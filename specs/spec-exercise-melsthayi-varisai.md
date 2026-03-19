# Spec: Melsthayi Varisai 1 — Exercise Definition

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**File:** `src/ragas/exercises/melsthayi1.ts`
**Document version:** 0.1
**Status:** Draft

***

## 1. What Melsthayi Varisai Is

*Mel* means upper/above. *Sthayi* means octave region. Melsthayi Varisai is a set of **5 progressive exercises** designed specifically to extend the student's vocal range into the **tara sthayi** (upper octave). [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/melsthayiupper-sthayi-varisai/)

The structural logic is unique among all exercise families:
- **Each exercise builds on the previous one** by adding one more note into the upper octave
- Exercise 1 reaches tara Sa (Ṡ)
- Exercise 2 reaches tara R1 (Ṙ)
- Exercise 3 reaches tara G3 (Ġ)
- Exercise 4 reaches tara M1 (Ṁ)
- Exercise 5 reaches tara Pa (Ṗ)

This spec covers **Exercise 1 only** — the pattern for subsequent exercises follows the same model with one additional tara note appended. [octavesonline](https://www.octavesonline.com/post/unlocking-melodic-heights-mastering-mel-sthayi-varisai-for-musical-growth)

***

## 2. What Makes This Structurally Different

All previous exercises (Sarali, Janta, Daatu) have **symmetric phrase structures** — ascending mirrors descending. Melsthayi Varisai 1 does **not**. It has three distinct sections: [bhmurali](https://bhmurali.com/pdf%20files/Mel%20Sthayi%20Varisai.pdf)

1. **Ascending run** — madhya sthayi up to tara Sa, then held
2. **Hold phrase** — tara Sa sustained (represented as a comma `,` in traditional notation = held beat)
3. **Descending run** — from tara Sa back down to madhya Sa

Additionally, the held note (`,`) creates **rests/holds** in the sequence. In the app, a held note is the same swara repeated — the student sustains the same pitch for multiple beats.

***

## 3. Full Pattern

From the canonical source: [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/melsthayiupper-sthayi-varisai/)

```
Ascending:   S  R  G  M  |  P  D  |  N  Ṡ  ||
Hold:        Ṡ  .  .  .  |  Ṡ  .  |  .  .  ||
Descending:  D  N  Ṡ  Ṙ  |  Ṡ  N  |  D  P  ||
             Ṡ  N  D  P  |  M  G  |  R  S  ||
```

Where `.` = hold (same note sustained, one beat each).

In sequence step terms, a hold is represented as a **repeat of the same swara** — identical to how Janta handles repeated notes, so no new data type is needed.

**Ascending phrase** (8 steps):
```
S  R  G  M  P  D  N  Ṡ
```

**Hold phrase** (8 steps — tara Sa repeated):
```
Ṡ  Ṡ  Ṡ  Ṡ  Ṡ  Ṡ  Ṡ  Ṡ
```

**Descending phrase A** (8 steps — descends from tara Sa through tara R1):
```
D  N  Ṡ  Ṙ  Ṡ  N  D  P
```

**Descending phrase B** (8 steps — returns to madhya Sa):
```
Ṡ  N  D  P  M  G  R  S
```

> **Note on Ṙ (tara R1):** Descending phrase A introduces **tara R1** — the only exercise in this spec set that reaches above tara Sa. Octave = 1, swara = R1.

***

## 4. Group Size

The ascending and hold phrases use **groupSize: 1** (one step per beat, Sarali-style). The descending phrases also use groupSize: 1 but with beat boundaries every 2 steps to reflect the 2-beat grouping in the tala pattern. [bhmurali](https://bhmurali.com/pdf%20files/Mel%20Sthayi%20Varisai.pdf)

***

## 5. Implementation

```typescript
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const MELSTHAYI_1: ExerciseDefinition = {
  id: 'melsthayi-1',
  label: 'Melsthayi Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'hold',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending-a',
      groups: [
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'R1', octave: 1 }], beatBoundary: true },  // tara R1
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending-b',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

MELSTHAYI_1.flatSequence = deriveFlatSequence(MELSTHAYI_1.phrases)
MELSTHAYI_1.allowedSwaras = Array.from(
  new Set(MELSTHAYI_1.flatSequence.map(stepToGraphBandKey)),
)
```

***

## 6. Flat Sequence Stats

| Property | Value |
|---|---|
| Total steps | 32 (8 per phrase × 4 phrases) |
| Groups | 32 (groupSize 1 throughout) |
| Phrases | 4 (ascending, hold, descending-a, descending-b) |
| Octaves spanned | 0 (madhya), 1 (tara) |
| Highest note reached | R1 octave 1 (tara Rishabham) |

***

## 7. UI Rendering Notes

### Four-phrase layout
Unlike all previous exercises which have 2 phrases (ascending + descending), this exercise has **4 phrases**. The renderer draws each phrase on its own row — no code change needed since `ExercisePanel` already iterates `phrases` generically. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/9e315e97-066e-466b-a09a-3b0ccf14445e/ExercisePanel.tsx)

### Hold phrase
The hold phrase (8× tara Sa) will render as 8 identical `Ṡ` tiles in a row. This is visually correct — it communicates to the student that tara Sa must be **sustained for 8 beats**, which is precisely the pedagogical point of this phrase. [madhuraswarangal](https://www.madhuraswarangal.com/basic-lessons/melsthayi-varisai)

### Descending-a phrase
This phrase contains **tara R1 (Ṙ)** — a note above tara Sa. The `stepToGraphBandKey` function needs one addition to handle this:

```typescript
function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return "Sa'"
  if (step.octave >= 1) return `${step.swara}'`  // e.g. "R1'" for tara R1
  return step.swara
}
```

And the `SWARA_TO_NOTATION` map in `ExercisePanel.tsx` needs tara variants:

```typescript
const TARA_NOTATION: Record<string, string> = {
  'R1': 'Ṙ',
  'G3': 'Ġ',
  'M1': 'Ṁ',
  'Pa': 'Ṗ',
}

function notationOf(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1) return 'Ṡ'
  if (step.octave >= 1) return TARA_NOTATION[step.swara] ?? step.swara
  return SWARA_TO_NOTATION[step.swara] ?? step.swara
}
```

***

## 8. Registration

```typescript
import { MELSTHAYI_1 } from './exercises/melsthayi1'

exercises: [
  SARALI_VARISAI_1,
  JANTA_VARISAI_1,
  DAATU_VARISAI_1,
  MELSTHAYI_1,    // ← add
]
```

