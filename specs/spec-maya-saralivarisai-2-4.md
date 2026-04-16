
## saraliVarisai2.ts

Pattern: `s r s r | s r | g m || s r g m | p d | n S || S n S n | S n | d p || S n d p | m g | r s` 

```ts
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const SARALI_VARISAI_2: ExerciseDefinition = {
  id: 'sarali-varisai-2',
  label: 'Sarali Varisai 2',
  phrases: [
    {
      label: 'phrase-1',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-2',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-3',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-4',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
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

SARALI_VARISAI_2.flatSequence = deriveFlatSequence(SARALI_VARISAI_2.phrases)
SARALI_VARISAI_2.allowedSwaras = Array.from(
  new Set(SARALI_VARISAI_2.flatSequence.map(stepToGraphBandKey)),
)
```

***

## saraliVarisai3.ts

Pattern: `s r g s | r g | s r || s r g m | p d | n S || S n d S | n d | S n || S n d p | m g | r s` 

```ts
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const SARALI_VARISAI_3: ExerciseDefinition = {
  id: 'sarali-varisai-3',
  label: 'Sarali Varisai 3',
  phrases: [
    {
      label: 'phrase-1',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-2',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-3',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-4',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
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

SARALI_VARISAI_3.flatSequence = deriveFlatSequence(SARALI_VARISAI_3.phrases)
SARALI_VARISAI_3.allowedSwaras = Array.from(
  new Set(SARALI_VARISAI_3.flatSequence.map(stepToGraphBandKey)),
)
```

***

## saraliVarisai4.ts

Pattern: `s r g m | s r | g m || s r g m | p d | n S || S n d p | S n | d p || S n d p | m g | r s` 

```ts
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const SARALI_VARISAI_4: ExerciseDefinition = {
  id: 'sarali-varisai-4',
  label: 'Sarali Varisai 4',
  phrases: [
    {
      label: 'phrase-1',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-2',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-3',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
      ],
    },
    {
      label: 'phrase-4',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }], beatBoundary: true },
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

SARALI_VARISAI_4.flatSequence = deriveFlatSequence(SARALI_VARISAI_4.phrases)
SARALI_VARISAI_4.allowedSwaras = Array.from(
  new Set(SARALI_VARISAI_4.flatSequence.map(stepToGraphBandKey)),
)
```

***

## Key Structural Insight

Each exercise now has **4 phrases** instead of 2 . The correct structure is:

| Exercise | Focus | What's special |
|---|---|---|
| SV2 | R and N | Oscillates `s r s r` then `S n S n` before the standard run |
| SV3 | G and D | Zigzags `s r g s | r g | s r` and mirrors with `S n d S | n d | S n` |
| SV4 | M and P | Repeats the `s r g m` tetrachord twice, then mirrors `S n d p` twice |
