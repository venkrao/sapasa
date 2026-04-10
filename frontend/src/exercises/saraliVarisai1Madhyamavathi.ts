import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

/**
 * Sarali Varisai 1 — Madhyamavathi
 *
 * Madhyamavathi is an audava-audava (pentatonic) janya of Kharaharapriya.
 * It uses five swaras: Sa, Ri₂ (R2), Ma₁ (M1), Pa, Ni₂ (D3).
 * Ga and Dha are absent in both directions.
 *
 *   Ascending : Sa  Ri₂  Ma₁ | Pa  Ni₂  Ṡ
 *   Descending: Ṡ   Ni₂  Pa  | Ma₁ Ri₂  Sa
 *
 * The beat boundary (|) marks the midpoint of the 6-note phrase,
 * aligning with standard Adi-tala practice.
 */

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

export const SARALI_VARISAI_1_MADHYAMAVATHI: ExerciseDefinition = {
  id: 'sarali-varisai-1',
  label: 'Sarali Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R2', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D3', octave: 0 }] },   // Ni₂ (Kaisika Nishada)
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'D3', octave: 0 }] },   // Ni₂
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'R2', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

SARALI_VARISAI_1_MADHYAMAVATHI.flatSequence = deriveFlatSequence(
  SARALI_VARISAI_1_MADHYAMAVATHI.phrases,
)
SARALI_VARISAI_1_MADHYAMAVATHI.allowedSwaras = Array.from(
  new Set(
    SARALI_VARISAI_1_MADHYAMAVATHI.flatSequence.map(stepToGraphBandKey),
  ),
)
