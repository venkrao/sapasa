import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PitchGraph from './PitchGraph'
import { SA_HZ } from './swaras'
import { EarTrainerAudioEngine, type TonePreset } from './audio/earTrainerAudioEngine'
import {
  analyzeMelodyPerformance,
  extractMelodyNoteEvents,
  getExtractConfigForMode,
  midiToHz,
  type MelodyProcessingMode,
  type MelodyFrame,
  type MelodyNoteEvent,
  type PerformanceAnalysis,
} from './melodyCapture'
import './MelodyCaptureScreen.css'

type Props = { onHome: () => void }
type NoteEvent = {
  status: 'note'
  note: string
  swara: string
  cents: number
  freq: number
  confidence?: number
}
type IdleEvent = { status: 'idle' }
type PitchEvent = NoteEvent | IdleEvent

const WS_URL = 'ws://localhost:8765/ws'
const RECONNECT_DELAY_MS = 2000

function waitMs(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, Math.max(0, ms)))
}

function formatReplayClock(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`
}

/** Wall-clock ms for the replay loop from `fromMs` (matches waitMs + playNote tail waits). */
function melodyReplayWallMsFrom(
  events: MelodyNoteEvent[],
  fromMs: number,
  tonePreset: TonePreset,
): number {
  const tailPad = tonePreset === 'piano' ? 480 : 420
  let playbackMs = fromMs
  let wall = 0
  for (const ev of events) {
    if (ev.endMs <= fromMs) continue
    const noteStart = Math.max(ev.startMs, playbackMs)
    wall += noteStart - playbackMs
    const durMs = ev.endMs - noteStart
    const durSec = Math.max(0.05, durMs / 1000)
    wall += Math.ceil(durSec * 1000 + tailPad)
    playbackMs = ev.endMs
  }
  return wall
}

export default function MelodyCaptureScreen({ onHome }: Props) {
  const [connected, setConnected] = useState(false)
  const [listening, setListening] = useState(true)
  const listeningRef = useRef(true)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const graphPushRef = useRef<((freq: number | null) => void) | null>(null)
  const audioRef = useRef<EarTrainerAudioEngine | null>(null)
  const replayRunIdRef = useRef(0)
  const replayStartPerfRef = useRef(0)
  const replayProgMusicalStartRef = useRef(0)
  const replayProgMusicalEndRef = useRef(0)
  const replayProgWallMsRef = useRef(0)
  const scrubDraggingRef = useRef(false)
  const replayRafRef = useRef(0)

  const [captureTarget, setCaptureTarget] = useState<'reference' | 'attempt'>('reference')
  const [status, setStatus] = useState<'idle' | 'capturing' | 'captured' | 'replaying'>('idle')
  const [captureStartedAt, setCaptureStartedAt] = useState<number | null>(null)
  const [captureStoppedAt, setCaptureStoppedAt] = useState<number | null>(null)
  const [referenceEvents, setReferenceEvents] = useState<MelodyNoteEvent[]>([])
  const [attemptEvents, setAttemptEvents] = useState<MelodyNoteEvent[]>([])
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [captureElapsedMs, setCaptureElapsedMs] = useState(0)
  const [captureLiveCount, setCaptureLiveCount] = useState(0)
  const [tonePreset, setTonePreset] = useState<TonePreset>('piano')
  const [processingMode, setProcessingMode] = useState<MelodyProcessingMode>('piano_friendly')
  const [replayPlayheadMs, setReplayPlayheadMs] = useState(0)

  const framesRef = useRef<MelodyFrame[]>([])
  const statusRef = useRef(status)
  useEffect(() => { statusRef.current = status }, [status])

  const onGraphMount = useCallback((push: (freq: number | null) => void) => {
    graphPushRef.current = push
  }, [])

  const stopReplay = useCallback(() => {
    replayRunIdRef.current += 1
    audioRef.current?.stop()
    setStatus(prev => (prev === 'replaying' ? 'captured' : prev))
  }, [])

  const clearCapture = useCallback(() => {
    if (
      !window.confirm(
        'Clear all melody data? Reference and attempt captures will be removed. This cannot be undone.',
      )
    ) {
      return
    }
    stopReplay()
    framesRef.current = []
    setReferenceEvents([])
    setAttemptEvents([])
    setAnalysis(null)
    setCaptureStartedAt(null)
    setCaptureStoppedAt(null)
    setCaptureElapsedMs(0)
    setCaptureLiveCount(0)
    setError(null)
    setStatus('idle')
    setReplayPlayheadMs(0)
  }, [stopReplay])

  const startCapture = useCallback(() => {
    if (!connected) {
      setError('Not connected to pitch backend. Start python server and retry.')
      return
    }
    stopReplay()
    const now = Date.now()
    framesRef.current = []
    if (captureTarget === 'attempt') setAnalysis(null)
    setError(null)
    setCaptureStartedAt(now)
    setCaptureStoppedAt(null)
    setCaptureElapsedMs(0)
    setCaptureLiveCount(0)
    setStatus('capturing')
  }, [captureTarget, connected, stopReplay])

  const stopCapture = useCallback(() => {
    if (statusRef.current !== 'capturing') return
    const stoppedAt = Date.now()
    const captured = [...framesRef.current]
    setCaptureStoppedAt(stoppedAt)
    setCaptureElapsedMs(captureStartedAt ? stoppedAt - captureStartedAt : 0)
    const extracted = extractMelodyNoteEvents(captured, getExtractConfigForMode(processingMode))
    if (captureTarget === 'reference') setReferenceEvents(extracted)
    else setAttemptEvents(extracted)
    setStatus('captured')
    setError(
      extracted.length === 0
        ? 'No stable notes captured. Try vocals-only source and slightly louder vocal signal.'
        : null,
    )
  }, [captureStartedAt, captureTarget, processingMode])

  const replayMelody = useCallback(async () => {
    const playEvents = captureTarget === 'reference' ? referenceEvents : attemptEvents
    if (playEvents.length === 0) return
    const lastEndMs = playEvents.reduce((m, e) => Math.max(m, e.endMs), 0)
    const totalEndMs = lastEndMs + 400
    let fromMs = Math.min(Math.max(0, replayPlayheadMs), lastEndMs)
    // After a full run playhead sits at `totalEndMs`; clamped `fromMs === lastEndMs` skips every note.
    if (lastEndMs > 0 && fromMs >= lastEndMs) fromMs = 0
    stopReplay()
    setStatus('replaying')
    setError(null)
    const runId = ++replayRunIdRef.current
    replayProgMusicalStartRef.current = fromMs
    replayProgMusicalEndRef.current = totalEndMs
    replayProgWallMsRef.current = melodyReplayWallMsFrom(playEvents, fromMs, tonePreset)
    replayStartPerfRef.current = performance.now()
    if (!audioRef.current) audioRef.current = new EarTrainerAudioEngine()
    await audioRef.current.ensureStarted()

    let playbackMs = fromMs
    let playedAny = false
    for (const ev of playEvents) {
      if (ev.endMs <= fromMs) continue
      if (runId !== replayRunIdRef.current) return
      const noteStart = Math.max(ev.startMs, playbackMs)
      const delayMs = noteStart - playbackMs
      if (delayMs > 0) await waitMs(delayMs)
      if (runId !== replayRunIdRef.current) return
      const durMs = ev.endMs - noteStart
      // Must match extracted timeline (no artificial cap): playNote now awaits full duration.
      const durSec = Math.max(0.05, durMs / 1000)
      await audioRef.current.playNote(midiToHz(ev.midi), durSec, tonePreset)
      playbackMs = ev.endMs
      playedAny = true
    }
    if (runId === replayRunIdRef.current) {
      setStatus('captured')
      if (playedAny) setReplayPlayheadMs(totalEndMs)
    }
  }, [attemptEvents, captureTarget, referenceEvents, replayPlayheadMs, stopReplay, tonePreset])

  const runAnalysis = useCallback(() => {
    if (referenceEvents.length === 0 || attemptEvents.length === 0) {
      setError('Capture both Reference and Attempt before analysis.')
      return
    }
    const result = analyzeMelodyPerformance(referenceEvents, attemptEvents)
    setAnalysis(result)
    setError(null)
  }, [attemptEvents, referenceEvents])

  useEffect(() => {
    listeningRef.current = listening
  }, [listening])

  useEffect(() => {
    const endScrub = () => {
      scrubDraggingRef.current = false
    }
    window.addEventListener('pointerup', endScrub)
    window.addEventListener('pointercancel', endScrub)
    return () => {
      window.removeEventListener('pointerup', endScrub)
      window.removeEventListener('pointercancel', endScrub)
    }
  }, [])

  useEffect(() => {
    return () => {
      stopReplay()
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [stopReplay])

  useEffect(() => {
    if (!listening) {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      wsRef.current = null
      setConnected(false)
      return
    }

    let disposed = false
    function connect() {
      if (disposed || !listeningRef.current) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (disposed) return
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (e: MessageEvent) => {
        if (disposed || !listeningRef.current) return
        try {
          const incoming = JSON.parse(e.data) as PitchEvent
          const freq = incoming.status === 'note' ? incoming.freq : null
          graphPushRef.current?.(freq)
          if (statusRef.current === 'capturing') {
            const frame: MelodyFrame = { tMs: Date.now(), freq }
            if (incoming.status === 'note' && incoming.confidence != null) {
              frame.confidence = incoming.confidence
            }
            framesRef.current.push(frame)
          }
        } catch {
          // ignore malformed packets
        }
      }

      ws.onerror = () => ws.close()
      ws.onclose = () => {
        if (disposed) return
        setConnected(false)
        wsRef.current = null
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
        if (listeningRef.current) reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()
    return () => {
      disposed = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      wsRef.current = null
      setConnected(false)
    }
  }, [listening])

  const activeReplayEvents = useMemo(
    () => (captureTarget === 'reference' ? referenceEvents : attemptEvents),
    [captureTarget, referenceEvents, attemptEvents],
  )
  const replayTotalMs = useMemo(() => {
    if (activeReplayEvents.length === 0) return 0
    const lastEnd = activeReplayEvents.reduce((m, e) => Math.max(m, e.endMs), 0)
    return lastEnd + 400
  }, [activeReplayEvents])

  useEffect(() => {
    setReplayPlayheadMs(0)
  }, [activeReplayEvents])

  useEffect(() => {
    if (status !== 'replaying') return
    const t0 = replayStartPerfRef.current
    const m0 = replayProgMusicalStartRef.current
    const m1 = replayProgMusicalEndRef.current
    const wall = replayProgWallMsRef.current
    const span = Math.max(0, m1 - m0)
    const tick = () => {
      if (statusRef.current !== 'replaying') return
      if (!scrubDraggingRef.current) {
        const elapsed = performance.now() - t0
        const frac = wall > 0 ? Math.min(1, elapsed / wall) : 1
        const pos = m0 + frac * span
        setReplayPlayheadMs(pos)
      }
      replayRafRef.current = requestAnimationFrame(tick)
    }
    replayRafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(replayRafRef.current)
  }, [status])

  useEffect(() => {
    if (status !== 'capturing' || !captureStartedAt) return
    const id = window.setInterval(() => {
      setCaptureElapsedMs(Date.now() - captureStartedAt)
      const rough = extractMelodyNoteEvents(
        framesRef.current,
        getExtractConfigForMode(processingMode),
      )
      setCaptureLiveCount(rough.length)
    }, 120)
    return () => window.clearInterval(id)
  }, [status, captureStartedAt, processingMode])

  function toggleListening() {
    const next = !listening
    setListening(next)
    listeningRef.current = next
    if (!next) {
      wsRef.current?.close()
      wsRef.current = null
      setConnected(false)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }

  const captureSummary = useMemo(() => {
    if (status === 'capturing') {
      return `Capturing... ${(captureElapsedMs / 1000).toFixed(1)}s · ${captureLiveCount} notes`
    }
    const selectedEvents = captureTarget === 'reference' ? referenceEvents : attemptEvents
    if (selectedEvents.length === 0 || captureStartedAt == null || captureStoppedAt == null) {
      return captureTarget === 'reference' ? 'No reference capture yet' : 'No attempt capture yet'
    }
    return `${selectedEvents.length} notes · ${((captureStoppedAt - captureStartedAt) / 1000).toFixed(1)}s`
  }, [
    status,
    captureElapsedMs,
    captureLiveCount,
    captureTarget,
    referenceEvents,
    attemptEvents,
    captureStartedAt,
    captureStoppedAt,
  ])

  const matchStats = useMemo(() => {
    if (!analysis) return null
    const matched = analysis.matched.length
    const refMissed = analysis.unmatchedReference.length
    const attExtra = analysis.unmatchedAttempt.length
    const total = Math.max(1, matched + refMissed + attExtra)
    return {
      matched,
      refMissed,
      attExtra,
      matchedPct: (matched / total) * 100,
      refMissedPct: (refMissed / total) * 100,
      attExtraPct: (attExtra / total) * 100,
      confidencePct: Math.round(analysis.averageConfidence * 100),
    }
  }, [analysis])

  return (
    <div className="app">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <div className="header-controls">
          <span className="header-screen-name">Melody Capture</span>
        </div>
        <button className="listen-button home-nav-button" onClick={onHome} type="button">Home</button>
      </header>

      <div className="melody-capture-toolbar">
        <div className="melody-tab-row">
          <button
            className={'listen-button ' + (captureTarget === 'reference' ? 'on' : 'off')}
            type="button"
            onClick={() => setCaptureTarget('reference')}
          >
            Reference
          </button>
          <button
            className={'listen-button ' + (captureTarget === 'attempt' ? 'on' : 'off')}
            type="button"
            onClick={() => setCaptureTarget('attempt')}
          >
            Attempt
          </button>
        </div>
        <button className={'listen-button ' + (listening ? 'on' : 'off')} onClick={toggleListening} type="button">
          {listening ? 'Pause listening' : 'Listen'}
        </button>
        <button
          className="listen-button"
          type="button"
          onClick={status === 'capturing' ? stopCapture : startCapture}
          disabled={!connected && status !== 'capturing'}
        >
          {status === 'capturing'
            ? `Stop ${captureTarget}`
            : `Capture ${captureTarget === 'reference' ? 'reference' : 'attempt'}`}
        </button>
        <button
          className="listen-button"
          type="button"
          onClick={status === 'replaying' ? stopReplay : () => void replayMelody()}
          disabled={(captureTarget === 'reference' ? referenceEvents : attemptEvents).length === 0}
        >
          {status === 'replaying' ? 'Stop replay' : 'Replay melody'}
        </button>
        <button
          className="listen-button"
          type="button"
          onClick={clearCapture}
          disabled={status === 'capturing'}
          title="Erase reference and attempt captures after confirmation."
        >
          Clear
        </button>
        <select className="shruti-select" value={tonePreset} onChange={e => setTonePreset(e.target.value as TonePreset)}>
          <option value="piano">Piano</option>
          <option value="sine">Sine</option>
        </select>
        <select
          className="shruti-select"
          value={processingMode}
          onChange={e => setProcessingMode(e.target.value as MelodyProcessingMode)}
          title="Capture cleanup profile"
        >
          <option value="raw">Raw capture</option>
          <option value="piano_friendly">Piano-friendly</option>
          <option value="ultra_aggressive">Ultra aggressive (test)</option>
          <option value="anti_octave_aggressive">Anti-octave aggressive</option>
        </select>
        <button
          className="listen-button"
          type="button"
          onClick={runAnalysis}
          disabled={referenceEvents.length === 0 || attemptEvents.length === 0 || status === 'capturing'}
        >
          Analyze attempt
        </button>
        <span className="melody-status-chip">{connected ? 'Connected' : 'Disconnected'}</span>
        <span className="melody-status-chip">{captureSummary}</span>
        <span className="melody-status-chip">
          Ref {referenceEvents.length} · Attempt {attemptEvents.length}
        </span>
        {error ? <span className="melody-status-chip melody-status-error">{error}</span> : null}
      </div>

      <div
        className={
          'melody-replay-scrubber' +
          (activeReplayEvents.length === 0 ? ' melody-replay-scrubber-disabled' : '')
        }
        aria-label="Replay timeline"
      >
        <span className="melody-replay-scrubber-label">Replay</span>
        <input
          type="range"
          className="melody-replay-scrubber-range"
          min={0}
          max={Math.max(1, replayTotalMs)}
          step={1}
          disabled={activeReplayEvents.length === 0}
          value={Math.min(replayPlayheadMs, Math.max(1, replayTotalMs))}
          title="Drag to seek; Replay melody plays from this position."
          onPointerDown={() => {
            scrubDraggingRef.current = true
            if (statusRef.current === 'replaying') stopReplay()
          }}
          onPointerUp={() => {
            scrubDraggingRef.current = false
          }}
          onPointerCancel={() => {
            scrubDraggingRef.current = false
          }}
          onChange={e => setReplayPlayheadMs(Number(e.target.value))}
        />
        <span className="melody-replay-scrubber-time">
          {formatReplayClock(replayPlayheadMs)} / {formatReplayClock(replayTotalMs)}
        </span>
      </div>

      {analysis && (
        <div className="melody-analysis-panel">
          <div className="melody-analysis-title">Performance Summary</div>
          <div className="melody-confidence-row">
            <span className="melody-confidence-label">Match confidence</span>
            <span className="melody-confidence-value">
              {matchStats?.confidencePct ?? 0}%
            </span>
          </div>
          <div className="melody-analysis-scores">
            <span className="melody-score-chip">Overall {analysis.overallScore}</span>
            <span className="melody-score-chip">Pitch {analysis.pitchScore}</span>
            <span className="melody-score-chip">Rhythm {analysis.rhythmScore}</span>
            <span className="melody-score-chip">Stability {analysis.stabilityScore}</span>
          </div>
          {matchStats && (
            <div className="melody-match-chart-wrap" aria-label="Matched versus unmatched note counts">
              <div className="melody-match-chart">
                <div className="melody-match-seg melody-match-seg-ok" style={{ width: `${matchStats.matchedPct}%` }} />
                <div className="melody-match-seg melody-match-seg-ref" style={{ width: `${matchStats.refMissedPct}%` }} />
                <div className="melody-match-seg melody-match-seg-att" style={{ width: `${matchStats.attExtraPct}%` }} />
              </div>
              <div className="melody-match-legend">
                <span className="melody-match-key melody-match-key-ok">Matched {matchStats.matched}</span>
                <span className="melody-match-key melody-match-key-ref">Ref missed {matchStats.refMissed}</span>
                <span className="melody-match-key melody-match-key-att">Attempt extra {matchStats.attExtra}</span>
              </div>
            </div>
          )}
          <div className="melody-analysis-lines">
            {analysis.summaryLines.map((line, idx) => (
              <div key={idx} className="melody-analysis-line">{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="graph-container">
        <div className="graph-left">
          <PitchGraph
            saHz={SA_HZ}
            paused={!listening}
            onMount={onGraphMount}
            allowedSwaras={null}
            expectedSwara={null}
            showHoldAnnotations={false}
          />
        </div>
      </div>
    </div>
  )
}

