import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './ExercisePanel.css'
import CustomMelodyEditor from './CustomMelodyEditor'
import { EarTrainerAudioEngine, type TonePreset } from './audio/earTrainerAudioEngine'
import { notationOfDisplay } from './carnaticNotation'
import PaltaExerciseEditor from './PaltaExerciseEditor'
import type { PaltaConfig, PaltaPhraseStats } from './paltaConfig'
import { deriveFlatSequence, sequenceStepHz, type ExercisePhrase, type SequenceStep } from './exerciseModel'

export type Option = { id: string; label: string }

export type ExercisePanelProps = {
  selectedRagaId: string
  selectedExerciseId: string
  ragaOptions: Option[]
  exerciseOptions: Option[]
  onRagaChange: (id: string) => void
  onExerciseChange: (id: string) => void

  ragaTalaLabel: string

  expectedIndex: number
  totalSteps: number
  phrases: ExercisePhrase[]
  expectedStep: SequenceStep | null
  exerciseActive: boolean
  canStart: boolean
  onStart: () => void
  onStop: () => void
  /** When true the exercise restarts from step 1 after the last note is matched. */
  loopExercise?: boolean
  onToggleLoop?: () => void

  /** Shruti Sa in Hz — used for reference playback of the expected note. */
  saHz: number

  /**
   * Fired when reference playback starts so the parent can ignore mic input briefly
   * (speaker → mic otherwise matches the exercise target and advances the step).
   */
  onReferencePlaybackStart?: (suppressExerciseMatchingMs: number) => void

  // Optional fixed width override (used for draggable divider resizing).
  panelWidthPx?: number

  /** Text format: space-separated swaras; | = bar after previous note (see CustomMelodyEditor hint). */
  showCustomMelodyEditor?: boolean
  customMelodyText?: string
  onCustomMelodyTextChange?: (text: string) => void
  customMelodyParseError?: string | null
  /** When true, only one exercise applies (Custom Melody raga) — hide the Exercise dropdown. */
  hideExerciseSelect?: boolean

  showPaltaEditor?: boolean
  paltaConfig?: PaltaConfig | null
  onPaltaConfigChange?: (c: PaltaConfig) => void
  paltaScaleRagaOptions?: { id: string; label: string }[]
  paltaScaleDegreeCount?: number
  paltaPhraseStats?: PaltaPhraseStats | null

  /** AI vocal coach (Carnatic Training sidebar) — Phase 2 */
  coachEnabled?: boolean
  onAskCoach?: () => void
  coachLoading?: boolean
  coachError?: string | null
  coachHistory?: { text: string; at: number; mock?: boolean }[]
}

/** Playback length passed to the synth — keep in sync with `playExpectedNote`. */
const REFERENCE_NOTE_DURATION_SEC = 2.5

export default function ExercisePanel({
  selectedRagaId,
  selectedExerciseId,
  ragaOptions,
  exerciseOptions,
  onRagaChange,
  onExerciseChange,
  ragaTalaLabel,
  expectedIndex,
  totalSteps,
  phrases,
  expectedStep,
  exerciseActive,
  canStart,
  onStart,
  onStop,
  loopExercise = false,
  onToggleLoop,
  saHz,
  onReferencePlaybackStart,
  panelWidthPx,
  coachEnabled = false,
  onAskCoach,
  coachLoading = false,
  coachError = null,
  coachHistory = [],
  showCustomMelodyEditor = false,
  customMelodyText = '',
  onCustomMelodyTextChange,
  customMelodyParseError = null,
  hideExerciseSelect = false,
  showPaltaEditor = false,
  paltaConfig = null,
  onPaltaConfigChange,
  paltaScaleRagaOptions = [],
  paltaScaleDegreeCount = 0,
  paltaPhraseStats = null,
}: ExercisePanelProps) {
  const audioRef = useRef<EarTrainerAudioEngine | null>(null)
  const referencePlayInFlightRef = useRef(false)
  const playsThisStepRef = useRef(0)
  const sessionPlaysRef = useRef(0)
  const [referenceHint, setReferenceHint] = useState<string | null>(null)
  const [tonePreset, setTonePreset] = useState<TonePreset>('piano')

  // ── Auto-play state ───────────────────────────────────────────────────
  const [tempo, setTempo] = useState(60)
  /** Draft BPM while typing; kept in sync with `tempo` when steppers change. */
  const [tempoInput, setTempoInput] = useState('60')
  const [autoPlayActive, setAutoPlayActive] = useState(false)
  const [autoPlayIndex, setAutoPlayIndex] = useState(-1)
  const autoPlayCancelRef = useRef(false)
  // Ref so the async auto-play loop always reads the current loop preference
  // without needing to be recreated when the prop changes.
  const loopExerciseRef = useRef(loopExercise)
  useEffect(() => { loopExerciseRef.current = loopExercise }, [loopExercise])

  useEffect(() => {
    setTempoInput(String(tempo))
  }, [tempo])

  const flatSequenceForPlayback = useMemo(() => deriveFlatSequence(phrases), [phrases])

  function resolveBpmFromField(raw: string, fallback: number): number {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') return fallback
    const v = parseInt(digits, 10)
    if (!Number.isFinite(v)) return fallback
    return Math.max(20, Math.min(360, v))
  }

  const commitTempoInput = useCallback((): number => {
    const next = resolveBpmFromField(tempoInput, tempo)
    setTempo(next)
    setTempoInput(String(next))
    return next
  }, [tempoInput, tempo])

  const stopAutoPlay = useCallback(() => {
    autoPlayCancelRef.current = true
    setAutoPlayActive(false)
    setAutoPlayIndex(-1)
    audioRef.current?.stop()
  }, [])

  const startAutoPlay = useCallback(async () => {
    if (flatSequenceForPlayback.length === 0) return
    if (!audioRef.current) audioRef.current = new EarTrainerAudioEngine()
    await audioRef.current.ensureStarted()

    autoPlayCancelRef.current = false
    setAutoPlayActive(true)

    const bpm = commitTempoInput()
    const noteDurationSec = 60 / bpm
    const beatMs = Math.ceil(noteDurationSec * 1000)

    do {
      for (let i = 0; i < flatSequenceForPlayback.length; i++) {
        if (autoPlayCancelRef.current) break
        setAutoPlayIndex(i)
        const hz = sequenceStepHz(flatSequenceForPlayback[i], saHz)
        await audioRef.current.playNote(hz, noteDurationSec * 0.85, tonePreset)
        await new Promise<void>(resolve => window.setTimeout(resolve, beatMs))
      }
      // Brief 2-beat pause between loops so the restart is audible
      if (!autoPlayCancelRef.current && loopExerciseRef.current) {
        setAutoPlayIndex(-1)
        await new Promise<void>(resolve => window.setTimeout(resolve, beatMs * 2))
      }
    } while (!autoPlayCancelRef.current && loopExerciseRef.current)

    if (!autoPlayCancelRef.current) {
      setAutoPlayActive(false)
      setAutoPlayIndex(-1)
    }
  }, [flatSequenceForPlayback, saHz, commitTempoInput, tonePreset])

  // Cancel auto-play when the exercise/raga selection or sequence content changes.
  useEffect(() => {
    stopAutoPlay()
  }, [selectedRagaId, selectedExerciseId, phrases, stopAutoPlay])

  useEffect(() => {
    return () => {
      autoPlayCancelRef.current = true
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    sessionPlaysRef.current = 0
    playsThisStepRef.current = 0
    setReferenceHint(null)
  }, [exerciseActive])

  useEffect(() => {
    playsThisStepRef.current = 0
    setReferenceHint(null)
  }, [expectedIndex])

  const playReferenceForStep = useCallback(
    async (step: SequenceStep, countHints: boolean) => {
      if (referencePlayInFlightRef.current) return
      referencePlayInFlightRef.current = true
      try {
        stopAutoPlay()

        if (!audioRef.current) audioRef.current = new EarTrainerAudioEngine()

        // Block exercise matching before audio: mic can pick up the speaker immediately.
        const suppressMs = Math.ceil(REFERENCE_NOTE_DURATION_SEC * 1000 + 850)
        onReferencePlaybackStart?.(suppressMs)

        const hz = sequenceStepHz(step, saHz)
        await audioRef.current.playNote(hz, REFERENCE_NOTE_DURATION_SEC, tonePreset)

        if (countHints) {
          playsThisStepRef.current += 1
          sessionPlaysRef.current += 1
          const perStep = playsThisStepRef.current
          const session = sessionPlaysRef.current
          const sessionThreshold = Math.max(12, totalSteps * 2)

          let hint: string | null = null
          if (perStep >= 6) {
            hint =
              'You’ve replayed the reference many times on this note — try once without it, even if it’s rough.'
          } else if (perStep >= 3) {
            hint = 'Try to match from memory before playing the tone again.'
          } else if (session >= sessionThreshold) {
            hint =
              'You’ve used the reference a lot this run — lean on your ear for the next few notes if you can.'
          }

          setReferenceHint(hint)
        }
      } finally {
        referencePlayInFlightRef.current = false
      }
    },
    [onReferencePlaybackStart, saHz, tonePreset, totalSteps, stopAutoPlay],
  )

  const playExpectedNote = useCallback(async () => {
    if (!exerciseActive || !expectedStep) return
    await playReferenceForStep(expectedStep, true)
  }, [exerciseActive, expectedStep, playReferenceForStep])

  const ragaLabel =
    ragaOptions.find(r => r.id === selectedRagaId)?.label ??
    (selectedRagaId ? selectedRagaId : '')
  const exerciseLabel =
    exerciseOptions.find(e => e.id === selectedExerciseId)?.label ?? selectedExerciseId

  return (
    <aside className="exercise-panel" style={panelWidthPx ? { width: panelWidthPx } : undefined}>
      <div className="exercise-head">
        <div className="exercise-title">
          <div className="exercise-kicker">{ragaLabel}</div>
          {ragaTalaLabel ? <div className="exercise-tala">{ragaTalaLabel}</div> : null}
          <div className="exercise-name">{exerciseLabel}</div>
        </div>

        <div className="exercise-actions">
          <div className="exercise-selects">
            <div className="exercise-select-block">
              <div className="exercise-select-label">Raga</div>
              <select
                className="exercise-select"
                value={selectedRagaId}
                onChange={e => onRagaChange(e.target.value)}
                title="Choose a raga — loads its scale and the list of exercises available for practice."
              >
                {ragaOptions.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {!hideExerciseSelect ? (
              <div className="exercise-select-block">
                <div className="exercise-select-label">Exercise</div>
                <select
                  className="exercise-select"
                  value={selectedExerciseId}
                  onChange={e => onExerciseChange(e.target.value)}
                  title="Choose an exercise — defines the sequence of swaras you will sing or hear in Sing & Test / auto-play."
                >
                  {exerciseOptions.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {showCustomMelodyEditor && onCustomMelodyTextChange ? (
            <CustomMelodyEditor
              value={customMelodyText}
              onChange={onCustomMelodyTextChange}
              parseError={customMelodyParseError}
              disabled={exerciseActive || autoPlayActive}
            />
          ) : null}

          {showPaltaEditor && paltaConfig && onPaltaConfigChange ? (
            <PaltaExerciseEditor
              value={paltaConfig}
              onChange={onPaltaConfigChange}
              scaleRagaOptions={paltaScaleRagaOptions}
              scaleDegreeCount={paltaScaleDegreeCount}
              phraseStats={paltaPhraseStats}
              disabled={exerciseActive || autoPlayActive}
            />
          ) : null}

          {/* ── Tempo + auto-play ── */}
          {!exerciseActive && !autoPlayActive ? (
            <div className="exercise-autoplay-row">
              <div className="exercise-select-block">
                <div className="exercise-select-label">Tempo</div>
                <div className="exercise-tempo-stepper">
                  <button
                    className="exercise-tempo-step-btn"
                    type="button"
                    onClick={e =>
                      setTempo(t => Math.max(20, t - (e.shiftKey ? 20 : 4)))
                    }
                    aria-label="Decrease tempo"
                    title="Slow down auto-play (4 BPM per click, 20 BPM with Shift). Minimum 20 BPM."
                  >−</button>
                  <div
                    className="exercise-tempo-value"
                    title="Type a BPM (20–360) or use − / +. Enter or leaving the field applies typed values."
                  >
                    <input
                      className="exercise-tempo-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label="Tempo in beats per minute"
                      value={tempoInput}
                      onChange={e => setTempoInput(e.target.value)}
                      onBlur={commitTempoInput}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          commitTempoInput()
                          e.currentTarget.blur()
                        }
                      }}
                    />
                    <span className="exercise-tempo-unit">BPM</span>
                  </div>
                  <button
                    className="exercise-tempo-step-btn"
                    type="button"
                    onClick={e =>
                      setTempo(t => Math.min(360, t + (e.shiftKey ? 20 : 4)))
                    }
                    aria-label="Increase tempo"
                    title="Speed up auto-play (4 BPM per click, 20 BPM with Shift). Maximum 360 BPM."
                  >+</button>
                </div>
              </div>
              <button
                className="exercise-btn exercise-btn-autoplay"
                type="button"
                onClick={() => void startAutoPlay()}
                disabled={!canStart}
                title={
                  !canStart
                    ? 'Pick a raga and an exercise from the menus above before starting auto-play.'
                    : 'Auto-play — the app advances through each note in the exercise at the chosen tempo (listen-only run-through).'
                }
              >
                Start
              </button>
            </div>
          ) : null}

          {/* ── Sing & Test / Stop + Loop toggle ── */}
          {!exerciseActive && !autoPlayActive ? (
            <div className="exercise-sing-row">
              <button
                type="button"
                className={`exercise-loop-btn${loopExercise ? ' active' : ''}`}
                onClick={onToggleLoop}
                title={
                  loopExercise
                    ? 'Loop is on — after the last swara, the exercise starts again from the beginning. Click to turn off.'
                    : 'Loop is off — the exercise ends after one full pass. Click to repeat the sequence automatically.'
                }
                aria-pressed={loopExercise}
              >
                ↺ {loopExercise ? 'Loop on' : 'Loop'}
              </button>
              <button
                className="exercise-btn exercise-btn-sing"
                type="button"
                onClick={onStart}
                disabled={!canStart}
                title={
                  !canStart
                    ? 'Pick a raga and an exercise from the menus above before starting.'
                    : 'Sing & Test — you sing each expected swara; the app listens and advances when your pitch matches (with optional loop).'
                }
              >
                Sing &amp; Test
              </button>
            </div>
          ) : exerciseActive ? (
            <div className="exercise-sing-row">
              <button
                type="button"
                className={`exercise-loop-btn${loopExercise ? ' active' : ''}`}
                onClick={onToggleLoop}
                title={
                  loopExercise
                    ? 'Loop is on — after the last note the exercise restarts. Click to stop after one pass next time.'
                    : 'Loop is off — exercise stops at the end. Click to repeat the sequence when you finish.'
                }
                aria-pressed={loopExercise}
              >
                ↺ {loopExercise ? 'Loop on' : 'Loop'}
              </button>
              <button
                className="exercise-btn exercise-btn-stop"
                type="button"
                onClick={onStop}
                title="Stop Sing & Test — ends the exercise, clears the expected-note state, and returns to ready."
              >
                Stop
              </button>
            </div>
          ) : autoPlayActive ? (
            <button
              className="exercise-btn exercise-btn-stop"
              type="button"
              onClick={stopAutoPlay}
              title="Stop auto-play — halts the automatic note sequence and returns to ready."
            >
              Stop
            </button>
          ) : null}
        </div>
      </div>

      <div className="exercise-meta">
        <div className="exercise-progress">
          Expected:{' '}
          {exerciseActive ? (
            <span className="exercise-next">
              {expectedStep ? notationOfDisplay(expectedStep) : '—'}
            </span>
          ) : (
            <span className="exercise-next exercise-next-idle">—</span>
          )}
        </div>

        <div className="exercise-progress-sub">
          {exerciseActive ? `${expectedIndex + 1} / ${totalSteps}` : 'Ready'}
        </div>

        {exerciseActive && expectedStep ? (
          <div className="exercise-reference-row">
            <div className="exercise-reference-controls">
              <button
                className="exercise-btn exercise-btn-reference"
                type="button"
                onClick={() => void playExpectedNote()}
                title="Hear the expected swara — plays a short reference tone at your current shruti. Use sparingly so you still train your internal pitch."
              >
                Play note
              </button>
              <select
                className="exercise-tone-select"
                value={tonePreset}
                onChange={e => setTonePreset(e.target.value as TonePreset)}
                title="Timbre for the reference tone. Piano uses Salamander samples at exact JI Hz; sine is a pure tone."
              >
                <option value="piano">Piano</option>
                <option value="sine">Sine</option>
              </select>
            </div>
            {referenceHint ? <p className="exercise-reference-hint">{referenceHint}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="exercise-notation">
        {phrases.map((phrase, phraseIdx) => {
          // Compute prefix step count so expectedIndex mapping is correct.
          let flatCursor = 0
          for (let i = 0; i < phraseIdx; i++) {
            flatCursor += phrases[i].groups.reduce((acc, g) => acc + g.steps.length, 0)
          }

          // Split this phrase's groups into visual lines using lineBreak.
          const lines: typeof phrase.groups[] = []
          let currentLine: typeof phrase.groups = []
          phrase.groups.forEach((g, idx) => {
            currentLine.push(g)
            if (g.lineBreak || idx === phrase.groups.length - 1) {
              lines.push(currentLine)
              currentLine = []
            }
          })

          return (
            <div key={phraseIdx}>
              {lines.map((lineGroups, lineIdx) => (
                <div
                  key={lineIdx}
                  className={
                    'exercise-line ' +
                    (phrase.label === 'descending' ? 'exercise-line-desc' : '')
                  }
                >
                  {lineGroups.map((group, gIdx) => {
                    const groupStart = flatCursor

                    const tiles = group.steps.map((step, sIdx) => {
                      const tileFlatIndex = groupStart + sIdx
                      const isExpected = exerciseActive && tileFlatIndex === expectedIndex
                      const isAutoPlaying = autoPlayActive && tileFlatIndex === autoPlayIndex
                      const tileClass =
                        'swara-tile ' +
                        (isExpected ? 'expected ' : '') +
                        (isAutoPlaying ? 'autoplay ' : '')
                      const label = notationOfDisplay(step)
                      return (
                        <button
                          key={gIdx + ':' + sIdx}
                          type="button"
                          className={tileClass.trim() + ' swara-tile-btn'}
                          aria-label={
                            isExpected
                              ? `Current step — play reference: ${label}`
                              : `Play ${label} at your shruti`
                          }
                          title="Play this swara. Same as “Play note” for the green (expected) tile during Sing & Test."
                          onClick={() => void playReferenceForStep(step, isExpected)}
                        >
                          {label}
                        </button>
                      )
                    })

                    flatCursor += group.steps.length

                    return (
                      <span key={gIdx} className="exercise-group">
                        {tiles}
                        {group.beatBoundary ? <span className="beat-sep" /> : null}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {coachEnabled && onAskCoach ? (
        <div className="coach-section">
          <div className="coach-section-head">
            <span className="coach-section-title">AI Coach</span>
          </div>
          <button
            type="button"
            className="exercise-btn coach-ask-btn"
            onClick={onAskCoach}
            disabled={coachLoading}
            title="Send the last several seconds from the practice mic to your local coach for brief feedback (requires the Python backend)."
          >
            {coachLoading ? 'Coach is thinking…' : 'Ask Coach'}
          </button>
          {coachError ? <p className="coach-error">{coachError}</p> : null}
          {coachHistory.length === 0 && !coachLoading && !coachError ? (
            <p className="coach-hint">
              After you sing, tap Ask Coach for feedback on the last few seconds of audio (local
              analysis).
            </p>
          ) : null}
          {coachHistory.length > 0 ? (
            <ul className="coach-history" aria-label="Coach responses this session">
              {[...coachHistory].reverse().map((entry, idx) => (
                <li key={entry.at + '-' + idx} className="coach-card">
                  <div className="coach-card-meta">
                    <time dateTime={new Date(entry.at).toISOString()}>
                      {new Date(entry.at).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </time>
                    {entry.mock ? <span className="coach-mock-badge">Mock</span> : null}
                  </div>
                  <p className="coach-card-text">{entry.text}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}

