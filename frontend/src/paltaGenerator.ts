import type { ExerciseGroup, ExercisePhrase, SequenceStep } from './exerciseModel'

/** Ascending arohanam through madhya sthayi: stops before tara Ṡa. */
export function madhyaScaleFromArohanam(arohanam: SequenceStep[]): SequenceStep[] {
  const out: SequenceStep[] = []
  for (const s of arohanam) {
    if (s.swara === 'Sa' && s.octave === 1) break
    out.push(s)
  }
  return out.length > 0 ? out : [{ swara: 'Sa', octave: 0 }]
}

/**
 * One step of a palta: walk `offset` scale-degree steps from `rootIndex` on `scale`,
 * wrapping across octaves using the same logic as fixed 7-degree paltas.
 */
export function resolvePaltaStep(
  scale: SequenceStep[],
  rootIndex: number,
  offset: number,
): SequenceStep {
  const n = scale.length
  if (n === 0) return { swara: 'Sa', octave: 0 }
  const ri = ((rootIndex % n) + n) % n
  const total = ri + offset
  const octaveDelta = Math.floor(total / n)
  const idx = ((total % n) + n) % n
  const base = scale[idx]
  return { swara: base.swara, octave: base.octave + octaveDelta }
}

export function buildPaltaGroup(
  scale: SequenceStep[],
  rootIndex: number,
  offsets: number[],
  beatBoundary = true,
): ExerciseGroup {
  return {
    steps: offsets.map(o => resolvePaltaStep(scale, rootIndex, o)),
    beatBoundary,
  }
}

export type BuildPaltaPhrasesParams = {
  scale: SequenceStep[]
  offsets: number[]
  rootLow: number
  rootHigh: number
  includeDescending: boolean
}

export function buildPaltaPhrases(params: BuildPaltaPhrasesParams): ExercisePhrase[] {
  const { scale, offsets, rootLow, rootHigh, includeDescending } = params
  const n = scale.length
  if (n === 0 || offsets.length === 0) return []

  const lo = Math.max(0, Math.min(rootLow, n - 1))
  const hi = Math.max(0, Math.min(rootHigh, n - 1))
  const r0 = Math.min(lo, hi)
  const r1 = Math.max(lo, hi)

  const ascGroups: ExerciseGroup[] = []
  for (let root = r0; root <= r1; root++) {
    ascGroups.push(buildPaltaGroup(scale, root, offsets, true))
  }

  const phrases: ExercisePhrase[] = [{ label: 'ascending', groups: ascGroups }]

  if (includeDescending && r1 > r0) {
    const descGroups: ExerciseGroup[] = []
    for (let root = r1; root >= r0; root--) {
      descGroups.push(buildPaltaGroup(scale, root, offsets, true))
    }
    phrases.push({ label: 'descending', groups: descGroups })
  }

  return phrases
}

export function clampInt(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

export function randomIntInclusive(low: number, high: number): number {
  const lo = Math.min(low, high)
  const hi = Math.max(low, high)
  if (hi <= lo) return lo
  return lo + Math.floor((hi - lo + 1) * Math.random())
}

export function randomOffsetsArray(length: number, low: number, high: number): number[] {
  return Array.from({ length: Math.max(0, length) }, () => randomIntInclusive(low, high))
}

/** Clamp random-offset range to scale degrees (±(n−1) for a length‑n scale). */
export function clampPaltaOffsetRange(
  offsetMin: number,
  offsetMax: number,
  scaleLen: number,
): { min: number; max: number } {
  const cap = Math.max(0, scaleLen - 1)
  const minAllowed = -cap
  const maxAllowed = cap
  const hiUser =
    Number.isFinite(offsetMax) && offsetMax >= scaleLen ? maxAllowed : offsetMax
  let hi = clampInt(hiUser, minAllowed, maxAllowed)
  let lo = clampInt(offsetMin, minAllowed, maxAllowed)
  if (lo > hi) [lo, hi] = [hi, lo]
  return { min: lo, max: hi }
}

/** Root sweep along the madhya scale; values ≥ scaleLen mean full range. */
export function clampPaltaRootRange(
  rootLow: number,
  rootHigh: number,
  scaleLen: number,
): { low: number; high: number } {
  const cap = Math.max(0, scaleLen - 1)
  const hi = Number.isFinite(rootHigh) && rootHigh >= scaleLen ? cap : clampInt(rootHigh, 0, cap)
  const lo = Number.isFinite(rootLow) && rootLow >= scaleLen ? 0 : clampInt(rootLow, 0, cap)
  const low = Math.min(lo, hi)
  const high = Math.max(lo, hi)
  return { low, high }
}

/** Total steps for `numRoot` consecutive roots (one stamped group per root). */
export function paltaStepCountForRootSpan(
  numRoots: number,
  patternLength: number,
  includeDescending: boolean,
): number {
  const L = patternLength
  if (numRoots <= 0 || L <= 0) return 0
  if (!includeDescending || numRoots <= 1) return numRoots * L
  return 2 * numRoots * L
}

/**
 * Largest root-span (number of consecutive roots from `low`) not exceeding `maxTotalSteps`.
 * Caps at `maxDesiredRoots` (typically full sweep width).
 */
export function maxRootSpanForStepLimit(
  patternLength: number,
  includeDescending: boolean,
  maxTotalSteps: number,
  maxDesiredRoots: number,
): number {
  const L = patternLength
  if (L <= 0 || maxDesiredRoots <= 0) return 0
  if (maxTotalSteps <= 0) return maxDesiredRoots
  let best = 1
  for (let g = 1; g <= maxDesiredRoots; g++) {
    const steps = paltaStepCountForRootSpan(g, L, includeDescending)
    if (steps <= maxTotalSteps) best = g
    else break
  }
  return best
}

export type EffectivePaltaBoundsParams = {
  scaleLen: number
  rootLow: number
  rootHigh: number
  patternLength: number
  includeDescending: boolean
  wholePhraseMaxSteps: number
}

/** Clamped root sweep, optionally shortened from the top to respect `wholePhraseMaxSteps`. */
export function effectivePaltaRootBounds(p: EffectivePaltaBoundsParams): {
  low: number
  high: number
  totalSteps: number
} {
  const { low, high } = clampPaltaRootRange(p.rootLow, p.rootHigh, p.scaleLen)
  const span = high - low + 1
  const L = p.patternLength
  if (L <= 0) return { low, high, totalSteps: 0 }
  if (p.wholePhraseMaxSteps <= 0) {
    return {
      low,
      high,
      totalSteps: paltaStepCountForRootSpan(span, L, p.includeDescending),
    }
  }
  const g = maxRootSpanForStepLimit(L, p.includeDescending, p.wholePhraseMaxSteps, span)
  const highCapped = low + g - 1
  return {
    low,
    high: highCapped,
    totalSteps: paltaStepCountForRootSpan(g, L, p.includeDescending),
  }
}
