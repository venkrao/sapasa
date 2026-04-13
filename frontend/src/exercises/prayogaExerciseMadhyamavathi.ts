import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

/**
 * Madhyamavathi prayoga drill (ranjaka phrases).
 *
 * Notes from spec:
 * - N2 is represented as D3 in this project's JI pitch mapping.
 * - R2 and D3 are kampita in musical rendering; this drill keeps note-wise steps.
 * - Avoid touching Ga / Dha variants while practicing these phrases.
 */
export const PRAYOGA_EXERCISE_MADHYAMAVATHI: ExerciseDefinition = {
  id: 'prayoga-exercise-madhyamavathi',
  label: 'Prayoga Drill',
  phrases: [
    {
      label: 'Prayoga 1 — Core loop',
      groups: [
        { steps: [{ swara: 'R2', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D3', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'R2', octave: 0 }] },
      ],
    },
    {
      label: 'Prayoga 2 — Upper octave launch',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'D3', octave: 1 }] },
        { steps: [{ swara: 'Pa', octave: 1 }] },
      ],
    },
    {
      label: 'Prayoga 3 — Ri oscillation',
      groups: [
        { steps: [{ swara: 'D3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R2', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R2', octave: 0 }] },
      ],
    },
    {
      label: 'Prayoga 4 — Full-range phrase',
      groups: [
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'R2', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'D3', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'D3', octave: 0 }] },
        { steps: [{ swara: 'R2', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
      ],
    },
    {
      label: 'Prayoga 5 — Ni peak oscillation',
      groups: [
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D3', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D3', octave: 1 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

PRAYOGA_EXERCISE_MADHYAMAVATHI.flatSequence = deriveFlatSequence(
  PRAYOGA_EXERCISE_MADHYAMAVATHI.phrases,
)
PRAYOGA_EXERCISE_MADHYAMAVATHI.allowedSwaras = Array.from(
  new Set(PRAYOGA_EXERCISE_MADHYAMAVATHI.flatSequence.map(stepToGraphBandKey)),
)
