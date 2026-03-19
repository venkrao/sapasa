import { useCallback, useEffect, useRef, useState } from 'react'
import PitchGraph from './PitchGraph'
import { SA_HZ, SHRUTI_LIST, swaraHz } from './swaras'
import ExercisePanel from './ExercisePanel'
import { RAGAS, getExercise } from './exerciseCatalog'
import { deriveFlatSequence } from './exerciseModel'
import type { RagaDefinition, SequenceStep } from './exerciseModel'

const WS_URL = 'ws://localhost:8765/ws'
const RECONNECT_DELAY_MS = 2000
const AROHANAM_AVAROHANAM_EXERCISE_ID = '__arohanam_avarohanam__'

type NoteEvent = { status: 'note'; note: string; swara: string; cents: number; freq: number }
type IdleEvent = { status: 'idle' }
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

export default function PitchMonitorScreen({ onHome }: Props) {
  const [event, setEvent] = useState<PitchEvent>({ status: 'idle' })
  const [connected, setConnected] = useState(false)
  const [saHz, setSaHz] = useState(SA_HZ)
  const [listening, setListening] = useState(true)

  // Sidebar resizer (draggable divider between graph and ExercisePanel).
  const [sidebarWidth, setSidebarWidth] = useState(360)
  const resizingRef = useRef(false)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(360)
  const [sidebarDragging, setSidebarDragging] = useState(false)

  // ── Exercise selection (Raga -> Exercise) ───────────────────────────────
  const ragaOptions = [
    { id: '', label: 'Select raga…' },
    ...RAGAS.map(r => ({ id: r.id, label: r.label })),
  ]
  const [selectedRagaId, setSelectedRagaId] = useState('')

  const selectedRaga: RagaDefinition | undefined =
    selectedRagaId ? RAGAS.find(r => r.id === selectedRagaId) : undefined
  const selectedRagaTalaLabel = selectedRaga?.talaLabel ?? ''

  const exerciseOptions = [
    { id: '', label: 'Select exercise…' },
    ...(selectedRagaId ? [{ id: AROHANAM_AVAROHANAM_EXERCISE_ID, label: 'Arohanam & Avarohanam' }] : []),
    ...((selectedRaga?.exercises ?? []).map(e => ({ id: e.id, label: e.label }))),
  ]

  const [selectedExerciseId, setSelectedExerciseId] = useState('')

  const isAroAvaroExercise = selectedExerciseId === AROHANAM_AVAROHANAM_EXERCISE_ID

  const selectedExercise =
    !isAroAvaroExercise && selectedRagaId && selectedExerciseId
      ? getExercise(selectedRagaId, selectedExerciseId)
      : undefined

  // Spec-driven "Arohanam & Avarohanam" generated from the selected raga.
  const aroAvaroPhrases = selectedRaga
    ? [
        {
          label: 'ascending',
          groups: selectedRaga.arohanam.map(step => ({ steps: [step] })),
        },
        {
          label: 'descending',
          groups: selectedRaga.avarohanam.map(step => ({ steps: [step] })),
        },
      ]
    : []

  const aroAvaroFlatSequence = deriveFlatSequence(aroAvaroPhrases)

  // Convert a SequenceStep to the swara band key used by PitchGraph.
  function stepToGraphKey(step: SequenceStep): string {
    return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
  }

  const aroAvaroAllowedSwaras = Array.from(new Set(aroAvaroFlatSequence.map(stepToGraphKey)))

  const flatSequence = isAroAvaroExercise ? aroAvaroFlatSequence : selectedExercise?.flatSequence ?? []
  const phrases = isAroAvaroExercise ? aroAvaroPhrases : selectedExercise?.phrases ?? []
  const allowedSwaras = isAroAvaroExercise ? aroAvaroAllowedSwaras : selectedExercise?.allowedSwaras ?? null

  const [exerciseActive, setExerciseActive] = useState(false)
  const [expectedIndex, setExpectedIndex] = useState(0)
  const exerciseActiveRef = useRef(exerciseActive)
  const expectedIndexRef = useRef(expectedIndex)
  const flatSequenceRef = useRef<SequenceStep[]>(flatSequence)
  const stableMatchCountRef = useRef(0)
  const lastMatchedExpectedRef = useRef<number>(-1) // tracks expectedIndex to reset count on change

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDisplayed = useRef<number>(0)
  const graphPushRef = useRef<((freq: number | null) => void) | null>(null)
  const saHzRef = useRef(SA_HZ) // stable ref for use inside WS closures
  const listeningRef = useRef(true)

  const onGraphMount = useCallback((push: (freq: number | null) => void) => {
    graphPushRef.current = push
  }, [])

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

          maybeAdvanceExercise(incoming)

          // Feed every raw point to the graph, unthrottled
          graphPushRef.current?.(incoming.status === 'note' ? incoming.freq : null)

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

  const note = event.status === 'note' ? (event as NoteEvent) : null
  const idleText = !listening ? 'paused' : connected ? 'listening…' : 'connecting…'

  const expectedStep =
    exerciseActive && expectedIndex >= 0 && expectedIndex < flatSequence.length ? flatSequence[expectedIndex] : null
  const expectedSwara = expectedStep ? stepToGraphKey(expectedStep) : null
  const totalSteps = flatSequence.length

  const canStart = !!selectedRagaId && !!selectedExerciseId && totalSteps > 0

  useEffect(() => {
    exerciseActiveRef.current = exerciseActive
  }, [exerciseActive])
  useEffect(() => {
    expectedIndexRef.current = expectedIndex
  }, [expectedIndex])
  useEffect(() => {
    flatSequenceRef.current = flatSequence
  }, [selectedRagaId, selectedExerciseId])

  function startExercise() {
    if (flatSequenceRef.current.length === 0) return
    stableMatchCountRef.current = 0
    lastMatchedExpectedRef.current = -1
    expectedIndexRef.current = 0
    setExpectedIndex(0)
    setExerciseActive(true)
  }

  function stopExercise() {
    setExerciseActive(false)
    stableMatchCountRef.current = 0
    lastMatchedExpectedRef.current = -1
    expectedIndexRef.current = 0
    setExpectedIndex(0)
  }

  function maybeAdvanceExercise(incoming: PitchEvent) {
    if (!exerciseActiveRef.current) return
    if (incoming.status !== 'note') return

    const seq = flatSequenceRef.current
    const idx = expectedIndexRef.current
    if (idx >= seq.length) return

    const step = seq[idx]
    const f = incoming.freq

    // Check the step's defined octave AND one octave below it.
    // The -1 octave slot handles YIN sub-harmonic detection errors (the detector
    // sometimes returns half the true frequency). We never search *above*
    // step.octave, which is what previously caused upper Sa (oct=1) to satisfy
    // a search for the final lower Sa (oct=0).
    const saHzForMatch = saHzRef.current
    let errCents = Infinity
    for (const oct of [step.octave - 1, step.octave]) {
      const targetHz = swaraHz(step.swara, saHzForMatch, oct)
      if (targetHz <= 0 || f <= 0) continue
      const e = Math.abs(1200 * Math.log2(f / targetHz))
      if (e < errCents) errCents = e
    }

    // ±25¢ keeps adjacent swaras clearly separated (R1 is ~90¢ from Sa).
    const SETTLE_CENTS = 25

    // ~1000ms of steady hold before advancing (backend sends ~50 events/sec,
    // so 50 frames ≈ 1000 ms). Prevents transient wobbles from advancing.
    const SETTLE_FRAMES = 50

    const onTarget = errCents <= SETTLE_CENTS

    if (onTarget) {
      // Track by index so Sa (oct=0) and Sa (oct=1) are treated distinctly.
      stableMatchCountRef.current =
        lastMatchedExpectedRef.current === idx ? stableMatchCountRef.current + 1 : 1
      lastMatchedExpectedRef.current = idx

      if (stableMatchCountRef.current >= SETTLE_FRAMES) {
        stableMatchCountRef.current = 0
        lastMatchedExpectedRef.current = -1

        const next = idx + 1
        if (next >= seq.length) {
          setExerciseActive(false)
          setExpectedIndex(seq.length - 1)
        } else {
          expectedIndexRef.current = next
          setExpectedIndex(next)
        }
      }
    } else {
      // Pitch drifted off target — reset stability counter so the student
      // must hold it steadily again before advancing.
      stableMatchCountRef.current = 0
      lastMatchedExpectedRef.current = -1
    }
  }

  return (
    <div className="app">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <div className="header-controls">
          <button className="listen-button home-nav-button" onClick={onHome} type="button" title="Back to home">
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

      <div className="graph-container">
        <div className="graph-left">
          <PitchGraph
            saHz={saHz}
            paused={!listening}
            onMount={onGraphMount}
            allowedSwaras={exerciseActive ? allowedSwaras : null}
            expectedSwara={exerciseActive ? expectedSwara : null}
          />
        </div>

        <div
          className={'sidebar-divider ' + (sidebarDragging ? 'dragging' : '')}
          onPointerDown={e => {
            resizingRef.current = true
            setSidebarDragging(true)
            resizeStartXRef.current = e.clientX
            resizeStartWidthRef.current = sidebarWidth
            try {
              // Prevent text selection on drag.
              document.body.style.userSelect = 'none'
            } catch {
              // ignore
            }

            const onMove = (ev: PointerEvent) => {
              if (!resizingRef.current) return
              const dx = ev.clientX - resizeStartXRef.current
              const minW = 320
              const maxW = 620
              // Reversed: dragging the divider LEFT should widen the sidebar.
              const next = Math.max(minW, Math.min(maxW, resizeStartWidthRef.current - dx))
              setSidebarWidth(next)
            }

            const onUp = () => {
              resizingRef.current = false
              setSidebarDragging(false)
              try {
                document.body.style.userSelect = ''
              } catch {
                // ignore
              }
              window.removeEventListener('pointermove', onMove)
              window.removeEventListener('pointerup', onUp)
            }

            window.addEventListener('pointermove', onMove, { passive: true })
            window.addEventListener('pointerup', onUp, { passive: true })
          }}
        />

        <ExercisePanel
          expectedIndex={expectedIndex}
          totalSteps={totalSteps}
          phrases={phrases}
          expectedStep={expectedStep}
          exerciseActive={exerciseActive}
          canStart={canStart}
          onStart={startExercise}
          onStop={stopExercise}
          selectedRagaId={selectedRagaId}
          selectedExerciseId={selectedExerciseId}
          ragaOptions={ragaOptions}
          exerciseOptions={exerciseOptions}
          ragaTalaLabel={selectedRagaTalaLabel}
          panelWidthPx={sidebarWidth}
          onRagaChange={id => {
            if (id === selectedRagaId) return
            stopExercise()
            setSelectedRagaId(id)
            setSelectedExerciseId('')
          }}
          onExerciseChange={id => {
            if (id === selectedExerciseId) return
            stopExercise()
            setSelectedExerciseId(id)
          }}
        />
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
            <span className="idle-text">{idleText}</span>
          </div>
        )}
      </div>
    </div>
  )
}

