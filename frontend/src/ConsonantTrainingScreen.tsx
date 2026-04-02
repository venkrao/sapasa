import { useState } from 'react'
import './ConsonantTrainingScreen.css'
import {
  CONSONANT_CATEGORIES,
  CORE_PRINCIPLE,
  THREE_ROUND_DRILL,
  type ConsonantCategory,
  type DifficultyLevel,
} from './consonantTraining'

type Props = {
  onHome: () => void
}

const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
}

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  return (
    <span className={`ct-badge ct-badge-${level}`}>
      {DIFFICULTY_LABEL[level]}
    </span>
  )
}

function CategoryCard({ category }: { category: ConsonantCategory }) {
  const [open, setOpen]           = useState(false)
  const [expandedEx, setExpandedEx] = useState<Set<number>>(new Set())

  function toggleEx(i: number) {
    setExpandedEx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className={'ct-category-card' + (open ? ' open' : '')}>
      <button
        type="button"
        className="ct-category-trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="ct-category-trigger-left">
          <span className="ct-category-name">{category.name}</span>
          <span className="ct-category-examples">{category.examples}</span>
        </div>
        <div className="ct-category-trigger-right">
          <span className="ct-category-summary">{category.summary}</span>
          <span className={'ct-chevron' + (open ? ' open' : '')}>›</span>
        </div>
      </button>

      {open && (
        <div className="ct-category-body">
          <div className="ct-carnatic-relevance">
            <span className="ct-carnatic-relevance-label">Carnatic relevance</span>
            <p className="ct-carnatic-relevance-text">{category.carnaticRelevance}</p>
          </div>

          <div className="ct-exercises">
            <div className="ct-exercises-heading">
              Exercises
              <span className="ct-exercises-count">{category.exercises.length}</span>
            </div>

            {category.exercises.map((ex, i) => {
              const exOpen = expandedEx.has(i)
              return (
                <div key={ex.id} className={'ct-exercise-card' + (exOpen ? ' open' : '')}>
                  <button
                    type="button"
                    className="ct-exercise-trigger"
                    onClick={() => toggleEx(i)}
                    aria-expanded={exOpen}
                  >
                    <span className="ct-exercise-name">{ex.name}</span>
                    <div className="ct-exercise-trigger-right">
                      <DifficultyBadge level={ex.difficulty} />
                      <span className={'ct-chevron' + (exOpen ? ' open' : '')}>›</span>
                    </div>
                  </button>

                  {exOpen && (
                    <div className="ct-exercise-body">
                      <p className="ct-exercise-instructions">{ex.instructions}</p>

                      <div className="ct-exercise-meta">
                        <div className="ct-exercise-target">
                          <span className="ct-exercise-target-label">Target</span>
                          <p className="ct-exercise-target-text">{ex.target}</p>
                        </div>
                        {ex.duration && (
                          <div className="ct-exercise-duration">
                            <span className="ct-exercise-duration-icon">⏱</span>
                            {ex.duration}
                          </div>
                        )}
                      </div>

                      {ex.carnaticTip && (
                        <div className="ct-exercise-tip">
                          <span className="ct-exercise-tip-label">Carnatic tip</span>
                          <p className="ct-exercise-tip-text">{ex.carnaticTip}</p>
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
  )
}

export default function ConsonantTrainingScreen({ onHome }: Props) {
  const drill = THREE_ROUND_DRILL

  return (
    <div className="app ct-screen">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <span className="ct-header-title">Consonant Training</span>
        <div className="header-controls">
          <button className="listen-button home-nav-button" onClick={onHome} type="button">
            Home
          </button>
        </div>
      </header>

      <main className="ct-main">
        <div className="ct-content">

          {/* Core principle banner */}
          <blockquote className="ct-principle">
            <span className="ct-principle-icon">❝</span>
            <p className="ct-principle-text">{CORE_PRINCIPLE}</p>
          </blockquote>

          {/* Three-Round Drill */}
          <section className="ct-drill">
            <div className="ct-drill-header">
              <h2 className="ct-drill-name">{drill.name}</h2>
              <p className="ct-drill-description">{drill.description}</p>
            </div>

            <div className="ct-rounds">
              {drill.rounds.map((round, idx) => (
                <div key={round.number} className="ct-round">
                  {idx < drill.rounds.length - 1 && (
                    <div className="ct-round-connector" aria-hidden="true" />
                  )}
                  <div className="ct-round-number" aria-label={`Round ${round.number}`}>
                    {round.number}
                  </div>
                  <div className="ct-round-content">
                    <div className="ct-round-label">{round.label}</div>
                    <p className="ct-round-instruction">{round.instruction}</p>
                    <div className="ct-round-target">
                      <span className="ct-round-target-label">Notice</span>
                      <p className="ct-round-target-text">{round.target}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ct-drill-cue">
              <span className="ct-drill-cue-icon">✓</span>
              <p className="ct-drill-cue-text">{drill.completionCue}</p>
            </div>

            <div className="ct-drill-prompt">
              Try it now with any phrase you are currently working on.
            </div>
          </section>

          {/* Category cards */}
          <section className="ct-categories">
            <h2 className="ct-categories-heading">Consonant Categories</h2>
            <div className="ct-categories-list">
              {CONSONANT_CATEGORIES.map(cat => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
