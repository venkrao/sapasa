import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  // For mandra notes we keep the base swara key (same JI band), since the graph
  // already draws multiple octaves of each swara lane.
  return step.swara
}

export const MANDRA_STHAYI_1: ExerciseDefinition = {
  id: 'mandra-sthayi-1',
  label: 'Mandra Sthayi Varisai 1',
  phrases: [
    {
      label: 'descent',
      groups: [
        { steps: [{ swara: 'Sa',  octave:  1 }] },  // tara Sa — start point
        { steps: [{ swara: 'N3',  octave:  0 }] },
        { steps: [{ swara: 'D1',  octave:  0 }] },
        { steps: [{ swara: 'Pa',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'M1',  octave:  0 }] },
        { steps: [{ swara: 'G3',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'R1',  octave:  0 }] },
        { steps: [{ swara: 'Sa',  octave:  0 }], beatBoundary: true },
      ],
    },
    {
      label: 'hold-mandra',
      groups: [
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }], beatBoundary: true },
      ],
    },
    {
      label: 'rebound',
      groups: [
        { steps: [{ swara: 'G3', octave: -1 }] },
        { steps: [{ swara: 'R1', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'N3', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'R1', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'G3', octave: -1 }] },
        { steps: [{ swara: 'M1', octave: -1 }], beatBoundary: true },
      ],
    },
    {
      label: 'ascent',
      groups: [
        { steps: [{ swara: 'Sa',  octave:  1 }] },  // tara Sa — return anchor
        { steps: [{ swara: 'N3',  octave:  0 }] },
        { steps: [{ swara: 'D1',  octave:  0 }] },
        { steps: [{ swara: 'Pa',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'M1',  octave:  0 }] },
        { steps: [{ swara: 'G3',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'R1',  octave:  0 }] },
        { steps: [{ swara: 'Sa',  octave:  0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

MANDRA_STHAYI_1.flatSequence = deriveFlatSequence(MANDRA_STHAYI_1.phrases)
MANDRA_STHAYI_1.allowedSwaras = Array.from(
  new Set(MANDRA_STHAYI_1.flatSequence.map(stepToGraphBandKey)),
)

