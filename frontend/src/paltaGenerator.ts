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

/** Count stamped pattern groups across all phrases (playback order). */
export function countExerciseGroupsInPhrases(phrases: ExercisePhrase[]): number {
  return phrases.reduce((acc, ph) => acc + ph.groups.length, 0)
}

/**
 * Keep only the first `maxGroups` groups in phrase order (ascending chunk first, then descending).
 * `maxGroups <= 0` means no limit (returns `phrases` unchanged).
 */
export function truncatePaltaPhrasesToMaxGroups(
  phrases: ExercisePhrase[],
  maxGroups: number,
): ExercisePhrase[] {
  if (maxGroups <= 0 || phrases.length === 0) return phrases
  const total = countExerciseGroupsInPhrases(phrases)
  if (total <= maxGroups) return phrases

  const out: ExercisePhrase[] = []
  let remaining = maxGroups
  for (const phrase of phrases) {
    if (remaining <= 0) break
    const take = phrase.groups.slice(0, remaining)
    if (take.length === 0) continue
    out.push({ ...phrase, groups: take })
    remaining -= take.length
  }
  return out.length > 0 ? out : [{ label: phrases[0]?.label ?? 'palta', groups: [] }]
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
