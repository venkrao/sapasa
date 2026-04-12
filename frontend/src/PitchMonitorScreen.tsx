import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PitchGraph from './PitchGraph'
import { SA_HZ, SHRUTI_LIST, swaraHz } from './swaras'
import ExercisePanel from './ExercisePanel'
import TanpuraStrip from './TanpuraStrip'
import CameraObservationLab from './CameraObservationLab'
import { RAGAS, getExercise } from './exerciseCatalog'
import { deriveFlatSequence } from './exerciseModel'
import type { RagaDefinition, SequenceStep } from './exerciseModel'

const WS_URL = 'ws://localhost:8765/ws'
/** Same host/port as `python main.py` — REST coach API. */
const PITCH_HTTP_ORIGIN = 'http://127.0.0.1:8765'
const COACH_CLIP_SECONDS = 15
const RECONNECT_DELAY_MS = 2000
const AROHANAM_AVAROHANAM_EXERCISE_ID = '__arohanam_avarohanam__'

type NoteEvent = { status: 'note'; note: string; swara: string; cents: number; freq: number }
type IdleEvent = { status: 'idle' }
type PitchEvent = NoteEvent | IdleEvent

function fmtTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

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
  const [octaveShift, setOctaveShift] = useState(0)
  const octaveShiftRef = useRef(0)
  const [listening, setListening] = useState(true)
  const [showHoldAnnotations, setShowHoldAnnotations] = useState(false)
  const [loopExercise, setLoopExercise] = useState(false)
  const loopExerciseRef = useRef(false)

  // Camera PiP
  const [showCamera, setShowCamera] = useState(false)
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 })
  const [pipSize, setPipSize] = useState({ w: 320, h: 420 })
  const pipDraggingRef = useRef(false)
  const pipResizingRef = useRef(false)
  /** Pitch graph column — used to position the camera PiP in viewport space (portal). */
  const graphLeftRef = useRef<HTMLDivElement>(null)
  /** Bumps when graph-left moves/resizes so fixed PiP position stays aligned. */
  const [pipAnchorTick, setPipAnchorTick] = useState(0)

  useLayoutEffect(() => {
    if (!showCamera) return
    const bump = () => setPipAnchorTick(t => t + 1)
    const el = graphLeftRef.current
    const ro = el ? new ResizeObserver(bump) : null
    if (el && ro) ro.observe(el)
    window.addEventListener('scroll', bump, true)
    window.addEventListener('resize', bump)
    bump()
    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', bump, true)
      window.removeEventListener('resize', bump)
    }
  }, [showCamera])

  const pipPortalStyle = useMemo((): CSSProperties => {
    const el = graphLeftRef.current
    if (!el) {
      return {
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: pipSize.w,
        height: pipSize.h,
        zIndex: 10000,
        visibility: 'hidden',
      }
    }
    const rect = el.getBoundingClientRect()
    return {
      position: 'fixed',
      left: rect.left + pipPos.x,
      bottom: window.innerHeight - rect.bottom + pipPos.y,
      width: pipSize.w,
      height: pipSize.h,
      zIndex: 10000,
      visibility: 'visible',
    }
  }, [showCamera, pipPos, pipSize, pipAnchorTick])

  // AI Coach (session-scoped history; not persisted)
  const [coachHistory, setCoachHistory] = useState<{ text: string; at: number; mock?: boolean }[]>(
    [],
  )
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachError, setCoachError] = useState<string | null>(null)

  // Session timer
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [showTimer, setShowTimer] = useState(true)
  const [timerPaused, setTimerPaused] = useState(false)
  const timerPausedRef = useRef(false)
  useEffect(() => { timerPausedRef.current = timerPaused }, [timerPaused])
  useEffect(() => {
    const id = setInterval(() => {
      if (!timerPausedRef.current) setSessionElapsed(s => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // effectiveSaHz is what everything uses — shruti × octave multiplier.
  const effectiveSaHz = saHz * Math.pow(2, octaveShift)

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
  const exerciseMatchSuppressUntilRef = useRef(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDisplayed = useRef<number>(0)
  const graphPushRef = useRef<((freq: number | null) => void) | null>(null)
  const saHzRef = useRef(SA_HZ) // always tracks effectiveSaHz for WS closures
  const listeningRef = useRef(true)

  const onGraphMount = useCallback((push: (freq: number | null) => void) => {
    graphPushRef.current = push
  }, [])

  const shrutiSummary = useMemo(() => {
    const s = SHRUTI_LIST.find(x => x.hz === saHz)
    const base = s ? `${s.kattai} (${s.western})` : `${saHz.toFixed(2)} Hz`
    return octaveShift !== 0 ? `${base} ${octaveShift > 0 ? `+${octaveShift}` : octaveShift} oct` : base
  }, [saHz, octaveShift])

  function sendShruti(ws: WebSocket, hz: number) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'set_shruti', sa_hz: hz }))
  }

  function onShrutiChange(hz: number) {
    const effective = hz * Math.pow(2, octaveShiftRef.current)
    saHzRef.current = effective
    setSaHz(hz)
    if (wsRef.current) sendShruti(wsRef.current, effective)
  }

  function onOctaveShiftChange(shift: number) {
    const clamped = Math.max(-2, Math.min(2, shift))
    octaveShiftRef.current = clamped
    const effective = saHz * Math.pow(2, clamped)
    saHzRef.current = effective
    setOctaveShift(clamped)
    if (wsRef.current) sendShruti(wsRef.current, effective)
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

  function startPipDrag(e: React.PointerEvent<HTMLDivElement>) {
    pipDraggingRef.current = true
    const startX = e.clientX
    const startY = e.clientY
    const startLeft = pipPos.x
    const startBottom = pipPos.y
    try { document.body.style.userSelect = 'none' } catch { /* ignore */ }

    const onMove = (ev: PointerEvent) => {
      if (!pipDraggingRef.current) return
      setPipPos({
        x: Math.max(0, startLeft + (ev.clientX - startX)),
        y: Math.max(0, startBottom - (ev.clientY - startY)),
      })
    }
    const onUp = () => {
      pipDraggingRef.current = false
      try { document.body.style.userSelect = '' } catch { /* ignore */ }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
  }

  function startPipResize(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    pipResizingRef.current = true
    const startX = e.clientX
    const startY = e.clientY
    const startW = pipSize.w
    const startH = pipSize.h
    try { document.body.style.userSelect = 'none' } catch { /* ignore */ }

    const onMove = (ev: PointerEvent) => {
      if (!pipResizingRef.current) return
      setPipSize({
        w: Math.max(240, startW + (ev.clientX - startX)),
        h: Math.max(280, startH + (ev.clientY - startY)),
      })
    }
    const onUp = () => {
      pipResizingRef.current = false
      try { document.body.style.userSelect = '' } catch { /* ignore */ }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
  }

  const onReferencePlaybackStart = useCallback((suppressMs: number) => {
    exerciseMatchSuppressUntilRef.current = performance.now() + suppressMs
    stableMatchCountRef.current = 0
    lastMatchedExpectedRef.current = -1
  }, [])

  const note = event.status === 'note' ? (event as NoteEvent) : null
  const idleText = !listening ? 'paused' : connected ? 'listening…' : 'connecting…'

  const expectedStep =
    exerciseActive && expectedIndex >= 0 && expectedIndex < flatSequence.length ? flatSequence[expectedIndex] : null
  const expectedSwara = expectedStep ? stepToGraphKey(expectedStep) : null
  const totalSteps = flatSequence.length

  const canStart = !!selectedRagaId && !!selectedExerciseId && totalSteps > 0

  const exerciseLabelForCoach = useMemo(() => {
    if (!selectedExerciseId || !selectedRagaId) return ''
    if (isAroAvaroExercise) return 'Arohanam & Avarohanam'
    return selectedExercise?.label ?? selectedExerciseId
  }, [selectedExerciseId, selectedRagaId, isAroAvaroExercise, selectedExercise?.label])

  const askCoach = useCallback(async () => {
    setCoachLoading(true)
    setCoachError(null)
    const shruti = SHRUTI_LIST.find(x => x.hz === saHz)
    const ragaLabel = selectedRaga?.label ?? ''
    try {
      const res = await fetch(`${PITCH_HTTP_ORIGIN}/coach/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_seconds: COACH_CLIP_SECONDS,
          context: {
            raga: ragaLabel,
            exercise: exerciseLabelForCoach,
            shruti_hz: effectiveSaHz,
            kattai: shruti ? String(shruti.kattai) : '',
            session_elapsed_s: sessionElapsed,
            pitch_summary: [],
          },
        }),
      })
      if (!res.ok) {
        let msg = res.statusText
        try {
          const j = (await res.json()) as { detail?: unknown }
          const d = j.detail
          if (typeof d === 'string') msg = d
          else if (Array.isArray(d))
            msg = d.map((x: { msg?: string }) => x.msg ?? JSON.stringify(x)).join('; ')
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      const data = (await res.json()) as { text: string; mock?: boolean }
      const entry = { text: data.text, at: Date.now(), mock: data.mock }
      setCoachHistory(h => [...h.slice(-4), entry])
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : String(e))
    } finally {
      setCoachLoading(false)
    }
  }, [effectiveSaHz, saHz, selectedRaga?.label, exerciseLabelForCoach, sessionElapsed])

  useEffect(() => {
    exerciseActiveRef.current = exerciseActive
  }, [exerciseActive])
  useEffect(() => {
    expectedIndexRef.current = expectedIndex
  }, [expectedIndex])
  useEffect(() => {
    flatSequenceRef.current = flatSequence
  }, [selectedRagaId, selectedExerciseId])
  useEffect(() => {
    loopExerciseRef.current = loopExercise
  }, [loopExercise])

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
    if (performance.now() < exerciseMatchSuppressUntilRef.current) return
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
          if (loopExerciseRef.current) {
            // Loop mode: restart from the beginning without stopping
            expectedIndexRef.current = 0
            lastMatchedExpectedRef.current = -1
            setExpectedIndex(0)
          } else {
            setExerciseActive(false)
            setExpectedIndex(seq.length - 1)
          }
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
    <>
    <div className="app">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        {note
          ? <span className="header-western" style={{ color: centsColor(note.cents) }}>{note.note}</span>
          : <span className="header-western header-western-idle" />}
        <div className="header-controls header-controls-home-only">
          <button
            className="listen-button home-nav-button"
            onClick={onHome}
            type="button"
            title="Leave the pitch monitor and return to the app home screen."
          >
            Home
          </button>
        </div>
      </header>

      <TanpuraStrip
        saHz={effectiveSaHz}
        shrutiSummary={shrutiSummary}
        sessionToolbar={
          <>
            <button
              className={'listen-button ' + (listening ? 'on' : 'off')}
              onClick={toggleListening}
              type="button"
              title={
                listening
                  ? 'Pause listening — pitch detection stops, the graph and detected note freeze; click again to resume.'
                  : 'Listen — start pitch detection; analyze the microphone and show your Carnatic swara, cents, and trace on the graph in real time.'
              }
            >
              {listening ? 'Pause listening' : 'Listen'}
            </button>
            <button
              className={'listen-button ' + (showHoldAnnotations ? 'on' : 'off')}
              onClick={() => setShowHoldAnnotations(v => !v)}
              type="button"
              title={
                showHoldAnnotations
                  ? 'Turn off hold annotations — remove labels that show how long each stable, in-tune segment lasted.'
                  : 'Show hold durations — when on, the graph annotates how long you sustain each in-tune note (useful for steady singing practice).'
              }
            >
              {showHoldAnnotations ? '⏱ Holds on' : '⏱ Holds'}
            </button>
            <button
              className={'listen-button ' + (showCamera ? 'on' : 'off')}
              onClick={() => setShowCamera(v => !v)}
              type="button"
              title={
                showCamera
                  ? 'Hide the posture camera — closes the picture-in-picture overlay (you can reopen it anytime).'
                  : 'Show posture camera — opens a small video overlay on the graph with physical feedback (e.g. shoulders, jaw). Drag the header to move; drag the corner grip to resize.'
              }
            >
              📷 Cam
            </button>

            <div
              className="session-timer-group"
              title="Session clock — tracks how long this practice has been open. Use ⏱ to show or hide the display; use ▶/⏸ to pause or resume counting."
            >
              {showTimer && (
                <>
                  <span
                    className={`session-timer-value${timerPaused ? ' paused' : ''}`}
                    title="Elapsed time for this session since you opened the pitch monitor. Pauses when you click ⏸ on the timer."
                  >
                    {fmtTimer(sessionElapsed)}
                  </span>
                  <button
                    className="session-timer-toggle"
                    type="button"
                    onClick={() => setTimerPaused(v => !v)}
                    title={
                      timerPaused
                        ? 'Resume the session timer — seconds start counting again from where you left off.'
                        : 'Pause the session timer — freezes the clock (useful if you step away without closing the app).'
                    }
                    aria-label={timerPaused ? 'Resume timer' : 'Pause timer'}
                  >
                    {timerPaused ? '▶' : '⏸'}
                  </button>
                </>
              )}
              <button
                className="session-timer-toggle"
                type="button"
                onClick={() => setShowTimer(v => !v)}
                title={
                  showTimer
                    ? 'Hide the session timer — removes the clock from the bar (elapsed time is kept; show again to resume display).'
                    : 'Show the session timer — displays elapsed practice time and pause controls next to this icon.'
                }
                aria-label={showTimer ? 'Hide session timer' : 'Show session timer'}
              >
                ⏱
              </button>
            </div>

            <select
              className="shruti-select"
              value={saHz}
              onChange={e => onShrutiChange(Number(e.target.value))}
              title="Reference Sa (shruti / kattai). Sets the fundamental pitch for the graph, tanpura drone, and exercises — match your physical tambura or instrument tuning."
            >
              {SHRUTI_LIST.map(s => (
                <option key={s.hz} value={s.hz}>
                  {s.kattai} ({s.western}) — {s.typicalUser}
                </option>
              ))}
            </select>

            <div
              className="octave-stepper"
              title="Transpose the app’s reference Sa by whole octaves (graph, drone, exercises). Use when your voice or instrument sits above or below the default range."
            >
              <button
                className="octave-step-btn"
                type="button"
                onClick={() => onOctaveShiftChange(octaveShift - 1)}
                disabled={octaveShift <= -2}
                aria-label="Shift octave down"
                title="Shift reference down one octave (lower all pitches by 8va). Disabled at the lowest allowed shift."
              >−8va</button>
              <span
                className="octave-value"
                title="Current octave shift relative to the chosen shruti. 0 means no shift; ±1 is one octave up or down."
              >
                {octaveShift === 0 ? 'Oct' : octaveShift > 0 ? `+${octaveShift} oct` : `${octaveShift} oct`}
              </span>
              <button
                className="octave-step-btn"
                type="button"
                onClick={() => onOctaveShiftChange(octaveShift + 1)}
                disabled={octaveShift >= 2}
                aria-label="Shift octave up"
                title="Shift reference up one octave (raise all pitches by 8va). Disabled at the highest allowed shift."
              >+8va</button>
            </div>
          </>
        }
      />

      <div className="graph-container">
        <div className="graph-left" ref={graphLeftRef}>
          <PitchGraph
            saHz={effectiveSaHz}
            paused={!listening}
            onMount={onGraphMount}
            allowedSwaras={exerciseActive ? allowedSwaras : null}
            expectedSwara={exerciseActive ? expectedSwara : null}
            showHoldAnnotations={showHoldAnnotations}
          />
        </div>

        <div
          className={'sidebar-divider ' + (sidebarDragging ? 'dragging' : '')}
          title="Drag horizontally to resize the exercise panel — wider gives more notation space; narrower gives more room to the pitch graph."
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
          loopExercise={loopExercise}
          onToggleLoop={() => setLoopExercise(v => !v)}
          saHz={effectiveSaHz}
          onReferencePlaybackStart={onReferencePlaybackStart}
          selectedRagaId={selectedRagaId}
          selectedExerciseId={selectedExerciseId}
          ragaOptions={ragaOptions}
          exerciseOptions={exerciseOptions}
          ragaTalaLabel={selectedRagaTalaLabel}
          panelWidthPx={sidebarWidth}
          coachEnabled={exerciseActive}
          onAskCoach={askCoach}
          coachLoading={coachLoading}
          coachError={coachError}
          coachHistory={coachHistory}
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
            style={{ '--note-color': centsColor(note.cents) } as CSSProperties}
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

    {showCamera &&
      createPortal(
        <div className="camera-pip camera-pip-portal" style={pipPortalStyle}>
          <div
            className="camera-pip-handle"
            onPointerDown={startPipDrag}
            title="Drag to move the camera window — position it so it does not cover the pitch trace you care about."
          >
            <span>📷 Camera</span>
            <button
              type="button"
              className="camera-pip-close"
              onClick={() => setShowCamera(false)}
              title="Close the posture camera — same as turning off 📷 Cam in the toolbar; you can reopen from there."
            >
              ✕
            </button>
          </div>
          <CameraObservationLab
            embedded
            embeddedPip
            onHome={() => setShowCamera(false)}
            onClose={() => setShowCamera(false)}
          />
          <div
            className="camera-pip-resize"
            onPointerDown={startPipResize}
            title="Drag to resize the camera panel — pull diagonally to change width and height."
          />
        </div>,
        document.body,
      )}
    </>
  )
}

