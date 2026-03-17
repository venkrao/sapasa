import { useCallback, useEffect, useRef } from 'react'
import { SA_HZ, buildSwaraBands, nearestSwaraCents, type SwaraBand } from './swaras'

// ── layout constants ──────────────────────────────────────────────────────────

const WINDOW_MS  = 15_000
const MIN_FREQ   = 75     // ~D#2 — well below any vocal range
const MAX_FREQ   = 1250   // ~D#6 — well above any vocal range

// Y-axis is split into two columns:
//   [0 .. SWARA_COL_X]   swara names (right-aligned)
//   [SWARA_COL_X .. LABEL_W]  Western note names (right-aligned)
//   [LABEL_W]            vertical divider
const SWARA_COL_X = 36
const LABEL_W     = 76

// ── pre-built band list ───────────────────────────────────────────────────────

const SWARA_BANDS: SwaraBand[] = buildSwaraBands(SA_HZ, MIN_FREQ, MAX_FREQ)

const PROMINENT = new Set(["Sa", "Pa", "Sa'"])

// ── helpers ───────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function noteFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function noteName(midi: number): string {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1)
}

function freqToY(freq: number, h: number): number {
  const lo = Math.log2(MIN_FREQ)
  const hi = Math.log2(MAX_FREQ)
  return h * (1 - (Math.log2(freq) - lo) / (hi - lo))
}

function freqAtCents(freq: number, cents: number): number {
  return freq * Math.pow(2, cents / 1200)
}

function pitchColor(absCents: number): string {
  if (absCents <= 10) return '#4ade80'
  if (absCents <= 25) return '#fbbf24'
  return '#f87171'
}

// ── component ─────────────────────────────────────────────────────────────────

type Point = { t: number; freq: number | null }

interface Props {
  onMount: (push: (freq: number | null) => void) => void
}

export default function PitchGraph({ onMount }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<Point[]>([])
  const rafRef     = useRef<number>(0)

  const push = useCallback((freq: number | null) => {
    const now = Date.now()
    historyRef.current.push({ t: now, freq })
    const cutoff = now - WINDOW_MS - 500
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
      dpr = window.devicePixelRatio || 1
      W   = canvas.offsetWidth
      H   = canvas.offsetHeight
      canvas.width  = W * dpr
      canvas.height = H * dpr
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    function draw() {
      ctx.resetTransform()
      ctx.scale(dpr, dpr)

      const now   = Date.now()
      const plotW = W - LABEL_W

      // background
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)

      // ── Western chromatic grid ────────────────────────────────────────────
      ctx.textBaseline = 'middle'

      for (let midi = 34; midi <= 91; midi++) {
        const f = noteFreq(midi)
        if (f < MIN_FREQ || f > MAX_FREQ) continue
        const y    = freqToY(f, H)
        const name = noteName(midi)
        const isSharp = name.includes('#')
        const isC     = name.startsWith('C') && !isSharp

        ctx.strokeStyle = isC ? '#242424' : isSharp ? '#111' : '#181818'
        ctx.lineWidth   = isC ? 1 : 0.5
        ctx.beginPath(); ctx.moveTo(LABEL_W, y); ctx.lineTo(W, y); ctx.stroke()

        if (!isSharp) {
          ctx.font      = isC ? '500 11px system-ui,sans-serif' : '400 10px system-ui,sans-serif'
          ctx.fillStyle = isC ? '#606060' : '#484848'
          ctx.textAlign = 'right'
          ctx.fillText(name, LABEL_W - 6, y)
        }
      }

      // ── Swara bands at JI positions ───────────────────────────────────────
      // Sort descending by freq so we can do a Y-proximity check for labels
      const sorted = [...SWARA_BANDS].sort((a, b) => b.freq - a.freq)
      let lastSwaraLabelY = -Infinity

      for (const band of sorted) {
        const y   = freqToY(band.freq, H)
        const col = band.color
        const big = PROMINENT.has(band.swara)

        // ±25¢ outer fill (prominent swaras only)
        if (big) {
          const yHi = freqToY(freqAtCents(band.freq, +25), H)
          const yLo = freqToY(freqAtCents(band.freq, -25), H)
          ctx.fillStyle = col + '10'
          ctx.fillRect(LABEL_W, yHi, plotW, yLo - yHi)
        }

        // ±10¢ inner fill
        const y10Hi = freqToY(freqAtCents(band.freq, +10), H)
        const y10Lo = freqToY(freqAtCents(band.freq, -10), H)
        ctx.fillStyle = col + (big ? '22' : '14')
        ctx.fillRect(LABEL_W, y10Hi, plotW, y10Lo - y10Hi)

        // centre line
        ctx.strokeStyle = col + (big ? '55' : '28')
        ctx.lineWidth   = big ? 1 : 0.5
        ctx.beginPath(); ctx.moveTo(LABEL_W, y); ctx.lineTo(W, y); ctx.stroke()

        // swara label (left column, skip if too close to the previous label)
        if (y - lastSwaraLabelY >= 9) {
          ctx.font      = big ? '600 10px system-ui,sans-serif' : '400 9px system-ui,sans-serif'
          ctx.fillStyle = col + (big ? 'cc' : '88')
          ctx.textAlign = 'right'
          ctx.fillText(band.label, SWARA_COL_X, y)
          lastSwaraLabelY = y
        }
      }

      // ── Y-axis divider ────────────────────────────────────────────────────
      ctx.strokeStyle = '#1f1f1f'
      ctx.lineWidth   = 1
      ctx.beginPath(); ctx.moveTo(LABEL_W, 0); ctx.lineTo(LABEL_W, H); ctx.stroke()

      // subtle column separator between swara / Western label zones
      ctx.strokeStyle = '#151515'
      ctx.lineWidth   = 0.5
      ctx.beginPath(); ctx.moveTo(SWARA_COL_X + 4, 0); ctx.lineTo(SWARA_COL_X + 4, H); ctx.stroke()

      // ── pitch trace ───────────────────────────────────────────────────────
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

        const y   = freqToY(p.freq, H)
        const col = pitchColor(nearestSwaraCents(p.freq, SWARA_BANDS))

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

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
