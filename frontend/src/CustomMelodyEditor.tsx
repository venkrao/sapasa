import { useCallback, useState } from 'react'
import {
  appendBarToMelodyText,
  appendNoteToMelodyText,
  MELODY_SWARA_BUTTON_ORDER,
  removeLastMelodyGroup,
} from './customMelodyParse'
import type { SequenceStep } from './exerciseModel'
import { SWARA_COLORS, SWARA_LABELS } from './swaras'

type Props = {
  value: string
  onChange: (text: string) => void
  parseError: string | null
  disabled?: boolean
}

const OCTAVE_CHOICES: { value: number; label: string }[] = [
  { value: -1, label: 'Mandra' },
  { value: 0, label: 'Madhya' },
  { value: 1, label: 'Tara' },
]

export default function CustomMelodyEditor({
  value,
  onChange,
  parseError,
  disabled = false,
}: Props) {
  const [octave, setOctave] = useState(0)

  const addNote = useCallback(
    (swara: string) => {
      const step: SequenceStep = { swara, octave }
      onChange(appendNoteToMelodyText(value, step))
    },
    [value, onChange, octave],
  )

  const addBar = useCallback(() => {
    onChange(appendBarToMelodyText(value))
  }, [value, onChange])

  const removeLast = useCallback(() => {
    onChange(removeLastMelodyGroup(value))
  }, [value, onChange])

  const clearAll = useCallback(() => {
    onChange('Sa')
  }, [onChange])

  return (
    <div className="custom-melody-editor" aria-label="Custom melody sequence">
      <div className="custom-melody-editor-head">
        <span className="custom-melody-editor-title">Your notes</span>
        <span className="custom-melody-editor-hint">
          Tap swaras to add them in order, or paste text using the same symbols as the notation row below
          (Ṡ, Ṙ₂, N₂, P, …) or engine names (Sa, R1, R2′, …). Bar inserts a beat. Duplicate glyphs like Ṗ default to tāra;
          use ASCII <code className="custom-melody-code">Pa,</code> for mandra Pa if needed.
        </span>
      </div>

      <div className="custom-melody-octave-row" role="group" aria-label="Octave for the next note">
        <span className="custom-melody-subhead">Octave</span>
        {OCTAVE_CHOICES.map(o => (
          <button
            key={o.value}
            type="button"
            className={'custom-melody-octave-btn' + (octave === o.value ? ' active' : '')}
            disabled={disabled}
            onClick={() => setOctave(o.value)}
            title={`Add the next tapped swara in ${o.label.toLowerCase()} sthayi`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="custom-melody-swara-grid" role="group" aria-label="Swara buttons">
        {MELODY_SWARA_BUTTON_ORDER.map(id => {
          const col = SWARA_COLORS[id] ?? '#888'
          return (
            <button
              key={id}
              type="button"
              className="custom-melody-swara-btn"
              disabled={disabled}
              style={{ borderColor: col + '55' }}
              onClick={() => addNote(id)}
              title={SWARA_LABELS[id] ?? id}
              aria-label={`Add ${SWARA_LABELS[id] ?? id}`}
            >
              <span className="custom-melody-swara-id">{id}</span>
              <span className="custom-melody-swara-sub">{SWARA_LABELS[id] ?? id}</span>
            </button>
          )
        })}
      </div>

      <div className="custom-melody-tool-row">
        <button
          type="button"
          className="exercise-btn custom-melody-tool-btn"
          disabled={disabled || !value.trim()}
          onClick={addBar}
          title="Insert a bar line after the last note (same as | in text)"
        >
          Bar |
        </button>
        <button
          type="button"
          className="exercise-btn custom-melody-tool-btn"
          disabled={disabled}
          onClick={removeLast}
          title="Remove the last note or bar"
        >
          Undo last
        </button>
        <button
          type="button"
          className="exercise-btn custom-melody-tool-btn"
          disabled={disabled}
          onClick={clearAll}
          title="Reset to a single madhya Sa"
        >
          Clear
        </button>
      </div>

      <details className="custom-melody-advanced">
        <summary className="custom-melody-advanced-summary">Edit as text (optional)</summary>
        <textarea
          className={'custom-melody-textarea' + (parseError ? ' custom-melody-textarea-error' : '')}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          spellCheck={false}
          rows={4}
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={!!parseError}
          aria-describedby={parseError ? 'custom-melody-parse-error' : undefined}
          title="Tiles or ASCII: Sa, R1, N1 (same as D2), N2 (same as D3), G1/G2 (same as R2/R3), … — spaces; | bar; ′ tara , mandra"
        />
      </details>

      {parseError ? (
        <p id="custom-melody-parse-error" className="custom-melody-parse-error" role="alert">
          {parseError}
        </p>
      ) : null}
    </div>
  )
}
