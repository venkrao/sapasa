import type { ExerciseDefinition, ExerciseGroup, ExercisePhrase, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`
  return step.swara
}

// Helper: build one row of 14 beats as 4 groups (4+2+4+4) with line breaks.
function row(
  a: SequenceStep[],  // 4 steps — laghu
  b: SequenceStep[],  // 2 steps — drutam
  c: SequenceStep[],  // 4 steps — laghu
  d: SequenceStep[],  // 4 steps — laghu
): ExerciseGroup[] {
  return [
    { steps: a, beatBoundary: true },
    { steps: b, beatBoundary: true },
    { steps: c, beatBoundary: true },
    { steps: d, beatBoundary: true, lineBreak: true }, // new line after each tala cycle
  ]
}

// Shorthand
const s  = (sw: string, o = 0): SequenceStep => ({ swara: sw, octave: o })
const S  = (sw: string)       : SequenceStep => ({ swara: sw, octave: 1 })  // tara

const ALANKARAM_1_PHRASES: ExercisePhrase[] = [
  {
    label: 'ascending',
    groups: [
      // Row 1: s r g m | g r | s r g r | s r g m
      ...row(
        [s('Sa'), s('R1'), s('G3'), s('M1')],
        [s('G3'), s('R1')],
        [s('Sa'), s('R1'), s('G3'), s('R1')],
        [s('Sa'), s('R1'), s('G3'), s('M1')],
      ),
      // Row 2: r g m p | m g | r g m g | r g m p
      ...row(
        [s('R1'), s('G3'), s('M1'), s('Pa')],
        [s('M1'), s('G3')],
        [s('R1'), s('G3'), s('M1'), s('G3')],
        [s('R1'), s('G3'), s('M1'), s('Pa')],
      ),
      // Row 3: g m p d | p m | g m p m | g m p d
      ...row(
        [s('G3'), s('M1'), s('Pa'), s('D1')],
        [s('Pa'), s('M1')],
        [s('G3'), s('M1'), s('Pa'), s('M1')],
        [s('G3'), s('M1'), s('Pa'), s('D1')],
      ),
      // Row 4: m p d n | d p | m p d p | m p d n
      ...row(
        [s('M1'), s('Pa'), s('D1'), s('N3')],
        [s('D1'), s('Pa')],
        [s('M1'), s('Pa'), s('D1'), s('Pa')],
        [s('M1'), s('Pa'), s('D1'), s('N3')],
      ),
      // Row 5: p d n S | n d | p d n d | p d n S
      ...row(
        [s('Pa'), s('D1'), s('N3'), S('Sa')],
        [s('N3'), s('D1')],
        [s('Pa'), s('D1'), s('N3'), s('D1')],
        [s('Pa'), s('D1'), s('N3'), S('Sa')],
      ),
    ],
  },
  {
    label: 'descending',
    groups: [
      // Row 6: S n d p | d n | S n d n | S n d p
      ...row(
        [S('Sa'), s('N3'), s('D1'), s('Pa')],
        [s('D1'), s('N3')],
        [S('Sa'), s('N3'), s('D1'), s('N3')],
        [S('Sa'), s('N3'), s('D1'), s('Pa')],
      ),
      // Row 7: n d p m | p d | n d p d | n d p m
      ...row(
        [s('N3'), s('D1'), s('Pa'), s('M1')],
        [s('Pa'), s('D1')],
        [s('N3'), s('D1'), s('Pa'), s('D1')],
        [s('N3'), s('D1'), s('Pa'), s('M1')],
      ),
      // Row 8: d p m g | m p | d p m p | d p m g
      ...row(
        [s('D1'), s('Pa'), s('M1'), s('G3')],
        [s('M1'), s('Pa')],
        [s('D1'), s('Pa'), s('M1'), s('Pa')],
        [s('D1'), s('Pa'), s('M1'), s('G3')],
      ),
      // Row 9: p m g r | g m | p m g m | p m g r
      ...row(
        [s('Pa'), s('M1'), s('G3'), s('R1')],
        [s('G3'), s('M1')],
        [s('Pa'), s('M1'), s('G3'), s('M1')],
        [s('Pa'), s('M1'), s('G3'), s('R1')],
      ),
      // Row 10: m g r s | r g | m g r g | m g r s
      ...row(
        [s('M1'), s('G3'), s('R1'), s('Sa')],
        [s('R1'), s('G3')],
        [s('M1'), s('G3'), s('R1'), s('G3')],
        [s('M1'), s('G3'), s('R1'), s('Sa')],
      ),
    ],
  },
]

export const ALANKARAM_1: ExerciseDefinition = {
  id: 'alankaram-1',
  label: 'Alankaram 1 — Dhruva Talam',
  phrases: ALANKARAM_1_PHRASES,
  flatSequence: [],
  allowedSwaras: [],
}

ALANKARAM_1.flatSequence = deriveFlatSequence(ALANKARAM_1.phrases)
ALANKARAM_1.allowedSwaras = Array.from(
  new Set(ALANKARAM_1.flatSequence.map(stepToGraphBandKey)),
)

