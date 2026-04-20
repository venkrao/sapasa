import type { RagaDefinition } from '../exerciseModel'
import { CUSTOM_MELODY_RAGA } from './customMelodyRaga'

export const PALTA_RAGA_ID = 'palta'

/** Synthetic exercise id — sequence is built at runtime from palta settings. */
export const PALTA_EXERCISE_ID = '__palta_random__'

export const PALTA_RAGA: RagaDefinition = {
  id: PALTA_RAGA_ID,
  label: 'Palta (random)',
  talaLabel: '',
  exercises: [
    {
      id: PALTA_EXERCISE_ID,
      label: 'Random palta',
      phrases: [],
      flatSequence: [],
      allowedSwaras: [],
    },
  ],
  arohanam: CUSTOM_MELODY_RAGA.arohanam,
  avarohanam: CUSTOM_MELODY_RAGA.avarohanam,
  swarasUsed: CUSTOM_MELODY_RAGA.swarasUsed,
}
