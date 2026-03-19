# Spec: Daatu Varisai 1 — Exercise Definition

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**File:** `src/ragas/exercises/datuVarisai1.ts`
**Document version:** 0.1
**Status:** Draft

***

## 1. What Daatu Varisai Is

*Daatu* (also spelled *Dhattu* or *Dhaatu*) means "skip" or "leap." Daatu Varisai exercises are **zigzag sequences** where the voice jumps over one or more swaras rather than moving stepwise. Unlike Sarali (stepwise) and Janta (pairs), Daatu forces the student to land accurately on non-adjacent swaras — training the voice to hit any note cold, regardless of what came before. [learncarnaticmusicblog.wordpress](https://learncarnaticmusicblog.wordpress.com/2016/03/02/dhatu-varisai/)

This is the first exercise in the curriculum where **pitch accuracy under leaping conditions** is tested. It directly prepares students for raga phrases, which frequently jump between non-adjacent swaras. [studylib](https://studylib.net/doc/8940064/music-notes-beginners-class-1--)

***

## 2. Pattern Structure

Daatu Varisai 1 is built on a **4-note zigzag cell** that slides up the scale one step at a time. Each cell follows the shape: [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/daatu-varisai/)

```
current  +2  current+1  +2-from-that
```

More concretely, using scale positions 1–7 (S=1, R=2, G=3, M=4, P=5, D=6, N=7):

```
Cell 1:  S  G  R  M
Cell 2:  R  M  G  P
Cell 3:  G  P  M  D
Cell 4:  M  D  P  N
Cell 5:  P  N  D  Ṡ
```

Each cell = skip one, step back, skip one again. The window slides up by one swara each cell. **Beat boundary falls after every cell**. [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/daatu-varisai/)

**Full ascending notation:**
```
S G R M | R M G P | G P M D | M D P N | P N D Ṡ |
```

**Full descending notation** (mirror — skip one down, step back up, skip one down):
```
Ṡ D N P | N P D M | D M P G | P G M R | M R G S |
```

***

## 3. Group Size

Each cell is **4 steps** — but unlike Alankara (which also has multi-step groups), the 4 steps in a Daatu cell do **not** slide as a window. The cell is the atomic unit: the student sings all 4 as a gesture before the next cell begins.

`groupSize: 4`

***

## 4. Implementation

```typescript
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const DAATU_VARISAI_1: ExerciseDefinition = {
  id: 'daatu-varisai-1',
  label: 'Daatu Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        // Cell 1: S G R M
        {
          steps: [
            { swara: 'Sa', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'R1', octave: 0 },
            { swara: 'M1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 2: R M G P
        {
          steps: [
            { swara: 'R1', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'Pa', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 3: G P M D
        {
          steps: [
            { swara: 'G3', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'D1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 4: M D P N
        {
          steps: [
            { swara: 'M1', octave: 0 },
            { swara: 'D1', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'N3', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 5: P N D Ṡ
        {
          steps: [
            { swara: 'Pa', octave: 0 },
            { swara: 'N3', octave: 0 },
            { swara: 'D1', octave: 0 },
            { swara: 'Sa', octave: 1 },
          ],
          beatBoundary: true,
        },
      ],
    },
    {
      label: 'descending',
      groups: [
        // Cell 1: Ṡ D N P
        {
          steps: [
            { swara: 'Sa', octave: 1 },
            { swara: 'D1', octave: 0 },
            { swara: 'N3', octave: 0 },
            { swara: 'Pa', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 2: N P D M
        {
          steps: [
            { swara: 'N3', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'D1', octave: 0 },
            { swara: 'M1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 3: D M P G
        {
          steps: [
            { swara: 'D1', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'Pa', octave: 0 },
            { swara: 'G3', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 4: P G M R
        {
          steps: [
            { swara: 'Pa', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'M1', octave: 0 },
            { swara: 'R1', octave: 0 },
          ],
          beatBoundary: true,
        },
        // Cell 5: M R G S
        {
          steps: [
            { swara: 'M1', octave: 0 },
            { swara: 'R1', octave: 0 },
            { swara: 'G3', octave: 0 },
            { swara: 'Sa', octave: 0 },
          ],
          beatBoundary: true,
        },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

DAATU_VARISAI_1.flatSequence = deriveFlatSequence(DAATU_VARISAI_1.phrases)
DAATU_VARISAI_1.allowedSwaras = Array.from(
  new Set(DAATU_VARISAI_1.flatSequence.map(stepToGraphBandKey)),
)
```

***

## 5. Flat Sequence Stats

| Property | Value |
|---|---|
| Total steps | 40 (5 cells × 4 steps × 2 phrases) |
| Groups | 10 (5 per phrase) |
| Beat boundaries | Every group (10 total) |
| Octaves spanned | 0 (madhya) and 1 (tara Sa only) |

***

## 6. Registration

Add to `MAYAMALAVAGOWLA.exercises` in `mayamalavagowla.ts`:

```typescript
import { DAATU_VARISAI_1 } from './exercises/datuVarisai1'

exercises: [
  SARALI_VARISAI_1,
  JANTA_VARISAI_1,
  DAATU_VARISAI_1,   // ← add
]
```

***

## 7. Matcher Note

Because cells jump non-adjacently, the matcher may receive a pitch that is correct but **two swaras ahead** of `expectedIndex` — for example the student sings G when S is expected (skipping ahead in the cell). The matcher must **not** auto-advance on partial matches; it advances only on the exact `expectedIndex` swara. Out-of-sequence pitches within ±50 cents of a raga swara should be logged as wrong-note events but must not move the pointer. [youtube](https://www.youtube.com/watch?v=UNvuH1b1rks)

***

