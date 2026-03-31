import { useState, useEffect, useRef, useCallback } from 'react'
import './OrganTrainingPanel.css'
import {
  BREATH_CONTROL_ESSENTIAL_FIVE,
  BREATH_CONTROL_ESSENTIAL_SUMMARY,
  BREATH_ORGAN_IDS,
  VOCAL_ORGANS,
  type VocalOrgan,
} from './vocalOrgans'

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

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
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

  // ── Breath hold timer ────────────────────────────────────────────────────
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsedMs, setElapsedMs]       = useState(0)
  const [history, setHistory]           = useState<number[]>([])
  const rafRef                          = useRef<number>(0)
  const startTimeRef                    = useRef<number>(0)

  const tick = useCallback(() => {
    setElapsedMs(Date.now() - startTimeRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  function startTimer() {
    startTimeRef.current = Date.now()
    setElapsedMs(0)
    setTimerRunning(true)
    rafRef.current = requestAnimationFrame(tick)
  }

  function stopTimer() {
    cancelAnimationFrame(rafRef.current)
    const held = Date.now() - startTimeRef.current
    setElapsedMs(held)
    setHistory(prev => [held, ...prev])
    setTimerRunning(false)
  }

  function clearHistory() {
    setHistory([])
    setElapsedMs(0)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <aside
      className="organ-panel"
      style={panelWidthPx !== undefined ? { width: panelWidthPx, flexShrink: 0 } : undefined}
    >
      <div className="organ-panel-inner">

        {/* ── Breath hold timer ── */}
        <div className="organ-timer">
          <div className="organ-timer-display" aria-live="polite" aria-label="Elapsed time">
            {formatTime(elapsedMs)}
          </div>
          <div className="organ-timer-controls">
            {!timerRunning ? (
              <button type="button" className="organ-timer-btn organ-timer-btn-start" onClick={startTimer}>
                Start
              </button>
            ) : (
              <button type="button" className="organ-timer-btn organ-timer-btn-stop" onClick={stopTimer}>
                Stop
              </button>
            )}
          </div>

          {history.length > 0 && (
            <div className="organ-timer-history">
              <div className="organ-timer-history-header">
                <span className="organ-timer-history-label">Hold history</span>
                <button
                  type="button"
                  className="organ-timer-history-clear"
                  onClick={clearHistory}
                >
                  Clear
                </button>
              </div>
              <ol className="organ-timer-history-list">
                {history.map((ms, i) => (
                  <li key={i} className={'organ-timer-history-item' + (i === 0 ? ' latest' : '')}>
                    <span className="organ-timer-history-index">#{history.length - i}</span>
                    <span className="organ-timer-history-value">{formatTime(ms)}</span>
                    {i === 0 && <span className="organ-timer-history-badge">latest</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

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

            {BREATH_ORGAN_IDS.has(selectedOrgan.id) && (
              <div className="organ-breath-disclosure-wrap">
                <Disclosure label="The only 5 you need">
                  <>
                    <p className="organ-breath-essentials-lede">
                      If you could only do five breath-control exercises for the rest of your singing life,
                      these are worth committing to — each one trains a distinct, irreplaceable skill. Each card
                      includes how to inhale (nose, mouth, or both) and why that pattern fits.
                    </p>
                    <ol className="organ-breath-essentials-list">
                      {BREATH_CONTROL_ESSENTIAL_FIVE.map((item, idx) => (
                        <li key={idx} className="organ-breath-essential-item">
                          <div className="organ-breath-essential-head">
                            <span className="organ-breath-essential-num">{idx + 1}</span>
                            <span className="organ-breath-essential-title">{item.title}</span>
                          </div>
                          <div className="organ-breath-how">
                            <div className="organ-breath-how-row">
                              <span className="organ-breath-how-label">Inhale through</span>
                              <span className="organ-breath-how-channel">{item.inhaleThrough}</span>
                            </div>
                            <p className="organ-breath-how-why">{item.inhaleWhy}</p>
                          </div>
                          <p className="organ-breath-essential-body">{item.body}</p>
                          <a
                            className="organ-breath-essential-source"
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.sourceLabel}
                          </a>
                        </li>
                      ))}
                    </ol>
                    <p className="organ-breath-essentials-summary">{BREATH_CONTROL_ESSENTIAL_SUMMARY}</p>
                  </>
                </Disclosure>
              </div>
            )}

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
