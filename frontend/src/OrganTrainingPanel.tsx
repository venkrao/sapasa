import { useState, useEffect, useCallback } from 'react'
import './OrganTrainingPanel.css'
import {
  BREATH_CONTROL_ESSENTIAL_FIVE,
  BREATH_CONTROL_ESSENTIAL_SUMMARY,
  type BreathEssentialItem,
} from './vocalOrgans'
import SSSHissGuide from './SSSHissGuide'
import ProgressChart, { AttemptsChart, type ProgressSession, type AttemptRecord } from './ProgressChart'

const API = 'http://localhost:8765'

type Props = {
  panelWidthPx?: number
}

export default function OrganTrainingPanel({ panelWidthPx }: Props) {
  const [expandedEx, setExpandedEx] = useState<Set<number>>(new Set())
  const [guideOpen, setGuideOpen]   = useState(false)

  const [dailySessions, setDailySessions]   = useState<ProgressSession[]>([])
  const [allAttempts, setAllAttempts]       = useState<AttemptRecord[]>([])
  const [trackerLoading, setTrackerLoading] = useState(true)

  const fetchHissHistory = useCallback(() => {
    setTrackerLoading(true)
    Promise.all([
      fetch(`${API}/api/exercise-sessions?exerciseId=sss-hiss`).then(r => r.json()),
      fetch(`${API}/api/exercise-sessions?exerciseId=sss-hiss&raw=true`).then(r => r.json()),
    ])
      .then(([daily, raw]: [ProgressSession[], AttemptRecord[]]) => {
        setDailySessions(daily)
        setAllAttempts(raw)
      })
      .catch(() => {})
      .finally(() => setTrackerLoading(false))
  }, [])

  // Fetch on mount
  useEffect(() => { fetchHissHistory() }, [fetchHissHistory])

  useEffect(() => {
    if (!guideOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setGuideOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guideOpen])

  function toggleEx(i: number) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <>
      {guideOpen && (
        <SSSHissGuide
          onClose={() => setGuideOpen(false)}
          onSessionSaved={fetchHissHistory}
        />
      )}

      <div
        className="organ-layout"
        style={panelWidthPx !== undefined ? { width: panelWidthPx } : undefined}
      >
        {/* ── Left column: exercises ──────────────────────────────────── */}
        <div className="organ-col organ-col-exercises">
          <div className="organ-col-inner">
            <div className="organ-essentials-header">
              <div className="organ-essentials-title">Breathing Exercises</div>
              <p className="organ-essentials-lede">{BREATH_CONTROL_ESSENTIAL_SUMMARY}</p>
            </div>

            <div className="organ-exercises">
              {BREATH_CONTROL_ESSENTIAL_FIVE.map((ex: BreathEssentialItem, i) => {
                const open     = expandedEx.has(i)
                const isGuided = ex.guideId === 'sss-hiss'
                return (
                  <div key={i} className={'organ-exercise-card' + (open ? ' open' : '')}>
                    <button
                      type="button"
                      className="organ-exercise-trigger"
                      onClick={() => toggleEx(i)}
                      aria-expanded={open}
                    >
                      <span className="organ-exercise-name">{ex.title}</span>
                      <span className={'organ-disclosure-chevron' + (open ? ' open' : '')}>›</span>
                    </button>

                    {open && (
                      <div className="organ-exercise-body">
                        <ul className="organ-exercise-steps">
                          {ex.steps.map((step, si) => (
                            <li key={si} className="organ-exercise-step">{step}</li>
                          ))}
                        </ul>
                        {isGuided && (
                          <button
                            type="button"
                            className="organ-exercise-start-btn"
                            onClick={() => setGuideOpen(true)}
                          >
                            Start Exercise
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right column: progress tracker ──────────────────────────── */}
        <div className="organ-col organ-col-tracker">
          <div className="organ-col-inner">
            <div className="organ-tracker-heading">
              <span className="organ-tracker-heading-title">Progress Tracker</span>
              <span className="organ-tracker-heading-sub">Sustained SSS Hiss</span>
            </div>

            {trackerLoading ? (
              <p className="organ-tracker-loading">Loading…</p>
            ) : (
              <>
                <div className="organ-tracker-section">
                  <div className="organ-tracker-section-label">Daily best</div>
                  <div className="organ-tracker-section-sub">
                    Best duration per calendar day — shows the week-over-week trend.
                  </div>
                  <ProgressChart sessions={dailySessions} targetSec={45} unit="s" />
                </div>

                <div className="organ-tracker-section">
                  <div className="organ-tracker-section-label">All attempts</div>
                  <div className="organ-tracker-section-sub">
                    Every rep in order — dashed lines mark where one day ends and the next begins.
                  </div>
                  <AttemptsChart attempts={allAttempts} targetSec={45} unit="s" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
