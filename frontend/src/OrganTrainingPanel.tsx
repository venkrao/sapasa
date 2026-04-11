import { useState, useEffect, useCallback, useRef } from 'react'
import './OrganTrainingPanel.css'
import {
  BREATH_CONTROL_ESSENTIAL_FIVE,
  BREATH_CONTROL_ESSENTIAL_SUMMARY,
  type BreathEssentialItem,
} from './vocalOrgans'
import SSSHissGuide from './SSSHissGuide'
import CameraObservationLab from './CameraObservationLab'
import ProgressChart, { AttemptsChart, DailyCountChart, type ProgressSession, type AttemptRecord } from './ProgressChart'

const API = 'http://localhost:8765'

// Emoji for each simple exercise
const EXERCISE_EMOJIS: Record<string, string> = {
  'belly-breathing': '🫁',
  '4-8-breathing':  '🔁',
  'straw-sovt':     '🪄',
  'ha-pulses':      '💥',
}

function fmtTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

// ─── Generic timed inline guide ──────────────────────────────────────────────
// Used for belly-breathing, 4-8-breathing, straw-sovt, and ha-pulses.
function TimedExerciseInline({
  exerciseId,
  title,
  steps,
  cues,
  onDone,
  onExit,
}: {
  exerciseId: string
  title: string
  steps: string[]
  /** Optional 2×2 quick-cue grid items */
  cues?: { icon: string; label: string }[]
  onDone: (durationSec: number) => void
  onExit: () => void
}) {
  const [elapsed, setElapsed]           = useState(0)
  const [stopwatchPaused, setStopwatchPaused] = useState(false)
  const stopwatchPausedRef = useRef(false)
  const startRef           = useRef(Date.now())
  // Accumulated ms before the last pause (so pause/resume doesn't lose time)
  const accumulatedRef     = useRef(0)

  useEffect(() => { stopwatchPausedRef.current = stopwatchPaused }, [stopwatchPaused])

  useEffect(() => {
    const id = setInterval(() => {
      if (!stopwatchPausedRef.current) {
        setElapsed(Math.floor((accumulatedRef.current + Date.now() - startRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  function toggleStopwatch() {
    if (stopwatchPausedRef.current) {
      // Resuming: reset startRef so elapsed accumulates correctly
      startRef.current = Date.now()
      setStopwatchPaused(false)
    } else {
      // Pausing: bank elapsed ms so far
      accumulatedRef.current += Date.now() - startRef.current
      setStopwatchPaused(true)
    }
  }

  function handleDone() {
    const dur = (accumulatedRef.current + (stopwatchPausedRef.current ? 0 : Date.now() - startRef.current)) / 1000
    onDone(dur)
    // Reset for next rep
    accumulatedRef.current = 0
    startRef.current = Date.now()
    setStopwatchPaused(false)
    setElapsed(0)
  }

  const emoji = EXERCISE_EMOJIS[exerciseId] ?? '🎵'

  return (
    <div className="timed-ex-guide">
      <div className="timed-ex-header">
        <span className="timed-ex-emoji">{emoji}</span>
        <div className="timed-ex-timer-block">
          <div className={`timed-ex-timer${stopwatchPaused ? ' paused' : ''}`}>
            {fmtTimer(elapsed)}
          </div>
        </div>
        <button
          type="button"
          className="timed-ex-pause-btn"
          onClick={toggleStopwatch}
          title={stopwatchPaused ? 'Resume stopwatch' : 'Pause stopwatch'}
          aria-label={stopwatchPaused ? 'Resume stopwatch' : 'Pause stopwatch'}
        >
          {stopwatchPaused ? '▶' : '⏸'}
        </button>
      </div>

      <ol className="timed-ex-steps">
        {steps.map((step, i) => (
          <li key={i} className="timed-ex-step">{step}</li>
        ))}
      </ol>

      {cues && cues.length > 0 && (
        <div className="timed-ex-cue-grid">
          {cues.map((c, i) => (
            <div key={i} className="timed-ex-cue">
              <span className="timed-ex-cue-icon">{c.icon}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="timed-ex-actions">
        <button type="button" className="timed-ex-done-btn" onClick={handleDone}>
          ✓ Mark Done
        </button>
        <button type="button" className="timed-ex-exit-btn" onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

// Cue grids for exercises that benefit from them
const HA_CUES = [
  { icon: '🫁', label: 'Full breath in' },
  { icon: '💨', label: 'ha · ha · ha · ha' },
  { icon: '🔄', label: 'Quick mouth recovery' },
  { icon: '🔁', label: 'Repeat 4–6 sets' },
]

type Props = {
  panelWidthPx?: number
}

type DrawerData = {
  daily: ProgressSession[]
  raw:   AttemptRecord[]
}

export default function OrganTrainingPanel({ panelWidthPx }: Props) {
  const [expandedEx, setExpandedEx]         = useState<Set<number>>(new Set())
  const [activeExercise, setActiveExercise] = useState<string | null>(null)
  const [showCamera, setShowCamera]         = useState(false)
  const [showTracker, setShowTracker]       = useState(false)
  const [sidebarOpen, setSidebarOpen]       = useState(true)

  // Sidebar completion-count badges (total sessions per exercise)
  const [completionCounts, setCompletionCounts] = useState<Record<string, number>>({})
  // Count of "Mark Done" / sessions saved in the current open-exercise session
  const [sessionRepCount, setSessionRepCount] = useState(0)
  // Overall time spent on this OrganTraining page (starts on mount)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [sessionTimerPaused, setSessionTimerPaused] = useState(false)
  const sessionTimerPausedRef = useRef(false)
  useEffect(() => { sessionTimerPausedRef.current = sessionTimerPaused }, [sessionTimerPaused])
  useEffect(() => {
    const id = setInterval(() => {
      if (!sessionTimerPausedRef.current) setSessionElapsed(s => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Progress drawer content
  const [drawerData, setDrawerData]     = useState<DrawerData>({ daily: [], raw: [] })
  const [drawerLoading, setDrawerLoading] = useState(false)

  // ── Fetch sidebar counts for all guided exercises ──────────────────────────
  const fetchAllCounts = useCallback(() => {
    const ids = BREATH_CONTROL_ESSENTIAL_FIVE
      .map(e => e.guideId)
      .filter(Boolean) as string[]

    Promise.all(
      ids.map(id =>
        fetch(`${API}/api/exercise-sessions?exerciseId=${id}&raw=true`)
          .then(r => r.json())
          .then((rows: AttemptRecord[]) => [id, rows.length] as const)
          .catch(() => [id, 0] as const)
      )
    ).then(pairs => {
      const counts: Record<string, number> = {}
      for (const [id, n] of pairs) counts[id] = n
      setCompletionCounts(counts)
    })
  }, [])

  useEffect(() => { fetchAllCounts() }, [fetchAllCounts])

  // ── Fetch drawer data for the given exercise ───────────────────────────────
  const fetchDrawerData = useCallback((exerciseId: string) => {
    setDrawerLoading(true)
    if (exerciseId === 'sss-hiss') {
      Promise.all([
        fetch(`${API}/api/exercise-sessions?exerciseId=sss-hiss`).then(r => r.json()),
        fetch(`${API}/api/exercise-sessions?exerciseId=sss-hiss&raw=true`).then(r => r.json()),
      ])
        .then(([daily, raw]: [ProgressSession[], AttemptRecord[]]) =>
          setDrawerData({ daily, raw })
        )
        .catch(() => {})
        .finally(() => setDrawerLoading(false))
    } else {
      fetch(`${API}/api/exercise-sessions?exerciseId=${exerciseId}&raw=true`)
        .then(r => r.json())
        .then((raw: AttemptRecord[]) => setDrawerData({ daily: [], raw }))
        .catch(() => {})
        .finally(() => setDrawerLoading(false))
    }
  }, [])

  // Reload drawer whenever it opens (or active exercise changes while open)
  useEffect(() => {
    if (showTracker && activeExercise) fetchDrawerData(activeExercise)
  }, [showTracker, activeExercise, fetchDrawerData])

  // Close tracker on Escape
  useEffect(() => {
    if (!showTracker) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowTracker(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showTracker])

  // ── Save a completed session ───────────────────────────────────────────────
  const saveSession = useCallback((exerciseId: string, durationSec: number) => {
    fetch(`${API}/api/exercise-sessions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ exerciseId, durationSec }),
    })
      .then(() => {
        fetchAllCounts()
        setSessionRepCount(c => c + 1)
        if (showTracker) fetchDrawerData(exerciseId)
      })
      .catch(() => {})
  }, [fetchAllCounts, fetchDrawerData, showTracker])

  function toggleEx(i: number) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function startExercise(guideId: string) {
    setActiveExercise(guideId)
    setShowCamera(false)
    setShowTracker(false)
    setSessionRepCount(0)
  }

  function exitExercise() {
    setActiveExercise(null)
    setShowCamera(false)
  }

  // ── Drawer label ───────────────────────────────────────────────────────────
  const drawerExLabel = activeExercise
    ? (BREATH_CONTROL_ESSENTIAL_FIVE.find(e => e.guideId === activeExercise)?.title ?? activeExercise)
    : 'SSS Hiss'

  return (
    <div
      className={`organ-layout-new${sidebarOpen ? '' : ' sidebar-collapsed'}`}
      style={panelWidthPx !== undefined ? { width: panelWidthPx } : undefined}
    >
      {/* ── Left column: exercise list ──────────────────────────────────── */}
      <div className="organ-col-left">
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
          <div className="organ-session-timer">
            <span className="organ-session-timer-label">Session</span>
            <div className="organ-session-timer-right">
              <span className={`organ-session-timer-value${sessionTimerPaused ? ' paused' : ''}`}>
                {fmtTimer(sessionElapsed)}
              </span>
              <button
                type="button"
                className="organ-session-timer-btn"
                onClick={() => setSessionTimerPaused(v => !v)}
                title={sessionTimerPaused ? 'Resume timer' : 'Pause timer'}
                aria-label={sessionTimerPaused ? 'Resume timer' : 'Pause timer'}
              >
                {sessionTimerPaused ? '▶' : '⏸'}
              </button>
            </div>
          </div>

          <div className="organ-essentials-header">
            <div className="organ-essentials-title">Breathing Exercises</div>
            <p className="organ-essentials-lede">{BREATH_CONTROL_ESSENTIAL_SUMMARY}</p>
          </div>

          <div className="organ-exercises">
            {BREATH_CONTROL_ESSENTIAL_FIVE.map((ex: BreathEssentialItem, i) => {
              const open     = expandedEx.has(i)
              const isGuided = !!ex.guideId
              const isActive = !!ex.guideId && ex.guideId === activeExercise
              const count    = ex.guideId ? (completionCounts[ex.guideId] ?? 0) : 0
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
                    {!isActive && count > 0 && (
                      <span className="ex-count-badge">{count}×</span>
                    )}
                    <span className={'organ-disclosure-chevron' + (open ? ' open' : '')}>›</span>
                  </button>

                  {open && (
                    <div className="organ-exercise-body">
                      <ul className="organ-exercise-steps">
                        {ex.steps.map((step, si) => (
                          <li key={si} className="organ-exercise-step">{step}</li>
                        ))}
                      </ul>
                      {isGuided && !activeExercise && (
                        <button
                          type="button"
                          className="organ-exercise-start-btn"
                          onClick={() => startExercise(ex.guideId!)}
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
        {!activeExercise && (
          <div className="organ-main-placeholder">
            <p className="organ-placeholder-text">
              Open an exercise above to begin.
            </p>
          </div>
        )}

        {activeExercise && (() => {
          const activeEx = BREATH_CONTROL_ESSENTIAL_FIVE.find(e => e.guideId === activeExercise)
          return (
            <div className="organ-active-area">
              {/* Header bar */}
              <div className="organ-active-header">
                <span className="organ-active-title">{activeEx?.title}</span>
                {sessionRepCount > 0 && (
                  <span className="organ-active-count" title="Times completed this session">
                    {sessionRepCount}× this session
                  </span>
                )}
                <div className="organ-active-header-actions">
                  <button
                    type="button"
                    className={`organ-progress-graph-btn${showTracker ? ' active' : ''}`}
                    onClick={() => setShowTracker(v => !v)}
                    aria-pressed={showTracker}
                    aria-label={showTracker ? 'Close progress graph' : 'Open progress graph'}
                  >
                    Progress Graph
                  </button>
                  <button
                    type="button"
                    className={`organ-camera-toggle ${showCamera ? 'active' : ''}`}
                    onClick={() => setShowCamera(v => !v)}
                  >
                    {showCamera ? '✕ Hide camera' : '📷 Watch shoulders'}
                  </button>
                </div>
              </div>

              {/* Body: guide + optional camera */}
              <div className={`organ-active-body${showCamera ? ' with-camera' : ''}`}>
                <div className="organ-guide-wrap">

                  {activeExercise === 'sss-hiss' && (
                    <SSSHissGuide
                      inline
                      onClose={exitExercise}
                      onSessionSaved={() => {
                        fetchAllCounts()
                        setSessionRepCount(c => c + 1)
                        if (showTracker) fetchDrawerData('sss-hiss')
                      }}
                    />
                  )}

                  {activeExercise === 'ha-pulses' && activeEx && (
                    <TimedExerciseInline
                      exerciseId="ha-pulses"
                      title={activeEx.title}
                      steps={activeEx.steps}
                      cues={HA_CUES}
                      onDone={dur => saveSession('ha-pulses', dur)}
                      onExit={exitExercise}
                    />
                  )}

                  {activeEx && !['sss-hiss', 'ha-pulses'].includes(activeExercise) && (
                    <TimedExerciseInline
                      exerciseId={activeExercise}
                      title={activeEx.title}
                      steps={activeEx.steps}
                      onDone={dur => saveSession(activeExercise, dur)}
                      onExit={exitExercise}
                    />
                  )}

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
          )
        })()}
      </div>

      {/* ── Progress drawer overlay ─────────────────────────────────────── */}
      {showTracker && (
        <div
          className="progress-drawer-backdrop"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowTracker(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Progress graph"
        >
          <div className="progress-drawer-panel">
            <div className="progress-drawer-header">
              <div className="organ-tracker-heading">
                <span className="organ-tracker-heading-title">Progress Tracker</span>
                <span className="organ-tracker-heading-sub">{drawerExLabel}</span>
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

            {drawerLoading ? (
              <p className="organ-tracker-loading">Loading…</p>
            ) : activeExercise === 'sss-hiss' ? (
              /* SSS Hiss: duration-based charts */
              <>
                <div className="organ-tracker-section">
                  <div className="organ-tracker-section-label">Daily best</div>
                  <div className="organ-tracker-section-sub">
                    Best hold duration per calendar day.
                  </div>
                  <ProgressChart sessions={drawerData.daily} targetSec={45} unit="s" />
                </div>
                <div className="organ-tracker-section">
                  <div className="organ-tracker-section-label">All attempts</div>
                  <div className="organ-tracker-section-sub">
                    Every rep in order — dashed lines mark day boundaries.
                  </div>
                  <AttemptsChart attempts={drawerData.raw} targetSec={45} unit="s" />
                </div>
              </>
            ) : (
              /* Other exercises: completion count charts */
              <>
                <div className="organ-tracker-section">
                  <div className="organ-tracker-section-label">Completions this month</div>
                  <div className="organ-tracker-section-sub">
                    Number of times you marked this exercise done per day.
                  </div>
                  <DailyCountChart attempts={drawerData.raw} />
                </div>
                <div className="organ-tracker-section organ-tracker-total-row">
                  <div className="organ-tracker-section-label">Total this month</div>
                  <div className="organ-tracker-total-value">
                    {drawerData.raw.length}
                    <span className="organ-tracker-total-unit"> sessions</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
