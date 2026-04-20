# Spec: Palta Exercise Module (Hindustani)

Repository: github.com/venkrao/sapasa  
File: `src/hindustani/exercises/palta.ts`  
Document version: 0.1  
Status: Draft  
Depends on: `spec-swara-frequencies.md`, `spec-exercise-data-model.md`  
Relates to: Exercise engine, ExercisePanel renderer

***

## 1. Background — What Kaushiki Described

In the *Sangam 2019 – Interaction with Kaushiki Chakraborty & Riyaz with Shankar Mahadevan*, Kaushiki explained paltas as numbered permutations of the seven swaras. She assigned the integers 1–7 to the notes of the saptak (octave):

| Number | Swara |
|--------|-------|
| 1 | Sa |
| 2 | Re |
| 3 | Ga |
| 4 | Ma |
| 5 | Pa |
| 6 | Dha |
| 7 | Ni |
| 1′ | Sa (upper octave) |

A palta is then a **numeric pattern** that is stamped across the scale. The pattern repeats with a sliding window, starting at Sa and moving up one step at a time until it reaches the top, then comes back down.

Her examples:

- `1 1 2 5` → Sa Sa Re Pa  
- `1 2 2 3` → Sa Re Re Ga  

The pattern itself (`1 1 2 5`, `1 2 2 3`, etc.) is the atomic unit. It does **not** change. What changes is the **root** note: on the first iteration the root is 1 (Sa), on the second it is 2 (Re), on the third it is 3 (Ga), and so on up to 7, then back down.

This is precisely what classical Hindustani teachers call a *palta* or *alankar* — a fixed interval pattern walked up and down the scale.

***

## 2. Mapping to the Existing Data Model

The `ExerciseDefinition` / `ExercisePhrase` / `ExerciseGroup` / `SequenceStep` model defined in `spec-exercise-data-model.md` can represent paltas directly:

- **`groupSize`** = length of the numeric pattern (e.g. 4 for `1 2 2 3`)
- **Each `ExerciseGroup`** = one stamped instance of the pattern at a given root
- **`ExercisePhrase`** = the full ascending or descending sweep of the pattern across all 7 roots
- **`beatBoundary`** = placed after each group (each stamped pattern instance is one beat-group unit)

No new data types are required.

***

## 3. Pattern Definition Format

A palta is defined by a **numeric offset array** relative to the root position.

```typescript
// Offset 0 = root note, 1 = one step above root, 2 = two steps above, etc.
// Negative offsets descend below root.
type PaltaPattern = {
  id: string;
  label: string;
  offsets: number[];   // e.g. [0, 0, 1, 4] for "1 1 2 5"
};
```

The offsets are **scale-degree offsets**, not semitone offsets. They index into the 7-note scale of the chosen raga. Wrapping across octave boundaries is handled by the sequence builder (see §5).

### Starter patterns (from Kaushiki's examples)

```typescript
const PALTA_PATTERNS: PaltaPattern[] = [
  { id: "p-1125", label: "1 1 2 5",  offsets: [0, 0, 1, 4] },
  { id: "p-1223", label: "1 2 2 3",  offsets: [0, 1, 1, 2] },
  // Further patterns to be added:
  { id: "p-1234", label: "1 2 3 4",  offsets: [0, 1, 2, 3] },  // Plain ascending run
  { id: "p-1243", label: "1 2 4 3",  offsets: [0, 1, 3, 2] },  // Jump and return
  { id: "p-1324", label: "1 3 2 4",  offsets: [0, 2, 1, 3] },  // Skip-step
];
```

***

## 4. Raga Context

In the Hindustani tradition, paltas are typically practiced in **Bilawal thaat** (equivalent to Carnatic Shankarabharanam / Western Ionian) for beginners, since it uses all natural (shuddha) swaras with no raised or lowered variants. This is the Hindustani counterpart to how Carnatic practice uses Mayamalavagowla.

| # | Swara (Hindustani) | Variant |
|---|---|---|
| 1 | Sa | Shuddha |
| 2 | Re | Shuddha (Re2) |
| 3 | Ga | Shuddha (Ga3) |
| 4 | Ma | Shuddha (Ma1) |
| 5 | Pa | Shuddha |
| 6 | Dha | Shuddha (Dha2) |
| 7 | Ni | Shuddha (Ni3) |

For v0.1, paltas are implemented using the **Bilawal thaat** scale only. Support for other thaats (e.g., Kafi, Bhairavi) is out of scope.

***

## 5. Sequence Builder

Rather than hand-authoring each phrase like Sarali Varisai, paltas are **algorithmically generated** from the pattern + scale. This function produces an `ExerciseDefinition` for any given `PaltaPattern`.

```typescript
import type { ExerciseDefinition, ExerciseGroup, ExercisePhrase, SequenceStep } from '../exerciseModel';
import { deriveFlatSequence } from '../exerciseModel';

// The 7 swaras of Bilawal thaat (madhya octave, octave 0)
const BILAWAL_SWARAS: string[] = ['Sa', 'Re2', 'Ga3', 'Ma1', 'Pa', 'Dha2', 'Ni3'];

/**
 * Given a root index (0–6) and an offset, resolve to a SequenceStep.
 * Offsets >= 7 wrap into tara octave (octave 1).
 * Offsets < 0 wrap into mandra octave (octave -1).
 */
function resolveStep(rootIndex: number, offset: number): SequenceStep {
  const raw = rootIndex + offset;
  const octave = raw < 0 ? -1 : raw >= 7 ? 1 : 0;
  const swara = BILAWAL_SWARAS[((raw % 7) + 7) % 7];
  // Tara Sa is represented as 'Sa' with octave 1
  return { swara, octave };
}

/**
 * Build one ExerciseGroup: the pattern stamped at a given root.
 */
function buildGroup(pattern: PaltaPattern, rootIndex: number, isLastInPhrase: boolean): ExerciseGroup {
  return {
    steps: pattern.offsets.map(offset => resolveStep(rootIndex, offset)),
    beatBoundary: true,
  };
}

/**
 * Ascending sweep: root moves from 0 (Sa) up to 6 (Ni).
 * Descending sweep: root moves from 6 (Ni) back down to 0 (Sa).
 */
export function buildPaltaExercise(pattern: PaltaPattern): ExerciseDefinition {
  const ascGroups: ExerciseGroup[] = [];
  for (let root = 0; root <= 6; root++) {
    ascGroups.push(buildGroup(pattern, root, root === 6));
  }

  const descGroups: ExerciseGroup[] = [];
  for (let root = 6; root >= 0; root--) {
    descGroups.push(buildGroup(pattern, root, root === 0));
  }

  const phrases: ExercisePhrase[] = [
    { label: 'ascending',  groups: ascGroups  },
    { label: 'descending', groups: descGroups },
  ];

  const exercise: ExerciseDefinition = {
    id: `palta-${pattern.id}`,
    label: `Palta ${pattern.label}`,
    talam: 'Teental',       // 16-beat cycle, standard for Hindustani riyaz
    beatsPerCycle: 16,
    groupSize: pattern.offsets.length,
    phrases,
    flatSequence: [],
    allowedSwaras: [],
  };

  exercise.flatSequence = deriveFlatSequence(exercise.phrases);
  exercise.allowedSwaras = Array.from(
    new Set(exercise.flatSequence.map(step =>
      step.swara === 'Sa' && step.octave === 1 ? 'Sa′' : step.swara
    ))
  );

  return exercise;
}
```

***

## 6. Worked Example — Palta "1 2 2 3" (offsets ) [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_8054103b-b0e5-4cc2-8670-4d64b8535976/5e73977a-e338-4aea-9148-035d14d5c2d7/pasted-text.txt)

Ascending sweep, root moves 0 → 6:

| Root | Stamped swaras | Number notation |
|------|----------------|-----------------|
| Sa (0) | Sa Re Re Ga | 1 2 2 3 |
| Re (1) | Re Ga Ga Ma | 2 3 3 4 |
| Ga (2) | Ga Ma Ma Pa | 3 4 4 5 |
| Ma (3) | Ma Pa Pa Dha | 4 5 5 6 |
| Pa (4) | Pa Dha Dha Ni | 5 6 6 7 |
| Dha (5) | Dha Ni Ni Sa′ | 6 7 7 1′ |
| Ni (6) | Ni Sa′ Sa′ Re′ | 7 1′ 1′ 2′ |

The descending sweep mirrors this in reverse (root 6 → 0).

**Total steps**: 7 roots × 4 notes × 2 directions = **56 steps**  
**Total groups**: 7 × 2 = **14 groups**

***

## 7. Worked Example — Palta "1 1 2 5" (offsets [youtube](https://www.youtube.com/playlist?list=PLpaF8Pyt0kEa09giY2XLjfkfGIpnHCwMh)