# Spec Update: Raga Definition — Arohanam & Avarohanam

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**Document version:** 0.2 (amends `spec-exercise-data-model.md` and `spec-exercise-sarali-varisai.md`)
**Status:** Draft

***

## 1. Why This Matters

Every Carnatic raga has a defined **arohanam** (ascending scale) and **avarohanam** (descending scale). These are not always the same set of notes — some ragas skip notes in one direction, use different variants ascending vs descending, or have vakra (zigzag) phrases embedded in the scale itself. [en.wikipedia](https://en.wikipedia.org/wiki/Mayamalavagowla)

The exercise engine needs the raga definition to:
- Know which swaras are **valid** in this raga (for dimming irrelevant lines on the pitch roll)
- Know which swaras are valid **in each direction** (for exercise sequence validation)
- Display the arohanam/avarohanam correctly in the raga reference card UI

***

## 2. RagaDefinition Type

```typescript
type SwaraStep = {
  swara: string    // e.g. "Sa", "R1", "G3"
  octave: number   // 0 = madhya, 1 = tara, -1 = mandra
}

type RagaDefinition = {
  id: string
  name: string
  aliases: string[]
  melakartha: number | null    // null for janya ragas that aren't melakartha
  chakra: string | null
  timeOfDay: string | null
  rasa: string[]
  hindustaniEquivalent: string | null

  arohanam: SwaraStep[]        // ascending scale, Sa to Sa'
  avarohanam: SwaraStep[]      // descending scale, Sa' to Sa

  // Derived at load time from arohanam + avarohanam union
  swarasUsed: string[]         // unique swara ids used in this raga
}
```

***

## 3. Mayamalavagowla Definition

```typescript
const MAYAMALAVAGOWLA: RagaDefinition = {
  id: "mayamalavagowla",
  name: "Mayamalavagowla",
  aliases: ["Malavagowla", "Suddha Gowla"],
  melakartha: 15,
  chakra: "Agni (3rd)",
  timeOfDay: "Morning (dawn)",
  rasa: ["Shantha", "Bhakti", "Karuna"],
  hindustaniEquivalent: "Bhairav",

  arohanam: [
    { swara: "Sa", octave: 0 },
    { swara: "R1", octave: 0 },
    { swara: "G3", octave: 0 },
    { swara: "M1", octave: 0 },
    { swara: "Pa", octave: 0 },
    { swara: "D1", octave: 0 },
    { swara: "N3", octave: 0 },
    { swara: "Sa", octave: 1 },
  ],

  avarohanam: [
    { swara: "Sa", octave: 1 },
    { swara: "N3", octave: 0 },
    { swara: "D1", octave: 0 },
    { swara: "Pa", octave: 0 },
    { swara: "M1", octave: 0 },
    { swara: "G3", octave: 0 },
    { swara: "R1", octave: 0 },
    { swara: "Sa", octave: 0 },
  ],

  // Derived at load time:
  swarasUsed: ["Sa", "R1", "G3", "M1", "Pa", "D1", "N3"]
}
```

Mayamalavagowla is **sampurna** — all 7 swaras appear in both directions, and arohanam and avarohanam are mirror images of each other. This is the simplest case. [en.wikipedia](https://en.wikipedia.org/wiki/Mayamalavagowla)

***

## 4. How a Non-Symmetric Raga Would Look

For contrast, here is how a raga with **different ascending and descending swaras** would be represented — using **Kharaharapriya** (Melakarta #22) as an example, which is symmetric, vs a janya raga like **Abheri** which is not: [anuradhamahesh.wordpress](https://anuradhamahesh.wordpress.com/carnatic-raga-appreciation/22-mayamalavagowla-the-raga-with-the-freshness-of-morning-dew/)

```typescript
// Abheri — a janya raga (derived, not melakartha)
// Arohanam skips G and D; Avarohanam is full
const ABHERI: RagaDefinition = {
  id: "abheri",
  name: "Abheri",
  aliases: ["Abhiri"],
  melakartha: null,           // janya raga — not a melakartha itself
  chakra: null,
  timeOfDay: "Evening",
  rasa: ["Karuna", "Shringara"],
  hindustaniEquivalent: "Bhimpalasi",

  arohanam: [
    { swara: "Sa", octave: 0 },
    { swara: "R2", octave: 0 },
    // G3 skipped in ascent
    { swara: "M1", octave: 0 },
    { swara: "Pa", octave: 0 },
    // D2 skipped in ascent
    { swara: "N2", octave: 0 },
    { swara: "Sa", octave: 1 },
  ],

  avarohanam: [
    { swara: "Sa", octave: 1 },
    { swara: "N2", octave: 0 },
    { swara: "D2", octave: 0 },  // D2 present in descent
    { swara: "Pa", octave: 0 },
    { swara: "M1", octave: 0 },
    { swara: "G3", octave: 0 },  // G3 present in descent
    { swara: "R2", octave: 0 },
    { swara: "Sa", octave: 0 },
  ],

  swarasUsed: ["Sa", "R2", "G3", "M1", "Pa", "D2", "N2"]
}
```

This demonstrates why arohanam and avarohanam must be **separate arrays** — a single `swaras` list would lose the directional information that defines the raga's identity.

***

## 5. Derived Field: swarasUsed

Computed at load time as the union of all swaras in arohanam and avarohanam, deduplicated:

```typescript
function deriveSwarasUsed(raga: RagaDefinition): string[] {
  const all = [
    ...raga.arohanam.map(s => s.swara),
    ...raga.avarohanam.map(s => s.swara)
  ]
  return [...new Set(all)]
}

MAYAMALAVAGOWLA.swarasUsed = deriveSwarasUsed(MAYAMALAVAGOWLA)
```

This field is what the pitch roll renderer uses to decide which swara lines to dim — any swara not in `swarasUsed` is rendered at reduced opacity when an exercise is active. [artiumacademy](https://artiumacademy.com/blogs/understanding-the-basics-of-carnatic-music-notation/)

***

## 6. ExerciseDefinition Update

`ExerciseDefinition` gets one new field linking it to its raga:

```typescript
type ExerciseDefinition = {
  id: string
  name: string
  ragaId: string             // ← links to RagaDefinition.id
  talam: string
  beatsPerCycle: number
  groupSize: number
  phrases: ExercisePhrase[]
  flatSequence: SequenceStep[]
}
```

The `raga` string field is replaced by `ragaId` — the full `RagaDefinition` object is looked up separately, keeping the exercise definition lean.

***

## 7. Raga Reference Card UI

The in-app raga card renders directly from `RagaDefinition`:

```
┌─────────────────────────────────────────────┐
│  Mayamalavagowla          Melakarta #15      │
│                                             │
│  Arohanam:                                  │
│  S  R₁  G₃  M₁  P  D₁  N₃  Ṡ              │
│                                             │
│  Avarohanam:                                │
│  Ṡ  N₃  D₁  P  M₁  G₃  R₁  S              │
│                                             │
│  Time: Morning (dawn)                       │
│  Mood: Peaceful · Devotional · Tender       │
│  Equivalent: Bhairav (Hindustani)           │
│                                             │
│  The gateway raga of Carnatic music.        │
│  All foundational exercises are set here.   │
│  Characteristic: large jumps R₁→G₃ and     │
│  D₁→N₃ (3 semitones each).                 │
└─────────────────────────────────────────────┘
```

The arohanam and avarohanam rows use the same `SWARA_TO_NOTATION` map already present in `ExercisePanel`.

***

## 8. Validation Rule (Optional, Future)

When an exercise sequence is authored, a validator can check that every swara in the sequence appears in the raga's `swarasUsed`. This prevents data entry errors when adding new exercises:

```typescript
function validateExerciseAgainstRaga(
  exercise: ExerciseDefinition,
  raga: RagaDefinition
): string[] {
  const errors: string[] = []
  for (const step of exercise.flatSequence) {
    if (!raga.swarasUsed.includes(step.swara)) {
      errors.push(
        `Step ${step.swara} (octave ${step.octave}) not in raga ${raga.id}`
      )
    }
  }
  return errors
}
```

***