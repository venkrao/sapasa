import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

export const SARALI_VARISAI_2: ExerciseDefinition = {
  id: 'sarali-varisai-2',
  label: 'Sarali Varisai 2',
  phrases: [
    {
      label: 'phrase-1',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-2',
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
      label: 'phrase-3',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-4',
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

SARALI_VARISAI_2.flatSequence = deriveFlatSequence(SARALI_VARISAI_2.phrases)
SARALI_VARISAI_2.allowedSwaras = Array.from(
  new Set(SARALI_VARISAI_2.flatSequence.map(stepToGraphBandKey)),
)
