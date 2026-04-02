import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './ExercisePanel.css'
import { EarTrainerAudioEngine, type TonePreset } from './audio/earTrainerAudioEngine'
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

  /** Shruti Sa in Hz — used for reference playback of the expected note. */
  saHz: number

  /**
   * Fired when reference playback starts so the parent can ignore mic input briefly
   * (speaker → mic otherwise matches the exercise target and advances the step).
   */
  onReferencePlaybackStart?: (suppressExerciseMatchingMs: number) => void

  // Optional fixed width override (used for draggable divider resizing).
  panelWidthPx?: number
}

/** Playback length passed to the synth — keep in sync with `playExpectedNote`. */
const REFERENCE_NOTE_DURATION_SEC = 1.0

const SWARA_TO_NOTATION: Record<string, string> = {
  Sa: 'S',
  R1: 'R₁',
  G3: 'G₃',
  M1: 'M₁',
  Pa: 'P',
  D1: 'D₁',
  N3: 'N₃',
}

const TARA_NOTATION: Record<string, string> = {
  R1: 'Ṙ',
  G3: 'Ġ',
  M1: 'Ṁ',
  Pa: 'Ṗ',
}

const MANDRA_NOTATION: Record<string, string> = {
  Sa: 'Ṣ',
  R1: 'Ṛ',
  G3: 'Ġ',
  M1: 'Ṃ',
  Pa: 'Ṗ',
  D1: 'Ḍ',
  N3: 'Ṇ',
}

function notationOf(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return 'Ṡ'
  if (step.octave >= 1)  return TARA_NOTATION[step.swara]   ?? step.swara
  if (step.octave <= -1) return MANDRA_NOTATION[step.swara] ?? step.swara
  return SWARA_TO_NOTATION[step.swara] ?? step.swara
}

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
  saHz,
  onReferencePlaybackStart,
  panelWidthPx,
}: ExercisePanelProps) {
  const audioRef = useRef<EarTrainerAudioEngine | null>(null)
  const playsThisStepRef = useRef(0)
  const sessionPlaysRef = useRef(0)
  const [referenceHint, setReferenceHint] = useState<string | null>(null)
  const [tonePreset, setTonePreset] = useState<TonePreset>('piano')

  // ── Auto-play state ───────────────────────────────────────────────────
  const [tempo, setTempo] = useState(60)
  const [autoPlayActive, setAutoPlayActive] = useState(false)
  const [autoPlayIndex, setAutoPlayIndex] = useState(-1)
  const autoPlayCancelRef = useRef(false)

  const flatSequenceForPlayback = useMemo(() => deriveFlatSequence(phrases), [phrases])

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

    const noteDurationSec = 60 / tempo

    for (let i = 0; i < flatSequenceForPlayback.length; i++) {
      if (autoPlayCancelRef.current) break
      setAutoPlayIndex(i)
      const hz = sequenceStepHz(flatSequenceForPlayback[i], saHz)
      await audioRef.current.playNote(hz, noteDurationSec * 0.85, tonePreset)
      await new Promise<void>(resolve => window.setTimeout(resolve, Math.ceil(noteDurationSec * 1000)))
    }

    if (!autoPlayCancelRef.current) {
      setAutoPlayActive(false)
      setAutoPlayIndex(-1)
    }
  }, [flatSequenceForPlayback, saHz, tempo, tonePreset])

  // Cancel auto-play when the exercise/raga selection changes.
  useEffect(() => {
    stopAutoPlay()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRagaId, selectedExerciseId])

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

  const playExpectedNote = useCallback(async () => {
    if (!exerciseActive || !expectedStep) return

    if (!audioRef.current) audioRef.current = new EarTrainerAudioEngine()

    playsThisStepRef.current += 1
    sessionPlaysRef.current += 1

    // Block exercise matching before audio: mic can pick up the speaker immediately.
    const suppressMs = Math.ceil(REFERENCE_NOTE_DURATION_SEC * 1000 + 850)
    onReferencePlaybackStart?.(suppressMs)

    const hz = sequenceStepHz(expectedStep, saHz)
    await audioRef.current.playNote(hz, REFERENCE_NOTE_DURATION_SEC, tonePreset)

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
  }, [exerciseActive, expectedStep, onReferencePlaybackStart, saHz, tonePreset, totalSteps])

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
              >
                {ragaOptions.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="exercise-select-block">
              <div className="exercise-select-label">Exercise</div>
              <select
                className="exercise-select"
                value={selectedExerciseId}
                onChange={e => onExerciseChange(e.target.value)}
              >
                {exerciseOptions.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Tempo + auto-play ── */}
          {!exerciseActive && !autoPlayActive ? (
            <div className="exercise-autoplay-row">
              <div className="exercise-select-block">
                <div className="exercise-select-label">Tempo</div>
                <div className="exercise-tempo-stepper">
                  <button
                    className="exercise-tempo-step-btn"
                    type="button"
                    onClick={() => setTempo(t => Math.max(30, t - 4))}
                    aria-label="Decrease tempo"
                  >−</button>
                  <span className="exercise-tempo-value">
                    {tempo} <span className="exercise-tempo-unit">BPM</span>
                  </span>
                  <button
                    className="exercise-tempo-step-btn"
                    type="button"
                    onClick={() => setTempo(t => Math.min(240, t + 4))}
                    aria-label="Increase tempo"
                  >+</button>
                </div>
              </div>
              <button
                className="exercise-btn exercise-btn-autoplay"
                type="button"
                onClick={() => void startAutoPlay()}
                disabled={!canStart}
                title={!canStart ? 'Select a raga and exercise first' : 'Play each note automatically'}
              >
                Start
              </button>
            </div>
          ) : null}

          {/* ── Sing & Test / Stop ── */}
          {!exerciseActive && !autoPlayActive ? (
            <button
              className="exercise-btn exercise-btn-sing"
              type="button"
              onClick={onStart}
              disabled={!canStart}
              title={!canStart ? 'Select a raga and exercise first' : 'Sing along and test your ear'}
            >
              Sing &amp; Test
            </button>
          ) : exerciseActive ? (
            <button className="exercise-btn exercise-btn-stop" type="button" onClick={onStop}>
              Stop
            </button>
          ) : autoPlayActive ? (
            <button className="exercise-btn exercise-btn-stop" type="button" onClick={stopAutoPlay}>
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
              {expectedStep ? notationOf(expectedStep) : '—'}
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
                title="Plays the expected swara at your selected shruti (optional aid — don’t lean on it for every note)."
              >
                Play note
              </button>
              <select
                className="exercise-tone-select"
                value={tonePreset}
                onChange={e => setTonePreset(e.target.value as TonePreset)}
                title="Sound for the reference note"
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
                      return (
                        <span key={gIdx + ':' + sIdx} className={tileClass.trim()}>
                          {notationOf(step)}
                        </span>
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
    </aside>
  )
}

