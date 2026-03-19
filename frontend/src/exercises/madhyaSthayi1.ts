import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

export const MADHYA_STHAYI_1: ExerciseDefinition = {
  id: 'madhya-sthayi-1',
  label: 'Madhya Sthayi Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] }, // hold
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] }, // hold
        { steps: [{ swara: 'Pa', octave: 0 }] }, // hold
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true }, // hold
      ],
    },
    {
      label: 'descending',
      groups: [
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }], beatBoundary: true },
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

MADHYA_STHAYI_1.flatSequence = deriveFlatSequence(MADHYA_STHAYI_1.phrases)
MADHYA_STHAYI_1.allowedSwaras = Array.from(
  new Set(MADHYA_STHAYI_1.flatSequence.map(stepToGraphBandKey)),
)

