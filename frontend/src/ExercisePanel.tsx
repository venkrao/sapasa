import './ExercisePanel.css'
import type { ExercisePhrase, SequenceStep } from './exerciseModel'

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

  // Optional fixed width override (used for draggable divider resizing).
  panelWidthPx?: number
}

const SWARA_TO_NOTATION: Record<string, string> = {
  Sa: 'S',
  R1: 'R₁',
  G3: 'G₃',
  M1: 'M₁',
  Pa: 'P',
  D1: 'D₁',
  N3: 'N₃',
}

function notationOf(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return 'Ṡ'
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
  panelWidthPx,
}: ExercisePanelProps) {
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

          {!exerciseActive ? (
            <button
              className="exercise-btn"
              type="button"
              onClick={onStart}
              disabled={!canStart}
              title={!canStart ? 'Select a raga and exercise first' : 'Start exercise'}
            >
              Start
            </button>
          ) : (
            <button className="exercise-btn exercise-btn-stop" type="button" onClick={onStop}>
              Stop
            </button>
          )}
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
      </div>

      <div className="exercise-notation">
        {phrases.map((phrase, phraseIdx) => {
          // Compute prefix step count so expectedIndex mapping is correct.
          let flatCursor = 0
          for (let i = 0; i < phraseIdx; i++) {
            flatCursor += phrases[i].groups.reduce((acc, g) => acc + g.steps.length, 0)
          }

          return (
            <div
              key={phraseIdx}
              className={
                'exercise-line ' + (phrase.label === 'descending' ? 'exercise-line-desc' : '')
              }
            >
              {phrase.groups.map((group, gIdx) => {
                const groupStart = flatCursor

                const tiles = group.steps.map((step, sIdx) => {
                  const tileFlatIndex = groupStart + sIdx
                  const isExpected = exerciseActive && tileFlatIndex === expectedIndex
                  return (
                    <span
                      key={gIdx + ':' + sIdx}
                      className={'swara-tile ' + (isExpected ? 'expected' : '')}
                    >
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
          )
        })}
      </div>
    </aside>
  )
}

