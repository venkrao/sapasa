import type { RagaDefinition, SequenceStep } from '../exerciseModel'
import { SARALI_VARISAI_1_MADHYAMAVATHI } from '../exercises/saraliVarisai1Madhyamavathi'
import { PRAYOGA_EXERCISE_MADHYAMAVATHI } from '../exercises/prayogaExerciseMadhyamavathi'

/**
 * Madhyamavathi — 28th janya of Kharaharapriya (22nd melakarta).
 *
 * Pentatonic (audava–audava): 5 swaras in both arohanam and avarohanam.
 * Skips Gandhara and Dhaivata entirely.
 *
 *   Arohanam  : S  R2  M1  P  N2  Ṡ
 *   Avarohanam: Ṡ  N2  P  M1  R2  S
 *
 * N2 (Kaisika Nishada, ratio 16/9) shares its pitch position with D3 in the
 * system's 12-position JI grid — referenced here as "D3".
 *
 * Notable compositions: "Bhavayami Raghu Ramam" (Swati Tirunal),
 * "Krishnani Begane Baro" (Mysore Vasudevachar).
 */
export const MADHYAMAVATHI: RagaDefinition = {
  id: 'madhyamavathi',
  label: 'Madhyamavathi',
  talaLabel: 'Adi-tala',
  exercises: [SARALI_VARISAI_1_MADHYAMAVATHI, PRAYOGA_EXERCISE_MADHYAMAVATHI],

  arohanam: [
    { swara: 'Sa', octave:  0 },
    { swara: 'R2', octave:  0 },
    { swara: 'M1', octave:  0 },
    { swara: 'Pa', octave:  0 },
    { swara: 'D3', octave:  0 },   // N2 — Kaisika Nishada
    { swara: 'Sa', octave:  1 },
  ] as SequenceStep[],

  avarohanam: [
    { swara: 'Sa', octave:  1 },
    { swara: 'D3', octave:  0 },   // N2
    { swara: 'Pa', octave:  0 },
    { swara: 'M1', octave:  0 },
    { swara: 'R2', octave:  0 },
    { swara: 'Sa', octave:  0 },
  ] as SequenceStep[],

  swarasUsed: ['Sa', 'R2', 'M1', 'Pa', 'D3'],
}
