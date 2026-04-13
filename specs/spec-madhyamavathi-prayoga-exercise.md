# Spec: Madhyamavathi Prayoga Exercise
**File:** `src/ragas/madhyamavathi.ts` (additions to `MADHYAMAVATHI: RagaDefinition`)
**Source:** P.P. Narayanaswami, *Rāgam Madhyamāvati* (carnatica.net); Wikipedia; carnatica.in

***

## Background

A **prayoga** (Sanskrit: प्रयोग, "usage/application") is a characteristic melodic phrase that
defines a raga's identity — the Carnatic equivalent of the Hindustani *pakkad/pidi*.
For Madhyamavathi, prayogas are especially important because the raga's 5 pentatonic
notes (S R2 M1 P N2) overlap with several other ragas; it is the *specific phrase shapes*,
not just the scale, that distinguish it.

The ranjaka prayogams (रंजक प्रयोगम् — "pleasing/beautifying phrases") documented by
P.P. Narayanaswami are the canonical reference set used in practice and teaching.

***

## Raga Metadata (additions to RagaDefinition)

```ts
// Add to MADHYAMAVATHI RagaDefinition:

jivaSwara: ['R2', 'D3'],          // R2 (Ri) and N2 (aliased D3) — rendered dīrgham (elongated)
chayaSwara: ['R2', 'M1', 'D3'],   // Shadow/colour swaras that define the raga's hue
nyasaSwara: ['R2', 'M1', 'Pa', 'D3'],  // Resting/resolution notes for phrases
grahaSwara: ['Sa', 'R2', 'M1', 'Pa', 'D3'], // Notes from which compositions may begin
```

**Gamaka notes:**
- **R2 and N2 (D3)** are *kampita swaras* — they must be rendered with oscillation/shake.
  In beginner exercises these can be shown as held, but the app should note that oscillation
  is expected.

***

## The 6 Ranjaka Prayogams

Source transliteration (Narayanaswami): `ri ma pa nI pa ma rI; sa NI PA; Ni sa ri sa rI;
ma ri pa ma ni pa Sa ni RI Sa; ma pa ni pa NI pa m`

Notation convention used here:
- Lowercase = madhya sthayi (middle octave)
- UPPERCASE = tara sthayi (upper octave)
- Octave field follows your existing `{ swara, octave }` model (octave 0 = madhya, 1 = tara, -1 = mandra)

### Prayoga 1 — The Core Ascent-Descent Loop
**Source phrase:** `ri ma pa nI pa ma rI`
**Shape:** Up to upper N, back down — the most "fingerprint" phrase of the raga

```ts
{
  id: 'prayoga-1',
  label: 'Prayoga 1 — Core loop (ri ma pa ni pa ma ri)',
  description: 'The defining phrase of Madhyamavathi. Ascends to upper N2, descends symmetrically. Both Ri and Ni are kampita (oscillated).',
  sequence: [
    { swara: 'R2', octave: 0 },  // ri
    { swara: 'M1', octave: 0 },  // ma
    { swara: 'Pa', octave: 0 },  // pa
    { swara: 'D3', octave: 0 },  // nI  (N2 upper neighbour, still madhya)
    { swara: 'Pa', octave: 0 },  // pa
    { swara: 'M1', octave: 0 },  // ma
    { swara: 'R2', octave: 0 },  // rI (held/kampita)
  ] as SequenceStep[],
  gamakaHints: {
    'R2': 'kampita',  // oscillate R2
    'D3': 'kampita',  // oscillate N2
  }
}
```

### Prayoga 2 — Upper Octave Launch
**Source phrase:** `sa NI PA`
**Shape:** Sa → tara Ni → tara Pa (descending from upper octave entry)

```ts
{
  id: 'prayoga-2',
  label: 'Prayoga 2 — Upper octave launch (sa NI PA)',
  description: 'Jump from madhya Sa to tara Ni, then settle on tara Pa. Characteristic of alapana openings.',
  sequence: [
    { swara: 'Sa', octave: 0 },  // sa
    { swara: 'D3', octave: 1 },  // NI (tara N2)
    { swara: 'Pa', octave: 1 },  // PA (tara Pa)
  ] as SequenceStep[],
}
```

### Prayoga 3 — Ri Oscillation Phrase
**Source phrase:** `Ni sa ri sa rI`
**Shape:** Descend from upper Ni into Sa, touch Ri, return to Sa, hold Ri — typical phrase end

```ts
{
  id: 'prayoga-3',
  label: 'Prayoga 3 — Ri oscillation (Ni sa ri sa ri)',
  description: 'A phrase that anchors on Ri via Sa. The final Ri is held (dīrgham). Very common as a phrase-ending gesture.',
  sequence: [
    { swara: 'D3', octave: 0 },  // Ni (upper neighbour, same octave)
    { swara: 'Sa', octave: 0 },  // sa
    { swara: 'R2', octave: 0 },  // ri
    { swara: 'Sa', octave: 0 },  // sa
    { swara: 'R2', octave: 0 },  // rI (held)
  ] as SequenceStep[],
  gamakaHints: {
    'R2': 'dirgham',  // elongate the final R2
  }
}
```

### Prayoga 4 — Full-Range Elaboration Phrase
**Source phrase:** `ma ri pa ma ni pa Sa ni RI Sa`
**Shape:** Wide-range phrase traversing mandra→tara; the most expansive ranjaka prayoga

```ts
{
  id: 'prayoga-4',
  label: 'Prayoga 4 — Full-range phrase (ma ri pa ma ni pa Sa ni Ri Sa)',
  description: 'The widest-ranging ranjaka prayoga. Covers lower octave to upper Sa. Used in extended alapana. Ri in upper register is kampita.',
  sequence: [
    { swara: 'M1', octave: 0 },  // ma
    { swara: 'R2', octave: 0 },  // ri
    { swara: 'Pa', octave: 0 },  // pa
    { swara: 'M1', octave: 0 },  // ma
    { swara: 'D3', octave: 0 },  // ni (N2)
    { swara: 'Pa', octave: 0 },  // pa
    { swara: 'Sa', octave: 1 },  // Sa (tara)
    { swara: 'D3', octave: 0 },  // ni
    { swara: 'R2', octave: 1 },  // RI (tara Ri — kampita)
    { swara: 'Sa', octave: 1 },  // Sa (tara, resolve)
  ] as SequenceStep[],
  gamakaHints: {
    'R2': 'kampita',
    'D3': 'kampita',
  }
}
```

### Prayoga 5 — Ni Oscillation Peak
**Source phrase:** `ma pa ni pa NI pa`
**Shape:** Oscillates around Ni — approaches, touches upper Ni, returns to Pa; typical of niraval phrases

```ts
{
  id: 'prayoga-5',
  label: 'Prayoga 5 — Ni peak oscillation (ma pa ni pa Ni pa)',
  description: 'Circles around N2 from Pa. The NI (upper emphasis) is kampita. Mimics the "rocking" feel typical of Madhyamavathi alapana around the upper half of the raga.',
  sequence: [
    { swara: 'M1', octave: 0 },  // ma
    { swara: 'Pa', octave: 0 },  // pa
    { swara: 'D3', octave: 0 },  // ni
    { swara: 'Pa', octave: 0 },  // pa
    { swara: 'D3', octave: 1 },  // NI (tara emphasis)
    { swara: 'Pa', octave: 0 },  // pa (return)
  ] as SequenceStep[],
  gamakaHints: {
    'D3': 'kampita',
  }
}
```

### Prayoga 6 — Compositional Graha Starts
**Notes:** Compositions begin on **ri** (e.g. "Vinayakuni"), **pa** (e.g. "Alakalallala"), or **ni** (e.g. "Naadupai").
This is not a single phrase but informs exercise starting points.

```ts
// No single SequenceStep[] — instead, use grahaSwara metadata above to allow
// the exercise runner to optionally begin a drill on R2, Pa, or D3 as alternatives to Sa.
```

***

## Confusable Ragas — Boundary Notes for Exercises

| Raga       | What it has that Madhyamavathi MUST NOT use |
|------------|---------------------------------------------|
| Śrī        | G3 (Sādhāraṇa Ga) and D2/D1 (Dhaivata) in avarohanam |
| Maṇiraṅgu  | G3 in avarohanam                            |
| Puspalaṭikā| G3 in arohanam and avarohanam               |

**Key rule to surface in the UI:** "Do not touch Ga or Dha — even slightly."
This can appear as a warning/hint in the prayoga exercise screen.

***

## Suggested `RagaDefinition` additions

```ts
export const MADHYAMAVATHI: RagaDefinition = {
  // ... existing fields ...

  // Raga lakshana
  jivaSwara:   ['R2', 'D3'],
  chayaSwara:  ['R2', 'M1', 'D3'],
  nyasaSwara:  ['R2', 'M1', 'Pa', 'D3'],
  grahaSwara:  ['Sa', 'R2', 'M1', 'Pa', 'D3'],
  kampitaSwara: ['R2', 'D3'],   // must be oscillated/shaken in rendition
  varjyaSwara:  ['G3', 'D1', 'D2'],  // forbidden — distinguishes from Śrī/Maṇiraṅgu

  prayogas: [
    PRAYOGA_1_MADHYAMAVATHI,
    PRAYOGA_2_MADHYAMAVATHI,
    PRAYOGA_3_MADHYAMAVATHI,
    PRAYOGA_4_MADHYAMAVATHI,
    PRAYOGA_5_MADHYAMAVATHI,
  ],

  exercises: [
    SARALI_VARISAI_1_MADHYAMAVATHI,
    PRAYOGA_EXERCISE_MADHYAMAVATHI,   // new: cycle through all 5 prayogas
  ],
}
```

***

## Suggested New Exercise: `prayogaExerciseMadhyamavathi.ts`

```ts
export const PRAYOGA_EXERCISE_MADHYAMAVATHI: ExerciseDefinition = {
  id: 'prayoga-exercise-madhyamavathi',
  label: 'Prayoga Drill',
  description:
    'Practice the 5 ranjaka prayogams (characteristic phrases) of Madhyamavathi. ' +
    'These are the phrases that define the raga\'s identity and distinguish it from ' +
    'similar ragas like Śrī and Maṇiraṅgu. Ri (R2) and Ni (N2) must be oscillated (kampita).',
  sections: [
    { label: 'Prayoga 1',  steps: [...PRAYOGA_1_SEQUENCE], hint: 'Core loop — the raga fingerprint' },
    { label: 'Prayoga 2',  steps: [...PRAYOGA_2_SEQUENCE], hint: 'Upper octave launch from Sa' },
    { label: 'Prayoga 3',  steps: [...PRAYOGA_3_SEQUENCE], hint: 'Ri oscillation — phrase ending gesture' },
    { label: 'Prayoga 4',  steps: [...PRAYOGA_4_SEQUENCE], hint: 'Full-range elaboration phrase' },
    { label: 'Prayoga 5',  steps: [...PRAYOGA_5_SEQUENCE], hint: 'Ni peak oscillation' },
  ],
  warnings: [
    'Never touch G3 (Gandhara) or any Dhaivata — this causes confusion with Śrī or Maṇiraṅgu.',
    'R2 and N2 are kampita swaras — hold and oscillate them, do not sing them flat.',
  ],
}
```

***

## N2 / D3 Aliasing Note (implementation reminder)

Your current implementation aliases N2 as `D3` in the JI 12-position grid because N2 (Kaisika
Nishada, ratio 16/9) shares its pitch position with D3 in the system. This is correct and should
be preserved consistently across all prayoga sequence steps. All `D3` references in this spec
refer to N2 (Kaisika Nishada), not Dhaivata.

***

## Sources
- P.P. Narayanaswami, "Rāgam Madhyamāvati", carnatica.net
- carnatica.in/special/madhyamavati-ppn.htm
- Wikipedia: Madhyamavati