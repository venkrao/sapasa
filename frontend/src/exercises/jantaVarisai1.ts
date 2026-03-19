import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

export const JANTA_VARISAI_1: ExerciseDefinition = {
  id: 'janta-varisai-1',
  label: 'Janta Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }, { swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }, { swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }, { swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }, { swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }, { swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }, { swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }, { swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }, { swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }, { swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }, { swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }, { swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }, { swara: 'Pa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'M1', octave: 0 }, { swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }, { swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }, { swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }, { swara: 'Sa', octave: 0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

JANTA_VARISAI_1.flatSequence = deriveFlatSequence(JANTA_VARISAI_1.phrases)
JANTA_VARISAI_1.allowedSwaras = Array.from(
  new Set(JANTA_VARISAI_1.flatSequence.map(stepToGraphBandKey)),
)

