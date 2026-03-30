import { useCallback, useEffect, useRef, useState } from 'react'
import PitchGraph from './PitchGraph'
import { SA_HZ, SHRUTI_LIST } from './swaras'
import TanpuraStrip from './TanpuraStrip'
import OrganTrainingPanel from './OrganTrainingPanel'

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

type Props = {
  onHome: () => void
}

export default function OrganTrainingScreen({ onHome }: Props) {
  const [event, setEvent]         = useState<PitchEvent>({ status: 'idle' })
  const [connected, setConnected] = useState(false)
  const [saHz, setSaHz]           = useState(SA_HZ)
  // Start paused — user must explicitly press Listen to activate the mic.
  const [listening, setListening] = useState(false)

  const [selectedOrganId, setSelectedOrganId] = useState('')

  // Sidebar resizer
  const [sidebarWidth, setSidebarWidth]       = useState(360)
  const resizingRef                           = useRef(false)
  const resizeStartXRef                       = useRef(0)
  const resizeStartWidthRef                   = useRef(360)
  const [sidebarDragging, setSidebarDragging] = useState(false)

  const wsRef            = useRef<WebSocket | null>(null)
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDisplayed    = useRef<number>(0)
  const graphPushRef     = useRef<((freq: number | null) => void) | null>(null)
  const saHzRef          = useRef(SA_HZ)
  const listeningRef     = useRef(false)

  const onGraphMount = useCallback((push: (freq: number | null) => void) => {
    graphPushRef.current = push
  }, [])

  const shrutiSummary = (() => {
    const s = SHRUTI_LIST.find(x => x.hz === saHz)
    return s ? `${s.kattai} (${s.western})` : `${saHz.toFixed(2)} Hz`
  })()

  function sendShruti(ws: WebSocket, hz: number) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'set_shruti', sa_hz: hz }))
  }

  function onShrutiChange(hz: number) {
    saHzRef.current = hz
    setSaHz(hz)
    if (wsRef.current) sendShruti(wsRef.current, hz)
  }

  useEffect(() => {
    function connect() {
      if (!listeningRef.current) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        sendShruti(ws, saHzRef.current)
      }

      ws.onmessage = (e: MessageEvent) => {
        if (!listeningRef.current) return
        try {
          const incoming = JSON.parse(e.data) as PitchEvent
          graphPushRef.current?.(incoming.status === 'note' ? incoming.freq : null)

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
        if (listeningRef.current) reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.onerror = () => ws.close()
    }

    if (listening) connect()
    else {
      wsRef.current?.close()
      wsRef.current = null
      setConnected(false)
      setEvent({ status: 'idle' })
      graphPushRef.current?.(null)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }

    return () => {
      wsRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [listening])

  function toggleListening() {
    listeningRef.current = !listeningRef.current
    setListening(listeningRef.current)
  }

  const note      = event.status === 'note' ? (event as NoteEvent) : null
  const idleText  = !listening ? 'paused' : connected ? 'listening…' : 'connecting…'

  return (
    <div className="app">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        {note
          ? <span className="header-western" style={{ color: centsColor(note.cents) }}>{note.note}</span>
          : <span className="header-western header-western-idle" />}
        <div className="header-controls">
          <button className="listen-button home-nav-button" onClick={onHome} type="button">
            Home
          </button>
          <button
            className={'listen-button ' + (listening ? 'on' : 'off')}
            onClick={toggleListening}
            type="button"
            title={listening ? 'Stop listening' : 'Start listening'}
          >
            {listening ? 'Pause' : 'Listen'}
          </button>
          <select className="shruti-select" value={saHz} onChange={e => onShrutiChange(Number(e.target.value))}>
            {SHRUTI_LIST.map(s => (
              <option key={s.hz} value={s.hz}>
                {s.kattai} ({s.western}) — {s.typicalUser}
              </option>
            ))}
          </select>
        </div>
      </header>

      <TanpuraStrip saHz={saHz} shrutiSummary={shrutiSummary} />

      <div className="graph-container">
        <div className="graph-left">
          <PitchGraph
            saHz={saHz}
            paused={!listening}
            onMount={onGraphMount}
            allowedSwaras={null}
            expectedSwara={null}
          />
        </div>

        <div
          className={'sidebar-divider ' + (sidebarDragging ? 'dragging' : '')}
          onPointerDown={e => {
            resizingRef.current = true
            setSidebarDragging(true)
            resizeStartXRef.current = e.clientX
            resizeStartWidthRef.current = sidebarWidth
            try { document.body.style.userSelect = 'none' } catch { /* ignore */ }

            const onMove = (ev: PointerEvent) => {
              if (!resizingRef.current) return
              const dx = ev.clientX - resizeStartXRef.current
              const next = Math.max(280, Math.min(560, resizeStartWidthRef.current - dx))
              setSidebarWidth(next)
            }
            const onUp = () => {
              resizingRef.current = false
              setSidebarDragging(false)
              try { document.body.style.userSelect = '' } catch { /* ignore */ }
              window.removeEventListener('pointermove', onMove)
              window.removeEventListener('pointerup', onUp)
            }
            window.addEventListener('pointermove', onMove, { passive: true })
            window.addEventListener('pointerup', onUp, { passive: true })
          }}
        />

        <OrganTrainingPanel
          selectedOrganId={selectedOrganId}
          onOrganChange={setSelectedOrganId}
          panelWidthPx={sidebarWidth}
        />
      </div>

      <div className="note-panel">
        {note ? (
          <div
            className="note-current"
            style={{ '--note-color': centsColor(note.cents) } as React.CSSProperties}
          >
            <span className="note-swara">{note.swara}</span>
            <span className="note-cents">{formatCents(note.cents)}</span>
            <span className="note-label">{centsLabel(note.cents)}</span>
          </div>
        ) : (
          <div className="note-idle">
            <div className="idle-dot" />
            <span className="idle-text">{idleText}</span>
          </div>
        )}
      </div>
    </div>
  )
}
