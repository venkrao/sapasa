import type { RagaDefinition } from '../exerciseModel'
import { SARALI_VARISAI_1 } from '../exercises/saraliVarisai1'
import type { SequenceStep } from '../exerciseModel'

export const MAYAMALAVAGOWLA: RagaDefinition = {
  id: 'mayamalavagowla',
  label: 'Mayamalavagowla',
  talaLabel: 'Adi-tala',
  exercises: [SARALI_VARISAI_1],

  // From @specs/spec-raga-definition.md
  arohanam: [
    { swara: 'Sa', octave: 0 },
    { swara: 'R1', octave: 0 },
    { swara: 'G3', octave: 0 },
    { swara: 'M1', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'D1', octave: 0 },
    { swara: 'N3', octave: 0 },
    { swara: 'Sa', octave: 1 },
  ] as SequenceStep[],

  avarohanam: [
    { swara: 'Sa', octave: 1 },
    { swara: 'N3', octave: 0 },
    { swara: 'D1', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'M1', octave: 0 },
    { swara: 'G3', octave: 0 },
    { swara: 'R1', octave: 0 },
    { swara: 'Sa', octave: 0 },
  ] as SequenceStep[],

  swarasUsed: ['Sa', 'R1', 'G3', 'M1', 'Pa', 'D1', 'N3'],
}

