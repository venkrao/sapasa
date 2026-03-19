import { useEffect, useMemo, useRef, useState } from 'react'
import { JI_RATIOS, SWARA_COLORS } from './swaras'
import './EarTrainerPanel.css'

type BasePitch = { label: string; hz: number }

const BASE_PITCHES: BasePitch[] = [
  { label: 'C3', hz: 130.81 },
  { label: 'C#3', hz: 138.59 },
  { label: 'D3', hz: 146.83 },
  { label: 'D#3', hz: 155.56 },
  { label: 'E3', hz: 164.81 },
  { label: 'F3', hz: 174.61 },
  { label: 'F#3', hz: 185.0 },
  { label: 'G3', hz: 196.0 },
  { label: 'G#3', hz: 207.65 },
  { label: 'A3', hz: 220.0 },
  { label: 'A#3', hz: 233.08 },
  { label: 'B3', hz: 246.94 },
  { label: 'C4 (default)', hz: 261.63 },
]

type RatioKey = keyof typeof JI_RATIOS

type SwaraDef = {
  short: string
  fullName: string
  ratioKey: RatioKey
  color: string
  pitchGroupId: string
  /** Optional secondary short name shown for pitch-overlap grouping. */
  secondaryShort?: string
  ratio: number
  /** Other swaras that are acoustically identical (shared ratio). */
  aliases: string[]
}

const SV: Array<Omit<SwaraDef, 'color' | 'ratio' | 'aliases'>> = [
  { short: 'Sa', fullName: 'Shadja (Sa)', ratioKey: 'Sa', pitchGroupId: 'Sa' },
  { short: 'Ri1', fullName: 'Shuddha Rishabha (Ri1)', ratioKey: 'R1', pitchGroupId: 'R1' },
  {
    short: 'Ri2',
    fullName: 'Chatushruti Rishabha (Ri2)',
    ratioKey: 'R2',
    pitchGroupId: 'R2/G1',
    secondaryShort: 'Ga1',
  },
  {
    short: 'Ga1',
    fullName: 'Shuddha Gandhara (Ga1)',
    ratioKey: 'R2',
    pitchGroupId: 'R2/G1',
    secondaryShort: 'Ri2',
  },
  {
    short: 'Ri3',
    fullName: 'Shatsruti Rishabha (Ri3)',
    ratioKey: 'R3',
    pitchGroupId: 'R3/G2',
    secondaryShort: 'Ga2',
  },
  {
    short: 'Ga2',
    fullName: 'Sadharana Gandhara (Ga2)',
    ratioKey: 'R3',
    pitchGroupId: 'R3/G2',
    secondaryShort: 'Ri3',
  },
  { short: 'Ga3', fullName: 'Antara Gandhara (Ga3)', ratioKey: 'G3', pitchGroupId: 'G3' },
  { short: 'Ma1', fullName: 'Shuddha Madhyama (Ma1)', ratioKey: 'M1', pitchGroupId: 'M1' },
  { short: 'Ma2', fullName: 'Prati Madhyama (Ma2)', ratioKey: 'M2', pitchGroupId: 'M2' },
  { short: 'Pa', fullName: 'Panchama (Pa)', ratioKey: 'Pa', pitchGroupId: 'Pa' },
  { short: 'Dha1', fullName: 'Shuddha Dhaivata (Dha1)', ratioKey: 'D1', pitchGroupId: 'D1' },
  {
    short: 'Dha2',
    fullName: 'Chatushruti Dhaivata (Dha2)',
    ratioKey: 'D2',
    pitchGroupId: 'D2/N1',
    secondaryShort: 'Ni1',
  },
  {
    short: 'Ni1',
    fullName: 'Shuddha Nishada (Ni1)',
    ratioKey: 'D2',
    pitchGroupId: 'D2/N1',
    secondaryShort: 'Dha2',
  },
  { short: 'Ni2', fullName: 'Kaisiki Nishada (Ni2)', ratioKey: 'D3', pitchGroupId: 'D3/N2' },
  { short: 'Ni3', fullName: 'Kakali Nishada (Ni3)', ratioKey: 'N3', pitchGroupId: 'N3' },
  { short: "Sa'", fullName: "Tara Shadja (Sa')", ratioKey: "Sa'", pitchGroupId: "Sa'" },
]

function computeRatio(ratioKey: RatioKey): number {
  const [num, den] = JI_RATIOS[ratioKey]
  return num / den
}

export default function EarTrainerPanel() {
  const [basePitchHz, setBasePitchHz] = useState(261.63) // C4 default
  const [noteDurationSec, setNoteDurationSec] = useState(1.5)
  const [activeSwara, setActiveSwara] = useState<string | null>(null)
  const [lastPlayedHz, setLastPlayedHz] = useState<number | null>(null)
  const [tonePreset, setTonePreset] = useState<TonePreset>('carnatic')

  const audioCtxRef = useRef<AudioContext | null>(null)
  const currentOscRef = useRef<OscillatorNode | null>(null)
  const currentGainRef = useRef<GainNode | null>(null)
  const currentFilterRef = useRef<BiquadFilterNode | null>(null)
  const activeResetTimerRef = useRef<number | null>(null)

  // ── Quiz mode state machine ───────────────────────────────────────────
  type QuizPhase = 'idle' | 'listening' | 'answered'
  type TonePreset = 'carnatic' | 'sine' | 'square' | 'sawtooth' | 'guitar' | 'piano'
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle')
  const [mysterySwara, setMysterySwara] = useState<SwaraDef | null>(null)
  const [userGuess, setUserGuess] = useState<SwaraDef | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 })
  const [endSummary, setEndSummary] = useState<{ correct: number; total: number } | null>(null)

  const swaras: SwaraDef[] = useMemo(() => {
    const base = SV.map(s => {
      const color = SWARA_COLORS[s.ratioKey]
      const ratio = computeRatio(s.ratioKey)
      return { ...s, color, ratio, aliases: [] as string[] }
    })

    // Fill aliases based on shared ratioKey (acoustically identical).
    const byRatioKey = new Map<RatioKey, SwaraDef[]>()
    for (const s of base) {
      const arr = byRatioKey.get(s.ratioKey) ?? []
      arr.push(s)
      byRatioKey.set(s.ratioKey, arr)
    }

    for (const group of byRatioKey.values()) {
      const shorts = group.map(s => s.short)
      for (const s of group) {
        s.aliases = shorts.filter(x => x !== s.short)
      }
    }

    return base
  }, [])

  function ensureAudioContext(): AudioContext {
    if (audioCtxRef.current) return audioCtxRef.current

    // Create lazily on first user gesture.
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
    if (!AudioCtx) throw new Error('Web Audio API is not supported in this browser.')
    audioCtxRef.current = new AudioCtx()
    return audioCtxRef.current
  }

  function stopCurrentNote() {
    const osc = currentOscRef.current
    const gain = currentGainRef.current
    const filter = currentFilterRef.current

    try {
      osc?.stop()
    } catch {
      // Ignore errors from stopping an already-stopped oscillator.
    }
    try {
      osc?.disconnect()
    } catch {
      // ignore
    }
    try {
      filter?.disconnect()
    } catch {
      // ignore
    }
    try {
      gain?.disconnect()
    } catch {
      // ignore
    }

    currentOscRef.current = null
    currentGainRef.current = null
    currentFilterRef.current = null
  }

  useEffect(() => {
    return () => {
      if (activeResetTimerRef.current) window.clearTimeout(activeResetTimerRef.current)
      stopCurrentNote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toneConfig(freqHz: number): {
    oscType: OscillatorType
    maxGain: number
    attackTimeSec: number
    useFilter: boolean
    filterFreqHz: number
    filterQ: number
  } {
    // Keep envelope behavior aligned with the spec.
    // "Tone presets" only change oscillator/filter timbre.
    switch (tonePreset) {
      case 'sine':
        return { oscType: 'sine', maxGain: 0.28, attackTimeSec: 0.02, useFilter: false, filterFreqHz: 0, filterQ: 0 }
      case 'square':
        return { oscType: 'square', maxGain: 0.18, attackTimeSec: 0.01, useFilter: false, filterFreqHz: 0, filterQ: 0 }
      case 'sawtooth':
        return { oscType: 'sawtooth', maxGain: 0.22, attackTimeSec: 0.015, useFilter: false, filterFreqHz: 0, filterQ: 0 }
      case 'guitar': {
        const cutoff = Math.min(2400, Math.max(450, freqHz * 1.9))
        return { oscType: 'sawtooth', maxGain: 0.2, attackTimeSec: 0.012, useFilter: true, filterFreqHz: cutoff, filterQ: 0.9 }
      }
      case 'piano': {
        const cutoff = Math.min(3200, Math.max(600, freqHz * 2.4))
        return { oscType: 'triangle', maxGain: 0.2, attackTimeSec: 0.008, useFilter: true, filterFreqHz: cutoff, filterQ: 0.7 }
      }
      case 'carnatic':
      default:
        return { oscType: 'triangle', maxGain: 0.33, attackTimeSec: 0.02, useFilter: false, filterFreqHz: 0, filterQ: 0 }
    }
  }

  async function playSwara(def: SwaraDef, opts?: { highlight?: boolean }) {
    const ctx = ensureAudioContext()
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // ignore; play attempt below may still work
      }
    }

    // Single-voice: stop anything currently playing.
    stopCurrentNote()

    const freq = basePitchHz * def.ratio
    setLastPlayedHz(freq)
    const now = ctx.currentTime

    const releaseEndTime = now + Math.max(0.08, noteDurationSec)
    const nearZero = 0.0001

    const cfg = toneConfig(freq)

    const osc = ctx.createOscillator()
    osc.type = cfg.oscType
    osc.frequency.setValueAtTime(freq, now)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(nearZero, now)
    gain.gain.linearRampToValueAtTime(cfg.maxGain, now + cfg.attackTimeSec)
    gain.gain.exponentialRampToValueAtTime(nearZero, releaseEndTime)

    if (cfg.useFilter) {
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(cfg.filterFreqHz, now)
      filter.Q.setValueAtTime(cfg.filterQ, now)
      osc.connect(filter)
      filter.connect(gain)
      currentFilterRef.current = filter
    } else {
      osc.connect(gain)
      currentFilterRef.current = null
    }
    gain.connect(ctx.destination)

    osc.start(now)
    // Keep stop aligned with the envelope end to avoid lingering clicks.
    osc.stop(releaseEndTime + 0.05)

    currentOscRef.current = osc
    currentGainRef.current = gain

    if (opts?.highlight ?? true) setActiveSwara(def.short)
    else setActiveSwara(null)

    if (activeResetTimerRef.current) window.clearTimeout(activeResetTimerRef.current)
    activeResetTimerRef.current = window.setTimeout(
      () => setActiveSwara(null),
      Math.ceil(noteDurationSec * 1000) + 80,
    )
  }

  function isAnswerCorrect(def: SwaraDef, mystery: SwaraDef): boolean {
    // Spec prefers alias/short acceptance for shared-pitch pairs.
    return def.short === mystery.short || mystery.aliases.includes(def.short)
  }

  async function playConfirmTone(correct: boolean) {
    const ctx = ensureAudioContext()
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // ignore
      }
    }

    // Single-voice: stop anything currently playing.
    stopCurrentNote()

    const now = ctx.currentTime
    const durationSec = correct ? 0.12 : 0.16
    const attackTimeSec = 0.01
    const maxGain = 0.22
    const nearZero = 0.0001

    const osc = ctx.createOscillator()
    osc.type = correct ? 'sine' : 'square'
    // Correct: high ping. Wrong: lower short buzz.
    const freq = correct ? Math.max(1100, basePitchHz * 4) : Math.min(300, Math.max(90, basePitchHz / 3))
    osc.frequency.setValueAtTime(freq, now)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(nearZero, now)
    gain.gain.linearRampToValueAtTime(maxGain, now + attackTimeSec)
    gain.gain.exponentialRampToValueAtTime(nearZero, now + durationSec)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + durationSec + 0.05)

    currentOscRef.current = osc
    currentGainRef.current = gain

    // Confirm tones don't need persistent visual "playing" highlight.
    setActiveSwara(null)
  }

  function startRound() {
    const next = swaras[Math.floor(Math.random() * swaras.length)]
    setMysterySwara(next)
    setUserGuess(null)
    setIsCorrect(null)
    setQuizPhase('listening')
    setEndSummary(null)
    playSwara(next, { highlight: false })
  }

  function startQuiz() {
    setScore({ correct: 0, total: 0 })
    setEndSummary(null)
    startRound()
  }

  function nextNote() {
    // Score persists across rounds.
    startRound()
  }

  function endQuiz() {
    if (quizPhase === 'idle') return

    const { correct, total } = score
    setQuizPhase('idle')
    setMysterySwara(null)
    setUserGuess(null)
    setIsCorrect(null)
    setScore({ correct: 0, total: 0 })
    setEndSummary({ correct, total })

    stopCurrentNote()
  }

  // Layout order: Row1 = Sa..Ma1 (8 keys), Row2 = Ma2..Sa' (8 keys).
  const keyboardOrder = useMemo(() => {
    const byShort = new Map(swaras.map(s => [s.short, s]))
    const row1 = ['Sa', 'Ri1', 'Ri2', 'Ga1', 'Ri3', 'Ga2', 'Ga3', 'Ma1'].map(k => byShort.get(k)!)
    const row2 = ["Ma2", 'Pa', 'Dha1', 'Dha2', 'Ni1', 'Ni2', 'Ni3', "Sa'"].map(k => byShort.get(k)!)
    return [...row1, ...row2]
  }, [swaras])

  const correctSet = useMemo(() => {
    if (!mysterySwara) return new Set<string>()
    return new Set([mysterySwara.short, ...mysterySwara.aliases])
  }, [mysterySwara])

  return (
    <div className="ear-panel">
      <div className="ear-controls">
        <div className="ear-control-block">
          <div className="ear-label">Base pitch (Sa)</div>
          <select
            className="ear-select"
            value={basePitchHz}
            onChange={e => setBasePitchHz(Number(e.target.value))}
          >
            {BASE_PITCHES.map(p => (
              <option key={p.label} value={p.hz}>
                {p.label} — {p.hz.toFixed(2)} Hz
              </option>
            ))}
          </select>
        </div>

        <div className="ear-control-block">
          <div className="ear-label">Note duration</div>
          <div className="ear-duration-row">
            <input
              className="ear-range"
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={noteDurationSec}
              onChange={e => setNoteDurationSec(Number(e.target.value))}
            />
            <span className="ear-duration-value">{noteDurationSec.toFixed(1)}s</span>
          </div>
        </div>

        <div className="ear-control-block">
          <div className="ear-tone-top-row">
            <div className="ear-label">Tone preset</div>
            {quizPhase === 'idle' ? (
              <button
                className="ear-quiz-btn ear-quiz-btn-primary ear-quiz-start-top"
                type="button"
                onClick={startQuiz}
              >
                Start Quiz
              </button>
            ) : null}
          </div>
          <select
            className="ear-select"
            value={tonePreset}
            onChange={e => setTonePreset(e.target.value as TonePreset)}
          >
            <option value="carnatic">Carnatic (triangle)</option>
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="guitar">Guitar-ish (filtered)</option>
            <option value="piano">Piano-ish (filtered)</option>
          </select>
        </div>
      </div>

      {quizPhase !== 'idle' || endSummary ? (
        <div className="ear-quiz-controls" aria-live="polite">
          {quizPhase !== 'idle' ? (
            <div className="ear-quiz-header">
              <div className="ear-quiz-score">
                Score: {score.correct} / {score.total}
              </div>
              <button
                className="ear-quiz-btn ear-quiz-btn-end"
                type="button"
                onClick={endQuiz}
                title="End quiz"
              >
                ✕ End Quiz
              </button>
            </div>
          ) : null}

          {quizPhase === 'listening' ? (
            <div className="ear-quiz-phase">
              <div className="ear-quiz-prompt">🔊 Which swara was that?</div>
              <div className="ear-quiz-actions">
                <button
                  className="ear-quiz-btn"
                  type="button"
                  onClick={() => {
                    if (!mysterySwara) return
                    playSwara(mysterySwara, { highlight: false })
                  }}
                >
                  Replay
                </button>
              </div>
            </div>
          ) : null}

          {quizPhase === 'answered' && mysterySwara ? (
            <div className="ear-quiz-phase">
              {isCorrect ? (
                <div className="ear-quiz-result">
                  ✅ Correct! That was <strong>{mysterySwara.short}</strong>
                </div>
              ) : (
                <div className="ear-quiz-result">
                  ❌ Not quite. Correct answer: <strong>{mysterySwara.short}</strong>
                </div>
              )}

              <div className="ear-quiz-actions">
                {!isCorrect ? (
                  <button
                    className="ear-quiz-btn"
                    type="button"
                    onClick={() => {
                      playSwara(mysterySwara, { highlight: false })
                    }}
                  >
                    Replay Correct Note
                  </button>
                ) : null}

                <button className="ear-quiz-btn ear-quiz-btn-primary" type="button" onClick={nextNote}>
                  Next Note
                </button>
              </div>
            </div>
          ) : null}

          {quizPhase === 'idle' && endSummary ? (
            <div className="ear-quiz-summary">
              You got {endSummary.correct} / {endSummary.total} correct
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="ear-keyboard" role="group" aria-label="Swaras keyboard">
        {keyboardOrder.map(def => {
          const isPlaying = activeSwara === def.short
          const isAnswered = quizPhase === 'answered'
          const keyIsCorrect = isAnswered ? correctSet.has(def.short) : false
          const keyIsWrong =
            isAnswered && isCorrect === false && userGuess ? def.short === userGuess.short : false

          // In ANSWERED, only correct/wrong buttons stay enabled; all others are dimmed/disabled.
          const disabledInAnswered = isAnswered ? !(keyIsCorrect || keyIsWrong) : false

          const className =
            'ear-swara-key ' +
            (isPlaying ? 'ear-swara-playing ' : '') +
            (keyIsCorrect ? 'ear-swara-correct ' : '') +
            (keyIsWrong ? 'ear-swara-wrong ' : '') +
            (isAnswered && !keyIsCorrect && !keyIsWrong ? 'ear-swara-dim ' : '')

          return (
            <button
              key={def.short}
              type="button"
              className={className.trim()}
              onClick={() => {
                if (quizPhase === 'idle') {
                  playSwara(def, { highlight: true })
                  return
                }
                if (quizPhase === 'listening') {
                  if (!mysterySwara) return
                  setUserGuess(def)
                  const correct = isAnswerCorrect(def, mysterySwara)
                  setIsCorrect(correct)
                  setQuizPhase('answered')
                  setScore(prev => ({
                    total: prev.total + 1,
                    correct: prev.correct + (correct ? 1 : 0),
                  }))
                  playConfirmTone(correct)
                  return
                }
              }}
              disabled={disabledInAnswered}
              aria-label={def.fullName}
              aria-pressed={isPlaying}
              title={def.fullName}
              style={
                {
                  '--ear-accent': def.color,
                } as React.CSSProperties
              }
            >
              <span className="ear-key-main">{def.short}</span>
              {def.secondaryShort ? <span className="ear-key-secondary">/{def.secondaryShort}</span> : null}
              <span className="ear-key-badge" aria-hidden="true">
                {isPlaying ? 'Playing' : ''}
              </span>
            </button>
          )
        })}
      </div>

      {quizPhase === 'idle' && activeSwara && lastPlayedHz ? (
        <div className="ear-playinfo" role="status" aria-live="polite">
          Playing: <span className="ear-playinfo-swara">{activeSwara}</span> —{' '}
          <span className="ear-playinfo-hz">{lastPlayedHz.toFixed(2)} Hz</span>
        </div>
      ) : null}
    </div>
  )
}

