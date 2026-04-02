import { useState, useEffect, useRef } from 'react'
import './OrganTrainingPanel.css'
import {
  BREATH_CONTROL_ESSENTIAL_FIVE,
  BREATH_CONTROL_ESSENTIAL_SUMMARY,
  type BreathEssentialItem,
} from './vocalOrgans'
import SSSHissGuide from './SSSHissGuide'

type Props = {
  panelWidthPx?: number
}

export default function OrganTrainingPanel({ panelWidthPx }: Props) {
  const [expandedEx, setExpandedEx] = useState<Set<number>>(new Set())
  const [guideOpen, setGuideOpen]   = useState(false)

  function toggleEx(i: number) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  useEffect(() => {
    if (!guideOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setGuideOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guideOpen])

  return (
    <>
      {guideOpen && <SSSHissGuide onClose={() => setGuideOpen(false)} />}
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
                      {isGuided ? (
                        <button
                          type="button"
                          className="organ-exercise-start-btn"
                          onClick={() => setGuideOpen(true)}
                        >
                          Start Exercise
                        </button>
                      ) : (
                        <>
                          <p className="organ-exercise-desc">{ex.body}</p>
                          <div className="organ-exercise-inhale">
                            <span className="organ-exercise-inhale-label">Inhale through</span>
                            <span className="organ-exercise-inhale-channel">{ex.inhaleThrough}</span>
                            <span className="organ-exercise-inhale-why">{ex.inhaleWhy}</span>
                          </div>
                          <a
                            className="organ-exercise-source"
                            href={ex.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {ex.sourceLabel}
                          </a>
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
