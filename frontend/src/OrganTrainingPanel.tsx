import { useState, useEffect, useRef, useCallback } from 'react'
import './OrganTrainingPanel.css'
import {
  BREATH_CONTROL_ESSENTIAL_FIVE,
  BREATH_CONTROL_ESSENTIAL_SUMMARY,
  type BreathEssentialItem,
} from './vocalOrgans'
import SSSHissGuide from './SSSHissGuide'
import HissChart, { type HissSession } from './HissChart'

const API = 'http://localhost:8765'

type Props = {
  panelWidthPx?: number
}

export default function OrganTrainingPanel({ panelWidthPx }: Props) {
  const [expandedEx, setExpandedEx] = useState<Set<number>>(new Set())
  const [guideOpen, setGuideOpen]   = useState(false)
  const [hissSessions, setHissSessions] = useState<HissSession[]>([])

  const fetchHissHistory = useCallback(() => {
    fetch(`${API}/api/exercise-sessions?exerciseId=sss-hiss`)
      .then(r => r.json())
      .then((data: HissSession[]) => setHissSessions(data))
      .catch(() => {})
  }, [])

  // Index of the SSS Hiss exercise (guideId === 'sss-hiss')
  const hissIdx = BREATH_CONTROL_ESSENTIAL_FIVE.findIndex(e => e.guideId === 'sss-hiss')

  function toggleEx(i: number) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  // Fetch SSS Hiss history whenever that card is expanded.
  useEffect(() => {
    if (expandedEx.has(hissIdx)) fetchHissHistory()
  }, [expandedEx, hissIdx, fetchHissHistory])

  useEffect(() => {
    if (!guideOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setGuideOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guideOpen])

  return (
    <>
      {guideOpen && (
        <SSSHissGuide
          onClose={() => setGuideOpen(false)}
          onSessionSaved={fetchHissHistory}
        />
      )}
      <aside
        className="organ-panel"
        style={panelWidthPx !== undefined ? { width: panelWidthPx, flexShrink: 0 } : undefined}
      >
        <div className="organ-panel-inner">

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
                        <>
                          <div className="organ-exercise-chart-header">Progress — daily best</div>
                          <HissChart sessions={hissSessions} />
                          <button
                            type="button"
                            className="organ-exercise-start-btn"
                            onClick={() => setGuideOpen(true)}
                          >
                            Start Exercise
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </aside>
    </>
  )
}
