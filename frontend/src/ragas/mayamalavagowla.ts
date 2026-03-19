import type { RagaDefinition, SequenceStep } from '../exerciseModel'
import { SARALI_VARISAI_1 } from '../exercises/saraliVarisai1'
import { JANTA_VARISAI_1 } from '../exercises/jantaVarisai1'
import { DAATU_VARISAI_1 } from '../exercises/datuVarisai1'

export const MAYAMALAVAGOWLA: RagaDefinition = {
  id: 'mayamalavagowla',
  label: 'Mayamalavagowla',
  talaLabel: 'Adi-tala',
  exercises: [SARALI_VARISAI_1, JANTA_VARISAI_1, DAATU_VARISAI_1],

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

