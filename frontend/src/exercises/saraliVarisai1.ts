import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  // Graph has a dedicated band key for upper Sa.
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const SARALI_VARISAI_1: ExerciseDefinition = {
  id: 'sarali-varisai-1',
  label: 'Sarali Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

// Fill derived fields once (keeps exercise definitions readable).
SARALI_VARISAI_1.flatSequence = deriveFlatSequence(SARALI_VARISAI_1.phrases)
SARALI_VARISAI_1.allowedSwaras = Array.from(
  new Set(SARALI_VARISAI_1.flatSequence.map(stepToGraphBandKey)),
)

