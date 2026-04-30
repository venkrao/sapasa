import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PitchGraph from './PitchGraph'
import { SA_HZ } from './swaras'
import { EarTrainerAudioEngine, type TonePreset } from './audio/earTrainerAudioEngine'
import {
  DEFAULT_MELODY_EXTRACT_CONFIG,
  extractMelodyNoteEvents,
  midiToHz,
  type MelodyFrame,
  type MelodyNoteEvent,
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

  const [status, setStatus] = useState<'idle' | 'capturing' | 'captured' | 'replaying'>('idle')
  const [captureStartedAt, setCaptureStartedAt] = useState<number | null>(null)
  const [captureStoppedAt, setCaptureStoppedAt] = useState<number | null>(null)
  const [events, setEvents] = useState<MelodyNoteEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [captureElapsedMs, setCaptureElapsedMs] = useState(0)
  const [tonePreset, setTonePreset] = useState<TonePreset>('piano')

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
    setEvents([])
    setCaptureStartedAt(null)
    setCaptureStoppedAt(null)
    setCaptureElapsedMs(0)
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
    setEvents([])
    setError(null)
    setCaptureStartedAt(now)
    setCaptureStoppedAt(null)
    setCaptureElapsedMs(0)
    setStatus('capturing')
  }, [connected, stopReplay])

  const stopCapture = useCallback(() => {
    if (statusRef.current !== 'capturing') return
    const stoppedAt = Date.now()
    const captured = [...framesRef.current]
    setCaptureStoppedAt(stoppedAt)
    setCaptureElapsedMs(captureStartedAt ? stoppedAt - captureStartedAt : 0)
    const extracted = extractMelodyNoteEvents(captured, DEFAULT_MELODY_EXTRACT_CONFIG)
    setEvents(extracted)
    setStatus('captured')
    setError(
      extracted.length === 0
        ? 'No stable notes captured. Try vocals-only source and slightly louder vocal signal.'
        : null,
    )
  }, [captureStartedAt])

  const replayMelody = useCallback(async () => {
    if (events.length === 0) return
    stopReplay()
    setStatus('replaying')
    setError(null)
    const runId = ++replayRunIdRef.current
    if (!audioRef.current) audioRef.current = new EarTrainerAudioEngine()
    await audioRef.current.ensureStarted()

    const first = events[0].startMs
    let playbackMs = first
    for (const ev of events) {
      if (runId !== replayRunIdRef.current) return
      const wait = ev.startMs - playbackMs
      await waitMs(wait)
      if (runId !== replayRunIdRef.current) return
      const durSec = Math.max(0.07, Math.min(1.8, ev.durMs / 1000))
      await audioRef.current.playNote(midiToHz(ev.midi), durSec, tonePreset)
      playbackMs = ev.startMs
    }
    if (runId === replayRunIdRef.current) setStatus('captured')
  }, [events, stopReplay, tonePreset])

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
    }, 120)
    return () => window.clearInterval(id)
  }, [status, captureStartedAt])

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
    if (status === 'capturing') return `Capturing... ${(captureElapsedMs / 1000).toFixed(1)}s`
    if (events.length === 0 || captureStartedAt == null || captureStoppedAt == null) return 'No capture yet'
    return `${events.length} notes · ${((captureStoppedAt - captureStartedAt) / 1000).toFixed(1)}s`
  }, [status, captureElapsedMs, events.length, captureStartedAt, captureStoppedAt])

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
        <button className={'listen-button ' + (listening ? 'on' : 'off')} onClick={toggleListening} type="button">
          {listening ? 'Pause listening' : 'Listen'}
        </button>
        <button
          className="listen-button"
          type="button"
          onClick={status === 'capturing' ? stopCapture : startCapture}
          disabled={!connected && status !== 'capturing'}
        >
          {status === 'capturing' ? 'Stop capture' : 'Capture melody'}
        </button>
        <button
          className="listen-button"
          type="button"
          onClick={status === 'replaying' ? stopReplay : () => void replayMelody()}
          disabled={events.length === 0}
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
        <span className="melody-status-chip">{connected ? 'Connected' : 'Disconnected'}</span>
        <span className="melody-status-chip">{captureSummary}</span>
        {error ? <span className="melody-status-chip melody-status-error">{error}</span> : null}
      </div>

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

