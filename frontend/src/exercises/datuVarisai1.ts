import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

export const DAATU_VARISAI_1: ExerciseDefinition = {
  id: 'daatu-varisai-1',
  label: 'Daatu Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        // Cell 1: S G R M
        {
          steps: [
            { swara: 'Sa', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'R1', octave: 0 },
            { swara: 'M1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 2: R M G P
        {
          steps: [
            { swara: 'R1', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'Pa', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 3: G P M D
        {
          steps: [
            { swara: 'G3', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'D1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 4: M D P N
        {
          steps: [
            { swara: 'M1', octave: 0 },
            { swara: 'D1', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'N3', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 5: P N D Ṡ
        {
          steps: [
            { swara: 'Pa', octave: 0 },
            { swara: 'N3', octave: 0 },
            { swara: 'D1', octave: 0 },
            { swara: 'Sa', octave: 1 },
          ],
          beatBoundary: true,
        },
      ],
    },
    {
      label: 'descending',
      groups: [
        // Cell 1: Ṡ D N P
        {
          steps: [
            { swara: 'Sa', octave: 1 },
            { swara: 'D1', octave: 0 },
            { swara: 'N3', octave: 0 },
            { swara: 'Pa', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 2: N P D M
        {
          steps: [
            { swara: 'N3', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'D1', octave: 0 },
            { swara: 'M1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 3: D M P G
        {
          steps: [
            { swara: 'D1', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'G3', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 4: P G M R
        {
          steps: [
            { swara: 'Pa', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'R1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 5: M R G S
        {
          steps: [
            { swara: 'M1', octave: 0 },
            { swara: 'R1', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'Sa', octave: 0 },
          ],
          beatBoundary: true,
        },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

DAATU_VARISAI_1.flatSequence = deriveFlatSequence(DAATU_VARISAI_1.phrases)
DAATU_VARISAI_1.allowedSwaras = Array.from(
  new Set(DAATU_VARISAI_1.flatSequence.map(stepToGraphBandKey)),
)

