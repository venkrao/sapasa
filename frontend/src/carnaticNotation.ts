import type { SequenceStep } from './exerciseModel'

/** Madhya sthayi — short letters + subscript digits (matches pitch tiles). */
export const SWARA_TO_NOTATION: Record<string, string> = {
  Sa: 'S',
  R1: 'R₁',
  R2: 'R₂',
  R3: 'R₃',
  G3: 'G₃',
  M1: 'M₁',
  M2: 'M₂',
  Pa: 'P',
  D1: 'D₁',
  D2: 'D₂',
  D3: 'N₂',
  N3: 'N₃',
}

export const TARA_NOTATION: Record<string, string> = {
  R1: 'Ṙ₁',
  R2: 'Ṙ₂',
  G3: 'Ġ₃',
  M1: 'Ṁ₁',
  Pa: 'Ṗ',
  D1: 'Ḋ₁',
  D3: 'Ṅ₂',
  N3: 'Ṅ₃',
}

export const MANDRA_NOTATION: Record<string, string> = {
  Sa: 'Ṣ',
  R1: 'Ṛ₁',
  R2: 'Ṛ₂',
  G3: 'Ġ₃',
  M1: 'Ṃ₁',
  Pa: 'Ṗ',
  D1: 'Ḍ₁',
  D3: 'Ṇ₂',
  N3: 'Ṇ₃',
}

/** Tara Ṡ — not in TARA_NOTATION (Sa uses special case). */
export const TARA_SA_SYMBOL = 'Ṡ'

export function notationOf(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return TARA_SA_SYMBOL
  if (step.octave >= 1) return TARA_NOTATION[step.swara] ?? step.swara
  if (step.octave <= -1) return MANDRA_NOTATION[step.swara] ?? step.swara
  return SWARA_TO_NOTATION[step.swara] ?? step.swara
}

/** Tiles / expected label: user-typed spelling when present, else default notation. */
export function notationOfDisplay(step: SequenceStep): string {
  if (step.displayAs != null && step.displayAs.length > 0) return step.displayAs
  return notationOf(step)
}
