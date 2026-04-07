import { useCallback, useEffect, useRef, useState } from 'react'
import './SSSHissGuide.css'

type Phase = 'ready' | 'inhale' | 'hiss' | 'done'

function formatSec(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}

const API = 'http://localhost:8765'

export default function SSSHissGuide({
  onClose,
  onSessionSaved,
}: {
  onClose: () => void
  onSessionSaved?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [hissMs, setHissMs] = useState(0)
  const [bestMs, setBestMs] = useState(0)

  const rafRef        = useRef<number>(0)
  const hissStartRef  = useRef<number>(0)
  const inhaleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tickHiss = useCallback(() => {
    setHissMs(Date.now() - hissStartRef.current)
    rafRef.current = requestAnimationFrame(tickHiss)
  }, [])

  function begin() {
    setPhase('inhale')
    inhaleTimeout.current = setTimeout(() => {
      hissStartRef.current = Date.now()
      setHissMs(0)
      setPhase('hiss')
      rafRef.current = requestAnimationFrame(tickHiss)
    }, 3200)
  }

  function done() {
    cancelAnimationFrame(rafRef.current)
    const held = Date.now() - hissStartRef.current
    setHissMs(held)
    setBestMs(prev => Math.max(prev, held))
    setPhase('done')

    const durationSec = held / 1000
    fetch(`${API}/api/exercise-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: 'sss-hiss', durationSec }),
    })
      .then(() => onSessionSaved?.())
      .catch(() => {})
  }

  function again() {
    cancelAnimationFrame(rafRef.current)
    setHissMs(0)
    setPhase('ready')
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (inhaleTimeout.current) clearTimeout(inhaleTimeout.current)
  }, [])

  const isNewBest = phase === 'done' && hissMs > 0 && hissMs >= bestMs

  return (
    <div
      className="sss-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="sss-card" role="dialog" aria-modal="true" aria-label="Guided SSS Hiss exercise">
        <button className="sss-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="sss-header">
          Sustained &ldquo;SSS&rdquo; Hiss
        </div>

        {/* ── Animated circle ── */}
        <div className={`sss-circle-wrap phase-${phase}`} aria-hidden="true">
          <div className="sss-circle">
            <div className="sss-circle-inner">
              {phase === 'ready' && (
                <span className="sss-phase-label">Ready</span>
              )}
              {phase === 'inhale' && (
                <span className="sss-phase-label sss-phase-inhale">Inhale…</span>
              )}
              {phase === 'hiss' && (
                <>
                  <span className="sss-phase-label sss-phase-hiss">Sssss…</span>
                  <span className="sss-elapsed" aria-live="polite">{formatSec(hissMs)}</span>
                </>
              )}
              {phase === 'done' && (
                <>
                  <span className="sss-elapsed sss-elapsed-done">{formatSec(hissMs)}</span>
                  {isNewBest && <span className="sss-new-best">Best!</span>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Cue text ── */}
        <div className="sss-instruction">
          {phase === 'ready' && (
            <ul className="sss-steps">
              <li>Inhale fully — belly <em>out</em>, chest still, shoulders down</li>
              <li>Exhale through clenched teeth as a thin, steady <em>"sssss"</em></li>
              <li>Keep the pressure <em>even</em> — no surges, no fading</li>
              <li>Press <strong>Done</strong> the moment the hiss breaks</li>
              <li className="sss-steps-target">Target: 45+ seconds</li>
            </ul>
          )}
          {phase === 'inhale' && (
            <p>Fill your lungs completely. Belly expands, chest stays still.</p>
          )}
          {phase === 'hiss' && (
            <p>Even pressure — a thin, unbroken hiss all the way to empty.</p>
          )}
          {phase === 'done' && (
            <p>
              {isNewBest ? 'Personal best this session! ' : `Best this session: ${formatSec(bestMs)}. `}
              Target is 45+ seconds.
            </p>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="sss-actions">
          {phase === 'ready' && (
            <button type="button" className="sss-btn sss-btn-begin" onClick={begin}>
              Begin
            </button>
          )}
          {phase === 'hiss' && (
            <button type="button" className="sss-btn sss-btn-done" onClick={done}>
              Done
            </button>
          )}
          {phase === 'done' && (
            <>
              <button type="button" className="sss-btn sss-btn-again" onClick={again}>
                Try again
              </button>
              <button type="button" className="sss-btn sss-btn-dismiss" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
