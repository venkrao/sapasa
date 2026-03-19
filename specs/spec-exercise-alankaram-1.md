# Spec: Alankaram 1 — Chatushra Jaati Dhruva Talam

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**File:** `src/ragas/exercises/alankaram1.ts`
**Document version:** 0.1
**Status:** Draft

***

## 1. Tala Structure: Dhruva Talam

Dhruva Talam has the structure: **I₄ 0 I₄ I₄** = 4 + 2 + 4 + 4 = **14 beats per cycle**. [shivkumar](https://www.shivkumar.org/music/basics/alankaram.htm)

| Anga (limb) | Symbol | Beats |
|---|---|---|
| Laghu | I₄ | 4 |
| Drutam | 0 | 2 |
| Laghu | I₄ | 4 |
| Laghu | I₄ | 4 |

This directly determines where `beatBoundary: true` falls — after beats 4, 6, 10, and 14.

***

## 2. The Pattern

Each row in the canonical notation is one **cycle** of 14 beats. The melodic window slides up by one step per cycle. The full ascending+descending span covers 10 rows — 5 ascending (S→S'), 5 descending (S'→S). [shivkumar](https://www.shivkumar.org/music/basics/alankaram.htm)

Reading the canonical notation directly:

```
Row 1:  s r g m | g r | s r g r | s r g m ||
Row 2:  r g m p | m g | r g m g | r g m p ||
Row 3:  g m p d | p m | g m p m | g m p d ||
Row 4:  m p d n | d p | m p d p | m p d n ||
Row 5:  p d n S | n d | p d n d | p d n S ||
Row 6:  S n d p | d n | S n d n | S n d p ||
Row 7:  n d p m | p d | n d p d | n d p m ||
Row 8:  d p m g | m p | d p m p | d p m g ||
Row 9:  p m g r | g m | p m g m | p m g r ||
Row 10: m g r s | r g | m g r g | m g r s ||
```

Rows 1–5 = ascending window (Sa to tara Sa). Rows 6–10 = descending window (tara Sa back to Sa).

***

## 3. Group Structure per Row

Each row has **4 groups** matching the tala angas, with a `beatBoundary` after each anga:

```
[4 steps] | [2 steps] | [4 steps] | [4 steps] ||
```

So `groupSize` is **variable within the row** — 4, 2, 4, 4. This is the first exercise where groups within a phrase have different sizes. The `ExerciseGroup.steps` array already handles this since it has no fixed length constraint. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/ab28c925-eebd-440e-9c67-c0fd44a7850d/exerciseModel.ts)

***

## 4. Implementation

```typescript
import type { ExerciseDefinition, ExerciseGroup, ExercisePhrase, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

// Helper: build one row of 14 beats as 4 groups (4+2+4+4)
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
    { steps: d, beatBoundary: true },
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
      ...row([s('Sa'),s('R1'),s('G3'),s('M1')], [s('G3'),s('R1')], [s('Sa'),s('R1'),s('G3'),s('R1')], [s('Sa'),s('R1'),s('G3'),s('M1')]),
      // Row 2: r g m p | m g | r g m g | r g m p
      ...row([s('R1'),s('G3'),s('M1'),s('Pa')], [s('M1'),s('G3')], [s('R1'),s('G3'),s('M1'),s('G3')], [s('R1'),s('G3'),s('M1'),s('Pa')]),
      // Row 3: g m p d | p m | g m p m | g m p d
      ...row([s('G3'),s('M1'),s('Pa'),s('D1')], [s('Pa'),s('M1')], [s('G3'),s('M1'),s('Pa'),s('M1')], [s('G3'),s('M1'),s('Pa'),s('D1')]),
      // Row 4: m p d n | d p | m p d p | m p d n
      ...row([s('M1'),s('Pa'),s('D1'),s('N3')], [s('D1'),s('Pa')], [s('M1'),s('Pa'),s('D1'),s('Pa')], [s('M1'),s('Pa'),s('D1'),s('N3')]),
      // Row 5: p d n S | n d | p d n d | p d n S
      ...row([s('Pa'),s('D1'),s('N3'),S('Sa')], [s('N3'),s('D1')], [s('Pa'),s('D1'),s('N3'),s('D1')], [s('Pa'),s('D1'),s('N3'),S('Sa')]),
    ],
  },
  {
    label: 'descending',
    groups: [
      // Row 6: S n d p | d n | S n d n | S n d p
      ...row([S('Sa'),s('N3'),s('D1'),s('Pa')], [s('D1'),s('N3')], [S('Sa'),s('N3'),s('D1'),s('N3')], [S('Sa'),s('N3'),s('D1'),s('Pa')]),
      // Row 7: n d p m | p d | n d p d | n d p m
      ...row([s('N3'),s('D1'),s('Pa'),s('M1')], [s('Pa'),s('D1')], [s('N3'),s('D1'),s('Pa'),s('D1')], [s('N3'),s('D1'),s('Pa'),s('M1')]),
      // Row 8: d p m g | m p | d p m p | d p m g
      ...row([s('D1'),s('Pa'),s('M1'),s('G3')], [s('M1'),s('Pa')], [s('D1'),s('Pa'),s('M1'),s('Pa')], [s('D1'),s('Pa'),s('M1'),s('G3')]),
      // Row 9: p m g r | g m | p m g m | p m g r
      ...row([s('Pa'),s('M1'),s('G3'),s('R1')], [s('G3'),s('M1')], [s('Pa'),s('M1'),s('G3'),s('M1')], [s('Pa'),s('M1'),s('G3'),s('R1')]),
      // Row 10: m g r s | r g | m g r g | m g r s
      ...row([s('M1'),s('G3'),s('R1'),s('Sa')], [s('R1'),s('G3')], [s('M1'),s('G3'),s('R1'),s('G3')], [s('M1'),s('G3'),s('R1'),s('Sa')]),
    ],
  },
]

export const ALANKARAM_1: ExerciseDefinition = {
  id: 'alankaram-1',
  label: 'Alankaram 1 — Dhruva Talam',
  talam: 'Dhruva',
  beatsPerCycle: 14,
  phrases: ALANKARAM_1_PHRASES,
  flatSequence: [],
  allowedSwaras: [],
}

ALANKARAM_1.flatSequence = deriveFlatSequence(ALANKARAM_1.phrases)
ALANKARAM_1.allowedSwaras = Array.from(
  new Set(ALANKARAM_1.flatSequence.map(stepToGraphBandKey)),
)
```

***

## 5. Flat Sequence Stats

| Property | Value |
|---|---|
| Total steps | 280 (10 rows × 14 beats × 2 phrases) |
| Groups | 40 (10 rows × 4 groups × 2 phrases) |
| Beat boundaries | 40 (every group) |
| Octaves spanned | 0 (madhya), 1 (tara Sa only) |
| Rows | 10 (5 ascending, 5 descending) |

***

## 6. UI Rendering Note

Each phrase in this exercise has **20 groups** (5 rows × 4 groups). Rendering all 20 groups in a single horizontal row would overflow any screen. The renderer should treat each **row of 4 groups (14 beats)** as a visual line. One clean way to handle this is to add an optional `lineBreak: true` field to `ExerciseGroup` — when the renderer encounters it, it starts a new line within the same phrase:

```typescript
export type ExerciseGroup = {
  steps: SequenceStep[]
  beatBoundary?: boolean
  lineBreak?: boolean     // ← new: start new display line after this group
}
```

In the implementation above, add `lineBreak: true` to the last group of each row (the 4th group in each set of 4). This lets the renderer lay out each tala cycle on its own line, matching the traditional notation format exactly.

***

## 7. Registration

```typescript
import { ALANKARAM_1 } from './exercises/alankaram1'

exercises: [
  SARALI_VARISAI_1,
  JANTA_VARISAI_1,
  DAATU_VARISAI_1,
  MELSTHAYI_1,
  MADHYA_STHAYI_1,
  MANDRA_STHAYI_1,
  ALANKARAM_1,
]
```
