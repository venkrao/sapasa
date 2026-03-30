import { useState, useEffect } from 'react'
import './OrganTrainingPanel.css'
import { VOCAL_ORGANS, type VocalOrgan } from './vocalOrgans'

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
}

function Disclosure({ label, children, defaultOpen = false }: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="organ-disclosure">
      <button
        type="button"
        className="organ-disclosure-trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="organ-disclosure-label">{label}</span>
        <span className={'organ-disclosure-chevron' + (open ? ' open' : '')}>›</span>
      </button>
      {open && <div className="organ-disclosure-body">{children}</div>}
    </div>
  )
}

type Props = {
  selectedOrganId: string
  onOrganChange: (id: string) => void
  panelWidthPx?: number
}

export default function OrganTrainingPanel({ selectedOrganId, onOrganChange, panelWidthPx }: Props) {
  const selectedOrgan: VocalOrgan | undefined =
    selectedOrganId ? VOCAL_ORGANS.find(o => o.id === selectedOrganId) : undefined

  // Track which exercise cards are expanded
  const [expandedEx, setExpandedEx] = useState<Set<number>>(new Set())

  // Reset expanded exercises whenever the organ changes
  useEffect(() => { setExpandedEx(new Set()) }, [selectedOrganId])

  function toggleEx(i: number) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <aside
      className="organ-panel"
      style={panelWidthPx !== undefined ? { width: panelWidthPx, flexShrink: 0 } : undefined}
    >
      <div className="organ-panel-inner">
        <div className="organ-section-label">ORGAN</div>

        <select
          className="organ-select"
          value={selectedOrganId}
          onChange={e => onOrganChange(e.target.value)}
        >
          <option value="">Select organ…</option>
          {VOCAL_ORGANS.map(o => (
            <option key={o.id} value={o.id}>
              {o.emoji} {o.name}
            </option>
          ))}
        </select>

        {!selectedOrgan && (
          <p className="organ-panel-hint">
            Choose an organ to see its role in singing and targeted exercises.
          </p>
        )}

        {selectedOrgan && (
          <div className="organ-detail">

            {/* Identity row — always visible */}
            <div className="organ-detail-name">
              <span className="organ-detail-emoji">{selectedOrgan.emoji}</span>
              {selectedOrgan.name}
            </div>

            {/* Role — one-liner, always visible */}
            <p className="organ-detail-role">{selectedOrgan.role}</p>

            {/* Context — collapsed by default to save space */}
            <Disclosure label="Why it matters">
              <p className="organ-detail-block-text">{selectedOrgan.whyItMatters}</p>
            </Disclosure>

            <Disclosure label="Carnatic relevance">
              <p className="organ-detail-block-text">{selectedOrgan.carnaticRelevance}</p>
            </Disclosure>

            {/* Exercises — the primary content, always open */}
            <div className="organ-exercises">
              <div className="organ-exercises-heading">
                Exercises
                <span className="organ-exercises-count">{selectedOrgan.exercises.length}</span>
              </div>

              {selectedOrgan.exercises.map((ex, i) => {
                const open = expandedEx.has(i)
                return (
                  <div key={i} className={'organ-exercise-card' + (open ? ' open' : '')}>
                    <button
                      type="button"
                      className="organ-exercise-trigger"
                      onClick={() => toggleEx(i)}
                      aria-expanded={open}
                    >
                      <span className="organ-exercise-name">{ex.name}</span>
                      <div className="organ-exercise-trigger-right">
                        <span className={`organ-exercise-badge organ-exercise-badge-${ex.difficulty}`}>
                          {DIFFICULTY_LABEL[ex.difficulty]}
                        </span>
                        <span className={'organ-disclosure-chevron' + (open ? ' open' : '')}>›</span>
                      </div>
                    </button>
                    {open && (
                      <div className="organ-exercise-body">
                        <p className="organ-exercise-desc">{ex.description}</p>
                        {ex.duration && (
                          <div className="organ-exercise-duration">
                            <span className="organ-exercise-duration-icon">⏱</span>
                            {ex.duration}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
