import type { PaltaConfig } from './paltaConfig'
import {
  clampPaltaOffsetRange,
  clampPaltaRootRange,
  effectivePaltaRootBounds,
  randomOffsetsArray,
} from './paltaGenerator'

export type PaltaScaleOption = { id: string; label: string }

type Props = {
  value: PaltaConfig
  onChange: (next: PaltaConfig) => void
  scaleRagaOptions: PaltaScaleOption[]
  /** Madhya-scale degree count (for clamp hints). */
  scaleDegreeCount: number
  disabled?: boolean
}

const LENGTH_PRESETS = [4, 8, 16, 32] as const

const TIP_SCALE =
  'Which raga’s ascending line (Sa up to the note before high Sa) defines the steps you’ll walk on.'

const TIP_PATTERN_LEN =
  'How many numbers are in one “stamp” of the pattern before the starting note moves. Bigger = longer phrases each time.'

const TIP_OFFSET_RANGE =
  'When you randomize, each number is picked between these two values. They measure steps along the scale from the current starting note (0 = same note; bigger = higher on the scale).'

const TIP_ROOT_SWEEP =
  'The palta repeats your pattern many times, each time starting one step higher on the scale until it reaches the end. “Start” and “End” are which starting notes to use: 0 is usually Sa, higher numbers move up the scale. Leave both at a large value (like 99) to use the full scale from bottom to top.'

const TIP_MAX_NOTES =
  'Roughly how many separate notes you want in the full line (up, plus back down if that’s on). 0 means no limit. If you pick a smaller number, the line stops earlier—from the top downward—so you get a shorter practice round.'

const TIP_DESCENDING =
  'After walking up the scale, also walk the same pattern back down to the starting region.'

const TIP_RANDOMIZE =
  'Roll a fresh set of random jumps, using your pattern length and min/max jump settings.'

export default function PaltaExerciseEditor({
  value,
  onChange,
  scaleRagaOptions,
  scaleDegreeCount,
  disabled = false,
}: Props) {
  const n = scaleDegreeCount
  const { min: offMin, max: offMax } =
    n > 0 ? clampPaltaOffsetRange(value.offsetMin, value.offsetMax, n) : { min: 0, max: 0 }
  const roots = n > 0 ? clampPaltaRootRange(value.rootLow, value.rootHigh, n) : { low: 0, high: 0 }
  const effective =
    n > 0
      ? effectivePaltaRootBounds({
          scaleLen: n,
          rootLow: value.rootLow,
          rootHigh: value.rootHigh,
          patternLength: value.patternLength,
          includeDescending: value.includeDescending,
          wholePhraseMaxSteps: value.wholePhraseMaxSteps,
        })
      : { low: 0, high: 0, totalSteps: 0 }

  function patch(p: Partial<PaltaConfig>) {
    onChange({ ...value, ...p })
  }

  function randomizeOffsets() {
    if (n <= 0) return
    const { min, max } = clampPaltaOffsetRange(value.offsetMin, value.offsetMax, n)
    patch({
      offsets: randomOffsetsArray(value.patternLength, min, max),
    })
  }

  return (
    <div className="custom-melody-editor palta-editor">
      <div className="custom-melody-editor-head">
        <div className="custom-melody-editor-title">Palta</div>
        <p className="custom-melody-editor-hint">
          Build a short shape of jumps, then move that shape step‑by‑step up the scale (and optionally
          back down). Choose a scale and sizes below, then tap <strong>Randomize pattern</strong> for a
          new shape. Hover labels marked with “?” for more detail.
        </p>
      </div>

      <div className="palta-field-grid">
        <label className="palta-field palta-field-tipped" title={TIP_SCALE}>
          <span className="palta-field-label">
            Scale to use <span className="palta-tip-mark" aria-hidden="true">?</span>
          </span>
          <select
            className="exercise-select palta-select-wide"
            value={value.scaleRagaId}
            disabled={disabled}
            onChange={e => patch({ scaleRagaId: e.target.value })}
            title={TIP_SCALE}
          >
            {scaleRagaOptions.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="palta-field palta-field-tipped" title={TIP_PATTERN_LEN}>
          <span className="palta-field-label">
            Notes per pattern <span className="palta-tip-mark" aria-hidden="true">?</span>
          </span>
          <div className="palta-inline-row">
            <input
              className="palta-num-input"
              type="number"
              min={1}
              max={64}
              value={value.patternLength}
              disabled={disabled}
              onChange={e => {
                const v = Number(e.target.value)
                patch({
                  patternLength: Number.isFinite(v)
                    ? Math.max(1, Math.min(64, Math.round(v)))
                    : value.patternLength,
                })
              }}
              title={TIP_PATTERN_LEN}
            />
            <span className="palta-presets" aria-label="Common lengths">
              {LENGTH_PRESETS.map(len => (
                <button
                  key={len}
                  type="button"
                  className="exercise-btn custom-melody-tool-btn palta-preset-btn"
                  disabled={disabled}
                  onClick={() => patch({ patternLength: len })}
                  title={`Use ${len} notes in each pattern`}
                >
                  {len}
                </button>
              ))}
            </span>
          </div>
        </label>

        <label className="palta-field palta-field-tipped" title={TIP_OFFSET_RANGE}>
          <span className="palta-field-label">
            Random jump range (min → max) <span className="palta-tip-mark" aria-hidden="true">?</span>
          </span>
          <div className="palta-inline-row">
            <input
              className="palta-num-input"
              type="number"
              value={value.offsetMin}
              disabled={disabled}
              onChange={e => patch({ offsetMin: Number(e.target.value) })}
              title="Smallest jump (in scale steps from the current starting note)."
            />
            <input
              className="palta-num-input"
              type="number"
              value={value.offsetMax}
              disabled={disabled}
              onChange={e => patch({ offsetMax: Number(e.target.value) })}
              title={
                n > 0
                  ? `Largest jump. Put ${n} or more to allow jumps up to the top of this scale (${n} steps).`
                  : 'Largest jump.'
              }
            />
          </div>
          {n > 0 ? (
            <span className="palta-field-hint">
              Random picks stay between {offMin} and {offMax} (this scale has {n} steps)
            </span>
          ) : null}
        </label>

        <label className="palta-field palta-field-tipped" title={TIP_ROOT_SWEEP}>
          <span className="palta-field-label">
            Where the walk runs (start → end) <span className="palta-tip-mark" aria-hidden="true">?</span>
          </span>
          <div className="palta-inline-row">
            <input
              className="palta-num-input"
              type="number"
              value={value.rootLow}
              disabled={disabled}
              onChange={e => patch({ rootLow: Number(e.target.value) })}
              title='First starting note, as a step on the scale (0 is usually Sa). Use 99 for "from the bottom".'
            />
            <input
              className="palta-num-input"
              type="number"
              value={value.rootHigh}
              disabled={disabled}
              onChange={e => patch({ rootHigh: Number(e.target.value) })}
              title={`Last starting note (top of this scale is step ${Math.max(0, n - 1)}). Use 99 for "through the top".`}
            />
          </div>
          {n > 0 ? (
            <span className="palta-field-hint">
              Walk uses starting steps {roots.low} through {roots.high}
            </span>
          ) : null}
        </label>

        <label className="palta-field palta-field-tipped" title={TIP_MAX_NOTES}>
          <span className="palta-field-label">
            Max notes in the full line <span className="palta-tip-mark" aria-hidden="true">?</span>
          </span>
          <div className="palta-inline-row">
            <input
              className="palta-num-input palta-num-input-wide"
              type="number"
              min={0}
              max={500000}
              step={1}
              value={value.wholePhraseMaxSteps}
              disabled={disabled}
              onChange={e => {
                const v = Number(e.target.value)
                patch({
                  wholePhraseMaxSteps: Number.isFinite(v)
                    ? Math.max(0, Math.min(500_000, Math.round(v)))
                    : value.wholePhraseMaxSteps,
                })
              }}
              title={TIP_MAX_NOTES}
            />
          </div>
          {n > 0 ? (
            <span className="palta-field-hint">
              About {effective.totalSteps} notes in the line (starting steps {effective.low}–{effective.high}
              {value.wholePhraseMaxSteps > 0 && effective.high < roots.high
                ? `; shortened from step ${roots.high}`
                : ''}
              ).
            </span>
          ) : null}
        </label>

        <label className="palta-field palta-field-checkbox palta-field-tipped" title={TIP_DESCENDING}>
          <input
            type="checkbox"
            checked={value.includeDescending}
            disabled={disabled}
            onChange={e => patch({ includeDescending: e.target.checked })}
            title={TIP_DESCENDING}
          />
          <span className="palta-field-label">Walk back down after going up</span>
        </label>
      </div>

      <div className="palta-offsets-row">
        <span className="palta-offsets-label" title="The numbers used for the latest random pattern (jumps along the scale).">
          Current pattern
        </span>
        <code className="palta-offsets-code">
          {value.offsets.length > 0 ? value.offsets.join(' ') : '—'}
        </code>
      </div>

      <div className="custom-melody-tool-row">
        <button
          type="button"
          className="exercise-btn custom-melody-tool-btn"
          disabled={disabled || n <= 0}
          onClick={randomizeOffsets}
          title={TIP_RANDOMIZE}
        >
          Randomize pattern
        </button>
      </div>
    </div>
  )
}
