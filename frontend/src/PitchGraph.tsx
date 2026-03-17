import { useCallback, useEffect, useRef } from 'react'

// ── constants ─────────────────────────────────────────────────────────────────

const WINDOW_MS = 15_000
const MIN_FREQ = 75    // ~D#2 — below lowest typical vocal range
const MAX_FREQ = 1250  // ~D#6 — above highest typical vocal range

const LABEL_W = 52     // px reserved for Y-axis labels

// Base frequencies for one octave — expanded to all octaves in the visible range
const BASE_TARGETS: Record<string, number> = {
  'Sa': 311.13,
  'Pa': 466.70,
}

const TARGET_COLORS: Record<string, string> = {
  'Sa': '#4ade80',
  'Pa': '#60a5fa',
}

// Nearest-cents check still needs the same three original targets
const TARGETS: Record<string, number> = {
  'Sa':  311.13,
  'Pa':  466.70,
  "Sa′": 622.25,
}

// All octave repetitions of each swara visible in [MIN_FREQ, MAX_FREQ]
type TargetBand = { swara: string; freq: number; color: string }

function buildTargetBands(): TargetBand[] {
  const bands: TargetBand[] = []
  for (const [swara, base] of Object.entries(BASE_TARGETS)) {
    for (const mult of [0.125, 0.25, 0.5, 1, 2, 4, 8]) {
      const f = base * mult
      if (f >= MIN_FREQ && f <= MAX_FREQ) {
        bands.push({ swara, freq: f, color: TARGET_COLORS[swara] })
      }
    }
  }
  return bands
}

const TARGET_BANDS = buildTargetBands()

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// ── helpers ───────────────────────────────────────────────────────────────────

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

function nearestCents(freq: number): number {
  // Distance in cents to the nearest chromatic semitone — always in [0, 50]
  const midi = 69 + 12 * Math.log2(freq / 440)
  return Math.abs((midi - Math.round(midi)) * 100)
}

function pitchColor(absCents: number): string {
  if (absCents <= 10) return '#4ade80'
  if (absCents <= 25) return '#fbbf24'
  return '#f87171'
}

// ── component ─────────────────────────────────────────────────────────────────

type Point = { t: number; freq: number | null }

interface Props {
  /** App calls this once with the push function so it can feed raw data points. */
  onMount: (push: (freq: number | null) => void) => void
}

export default function PitchGraph({ onMount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<Point[]>([])
  const rafRef = useRef<number>(0)

  const push = useCallback((freq: number | null) => {
    const now = Date.now()
    historyRef.current.push({ t: now, freq })
    const cutoff = now - WINDOW_MS - 500
    while (historyRef.current.length > 1 && historyRef.current[0].t < cutoff) {
      historyRef.current.shift()
    }
  }, [])

  useEffect(() => {
    onMount(push)
  }, [onMount, push])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let W = 0, H = 0, dpr = 1

    function resize() {
      dpr = window.devicePixelRatio || 1
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    function draw() {
      ctx.resetTransform()
      ctx.scale(dpr, dpr)

      const now = Date.now()
      const plotW = W - LABEL_W

      // background
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)

      // ── note grid ──────────────────────────────────────────────────────────
      // MIDI 34 (A#1, 58 Hz) → MIDI 91 (G6, 1568 Hz) — clip by freq range
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      for (let midi = 34; midi <= 91; midi++) {
        const f = noteFreq(midi)
        if (f < MIN_FREQ || f > MAX_FREQ) continue

        const y = freqToY(f, H)
        const name = noteName(midi)
        const isSharp = name.includes('#')
        const isC     = name.startsWith('C') && !isSharp

        // grid line
        ctx.strokeStyle = isSharp ? '#141414' : isC ? '#252525' : '#1e1e1e'
        ctx.lineWidth   = isC ? 1 : 0.5
        ctx.beginPath()
        ctx.moveTo(LABEL_W, y)
        ctx.lineTo(W, y)
        ctx.stroke()

        // label all natural notes; C notes slightly brighter as octave markers
        if (!isSharp) {
          ctx.font      = isC ? '500 11px system-ui, sans-serif'
                               : '400 10px system-ui, sans-serif'
          ctx.fillStyle = isC ? '#606060' : '#484848'
          ctx.fillText(name, LABEL_W - 6, y)
        }
      }

      // ── target bands ───────────────────────────────────────────────────────
      for (const { swara, freq, color: col } of TARGET_BANDS) {
        const y = freqToY(freq, H)

        // ±25¢ outer band
        const y25hi = freqToY(freqAtCents(freq, +25), H)
        const y25lo = freqToY(freqAtCents(freq, -25), H)
        ctx.fillStyle = col + '12'
        ctx.fillRect(LABEL_W, y25hi, plotW, y25lo - y25hi)

        // ±10¢ inner band
        const y10hi = freqToY(freqAtCents(freq, +10), H)
        const y10lo = freqToY(freqAtCents(freq, -10), H)
        ctx.fillStyle = col + '22'
        ctx.fillRect(LABEL_W, y10hi, plotW, y10lo - y10hi)

        // center line
        ctx.strokeStyle = col + '55'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(LABEL_W, y)
        ctx.lineTo(W, y)
        ctx.stroke()

        // swara label
        ctx.fillStyle = col + 'cc'
        ctx.font = '600 11px system-ui, sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(swara, LABEL_W - 6, y)
      }

      // ── Y-axis divider ─────────────────────────────────────────────────────
      ctx.strokeStyle = '#1f1f1f'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(LABEL_W, 0)
      ctx.lineTo(LABEL_W, H)
      ctx.stroke()

      // ── pitch trace ────────────────────────────────────────────────────────
      const pts = historyRef.current

      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      let inSeg = false
      let segColor = ''

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        const x = LABEL_W + plotW * (1 - (now - p.t) / WINDOW_MS)
        if (x < LABEL_W) continue

        if (p.freq === null) {
          if (inSeg) { ctx.stroke(); inSeg = false }
          continue
        }

        const y = freqToY(p.freq, H)
        const col = pitchColor(nearestCents(p.freq))

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

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
