# Spec: Mandra Sthayi Varisai 1 — Exercise Definition

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**File:** `src/ragas/exercises/mandraSthayi1.ts`
**Document version:** 0.1
**Status:** Draft

***

## 1. What Mandra Sthayi Varisai Is

*Mandra* = lower. Mandra Sthayi Varisai exercises combine **madhya (middle) and mandra (lower) octave** regions — the mirror image of Melsthayi Varisai which combined madhya and tara. Also called *Taggusthayi Varisai* (*taggu* = lower in Telugu). [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/mandrasthayilower-varisai/)

The series has 5 exercises of increasing depth into the lower octave. Each exercise progressively descends one note further into mandra sthayi — exactly mirroring how Melsthayi progressively ascended into tara sthayi. [bhmurali](https://bhmurali.com/pdf%20files/Mandra%20Sthayi%20Varisai.pdf)

| Exercise | Lowest note reached |
|---|---|
| 1 | Mandra Sa (S, octave -1) |
| 2 | Mandra N3 (n, octave -1) |
| 3 | Mandra D1 (d, octave -1) |
| 4 | Mandra Pa (p, octave -1) |
| 5 | Mandra M1 (m, octave -1) |

This spec covers **Exercise 1**. [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/mandrasthayilower-varisai/)

***

## 2. Important Note on Notation Convention

Mandra sthayi notes are conventionally written with a **dot below** the letter in traditional Carnatic notation — e.g. Ṣ for mandra Sa, Ṇ for mandra N3. In your app's `SequenceStep` model, these are represented as `octave: -1`. The existing `notationOf()` function in `ExercisePanel.tsx` needs a mandra variant, mirroring the tara variant added for Melsthayi. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/9e315e97-066e-466b-a09a-3b0ccf14445e/ExercisePanel.tsx)

***

## 3. Pattern

From the canonical source: [bhmurali](https://bhmurali.com/pdf%20files/Mandra%20Sthayi%20Varisai.pdf)

```
Phrase 1 (descent to mandra Sa):
Ṡ  N  D  P  |  M  G  |  R  S  ||

Phrase 2 (mandra Sa hold):
Ṣ  .  .  .  |  Ṣ  .  |  .  .  ||

Phrase 3 (ascent from mandra through madhya):
Ġ  Ṛ  Ṣ  ṇ  |  Ṣ  Ṛ  |  Ġ  Ṁ  ||

Phrase 4 (return to madhya Sa):
Ṡ  N  D  P  |  M  G  |  R  S  ||
Ṡ  R  G  M  ... (continuation back)
```

Reading out as explicit swara steps, expanding holds as repeated notes:

**Phrase 1 — Descend to mandra Sa (8 steps):**
```
Sa(1)  N3(0)  D1(0)  Pa(0)  |  M1(0)  G3(0)  |  R1(0)  Sa(0)  ||
```

**Phrase 2 — Hold mandra Sa (8 steps):**
```
Sa(-1)  Sa(-1)  Sa(-1)  Sa(-1)  |  Sa(-1)  Sa(-1)  |  Sa(-1)  Sa(-1)  ||
```

**Phrase 3 — Ascent from mandra back through madhya (8 steps):**
```
G3(-1)  R1(-1)  Sa(-1)  N3(-1)  |  Sa(-1)  R1(-1)  |  G3(-1)  M1(-1)  ||
```

> Note: Phrase 3 is a *rebound phrase* — it weaves around mandra Sa with the notes immediately above it (mandra G3, R1) before starting the climb back up. This is the pedagogical core — the student must navigate the area just above their lowest comfortable note. [riyazapp](https://riyazapp.com/courses/carnatic-classical/mandra-sthayi-varase/)

**Phrase 4 — Return to madhya Sa (8 steps):**
```
Sa(1)  N3(0)  D1(0)  Pa(0)  |  M1(0)  G3(0)  |  R1(0)  Sa(0)  ||
```

> Note: Phrase 4 mirrors Phrase 1 exactly — it is the ascent back from wherever the lower phrases left the voice, returning cleanly to madhya Sa.

***

## 4. Implementation

```typescript
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1)  return "Sa'"
  if (step.swara === 'Sa' && step.octave <= -1) return "Sa,"   // mandra Sa band key
  return step.swara
}

export const MANDRA_STHAYI_1: ExerciseDefinition = {
  id: 'mandra-sthayi-1',
  label: 'Mandra Sthayi Varisai 1',
  phrases: [
    {
      label: 'descent',
      groups: [
        { steps: [{ swara: 'Sa',  octave:  1 }] },   // tara Sa — start point
        { steps: [{ swara: 'N3',  octave:  0 }] },
        { steps: [{ swara: 'D1',  octave:  0 }] },
        { steps: [{ swara: 'Pa',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'M1',  octave:  0 }] },
        { steps: [{ swara: 'G3',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'R1',  octave:  0 }] },
        { steps: [{ swara: 'Sa',  octave:  0 }], beatBoundary: true },
      ],
    },
    {
      label: 'hold-mandra',
      groups: [
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }], beatBoundary: true },
      ],
    },
    {
      label: 'rebound',
      groups: [
        { steps: [{ swara: 'G3', octave: -1 }] },
        { steps: [{ swara: 'R1', octave: -1 }] },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'N3', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: -1 }] },
        { steps: [{ swara: 'R1', octave: -1 }], beatBoundary: true },
        { steps: [{ swara: 'G3', octave: -1 }] },
        { steps: [{ swara: 'M1', octave: -1 }], beatBoundary: true },
      ],
    },
    {
      label: 'ascent',
      groups: [
        { steps: [{ swara: 'Sa',  octave:  1 }] },   // tara Sa — return anchor
        { steps: [{ swara: 'N3',  octave:  0 }] },
        { steps: [{ swara: 'D1',  octave:  0 }] },
        { steps: [{ swara: 'Pa',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'M1',  octave:  0 }] },
        { steps: [{ swara: 'G3',  octave:  0 }], beatBoundary: true },
        { steps: [{ swara: 'R1',  octave:  0 }] },
        { steps: [{ swara: 'Sa',  octave:  0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

MANDRA_STHAYI_1.flatSequence = deriveFlatSequence(MANDRA_STHAYI_1.phrases)
MANDRA_STHAYI_1.allowedSwaras = Array.from(
  new Set(MANDRA_STHAYI_1.flatSequence.map(stepToGraphBandKey)),
)
```

***

## 5. Flat Sequence Stats

| Property | Value |
|---|---|
| Total steps | 32 (8 per phrase × 4 phrases) |
| Phrases | 4 (descent, hold-mandra, rebound, ascent) |
| Octaves spanned | -1 (mandra), 0 (madhya), 1 (tara) |
| Lowest note | Sa octave -1 (mandra Sa) |
| Highest note | Sa octave 1 (tara Sa — start and end anchor) |

***

## 6. Code Changes Required

### 6.1 notationOf() in ExercisePanel.tsx

Add mandra notation support — dots below the letter: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/9e315e97-066e-466b-a09a-3b0ccf14445e/ExercisePanel.tsx)

```typescript
const MANDRA_NOTATION: Record<string, string> = {
  'Sa': 'Ṣ',
  'R1': 'Ṛ',
  'G3': 'Ġ',   // reused from tara — context makes it clear
  'M1': 'Ṃ',
  'Pa': 'Ṗ',
  'D1': 'Ḍ',
  'N3': 'Ṇ',
}

function notationOf(step: SequenceStep): string {
  if (step.swara === 'Sa' && step.octave >= 1)  return 'Ṡ'
  if (step.octave >= 1)  return TARA_NOTATION[step.swara]  ?? step.swara
  if (step.octave <= -1) return MANDRA_NOTATION[step.swara] ?? step.swara
  return SWARA_TO_NOTATION[step.swara] ?? step.swara
}
```

### 6.2 Pitch Roll Y-axis

Mandra sthayi notes fall **below the current E2 floor** for some shrutis. Verify that `build_frequency_map` in `swaras.ts` includes `octave: -1` entries and that the pitch roll renders them. For D# shruti, mandra Sa sits at ~155.56 Hz — well within audible and renderable range. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/f9304d07-4d02-4ca1-9a3a-9eeb90fbd43b/swaras.ts)

***

## 7. Registration

```typescript
import { MANDRA_STHAYI_1 } from './exercises/mandraSthayi1'

exercises: [
  SARALI_VARISAI_1,
  JANTA_VARISAI_1,
  DAATU_VARISAI_1,
  MELSTHAYI_1,
  MADHYA_STHAYI_1,
  MANDRA_STHAYI_1,   // ← add
]
```
