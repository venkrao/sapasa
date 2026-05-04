import type { RagaDefinition, SequenceStep } from '../exerciseModel'

export const HAMSADHWANI: RagaDefinition = {
  id: 'hamsadhwani',
  label: 'Hamsadhwani',
  talaLabel: 'Adi-tala',
  exercises: [],

  // From @specs/spec-happy-ragas-3.md
  arohanam: [
    { swara: 'Sa', octave: 0 },
    { swara: 'R2', octave: 0 },
    { swara: 'G3', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'N3', octave: 0 },
    { swara: 'Sa', octave: 1 },
  ] as SequenceStep[],

  avarohanam: [
    { swara: 'Sa', octave: 1 },
    { swara: 'N3', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'G3', octave: 0 },
    { swara: 'R2', octave: 0 },
    { swara: 'Sa', octave: 0 },
  ] as SequenceStep[],

  swarasUsed: ['Sa', 'R2', 'G3', 'Pa', 'N3'],
}

export const MOHANAM: RagaDefinition = {
  id: 'mohanam',
  label: 'Mohanam',
  talaLabel: 'Adi-tala',
  exercises: [],

  // From @specs/spec-happy-ragas-3.md
  arohanam: [
    { swara: 'Sa', octave: 0 },
    { swara: 'R2', octave: 0 },
    { swara: 'G3', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'D2', octave: 0 },
    { swara: 'Sa', octave: 1 },
  ] as SequenceStep[],

  avarohanam: [
    { swara: 'Sa', octave: 1 },
    { swara: 'D2', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'G3', octave: 0 },
    { swara: 'R2', octave: 0 },
    { swara: 'Sa', octave: 0 },
  ] as SequenceStep[],

  swarasUsed: ['Sa', 'R2', 'G3', 'Pa', 'D2'],
}

export const BILAHARI: RagaDefinition = {
  id: 'bilahari',
  label: 'Bilahari',
  talaLabel: 'Adi-tala',
  exercises: [],

  // From @specs/spec-happy-ragas-3.md
  arohanam: [
    { swara: 'Sa', octave: 0 },
    { swara: 'R2', octave: 0 },
    { swara: 'M1', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'N3', octave: 0 },
    { swara: 'Sa', octave: 1 },
  ] as SequenceStep[],

  avarohanam: [
    { swara: 'Sa', octave: 1 },
    { swara: 'N3', octave: 0 },
    { swara: 'D2', octave: 0 },
    { swara: 'Pa', octave: 0 },
    { swara: 'M1', octave: 0 },
    { swara: 'G3', octave: 0 },
    { swara: 'R2', octave: 0 },
    { swara: 'Sa', octave: 0 },
  ] as SequenceStep[],

  swarasUsed: ['Sa', 'R2', 'G3', 'M1', 'Pa', 'D2', 'N3'],
}
