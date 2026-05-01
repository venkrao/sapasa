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
type NoteEvent = { status: 'note'; note: string; swara: string; cents: number; freq: number }
type IdleEvent = { status: 'idle' }
type PitchEvent = NoteEvent | IdleEvent

const WS_URL = 'ws://localhost:8765/ws'
const RECONNECT_DELAY_MS = 2000

function waitMs(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, Math.max(0, ms)))
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
    stopReplay()
    setStatus('replaying')
    setError(null)
    const runId = ++replayRunIdRef.current
    if (!audioRef.current) audioRef.current = new EarTrainerAudioEngine()
    await audioRef.current.ensureStarted()

    const first = playEvents[0].startMs
    let playbackMs = first
    for (const ev of playEvents) {
      if (runId !== replayRunIdRef.current) return
      const wait = ev.startMs - playbackMs
      await waitMs(wait)
      if (runId !== replayRunIdRef.current) return
      const durSec = Math.max(0.07, Math.min(1.8, ev.durMs / 1000))
      await audioRef.current.playNote(midiToHz(ev.midi), durSec, tonePreset)
      playbackMs = ev.startMs
    }
    if (runId === replayRunIdRef.current) setStatus('captured')
  }, [attemptEvents, captureTarget, referenceEvents, stopReplay, tonePreset])

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
          if (statusRef.current === 'capturing') framesRef.current.push({ tMs: Date.now(), freq })
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
        <button className="listen-button" type="button" onClick={clearCapture} disabled={status === 'capturing'}>
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

