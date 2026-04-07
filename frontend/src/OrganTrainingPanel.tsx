import { useState, useEffect, useCallback } from 'react'
import './OrganTrainingPanel.css'
import {
  BREATH_CONTROL_ESSENTIAL_FIVE,
  BREATH_CONTROL_ESSENTIAL_SUMMARY,
  type BreathEssentialItem,
} from './vocalOrgans'
import SSSHissGuide from './SSSHissGuide'
import CameraObservationLab from './CameraObservationLab'
import ProgressChart, { AttemptsChart, type ProgressSession, type AttemptRecord } from './ProgressChart'

const API = 'http://localhost:8765'

type Props = {
  panelWidthPx?: number
}

export default function OrganTrainingPanel({ panelWidthPx }: Props) {
  const [expandedEx, setExpandedEx]     = useState<Set<number>>(new Set())
  const [exerciseActive, setExerciseActive] = useState(false)
  const [showCamera, setShowCamera]     = useState(false)
  const [showTracker, setShowTracker]   = useState(false)
  const [sidebarOpen, setSidebarOpen]   = useState(true)

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

  useEffect(() => { fetchHissHistory() }, [fetchHissHistory])

  // Close tracker on Escape
  useEffect(() => {
    if (!showTracker) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowTracker(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showTracker])

  function toggleEx(i: number) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function exitExercise() {
    setExerciseActive(false)
    setShowCamera(false)
  }

  return (
    <div
      className={`organ-layout-new${sidebarOpen ? '' : ' sidebar-collapsed'}`}
      style={panelWidthPx !== undefined ? { width: panelWidthPx } : undefined}
    >
      {/* ── Left column: exercise list ──────────────────────────────────── */}
      <div className="organ-col-left">
        {/* Collapse/expand toggle — sits on the right edge of the column */}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? 'Collapse exercise list' : 'Expand exercise list'}
          title={sidebarOpen ? 'Collapse' : 'Exercises'}
        >
          <span className={`sidebar-toggle-chevron${sidebarOpen ? '' : ' flipped'}`}>‹</span>
          {!sidebarOpen && <span className="sidebar-toggle-label">Exercises</span>}
        </button>

        <div className="organ-col-inner sidebar-content">
          <div className="organ-essentials-header">
            <div className="organ-essentials-title">Breathing Exercises</div>
            <p className="organ-essentials-lede">{BREATH_CONTROL_ESSENTIAL_SUMMARY}</p>
          </div>

          <div className="organ-exercises">
            {BREATH_CONTROL_ESSENTIAL_FIVE.map((ex: BreathEssentialItem, i) => {
              const open     = expandedEx.has(i)
              const isGuided = ex.guideId === 'sss-hiss'
              const isActive = isGuided && exerciseActive
              return (
                <div
                  key={i}
                  className={
                    'organ-exercise-card' +
                    (open ? ' open' : '') +
                    (isActive ? ' exercise-running' : '')
                  }
                >
                  <button
                    type="button"
                    className="organ-exercise-trigger"
                    onClick={() => toggleEx(i)}
                    aria-expanded={open}
                  >
                    <span className="organ-exercise-name">{ex.title}</span>
                    {isActive && <span className="ex-running-badge">Active</span>}
                    <span className={'organ-disclosure-chevron' + (open ? ' open' : '')}>›</span>
                  </button>

                  {open && (
                    <div className="organ-exercise-body">
                      <ul className="organ-exercise-steps">
                        {ex.steps.map((step, si) => (
                          <li key={si} className="organ-exercise-step">{step}</li>
                        ))}
                      </ul>
                      {isGuided && !exerciseActive && (
                        <button
                          type="button"
                          className="organ-exercise-start-btn"
                          onClick={() => setExerciseActive(true)}
                        >
                          Start Exercise
                        </button>
                      )}
                      {isActive && (
                        <button
                          type="button"
                          className="organ-exercise-exit-btn"
                          onClick={exitExercise}
                        >
                          Exit Exercise
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

      {/* ── Right area: active exercise or placeholder ──────────────────── */}
      <div className="organ-col-main">
        {!exerciseActive && (
          <div className="organ-main-placeholder">
            <p className="organ-placeholder-text">
              Open an exercise above to begin.
            </p>
          </div>
        )}

        {exerciseActive && (
          <div className="organ-active-area">
            {/* Header bar: title + camera toggle */}
            <div className="organ-active-header">
              <span className="organ-active-title">Sustained &ldquo;SSS&rdquo; Hiss</span>
              <button
                type="button"
                className={`organ-camera-toggle ${showCamera ? 'active' : ''}`}
                onClick={() => setShowCamera(v => !v)}
              >
                {showCamera ? '✕ Hide camera' : '📷 Watch shoulders'}
              </button>
            </div>

            {/* Body: guide + optional camera side-panel */}
            <div className={`organ-active-body${showCamera ? ' with-camera' : ''}`}>
              <div className="organ-guide-wrap">
                <SSSHissGuide
                  inline
                  onClose={exitExercise}
                  onSessionSaved={() => { fetchHissHistory(); setShowTracker(false) }}
                />
              </div>

              {showCamera && (
                <div className="organ-camera-wrap">
                  <CameraObservationLab
                    embedded
                    onHome={() => setShowCamera(false)}
                    onClose={() => setShowCamera(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Progress FAB (bottom-right of layout) ──────────────────────── */}
      <button
        type="button"
        className={`progress-fab${showTracker ? ' progress-fab-active' : ''}`}
        onClick={() => setShowTracker(v => !v)}
        aria-label="Toggle progress tracker"
      >
        <span className="progress-fab-icon">↗</span>
        <span className="progress-fab-label">Progress</span>
      </button>

      {/* ── Progress drawer overlay ─────────────────────────────────────── */}
      {showTracker && (
        <div
          className="progress-drawer-backdrop"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowTracker(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Progress tracker"
        >
          <div className="progress-drawer-panel">
            <div className="progress-drawer-header">
              <div className="organ-tracker-heading">
                <span className="organ-tracker-heading-title">Progress Tracker</span>
                <span className="organ-tracker-heading-sub">Sustained SSS Hiss</span>
              </div>
              <button
                className="progress-drawer-close"
                type="button"
                onClick={() => setShowTracker(false)}
                aria-label="Close tracker"
              >
                ×
              </button>
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
      )}
    </div>
  )
}
