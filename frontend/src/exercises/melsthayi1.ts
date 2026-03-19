import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

export const MELSTHAYI_1: ExerciseDefinition = {
  id: 'melsthayi-1',
  label: 'Melsthayi Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'hold',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending-a',
      groups: [
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'R1', octave: 1 }], beatBoundary: true }, // tara R1
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending-b',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

MELSTHAYI_1.flatSequence = deriveFlatSequence(MELSTHAYI_1.phrases)
MELSTHAYI_1.allowedSwaras = Array.from(
  new Set(MELSTHAYI_1.flatSequence.map(stepToGraphBandKey)),
)

