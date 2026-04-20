import { useEffect, useRef, useState } from 'react'
import type { PaltaConfig, PaltaPhraseStats } from './paltaConfig'
import { clampPaltaOffsetRange, clampPaltaRootRange, randomOffsetsArray } from './paltaGenerator'

export type PaltaScaleOption = { id: string; label: string }

type Props = {
  value: PaltaConfig
  onChange: (next: PaltaConfig) => void
  scaleRagaOptions: PaltaScaleOption[]
  /** Madhya-scale degree count (for clamp hints). */
  scaleDegreeCount: number
  /** Built phrase stats from the parent (full vs capped groups and note count). */
  phraseStats?: PaltaPhraseStats | null
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

const TIP_MAX_GROUPS =
  'How many times the whole random pattern is played end-to-end in the exercise line (each time at the next starting note up the scale, then the descent if enabled). Example: pattern length 4 and max 12 repeats means up to 12 stamped patterns (48 single notes), not 12 single notes. Use 0 for no limit.'

const TIP_DESCENDING =
  'After walking up the scale, also walk the same pattern back down to the starting region.'

const TIP_RANDOMIZE =
  'Roll a fresh set of random jumps, using your pattern length and min/max jump settings.'

const TIP_PATTERN_EDIT =
  'Space-separated whole numbers: scale-step jumps from each root (0 = same degree as the root). Enter or leave the field to apply. The count of numbers sets “Notes per pattern” when you commit.'

export default function PaltaExerciseEditor({
  value,
  onChange,
  scaleRagaOptions,
  scaleDegreeCount,
  phraseStats = null,
  disabled = false,
}: Props) {
  const n = scaleDegreeCount
  const { min: offMin, max: offMax } =
    n > 0 ? clampPaltaOffsetRange(value.offsetMin, value.offsetMax, n) : { min: 0, max: 0 }
  const roots = n > 0 ? clampPaltaRootRange(value.rootLow, value.rootHigh, n) : { low: 0, high: 0 }

  const offsetsSerialized = value.offsets.join(',')
  const [patternDraft, setPatternDraft] = useState(() =>
    value.offsets.length > 0 ? value.offsets.join(' ') : '',
  )
  const patternFocusRef = useRef(false)

  useEffect(() => {
    if (patternFocusRef.current) return
    setPatternDraft(value.offsets.length > 0 ? value.offsets.join(' ') : '')
  }, [offsetsSerialized, value.patternLength])

  function patch(p: Partial<PaltaConfig>) {
    onChange({ ...value, ...p })
  }

  function commitPatternDraft() {
    const raw = patternDraft.trim()
    if (raw === '') {
      setPatternDraft(value.offsets.length > 0 ? value.offsets.join(' ') : '')
      return
    }
    const tokens = raw.split(/\s+/).filter(Boolean)
    const nums: number[] = []
    for (const t of tokens) {
      const v = Number(t)
      if (!Number.isFinite(v)) {
        setPatternDraft(value.offsets.length > 0 ? value.offsets.join(' ') : '')
        return
      }
      nums.push(Math.round(v))
    }
    if (nums.length === 0) {
      setPatternDraft(value.offsets.length > 0 ? value.offsets.join(' ') : '')
      return
    }
    const L = Math.min(64, Math.max(1, nums.length))
    const next = nums.slice(0, L)
    onChange({ ...value, patternLength: L, offsets: next })
    setPatternDraft(next.join(' '))
  }

  function randomizeOffsets() {
    if (n <= 0) return
    const { min, max } = clampPaltaOffsetRange(value.offsetMin, value.offsetMax, n)
    const next = randomOffsetsArray(value.patternLength, min, max)
    patch({ offsets: next })
    setPatternDraft(next.join(' '))
  }

  return (
    <div className="custom-melody-editor palta-editor">
      <div className="custom-melody-editor-head">
        <div className="custom-melody-editor-title">Palta</div>
        <p className="custom-melody-editor-hint">
          Build a short shape of jumps, then move that shape step‑by‑step up the scale (and optionally
          back down). Choose a scale and sizes below, then tap <strong>Randomize pattern</strong> for a
          new shape, or type the pattern below. Hover labels marked with “?” for more detail.
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

        <label className="palta-field palta-field-tipped" title={TIP_MAX_GROUPS}>
          <span className="palta-field-label">
            Max pattern repeats (whole line) <span className="palta-tip-mark" aria-hidden="true">?</span>
          </span>
          <div className="palta-inline-row">
            <input
              className="palta-num-input palta-num-input-wide"
              type="number"
              min={0}
              max={50000}
              step={1}
              value={value.wholePhraseMaxGroups}
              disabled={disabled}
              onChange={e => {
                const v = Number(e.target.value)
                patch({
                  wholePhraseMaxGroups: Number.isFinite(v)
                    ? Math.max(0, Math.min(50_000, Math.round(v)))
                    : value.wholePhraseMaxGroups,
                })
              }}
              title={TIP_MAX_GROUPS}
            />
          </div>
          {phraseStats && phraseStats.fullGroups > 0 ? (
            <span className="palta-field-hint">
              Line uses {phraseStats.usedGroups} of {phraseStats.fullGroups} pattern repeat
              {phraseStats.fullGroups === 1 ? '' : 's'}
              {phraseStats.usedGroups < phraseStats.fullGroups ? ' (capped)' : ''} — about{' '}
              {phraseStats.noteCount} single notes ({phraseStats.usedGroups} × {value.patternLength} per
              repeat).
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

      <div className="palta-offsets-block">
        <label className="palta-offsets-label-row" htmlFor="palta-pattern-input">
          <span className="palta-offsets-label" title={TIP_PATTERN_EDIT}>
            Current pattern <span className="palta-tip-mark" aria-hidden="true">?</span>
          </span>
        </label>
        <input
          id="palta-pattern-input"
          className="palta-offsets-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled || n <= 0}
          placeholder="e.g. 0 0 1 4"
          value={patternDraft}
          title={TIP_PATTERN_EDIT}
          onChange={e => setPatternDraft(e.target.value)}
          onFocus={() => {
            patternFocusRef.current = true
          }}
          onBlur={() => {
            commitPatternDraft()
            patternFocusRef.current = false
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              commitPatternDraft()
              e.currentTarget.blur()
            }
          }}
        />
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
