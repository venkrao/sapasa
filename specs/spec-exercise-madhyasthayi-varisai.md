# Spec: Madhya Sthayi Varisai 1 — Exercise Definition

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**File:** `src/ragas/exercises/madhyaSthayi1.ts`
**Document version:** 0.1
**Status:** Draft

***

## 1. What Madhya Sthayi Varisai Is

*Madhya* = middle. *Sthayi* = octave region. Madhya Sthayi Varisai exercises **combine all three octave regions** — mandra (lower), madhya (middle), and tara (upper) — into a single flowing exercise. The voice must move fluidly across octave boundaries rather than staying in one register. [eviolinguru](https://www.eviolinguru.com/uploads/7/3/5/7/735729/madhya_sthayi_varisai.pdf)

The series has at least 4 exercises of increasing complexity: [youtube](https://www.youtube.com/playlist?list=PL0tStqEWjU4UXAJj0ysfmrLt8ycRKE5Hs)

| Exercise | Character |
|---|---|
| 1 | Ascent from madhya Sa to tara Sa, descent back with a Pa-region hold |
| 2 | Starts from tara Sa, descends through mandra, returns |
| 3 | Three-octave sweep — mandra Sa to tara Sa and back |
| 4 | Complex leaping patterns across all three octaves |

This spec covers **Exercise 1**. [scribd](https://www.scribd.com/document/360687369/01-Sarali-Madhyasthayi-Varishai)

***

## 2. Pattern

Exercise 1 has a characteristic structure: a **rising phrase in madhya sthayi**, a **held Pa region**, then a **descending phrase that weaves between tara and madhya** before returning to madhya Sa. [scribd](https://www.scribd.com/document/360687369/01-Sarali-Madhyasthayi-Varishai)

**Full notation** (using canonical source ): [scribd](https://www.scribd.com/document/360687369/01-Sarali-Madhyasthayi-Varishai)

```
Ascending phrase:
s  r  g  m  |  p  ,  g  m  |  p  ,  ,  ,  ||

Descending phrase:
g  m  p  d  |  n  d  p  m  |  g  m  p  g  |  m  g  r  s  ||
```

Where `,` = hold (same note sustained for one beat).

Reading this out as actual swara steps:

**Ascending (12 steps):**
```
S  R  G  M  |  P  P  G  M  |  P  P  P  P  ||
```

**Descending (16 steps):**
```
G  M  P  D  |  N  D  P  M  |  G  M  P  G  |  M  G  R  S  ||
```

> Note: The descending phrase does **not** start from tara Sa — it starts from madhya G3 and moves outward, which is the distinctive character of this exercise. It trains the voice to navigate the Pa region (the gravitational centre of this raga) with fluency. [eviolinguru](https://www.eviolinguru.com/uploads/7/3/5/7/735729/madhya_sthayi_varisai.pdf)

***

## 3. Structural Notes

- **No mandra sthayi** in Exercise 1 — all notes are octave 0 (madhya). Mandra appears from Exercise 2 onwards.
- **Pa is the "resting note"** (*nyasa swara*) here — the hold on Pa in the ascending phrase is intentional and pedagogically significant. [scribd](https://www.scribd.com/document/360687369/01-Sarali-Madhyasthayi-Varishai)
- **groupSize: 1** throughout — each step is its own group, beat boundaries every 4 steps per Adi talam.

***

## 4. Implementation

```typescript
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const MADHYA_STHAYI_1: ExerciseDefinition = {
  id: 'madhya-sthayi-1',
  label: 'Madhya Sthayi Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },  // hold
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },  // hold
        { steps: [{ swara: 'Pa', octave: 0 }] },  // hold
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },  // hold
      ],
    },
    {
      label: 'descending',
      groups: [
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

MADHYA_STHAYI_1.flatSequence = deriveFlatSequence(MADHYA_STHAYI_1.phrases)
MADHYA_STHAYI_1.allowedSwaras = Array.from(
  new Set(MADHYA_STHAYI_1.flatSequence.map(stepToGraphBandKey)),
)
```

***

## 5. Flat Sequence Stats

| Property | Value |
|---|---|
| Total steps | 28 (12 ascending + 16 descending) |
| Groups | 28 (groupSize 1 throughout) |
| Phrases | 2 |
| Octaves spanned | 0 (madhya) only |
| Highest note | Pa (octave 0) |
| Characteristic feature | Pa held as nyasa swara in ascending phrase |

***

## 6. Key Pedagogical Point for the UI

Pa appears **7 times** out of 28 steps — more than any other swara in this exercise. The pitch roll will naturally show many landings in the Pa lane, which is correct. If you ever add a per-swara hit-rate overlay, Pa's high frequency in this exercise should be noted — it's intentional, not a data anomaly. [eviolinguru](https://www.eviolinguru.com/uploads/7/3/5/7/735729/madhya_sthayi_varisai.pdf)

***

## 7. Registration

```typescript
import { MADHYA_STHAYI_1 } from './exercises/madhyaSthayi1'

exercises: [
  SARALI_VARISAI_1,
  JANTA_VARISAI_1,
  DAATU_VARISAI_1,
  MELSTHAYI_1,
  MADHYA_STHAYI_1,   // ← add
]
```
