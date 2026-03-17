import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import PitchGraph from './PitchGraph'

const WS_URL = 'ws://localhost:8765/ws'
const RECONNECT_DELAY_MS = 2000

type NoteEvent = { status: 'note'; note: string; swara: string; cents: number; freq: number }
type IdleEvent  = { status: 'idle' }
type PitchEvent = NoteEvent | IdleEvent

function centsColor(cents: number): string {
  const abs = Math.abs(cents)
  if (abs <= 10) return '#4ade80'
  if (abs <= 25) return '#fbbf24'
  return '#f87171'
}

function formatCents(cents: number): string {
  if (cents === 0) return '0¢'
  return (cents > 0 ? '+' : '') + cents.toFixed(1) + '¢'
}

function centsLabel(cents: number): string {
  if (Math.abs(cents) <= 10) return 'in tune'
  return cents > 0 ? 'sharp' : 'flat'
}

export default function App() {
  const [event, setEvent]       = useState<PitchEvent>({ status: 'idle' })
  const [connected, setConnected] = useState(false)

  const wsRef           = useRef<WebSocket | null>(null)
  const reconnectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDisplayed   = useRef<number>(0)
  const graphPushRef    = useRef<((freq: number | null) => void) | null>(null)

  const onGraphMount = useCallback((push: (freq: number | null) => void) => {
    graphPushRef.current = push
  }, [])

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)

      ws.onmessage = (e: MessageEvent) => {
        try {
          const incoming = JSON.parse(e.data) as PitchEvent

          // Feed every raw point to the graph, unthrottled
          graphPushRef.current?.(
            incoming.status === 'note' ? incoming.freq : null
          )

          // Throttle the text display to ~5 fps so the number is readable
          const now = Date.now()
          if (incoming.status === 'idle' || now - lastDisplayed.current >= 200) {
            lastDisplayed.current = now
            setEvent(incoming)
          }
        } catch {
          // malformed message — ignore
        }
      }

      ws.onclose = () => {
        setConnected(false)
        setEvent({ status: 'idle' })
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      wsRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [])

  const note = event.status === 'note' ? (event as NoteEvent) : null

  return (
    <div className="app">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <span className="shruti-badge">D♯ / E♭</span>
      </header>

      <div className="graph-container">
        <PitchGraph onMount={onGraphMount} />
      </div>

      <div className="note-panel">
        {note ? (
          <div
            className="note-current"
            style={{ '--note-color': centsColor(note.cents) } as React.CSSProperties}
          >
            <div className="note-identity">
              <span className="note-swara">{note.swara}</span>
              <span className="note-western">{note.note}</span>
            </div>
            <span className="note-cents">{formatCents(note.cents)}</span>
            <span className="note-label">{centsLabel(note.cents)}</span>
          </div>
        ) : (
          <div className="note-idle">
            <div className="idle-dot" />
            <span className="idle-text">
              {connected ? 'listening…' : 'connecting…'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
