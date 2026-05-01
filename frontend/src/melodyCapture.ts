export type MelodyFrame = {
  tMs: number
  freq: number | null
  /** YIN detector confidence from backend when present (~0.85–0.99 voiced). */
  confidence?: number
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
  splitEnterCents: number
  /** Must come back below this to cancel pending split (hysteresis). */
  splitExitCents: number
  /** Minimum dwell time at new pitch center before committing a split. */
  splitMinStableMs: number
  /** Median smoothing window over voiced frequencies (frames). */
  smoothingWindow: number
  /** Merge adjacent near-identical notes with very short gap. */
  mergeMaxGapMs: number
  mergeMaxCents: number
  /** Test mode: split very aggressively on pitch movement and short holds. */
  ultraAggressive?: boolean
  /**
   * Reduce YIN octave-doubling/halving errors by snapping each sample to {f/2,f,2f}
   * nearest to recent raw-frequency history before smoothing/segmentation.
   */
  octaveStabilize?: boolean
  /** Rolling window of prior raw Hz samples used as octave reference (median). */
  octaveStabilizeWindow?: number
  /** Candidate octave folds used while stabilizing each frame. */
  octaveCandidateFactors?: number[]
  /** Consecutive voiced frames required before accepting a true octave jump. */
  octaveJumpHoldFrames?: number
  /** Threshold for considering a frame-level move as an octave jump. */
  octaveJumpCents?: number
  /** Fix short isolated note events that are octave outliers to their neighbors. */
  postNoteOctaveCorrect?: boolean
  postNoteMaxDurMs?: number
  postNoteNeighborCents?: number
}

export type MelodyProcessingMode = 'raw' | 'piano_friendly' | 'ultra_aggressive' | 'anti_octave_aggressive'

const RAW_MELODY_EXTRACT_CONFIG: MelodyExtractConfig = {
  minNoteMs: 55,
  endSilenceMs: 90,
  minFreqHz: 80,
  maxFreqHz: 1200,
  splitEnterCents: 75,
  splitExitCents: 75,
  splitMinStableMs: 60,
  smoothingWindow: 1,
  mergeMaxGapMs: 0,
  mergeMaxCents: 0,
  octaveStabilize: true,
  octaveStabilizeWindow: 5,
}

const ULTRA_AGGRESSIVE_MELODY_EXTRACT_CONFIG: MelodyExtractConfig = {
  minNoteMs: 24,
  endSilenceMs: 45,
  minFreqHz: 80,
  maxFreqHz: 1200,
  splitEnterCents: 26,
  splitExitCents: 14,
  splitMinStableMs: 22,
  smoothingWindow: 3,
  mergeMaxGapMs: 0,
  mergeMaxCents: 0,
  ultraAggressive: true,
  octaveStabilize: true,
  octaveStabilizeWindow: 5,
  octaveCandidateFactors: [0.5, 1, 2],
  octaveJumpHoldFrames: 2,
  octaveJumpCents: 930,
}

const ANTI_OCTAVE_AGGRESSIVE_MELODY_EXTRACT_CONFIG: MelodyExtractConfig = {
  minNoteMs: 22,
  endSilenceMs: 40,
  minFreqHz: 80,
  maxFreqHz: 1200,
  splitEnterCents: 24,
  splitExitCents: 12,
  splitMinStableMs: 20,
  smoothingWindow: 3,
  mergeMaxGapMs: 0,
  mergeMaxCents: 0,
  ultraAggressive: true,
  octaveStabilize: true,
  octaveStabilizeWindow: 7,
  octaveCandidateFactors: [0.25, 0.5, 1, 2, 4],
  octaveJumpHoldFrames: 5,
  octaveJumpCents: 900,
  postNoteOctaveCorrect: true,
  postNoteMaxDurMs: 240,
  postNoteNeighborCents: 80,
}

export const DEFAULT_MELODY_EXTRACT_CONFIG: MelodyExtractConfig = {
  // Phase-A tuned defaults for piano-like replay.
  minNoteMs: 60,
  endSilenceMs: 95,
  minFreqHz: 80,
  maxFreqHz: 1200,
  splitEnterCents: 88,
  splitExitCents: 58,
  splitMinStableMs: 70,
  smoothingWindow: 5,
  mergeMaxGapMs: 65,
  mergeMaxCents: 42,
  octaveStabilize: true,
  octaveStabilizeWindow: 5,
  octaveCandidateFactors: [0.5, 1, 2],
  octaveJumpHoldFrames: 2,
  octaveJumpCents: 930,
  postNoteOctaveCorrect: true,
  postNoteMaxDurMs: 180,
  postNoteNeighborCents: 70,
}

export function getExtractConfigForMode(mode: MelodyProcessingMode): MelodyExtractConfig {
  if (mode === 'raw') return RAW_MELODY_EXTRACT_CONFIG
  if (mode === 'ultra_aggressive') return ULTRA_AGGRESSIVE_MELODY_EXTRACT_CONFIG
  if (mode === 'anti_octave_aggressive') return ANTI_OCTAVE_AGGRESSIVE_MELODY_EXTRACT_CONFIG
  return DEFAULT_MELODY_EXTRACT_CONFIG
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

/** Hz values YIN might report instead of true f0 when it locks onto an octave harmonic. */
function octaveFoldCandidates(
  hz: number,
  minHz: number,
  maxHz: number,
  factors: ReadonlyArray<number>,
): number[] {
  const set = new Set<number>()
  for (const factor of factors) {
    const v = hz * factor
    if (v >= minHz && v <= maxHz) set.add(v)
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * Snap each voiced sample to f/2, f, or 2f — whichever is nearest in cents to the median of the
 * previous raw detector readings. Brief harmonic-lock spikes disagree with history and get folded.
 */
export function stabilizeMelodyOctaves(
  frames: MelodyFrame[],
  minHz: number,
  maxHz: number,
  windowSize: number,
  candidateFactors: ReadonlyArray<number> = [0.5, 1, 2],
  jumpHoldFrames = 2,
  jumpCents = 930,
): MelodyFrame[] {
  const hist: number[] = []
  const w = Math.max(1, Math.floor(windowSize))
  const needJumpFrames = Math.max(1, Math.floor(jumpHoldFrames))
  let pendingJumpHz: number | null = null
  let pendingJumpFrames = 0
  let lastStableHz: number | null = null
  return frames.map(f => {
    if (f.freq == null) return { ...f }
    const raw = f.freq
    const refSnap = lastStableHz ?? (hist.length === 0 ? raw : median(hist))
    const candidates = octaveFoldCandidates(raw, minHz, maxHz, candidateFactors)
    const best = candidates.reduce((best, c) =>
      centsBetweenHz(c, refSnap) < centsBetweenHz(best, refSnap) ? c : best,
    candidates[0])
    let chosen = best

    const isOctaveJump = centsBetweenHz(best, refSnap) >= jumpCents
    if (isOctaveJump) {
      const fallback = candidates
        .filter(c => centsBetweenHz(c, refSnap) < jumpCents)
        .sort((a, b) => centsBetweenHz(a, refSnap) - centsBetweenHz(b, refSnap))[0]
      const jumpTarget = best
      if (pendingJumpHz != null && centsBetweenHz(pendingJumpHz, jumpTarget) < 40) {
        pendingJumpFrames += 1
      } else {
        pendingJumpHz = jumpTarget
        pendingJumpFrames = 1
      }
      const allowJump = pendingJumpFrames >= needJumpFrames
      chosen = allowJump ? jumpTarget : (fallback ?? refSnap)
      if (allowJump) {
        pendingJumpHz = null
        pendingJumpFrames = 0
      }
    } else {
      pendingJumpHz = null
      pendingJumpFrames = 0
    }
    // Marginal YIN confidence often correlates with harmonic ambiguity — avoid shifting the median with those samples.
    const trustHist =
      f.confidence == null || f.confidence >= 0.88
    if (trustHist) {
      hist.push(raw)
      while (hist.length > w) hist.shift()
    }
    lastStableHz = chosen
    return { ...f, freq: chosen }
  })
}

function maybeFoldOctaveToNeighbors(
  targetHz: number,
  leftHz: number,
  rightHz: number,
  minHz: number,
  maxHz: number,
): number {
  const cands = octaveFoldCandidates(targetHz, minHz, maxHz, [0.25, 0.5, 1, 2, 4])
  let best = targetHz
  let bestCost = Number.POSITIVE_INFINITY
  for (const c of cands) {
    const cost = centsBetweenHz(c, leftHz) + centsBetweenHz(c, rightHz)
    if (cost < bestCost) {
      bestCost = cost
      best = c
    }
  }
  return best
}

function fixShortOctaveOutlierNotes(events: MelodyNoteEvent[], cfg: MelodyExtractConfig): MelodyNoteEvent[] {
  if (!cfg.postNoteOctaveCorrect || events.length < 3) return events
  const maxDur = cfg.postNoteMaxDurMs ?? 220
  const neighborTol = cfg.postNoteNeighborCents ?? 80
  const out = events.map(ev => ({ ...ev }))
  for (let i = 1; i < out.length - 1; i++) {
    const prev = out[i - 1]
    const cur = out[i]
    const next = out[i + 1]
    if (cur.durMs > maxDur) continue
    if (centsBetweenHz(prev.freqHz, next.freqHz) > neighborTol) continue
    const folded = maybeFoldOctaveToNeighbors(cur.freqHz, prev.freqHz, next.freqHz, cfg.minFreqHz, cfg.maxFreqHz)
    const toPrev = centsBetweenHz(folded, prev.freqHz)
    const toNext = centsBetweenHz(folded, next.freqHz)
    const curToPrev = centsBetweenHz(cur.freqHz, prev.freqHz)
    const curToNext = centsBetweenHz(cur.freqHz, next.freqHz)
    const isBigImprovement = toPrev + toNext + 120 < curToPrev + curToNext
    if (isBigImprovement) {
      cur.freqHz = folded
      cur.midi = hzToMidi(folded)
    }
  }
  return out
}

function smoothFrames(frames: MelodyFrame[], windowSize: number): MelodyFrame[] {
  if (windowSize <= 1 || frames.length <= 2) return frames
  const voicedIdx: number[] = []
  const voicedHz: number[] = []
  frames.forEach((f, i) => {
    if (f.freq != null) {
      voicedIdx.push(i)
      voicedHz.push(f.freq)
    }
  })
  if (voicedHz.length <= 2) return frames

  const half = Math.floor(windowSize / 2)
  const smoothedHz = voicedHz.map((_, i) => {
    const lo = Math.max(0, i - half)
    const hi = Math.min(voicedHz.length - 1, i + half)
    return median(voicedHz.slice(lo, hi + 1))
  })
  const out = frames.map(f => ({ ...f }))
  for (let i = 0; i < voicedIdx.length; i++) out[voicedIdx[i]].freq = smoothedHz[i]
  return out
}

function mergeAdjacentEvents(events: MelodyNoteEvent[], cfg: MelodyExtractConfig): MelodyNoteEvent[] {
  if (events.length <= 1 || cfg.mergeMaxGapMs <= 0) return events
  const merged: MelodyNoteEvent[] = []
  for (const ev of events) {
    const prev = merged[merged.length - 1]
    if (!prev) {
      merged.push({ ...ev })
      continue
    }
    const gapMs = ev.startMs - prev.endMs
    const cents = centsBetweenHz(ev.freqHz, prev.freqHz)
    if (gapMs <= cfg.mergeMaxGapMs && cents <= cfg.mergeMaxCents) {
      const spanStart = prev.startMs
      const spanEnd = Math.max(prev.endMs, ev.endMs)
      const weightedHz =
        (prev.freqHz * prev.durMs + ev.freqHz * ev.durMs) / Math.max(1, prev.durMs + ev.durMs)
      const durMs = spanEnd - spanStart
      merged[merged.length - 1] = {
        ...prev,
        endMs: spanEnd,
        durMs,
        freqHz: weightedHz,
        midi: hzToMidi(weightedHz),
      }
    } else {
      merged.push({ ...ev })
    }
  }
  return merged
}

export function extractMelodyNoteEvents(
  frames: MelodyFrame[],
  cfg: MelodyExtractConfig = DEFAULT_MELODY_EXTRACT_CONFIG,
): MelodyNoteEvent[] {
  if (frames.length === 0) return []
  let workFrames = frames.map(f => ({ ...f }))
  if (cfg.octaveStabilize !== false) {
    const ozWin = cfg.octaveStabilizeWindow ?? 5
    workFrames = stabilizeMelodyOctaves(
      workFrames,
      cfg.minFreqHz,
      cfg.maxFreqHz,
      ozWin,
      cfg.octaveCandidateFactors ?? [0.5, 1, 2],
      cfg.octaveJumpHoldFrames ?? 2,
      cfg.octaveJumpCents ?? 930,
    )
  }
  workFrames = smoothFrames(workFrames, cfg.smoothingWindow)
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

  const pushUltraAggressiveRun = (cluster: MelodyFrame[]) => {
    if (cluster.length === 0) return
    const startT = cluster[0].tMs
    const endT = cluster[cluster.length - 1].tMs
    const durMs = Math.max(1, endT - startT)
    const freqHz = median(cluster.map(f => f.freq!).filter(Boolean))
    events.push({
      startMs: Math.max(0, startT - baseT),
      endMs: Math.max(0, endT - baseT),
      durMs,
      freqHz,
      midi: hzToMidi(freqHz),
      velocity: 0.72,
    })
  }

  if (cfg.ultraAggressive) {
    const voicedFrames = workFrames.filter(
      f => f.freq != null && f.freq >= cfg.minFreqHz && f.freq <= cfg.maxFreqHz,
    )
    if (voicedFrames.length === 0) return []
    let cluster: MelodyFrame[] = [voicedFrames[0]]
    let centerHz = voicedFrames[0].freq!
    for (let i = 1; i < voicedFrames.length; i++) {
      const fr = voicedFrames[i]
      const prev = voicedFrames[i - 1]
      const gapMs = fr.tMs - prev.tMs
      const jumpCents = centsBetweenHz(fr.freq!, centerHz)
      const shouldSplit = gapMs > cfg.endSilenceMs || jumpCents >= cfg.splitEnterCents
      if (shouldSplit) {
        pushUltraAggressiveRun(cluster)
        cluster = [fr]
        centerHz = fr.freq!
      } else {
        cluster.push(fr)
        centerHz = median(cluster.map(x => x.freq!).filter(Boolean))
      }
    }
    pushUltraAggressiveRun(cluster)
    return fixShortOctaveOutlierNotes(events.filter(e => e.durMs >= cfg.minNoteMs), cfg)
  }

  for (const frame of workFrames) {
    const voiced = frame.freq != null && frame.freq >= cfg.minFreqHz && frame.freq <= cfg.maxFreqHz
    if (voiced) {
      if (runStartT == null) runStartT = frame.tMs
      lastVoicedT = frame.tMs
      voicedFreqs.push(frame.freq!)

      // Aggressive split on stable pitch jump (handles legato singing with little silence).
      if (voicedFreqs.length >= 3) {
        const currentCenterHz = median(voicedFreqs)
        const jumpCents = centsBetweenHz(frame.freq!, currentCenterHz)

        if (jumpCents >= cfg.splitEnterCents) {
          if (pendingSplitStartT == null) {
            pendingSplitStartT = frame.tMs
            pendingSplitFreqs = [frame.freq!]
          } else {
            pendingSplitFreqs.push(frame.freq!)
          }
        } else if (jumpCents <= cfg.splitExitCents) {
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
  return fixShortOctaveOutlierNotes(mergeAdjacentEvents(events, cfg), cfg)
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

