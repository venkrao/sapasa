import type { RagaDefinition, SequenceStep } from '../exerciseModel'
import { JI_RATIOS } from '../swaras'

/** Synthetic raga: user-defined sequence (not tied to a single scale). */
export const CUSTOM_MELODY_RAGA_ID = 'custom-melody'

/** All JI swara ids except Sa′ (tara Sa is encoded as Sa + octave in SequenceStep). */
const ALL_JI_SWARAS = Object.keys(JI_RATIOS).filter(k => k !== "Sa'")

const CHROMATIC_UP: SequenceStep[] = [
  { swara: 'Sa', octave: 0 },
  { swara: 'R1', octave: 0 },
  { swara: 'R2', octave: 0 },
  { swara: 'R3', octave: 0 },
  { swara: 'G3', octave: 0 },
  { swara: 'M1', octave: 0 },
  { swara: 'M2', octave: 0 },
  { swara: 'Pa', octave: 0 },
  { swara: 'D1', octave: 0 },
  { swara: 'D2', octave: 0 },
  { swara: 'D3', octave: 0 },
  { swara: 'N3', octave: 0 },
  { swara: 'Sa', octave: 1 },
]

const CHROMATIC_DOWN: SequenceStep[] = [...CHROMATIC_UP].reverse()

export const CUSTOM_MELODY_RAGA: RagaDefinition = {
  id: CUSTOM_MELODY_RAGA_ID,
  label: 'Custom Melody',
  talaLabel: '',
  exercises: [],

  arohanam: CHROMATIC_UP,
  avarohanam: CHROMATIC_DOWN,
  swarasUsed: ALL_JI_SWARAS,
}
