import { useCallback, useEffect, useRef } from 'react'
import { buildSwaraBands, nearestSwaraCents, type SwaraBand } from './swaras'

// ── grid & viewport constants ─────────────────────────────────────────────────

const GRID_MIN_HZ = 82.41    // E2 — below lowest practical vocal Sa
const GRID_MAX_HZ = 2093.00  // C7 — above highest soprano note

const OCTAVE_SPAN = 3        // octaves visible at once
const HALF_SPAN   = OCTAVE_SPAN / 2

const WINDOW_MS      = 60_000  // trace history length
const MEDIAN_WIN_MS  = 2_000   // window for scroll target median
const SCROLL_EMA     = 0.08    // viewport smoothing (per-frame at 60fps)
/** Above this distance from the viewport centre, snap instead of freezing (EMA only within guard). */
const JUMP_GUARD     = 300     // cents

// ── layout ────────────────────────────────────────────────────────────────────

const LABEL_W = 46  // left axis: swara names
const LABEL_R = 48  // right axis: Western note names

const PROMINENT = new Set(['Sa', 'Pa', "Sa'"])

// ── helpers ───────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function noteFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function noteName(midi: number): string {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1)
}

function freqToY(freq: number, h: number, viewMin: number, viewMax: number): number {
  const lo = Math.log2(viewMin)
  const hi = Math.log2(viewMax)
  return h * (1 - (Math.log2(freq) - lo) / (hi - lo))
}

function freqAtCents(freq: number, cents: number): number {
  return freq * Math.pow(2, cents / 1200)
}

function centsToHz(f: number, other: number): number {
  return Math.abs(1200 * Math.log2(f / other))
}

function pitchColor(absCents: number): string {
  if (absCents <= 10) return '#4ade80'
  if (absCents <= 25) return '#fbbf24'
  if (absCents <= 50) return '#f87171'
  return '#2e2e2e'  // between swarasthanas
}

// ── component ─────────────────────────────────────────────────────────────────

type Point = { t: number; freq: number | null }

interface Props {
  saHz:    number
  paused:  boolean
  allowedSwaras?: string[] | null
  expectedSwara?: string | null
  onMount: (push: (freq: number | null) => void) => void
  /** When true, draws brackets + duration labels over every in-tune hold ≥ 0.8 s */
  showHoldAnnotations?: boolean
}

export default function PitchGraph({
  saHz,
  paused,
  allowedSwaras,
  expectedSwara,
  onMount,
  showHoldAnnotations = false,
}: Props) {
  const canvasRef           = useRef<HTMLCanvasElement>(null)
  const historyRef          = useRef<Point[]>([])
  const displayCentreRef    = useRef<number>(saHz)    // initialised to Sa
  const rafRef              = useRef<number>(0)

  // swara bands — rebuilt whenever saHz changes, read by the draw loop via ref
  const swaraBandsRef = useRef<SwaraBand[]>(buildSwaraBands(saHz, GRID_MIN_HZ, GRID_MAX_HZ))
  useEffect(() => {
    swaraBandsRef.current      = buildSwaraBands(saHz, GRID_MIN_HZ, GRID_MAX_HZ)
    displayCentreRef.current   = saHz   // jump viewport to new Sa on shruti change
  }, [saHz])

  // pause support: freeze the graph timebase and stop viewport tracking
  const pausedRef     = useRef(paused)
  const frozenNowRef  = useRef<number | null>(null)
  useEffect(() => {
    pausedRef.current = paused
    if (paused) frozenNowRef.current = Date.now()
    else frozenNowRef.current = null
  }, [paused])

  // Exercise-aware emphasis/dimming (optional)
  const allowedSetRef         = useRef<Set<string> | null>(null)
  const expectedSwaraRef      = useRef<string | null>(expectedSwara ?? null)
  const showHoldAnnotationsRef = useRef(showHoldAnnotations)
  useEffect(() => {
    allowedSetRef.current = allowedSwaras ? new Set(allowedSwaras) : null
  }, [allowedSwaras])
  useEffect(() => {
    expectedSwaraRef.current = expectedSwara ?? null
  }, [expectedSwara])
  useEffect(() => {
    showHoldAnnotationsRef.current = showHoldAnnotations
  }, [showHoldAnnotations])

  // drag-to-scroll state
  const isDraggingRef       = useRef(false)
  const dragLastYRef        = useRef(0)
  const autoScrollPaused    = useRef(false)
  const resumeTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  const push = useCallback((freq: number | null) => {
    const now = Date.now()
    historyRef.current.push({ t: now, freq })
    const cutoff = now - WINDOW_MS - 1000
    while (historyRef.current.length > 1 && historyRef.current[0].t < cutoff)
      historyRef.current.shift()
  }, [])

  useEffect(() => { onMount(push) }, [onMount, push])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = 0, H = 0, dpr = 1

    function resize() {
      if (!canvas) return
      dpr = window.devicePixelRatio || 1
      W   = canvas.offsetWidth
      H   = canvas.offsetHeight
      canvas.width  = W * dpr
      canvas.height = H * dpr
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    // ── drag-to-scroll ────────────────────────────────────────────────────────
    function onPointerDown(e: PointerEvent) {
      canvas?.setPointerCapture(e.pointerId)
      isDraggingRef.current = true
      dragLastYRef.current  = e.clientY
      autoScrollPaused.current = true
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }

    function onPointerMove(e: PointerEvent) {
      if (!isDraggingRef.current) return
      const dy = e.clientY - dragLastYRef.current
      dragLastYRef.current = e.clientY
      // dragging down → lower frequencies (negate delta)
      const deltaOctaves = -dy * (OCTAVE_SPAN / H)
      displayCentreRef.current = Math.max(
        GRID_MIN_HZ * Math.pow(2, HALF_SPAN),
        Math.min(
          GRID_MAX_HZ / Math.pow(2, HALF_SPAN),
          displayCentreRef.current * Math.pow(2, deltaOctaves),
        ),
      )
    }

    function onPointerUp() {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      // resume auto-scroll after 3 s of inactivity
      resumeTimerRef.current = setTimeout(() => {
        autoScrollPaused.current = false
      }, 3000)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup',   onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)

    function clampDisplayCentre(hz: number): number {
      return Math.max(
        GRID_MIN_HZ * Math.pow(2, HALF_SPAN),
        Math.min(GRID_MAX_HZ / Math.pow(2, HALF_SPAN), hz),
      )
    }

    function draw() {
      ctx.resetTransform()
      ctx.scale(dpr, dpr)

      const now   = pausedRef.current ? (frozenNowRef.current ?? Date.now()) : Date.now()
      const plotW = W - LABEL_W - LABEL_R

      // Viewport from last frame — used to detect “singing off screen” while pan paused
      const centrePrev = displayCentreRef.current
      const viewMinPrev = Math.max(GRID_MIN_HZ, centrePrev / Math.pow(2, HALF_SPAN))
      const viewMaxPrev = Math.min(GRID_MAX_HZ, centrePrev * Math.pow(2, HALF_SPAN))

      // ── 1. Update display centre (skipped while user is dragging) ────────
      if (!pausedRef.current) {
        const recentFreqs = historyRef.current
          .filter(p => p.freq !== null && now - p.t <= MEDIAN_WIN_MS)
          .map(p => p.freq as number)
          .sort((a, b) => a - b)

        if (recentFreqs.length > 0) {
          const median = recentFreqs[Math.floor(recentFreqs.length / 2)]

          // After a manual pan, resume follow as soon as the sung pitch is outside the frame
          // (but not while the pointer is still down — avoid fighting drag).
          if (
            autoScrollPaused.current &&
            !isDraggingRef.current &&
            (median < viewMinPrev || median > viewMaxPrev)
          ) {
            autoScrollPaused.current = false
            if (resumeTimerRef.current) {
              clearTimeout(resumeTimerRef.current)
              resumeTimerRef.current = null
            }
          }

          if (!autoScrollPaused.current) {
            const jump = centsToHz(median, displayCentreRef.current)
            if (jump <= JUMP_GUARD) {
              displayCentreRef.current +=
                SCROLL_EMA * (median - displayCentreRef.current)
            } else {
              // Large interval / octave jump: bring the note into view immediately
              displayCentreRef.current = clampDisplayCentre(median)
            }
            displayCentreRef.current = clampDisplayCentre(displayCentreRef.current)
          }
        }
        // silence → hold position (no update)
      }

      // ── 2. Viewport bounds ────────────────────────────────────────────────
      const centre  = displayCentreRef.current
      const viewMin = Math.max(GRID_MIN_HZ, centre / Math.pow(2, HALF_SPAN))
      const viewMax = Math.min(GRID_MAX_HZ, centre * Math.pow(2, HALF_SPAN))

      // Shorthand for freq → Y using current viewport
      const fToY = (f: number) => freqToY(f, H, viewMin, viewMax)

      // ── 3. Background ─────────────────────────────────────────────────────
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)

      // ── 4. Western chromatic grid + right labels ──────────────────────────
      ctx.textBaseline = 'middle'
      // We'll render Western note labels on the LEFT axis, so right-align text
      // near the divider at `LABEL_W`.
      ctx.textAlign    = 'right'

      for (let midi = 40; midi <= 96; midi++) {
        const f = noteFreq(midi)
        if (f < viewMin || f > viewMax) continue

        const y    = fToY(f)
        const name = noteName(midi)
        const isSharp = name.includes('#')
        const isC     = name.startsWith('C') && !isSharp

        ctx.strokeStyle = isC ? '#242424' : isSharp ? '#111' : '#181818'
        ctx.lineWidth   = isC ? 1 : 0.5
        ctx.beginPath()
        ctx.moveTo(LABEL_W, y)
        ctx.lineTo(W - LABEL_R, y)
        ctx.stroke()

        if (!isSharp) {
          ctx.font      = isC ? '500 11px system-ui,sans-serif' : '400 10px system-ui,sans-serif'
          ctx.fillStyle = isC ? '#606060' : '#484848'
          // Left side: keep text inside the left reserved label column.
          ctx.fillText(name, LABEL_W - 6, y)
        }
      }

      // ── 5. Swara bands + left labels ──────────────────────────────────────
      const visibleBands = swaraBandsRef.current
        .filter(b => b.freq >= viewMin && b.freq <= viewMax)
        .sort((a, b) => b.freq - a.freq)

      let lastLabelY = -Infinity

      for (const band of visibleBands) {
        const y   = fToY(band.freq)
        const col = band.color
        const allowedSet = allowedSetRef.current
        const isAllowed  = allowedSet ? allowedSet.has(band.swara) : true
        const isExpected = expectedSwaraRef.current
          ? band.swara === expectedSwaraRef.current
          : false
        const dim = allowedSet ? !isAllowed : false
        const big = isExpected || (!dim && PROMINENT.has(band.swara))

        // ±25¢ outer fill (prominent only)
        if (big) {
          const yHi = fToY(freqAtCents(band.freq, +25))
          const yLo = fToY(freqAtCents(band.freq, -25))
          ctx.fillStyle = col + '10'
          ctx.fillRect(LABEL_W, yHi, plotW, yLo - yHi)
        }

        // ±10¢ inner fill
        const y10Hi = fToY(freqAtCents(band.freq, +10))
        const y10Lo = fToY(freqAtCents(band.freq, -10))
        ctx.fillStyle = col + (dim ? '0c' : (big ? '22' : '14'))
        ctx.fillRect(LABEL_W, y10Hi, plotW, y10Lo - y10Hi)

        // centre line
        ctx.strokeStyle = col + (dim ? '18' : (big ? '55' : '28'))
        ctx.lineWidth   = big ? 1 : 0.5
        ctx.beginPath()
        ctx.moveTo(LABEL_W, y)
        ctx.lineTo(W - LABEL_R, y)
        ctx.stroke()

        // left swara label (skip if too close to previous)
        if (y - lastLabelY >= 9) {
          ctx.font      = big ? '600 10px system-ui,sans-serif' : '400 9px system-ui,sans-serif'
          ctx.fillStyle = col + (dim ? '55' : (big ? 'cc' : '88'))
          // Right side: Carnatic swara labels should appear on the right axis.
          ctx.textAlign = 'left'
          ctx.fillText(band.label, W - LABEL_R + 6, y)
          lastLabelY = y
        }
      }

      // ── 6. Axis dividers ──────────────────────────────────────────────────
      ctx.strokeStyle = '#1f1f1f'
      ctx.lineWidth   = 1
      ctx.beginPath(); ctx.moveTo(LABEL_W,       0); ctx.lineTo(LABEL_W,       H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(W - LABEL_R,   0); ctx.lineTo(W - LABEL_R,   H); ctx.stroke()

      // ── 7. Pitch trace ────────────────────────────────────────────────────
      const pts = historyRef.current
      ctx.lineWidth = 2
      ctx.lineJoin  = 'round'
      ctx.lineCap   = 'round'

      let inSeg    = false
      let segColor = ''

      for (const p of pts) {
        const x = LABEL_W + plotW * (1 - (now - p.t) / WINDOW_MS)
        if (x < LABEL_W) continue

        if (p.freq === null) {
          if (inSeg) { ctx.stroke(); inSeg = false }
          continue
        }

        const y   = fToY(p.freq)
        const col = pitchColor(nearestSwaraCents(p.freq, swaraBandsRef.current))

        if (!inSeg || col !== segColor) {
          if (inSeg) ctx.stroke()
          ctx.beginPath()
          ctx.strokeStyle = col
          segColor = col
          ctx.moveTo(x, y)
          inSeg = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      if (inSeg) ctx.stroke()

      // ── 8. Hold duration annotations ─────────────────────────────────────
      if (showHoldAnnotationsRef.current && pts.length > 1) {
        const MIN_HOLD_MS  = 800
        // A hold ends only after this much continuous silence (no voiced frames)
        const PAUSE_END_MS = 1000

        type HoldRun = {
          startT: number; endT: number
          bandFreq: number; color: string; swara: string
        }
        const runs: HoldRun[] = []
        let runStart:    number | null = null
        let lastVoicedT: number | null = null
        let runFreqs: number[] = []

        const closeRun = (endT: number) => {
          if (runStart === null || runFreqs.length === 0) return
          if (endT - runStart >= MIN_HOLD_MS) {
            const sorted = [...runFreqs].sort((a, b) => a - b)
            const mf = sorted[Math.floor(sorted.length / 2)]
            const nb = swaraBandsRef.current.reduce((best, b) =>
              Math.abs(b.freq - mf) < Math.abs(best.freq - mf) ? b : best
            )
            runs.push({ startT: runStart, endT, bandFreq: nb.freq, color: nb.color, swara: nb.swara })
          }
          runStart    = null
          lastVoicedT = null
          runFreqs    = []
        }

        for (const p of pts) {
          if (p.freq !== null) {
            // Voiced frame — any pitched audio, regardless of cent accuracy
            if (runStart === null) runStart = p.t
            lastVoicedT = p.t
            runFreqs.push(p.freq)
          } else {
            // Silence frame — only break the hold after > 1 s of no audio
            if (runStart !== null && lastVoicedT !== null && p.t - lastVoicedT > PAUSE_END_MS) {
              closeRun(lastVoicedT)
            }
          }
        }
        // Close any still-open run at the end of the point array
        if (runStart !== null && lastVoicedT !== null) {
          if (now - lastVoicedT > PAUSE_END_MS) {
            closeRun(lastVoicedT)   // user has stopped; hold ended at last voiced frame
          } else {
            closeRun(now)           // hold is still live / just finished
          }
        }

        // Identify the longest run for gold highlight
        let longestMs = 0
        for (const r of runs) longestMs = Math.max(longestMs, r.endT - r.startT)

        ctx.save()
        for (const run of runs) {
          const isLongest = (run.endT - run.startT) === longestMs && longestMs >= MIN_HOLD_MS
          const x1 = LABEL_W + plotW * (1 - (now - run.startT) / WINDOW_MS)
          const x2 = LABEL_W + plotW * (1 - (now - run.endT)   / WINDOW_MS)
          const cx1 = Math.max(LABEL_W, x1)
          const cx2 = Math.min(LABEL_W + plotW, x2)
          if (cx2 <= cx1 + 1) continue

          const durSec = (run.endT - run.startT) / 1000
          const yHi = fToY(freqAtCents(run.bandFreq, +25))
          const yLo = fToY(freqAtCents(run.bandFreq, -25))

          // Filled band
          const fillColor = isLongest ? '#f59e0b' : run.color
          ctx.fillStyle   = fillColor + (isLongest ? '28' : '18')
          ctx.fillRect(cx1, yHi, cx2 - cx1, yLo - yHi)

          // Top + bottom bracket lines
          ctx.strokeStyle = fillColor + (isLongest ? 'aa' : '55')
          ctx.lineWidth   = 1
          ctx.beginPath()
          ctx.moveTo(cx1, yHi); ctx.lineTo(cx2, yHi)
          ctx.moveTo(cx1, yLo); ctx.lineTo(cx2, yLo)
          ctx.stroke()

          // Vertical end-caps
          ctx.strokeStyle = fillColor + (isLongest ? '88' : '44')
          ctx.lineWidth   = 1
          ctx.beginPath()
          ctx.moveTo(cx1, yHi); ctx.lineTo(cx1, yLo)
          ctx.moveTo(cx2, yHi); ctx.lineTo(cx2, yLo)
          ctx.stroke()

          // Duration + swara label
          if (cx2 - cx1 >= 16) {
            ctx.font         = `${isLongest ? '700' : '600'} 9px system-ui,sans-serif`
            ctx.fillStyle    = fillColor + (isLongest ? 'ff' : 'cc')
            ctx.textAlign    = 'right'
            ctx.textBaseline = 'bottom'
            const label = isLongest
              ? `★ ${durSec.toFixed(1)}s`
              : `${durSec.toFixed(1)}s`
            ctx.fillText(label, Math.min(cx2, LABEL_W + plotW) - 2, yHi - 2)
          }
        }
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      canvas.removeEventListener('pointerdown',  onPointerDown)
      canvas.removeEventListener('pointermove',  onPointerMove)
      canvas.removeEventListener('pointerup',    onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerUp)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'ns-resize' }}
    />
  )
}
