***

## Answer to Your Quick Questions

**On separators:** In traditional Carnatic notation, grouping is conveyed by **spacing and beat position**, not explicit separator characters. Bar lines (`|`) mark tala beat boundaries, and within a beat, notes belonging to the same "gesture" are written together with no space. For your data model, explicit group arrays are cleaner and unambiguous — don't rely on text formatting  [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/).

**On Janta 3 and Alankara 1 patterns:** Here they are precisely.

**Janta Varisai 3** — the zigzag pattern:
```
S R | S R | R G | R G | G M | G M | M P | M P | P D | P D | D N | D N | N Ṡ | N Ṡ
Ṡ N | Ṡ N | N D | N D | D P | D P | P M | P M | M G | M G | G R | G R | R S | R S
```
Each group is a **pair of adjacent swaras stepping up by one**, repeated twice. So the group unit is `[current, next]`, and each group appears twice before the window slides up.

**Alankara 1** — rolling triplet:
```
S R G | R G M | G M P | M P D | P D N | D N Ṡ
Ṡ N D | N D P | D P M | P M G | M G R | G R S
```
Each group is a **triplet**, the window slides up one step each time.

***

# Spec: Exercise Data Model — Grouped Sequence Format

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**Document version:** 0.1
**Status:** Draft
**Depends on:** `spec-swara-frequencies.md`
**Relates to:** Exercise engine, ExercisePanel renderer

***

## 1. Core Principle

Every exercise is stored in two parallel representations derived from one source of truth:

- **`groups`** — the grouped structure, used by the renderer to lay out tiles correctly
- **`flatSequence`** — derived by flattening `groups`, used exclusively by the matcher to advance `expectedIndex`

The renderer never uses `flatSequence`. The matcher never uses `groups`. They share only the source data.

***

## 2. SequenceStep (unchanged)

```typescript
type SequenceStep = {
  swara: string   // e.g. "Sa", "R1", "G3"
  octave: number  // -1 = mandra, 0 = madhya, 1 = tara
}
```

***

## 3. ExerciseGroup

A group is the atomic rendering unit — one "gesture" that the student sings as a unit before moving to the next: [studocu](https://www.studocu.com/row/document/university-of-mauritius/bahons-english/sarali-varisai/53752166)

```typescript
type ExerciseGroup = {
  steps: SequenceStep[]   // 1 step (Sarali), 2 steps (Janta), 3 steps (Alankara)
  beatBoundary?: boolean  // true = render a visible bar separator after this group
}
```

***

## 4. ExercisePhrase

A phrase is one complete line of the exercise — ascending or descending. The renderer draws each phrase on its own row: [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)

```typescript
type ExercisePhrase = {
  label: "ascending" | "descending" | string  // custom label for non-arc exercises
  groups: ExerciseGroup[]
}
```

***

## 5. ExerciseDefinition

```typescript
type ExerciseDefinition = {
  id: string
  name: string
  raga: string
  talam: string
  beatsPerCycle: number
  groupSize: number          // 1 = Sarali, 2 = Janta, 3 = Alankara
  phrases: ExercisePhrase[]  // ordered — renderer draws top to bottom
  flatSequence: SequenceStep[]  // derived, used only by matcher
}
```

`flatSequence` is computed once at load time by flattening all phrases → groups → steps in order. It is never hand-authored.

***

## 6. Complete Exercise Definitions

### 6.1 Sarali Varisai 1

Group size: **1** (each step is its own group). Two phrases: ascending, descending. [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)

```typescript
const SARALI_1: ExerciseDefinition = {
  id: "sarali-1",
  name: "Sarali Varisai 1",
  raga: "mayamalavagowla",
  talam: "Adi",
  beatsPerCycle: 8,
  groupSize: 1,
  phrases: [
    {
      label: "ascending",
      groups: [
        { steps: [{ swara: "Sa", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }] },
        { steps: [{ swara: "M1", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "Pa", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }] },
        { steps: [{ swara: "N3", octave: 0 }] },
        { steps: [{ swara: "Sa", octave: 1 }], beatBoundary: true },
      ]
    },
    {
      label: "descending",
      groups: [
        { steps: [{ swara: "Sa", octave: 1 }] },
        { steps: [{ swara: "N3", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }] },
        { steps: [{ swara: "Pa", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "M1", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }] },
        { steps: [{ swara: "Sa", octave: 0 }], beatBoundary: true },
      ]
    }
  ],
  flatSequence: []  // derived at load time
}
```

***

### 6.2 Janta Varisai 1

Group size: **2** (each swara sung twice as a pair): [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)

```typescript
const JANTA_1: ExerciseDefinition = {
  id: "janta-1",
  name: "Janta Varisai 1",
  raga: "mayamalavagowla",
  talam: "Adi",
  beatsPerCycle: 8,
  groupSize: 2,
  phrases: [
    {
      label: "ascending",
      groups: [
        { steps: [{ swara: "Sa", octave: 0 }, { swara: "Sa", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }, { swara: "R1", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "G3", octave: 0 }] },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "M1", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "Pa", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "D1", octave: 0 }] },
        { steps: [{ swara: "N3", octave: 0 }, { swara: "N3", octave: 0 }] },
        { steps: [{ swara: "Sa", octave: 1 }, { swara: "Sa", octave: 1 }], beatBoundary: true },
      ]
    },
    {
      label: "descending",
      groups: [
        { steps: [{ swara: "Sa", octave: 1 }, { swara: "Sa", octave: 1 }] },
        { steps: [{ swara: "N3", octave: 0 }, { swara: "N3", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "D1", octave: 0 }] },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "Pa", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "M1", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "G3", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }, { swara: "R1", octave: 0 }] },
        { steps: [{ swara: "Sa", octave: 0 }, { swara: "Sa", octave: 0 }], beatBoundary: true },
      ]
    }
  ],
  flatSequence: []
}
```

***

### 6.3 Janta Varisai 3 — Zigzag

Group size: **2**, but steps are *different* swaras (current + next), repeated twice before sliding: [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)

```typescript
const JANTA_3: ExerciseDefinition = {
  id: "janta-3",
  name: "Janta Varisai 3",
  raga: "mayamalavagowla",
  talam: "Adi",
  beatsPerCycle: 8,
  groupSize: 2,
  phrases: [
    {
      label: "ascending",
      groups: [
        { steps: [{ swara: "Sa", octave: 0 }, { swara: "R1", octave: 0 }] },
        { steps: [{ swara: "Sa", octave: 0 }, { swara: "R1", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }, { swara: "G3", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }, { swara: "G3", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "M1", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "M1", octave: 0 }] },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "Pa", octave: 0 }] },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "Pa", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "D1", octave: 0 }] },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "D1", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "N3", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "N3", octave: 0 }] },
        { steps: [{ swara: "N3", octave: 0 }, { swara: "Sa", octave: 1 }] },
        { steps: [{ swara: "N3", octave: 0 }, { swara: "Sa", octave: 1 }], beatBoundary: true },
      ]
    },
    {
      label: "descending",
      groups: [
        { steps: [{ swara: "Sa", octave: 1 }, { swara: "N3", octave: 0 }] },
        { steps: [{ swara: "Sa", octave: 1 }, { swara: "N3", octave: 0 }] },
        { steps: [{ swara: "N3", octave: 0 }, { swara: "D1", octave: 0 }] },
        { steps: [{ swara: "N3", octave: 0 }, { swara: "D1", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "Pa", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "Pa", octave: 0 }] },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "M1", octave: 0 }] },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "M1", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "G3", octave: 0 }] },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "G3", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "R1", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "R1", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }, { swara: "Sa", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }, { swara: "Sa", octave: 0 }], beatBoundary: true },
      ]
    }
  ],
  flatSequence: []
}
```

***

### 6.4 Alankara 1 — Rolling Triplet

Group size: **3**, sliding window moves up one step per group: [studocu](https://www.studocu.com/row/document/university-of-mauritius/bahons-english/sarali-varisai/53752166)

```typescript
const ALANKARA_1: ExerciseDefinition = {
  id: "alankara-1",
  name: "Alankara 1",
  raga: "mayamalavagowla",
  talam: "Adi",
  beatsPerCycle: 8,
  groupSize: 3,
  phrases: [
    {
      label: "ascending",
      groups: [
        { steps: [{ swara: "Sa", octave: 0 }, { swara: "R1", octave: 0 }, { swara: "G3", octave: 0 }] },
        { steps: [{ swara: "R1", octave: 0 }, { swara: "G3", octave: 0 }, { swara: "M1", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "M1", octave: 0 }, { swara: "Pa", octave: 0 }] },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "Pa", octave: 0 }, { swara: "D1", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "D1", octave: 0 }, { swara: "N3", octave: 0 }] },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "N3", octave: 0 }, { swara: "Sa", octave: 1 }], beatBoundary: true },
      ]
    },
    {
      label: "descending",
      groups: [
        { steps: [{ swara: "Sa", octave: 1 }, { swara: "N3", octave: 0 }, { swara: "D1", octave: 0 }] },
        { steps: [{ swara: "N3", octave: 0 }, { swara: "D1", octave: 0 }, { swara: "Pa", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "D1", octave: 0 }, { swara: "Pa", octave: 0 }, { swara: "M1", octave: 0 }] },
        { steps: [{ swara: "Pa", octave: 0 }, { swara: "M1", octave: 0 }, { swara: "G3", octave: 0 }], beatBoundary: true },
        { steps: [{ swara: "M1", octave: 0 }, { swara: "G3", octave: 0 }, { swara: "R1", octave: 0 }] },
        { steps: [{ swara: "G3", octave: 0 }, { swara: "R1", octave: 0 }, { swara: "Sa", octave: 0 }], beatBoundary: true },
      ]
    }
  ],
  flatSequence: []
}
```

***

## 7. flatSequence Derivation (load-time utility)

```typescript
function deriveFlatSequence(exercise: ExerciseDefinition): SequenceStep[] {
  return exercise.phrases
    .flatMap(phrase => phrase.groups)
    .flatMap(group => group.steps)
}

// Called once at app init or exercise load:
SARALI_1.flatSequence = deriveFlatSequence(SARALI_1)
JANTA_1.flatSequence  = deriveFlatSequence(JANTA_1)
JANTA_3.flatSequence  = deriveFlatSequence(JANTA_3)
ALANKARA_1.flatSequence = deriveFlatSequence(ALANKARA_1)
```

The matcher only ever reads `flatSequence[expectedIndex]` — it has no knowledge of groups or phrases.

***

## 8. Renderer Contract

The renderer receives `phrases: ExercisePhrase[]` and `expectedIndex: number`. It:

1. Draws each phrase on its own row
2. Within each phrase, draws each group as a visually distinct tile cluster
3. Inserts a beat separator after any group where `beatBoundary === true`
4. Highlights the tile corresponding to `expectedIndex` by mapping back from flat index to `(phraseIndex, groupIndex, stepIndex)` — a one-time computed lookup at load

The renderer **never uses `flatSequence`** directly — only `phrases`.

***

