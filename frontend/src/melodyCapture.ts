export type MelodyFrame = {
  tMs: number
  freq: number | null
}

export type MelodyNoteEvent = {
  startMs: number
  endMs: number
  durMs: number
  freqHz: number
  midi: number
  velocity: number
}

export type MatchedNote = {
  refIndex: number
  attemptIndex: number
  pitchCentsError: number
  onsetErrorMs: number
  durationErrorMs: number
  confidence: number
}

export type PerformanceAnalysis = {
  matched: MatchedNote[]
  unmatchedReference: number[]
  unmatchedAttempt: number[]
  averageConfidence: number
  pitchScore: number
  rhythmScore: number
  stabilityScore: number
  overallScore: number
  dominantPitchBias: 'sharp' | 'flat' | 'balanced'
  dominantTimingBias: 'early' | 'late' | 'balanced'
  summaryLines: string[]
}

export type MelodyExtractConfig = {
  minNoteMs: number
  endSilenceMs: number
  minFreqHz: number
  maxFreqHz: number
  /**
   * If pitch moves by this many cents and stays there for a short window,
   * split into a new note even without silence.
   */
  splitCentsThreshold: number
  /** Minimum dwell time at new pitch center before committing a split. */
  splitMinStableMs: number
}

export const DEFAULT_MELODY_EXTRACT_CONFIG: MelodyExtractConfig = {
  // Aggressive capture defaults (can tune up later if over-segmenting).
  minNoteMs: 55,
  endSilenceMs: 90,
  minFreqHz: 80,
  maxFreqHz: 1200,
  splitCentsThreshold: 75,
  splitMinStableMs: 60,
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function hzToMidi(hz: number): number {
  const midi = 69 + 12 * Math.log2(hz / 440)
  return Math.max(21, Math.min(108, Math.round(midi)))
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function scoreLinear(absErr: number, best: number, worst: number): number {
  if (absErr <= best) return 1
  if (absErr >= worst) return 0
  return 1 - (absErr - best) / (worst - best)
}

function centsBetweenHz(aHz: number, bHz: number): number {
  return Math.abs(1200 * Math.log2(aHz / bHz))
}

export function extractMelodyNoteEvents(
  frames: MelodyFrame[],
  cfg: MelodyExtractConfig = DEFAULT_MELODY_EXTRACT_CONFIG,
): MelodyNoteEvent[] {
  if (frames.length === 0) return []
  const events: MelodyNoteEvent[] = []

  let runStartT: number | null = null
  let lastVoicedT: number | null = null
  let voicedFreqs: number[] = []
  const baseT = frames[0].tMs

  // Candidate "new note" cluster while still voiced, used for pitch-change split.
  let pendingSplitStartT: number | null = null
  let pendingSplitFreqs: number[] = []

  const resetPendingSplit = () => {
    pendingSplitStartT = null
    pendingSplitFreqs = []
  }

  const closeRun = (endTOverride?: number | null) => {
    if (runStartT == null || lastVoicedT == null || voicedFreqs.length === 0) {
      resetPendingSplit()
      return
    }
    const endT = endTOverride != null ? endTOverride : lastVoicedT
    const durMs = endT - runStartT
    if (durMs >= cfg.minNoteMs) {
      const freqHz = median(voicedFreqs)
      const midi = hzToMidi(freqHz)
      events.push({
        startMs: Math.max(0, runStartT - baseT),
        endMs: Math.max(0, endT - baseT),
        durMs,
        freqHz,
        midi,
        velocity: 0.72,
      })
    }
    runStartT = null
    lastVoicedT = null
    voicedFreqs = []
    resetPendingSplit()
  }

  for (const frame of frames) {
    const voiced = frame.freq != null && frame.freq >= cfg.minFreqHz && frame.freq <= cfg.maxFreqHz
    if (voiced) {
      if (runStartT == null) runStartT = frame.tMs
      lastVoicedT = frame.tMs
      voicedFreqs.push(frame.freq!)

      // Aggressive split on stable pitch jump (handles legato singing with little silence).
      if (voicedFreqs.length >= 3) {
        const currentCenterHz = median(voicedFreqs)
        const jumpCents = centsBetweenHz(frame.freq!, currentCenterHz)

        if (jumpCents >= cfg.splitCentsThreshold) {
          if (pendingSplitStartT == null) {
            pendingSplitStartT = frame.tMs
            pendingSplitFreqs = [frame.freq!]
          } else {
            pendingSplitFreqs.push(frame.freq!)
          }
        } else {
          // Drifted back toward center: cancel pending split candidate.
          resetPendingSplit()
        }

        if (
          pendingSplitStartT != null &&
          frame.tMs - pendingSplitStartT >= cfg.splitMinStableMs &&
          pendingSplitFreqs.length >= 2
        ) {
          // Commit current run up to just before split cluster,
          // then start a fresh run from split cluster.
          const splitStartT = pendingSplitStartT
          const preSplitFreqCount = voicedFreqs.length - pendingSplitFreqs.length
          if (preSplitFreqCount >= 1) {
            const preSplitFreqs = voicedFreqs.slice(0, preSplitFreqCount)
            const preSplitLastT = splitStartT - 1
            const preDurMs = preSplitLastT - runStartT
            if (preDurMs >= cfg.minNoteMs) {
              const preHz = median(preSplitFreqs)
              events.push({
                startMs: Math.max(0, runStartT - baseT),
                endMs: Math.max(0, preSplitLastT - baseT),
                durMs: preDurMs,
                freqHz: preHz,
                midi: hzToMidi(preHz),
                velocity: 0.72,
              })
            }
          }

          runStartT = splitStartT
          voicedFreqs = [...pendingSplitFreqs]
          lastVoicedT = frame.tMs
          resetPendingSplit()
        }
      }
      continue
    }
    if (runStartT != null && lastVoicedT != null && frame.tMs - lastVoicedT > cfg.endSilenceMs) {
      closeRun()
    }
  }

  closeRun()
  return events
}

export function analyzeMelodyPerformance(
  reference: MelodyNoteEvent[],
  attempt: MelodyNoteEvent[],
): PerformanceAnalysis {
  const MAX_ONSET_WINDOW_MS = 450
  const MAX_PITCH_WINDOW_CENTS = 180
  const MAX_DURATION_RATIO = 2.5

  const matched: MatchedNote[] = []
  const unmatchedReference: number[] = []
  const unmatchedAttempt = new Set<number>(attempt.map((_, i) => i))
  let attemptCursor = 0

  for (let ri = 0; ri < reference.length; ri++) {
    const ref = reference[ri]
    let bestIdx = -1
    let bestCost = Number.POSITIVE_INFINITY
    for (let ai = attemptCursor; ai < attempt.length; ai++) {
      const att = attempt[ai]
      const onsetErr = att.startMs - ref.startMs
      if (Math.abs(onsetErr) > MAX_ONSET_WINDOW_MS) {
        if (att.startMs > ref.startMs + MAX_ONSET_WINDOW_MS) break
        continue
      }
      const centsErr = 1200 * Math.log2(att.freqHz / ref.freqHz)
      if (Math.abs(centsErr) > MAX_PITCH_WINDOW_CENTS) continue
      const durationRatio = Math.max(att.durMs, ref.durMs) / Math.max(1, Math.min(att.durMs, ref.durMs))
      if (durationRatio > MAX_DURATION_RATIO) continue
      const cost =
        (Math.abs(centsErr) / MAX_PITCH_WINDOW_CENTS) * 0.6 +
        (Math.abs(onsetErr) / MAX_ONSET_WINDOW_MS) * 0.3 +
        ((durationRatio - 1) / (MAX_DURATION_RATIO - 1)) * 0.1
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = ai
      }
    }

    if (bestIdx < 0) {
      unmatchedReference.push(ri)
      continue
    }
    const att = attempt[bestIdx]
    const pitchCentsError = 1200 * Math.log2(att.freqHz / ref.freqHz)
    const onsetErrorMs = att.startMs - ref.startMs
    const durationErrorMs = att.durMs - ref.durMs
    const confidence = clamp01(1 - bestCost)
    matched.push({ refIndex: ri, attemptIndex: bestIdx, pitchCentsError, onsetErrorMs, durationErrorMs, confidence })
    unmatchedAttempt.delete(bestIdx)
    attemptCursor = bestIdx + 1
  }

  const matchedCount = matched.length
  const coverage = reference.length > 0 ? matchedCount / reference.length : 0
  const pitchBase =
    matchedCount === 0
      ? 0
      : matched.reduce((acc, m) => acc + scoreLinear(Math.abs(m.pitchCentsError), 10, 120), 0) / matchedCount
  const rhythmBase =
    matchedCount === 0
      ? 0
      : matched.reduce((acc, m) => acc + scoreLinear(Math.abs(m.onsetErrorMs), 40, 350), 0) / matchedCount
  const durErrAvg =
    matchedCount === 0 ? 1 : matched.reduce((acc, m) => acc + Math.min(1, Math.abs(m.durationErrorMs) / 500), 0) / matchedCount
  const fragmentation =
    reference.length === 0 ? 1 : Math.min(1, Math.abs(attempt.length - reference.length) / reference.length)
  const stabilityBase = clamp01(1 - (0.6 * durErrAvg + 0.4 * fragmentation))

  const pitchScore = Math.round(100 * pitchBase * (0.4 + 0.6 * coverage))
  const rhythmScore = Math.round(100 * rhythmBase * (0.4 + 0.6 * coverage))
  const stabilityScore = Math.round(100 * stabilityBase)
  const overallScore = Math.round(pitchScore * 0.5 + rhythmScore * 0.35 + stabilityScore * 0.15)
  const averageConfidence =
    matchedCount === 0 ? 0 : matched.reduce((acc, m) => acc + m.confidence, 0) / matchedCount

  const pitchBiasAvg = matchedCount === 0 ? 0 : matched.reduce((acc, m) => acc + m.pitchCentsError, 0) / matchedCount
  const timingBiasAvg = matchedCount === 0 ? 0 : matched.reduce((acc, m) => acc + m.onsetErrorMs, 0) / matchedCount
  const dominantPitchBias = pitchBiasAvg > 8 ? 'sharp' : pitchBiasAvg < -8 ? 'flat' : 'balanced'
  const dominantTimingBias = timingBiasAvg > 30 ? 'late' : timingBiasAvg < -30 ? 'early' : 'balanced'

  const summaryLines = [
    `Matched ${matchedCount}/${reference.length} reference notes.`,
    dominantPitchBias === 'balanced'
      ? 'Pitch center looked balanced.'
      : `Pitch tendency: mostly ${dominantPitchBias}.`,
    dominantTimingBias === 'balanced'
      ? 'Timing felt mostly centered.'
      : `Timing tendency: entries were generally ${dominantTimingBias}.`,
    coverage < 0.5
      ? 'Try a clearer second attempt with stronger vocal signal and consistent tempo.'
      : 'Next step: repeat once more and target tighter note starts on phrase transitions.',
  ]

  return {
    matched,
    unmatchedReference,
    unmatchedAttempt: Array.from(unmatchedAttempt),
    averageConfidence,
    pitchScore,
    rhythmScore,
    stabilityScore,
    overallScore,
    dominantPitchBias,
    dominantTimingBias,
    summaryLines,
  }
}

