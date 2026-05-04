# Spec: Raga Definitions — Hamsadhwani, Mohanam, Bilahari

**Repository:** github.com/venkrao/sapasa
**Document version:** 0.1
**Status:** Draft
**Amends:** spec-raga-definition.md
```

***

## Hamsadhwani

A **pentatonic janya raga** derived from Melakarta #29 (Dheerasankarabharanam). Skips M and D entirely in both directions — making it one of the most compact, bright-sounding ragas.

```typescript
const HAMSADHWANI: RagaDefinition = {
  id: "hamsadhwani",
  name: "Hamsadhwani",
  aliases: ["Hansadhwani"],
  melakartha: null,           // janya raga
  chakra: null,
  timeOfDay: "Evening",
  rasa: ["Veera", "Hasya"],
  hindustaniEquivalent: "Hansdhwani",

  arohanam: [
    { swara: "Sa", octave: 0 },
    { swara: "R2", octave: 0 },
    { swara: "G3", octave: 0 },
    { swara: "Pa", octave: 0 },
    { swara: "N3", octave: 0 },
    { swara: "Sa", octave: 1 },
  ],

  avarohanam: [
    { swara: "Sa", octave: 1 },
    { swara: "N3", octave: 0 },
    { swara: "Pa", octave: 0 },
    { swara: "G3", octave: 0 },
    { swara: "R2", octave: 0 },
    { swara: "Sa", octave: 0 },
  ],

  // Symmetric — same swaras in both directions
  swarasUsed: ["Sa", "R2", "G3", "Pa", "N3"]
}
```

> **Note:** Hamsadhwani is **audava–audava** (5 notes up, 5 notes down) and fully symmetric. M1 and D2 are completely absent. The characteristic phrase N3→Sa→R2→G3 gives it its uplifting, bright character.

***

## Mohanam

A **pentatonic janya raga** derived from Melakarta #28 (Harikambhoji). Skips M and N entirely. Known as *Bhoopali* in Hindustani. Like Hamsadhwani, it is audava–audava and symmetric.

```typescript
const MOHANAM: RagaDefinition = {
  id: "mohanam",
  name: "Mohanam",
  aliases: ["Mohana", "Bhoop", "Bhoopali"],
  melakartha: null,           // janya raga
  chakra: null,
  timeOfDay: "Early morning",
  rasa: ["Hasya", "Shringara"],
  hindustaniEquivalent: "Bhoopali",

  arohanam: [
    { swara: "Sa", octave: 0 },
    { swara: "R2", octave: 0 },
    { swara: "G3", octave: 0 },
    { swara: "Pa", octave: 0 },
    { swara: "D2", octave: 0 },
    { swara: "Sa", octave: 1 },
  ],

  avarohanam: [
    { swara: "Sa", octave: 1 },
    { swara: "D2", octave: 0 },
    { swara: "Pa", octave: 0 },
    { swara: "G3", octave: 0 },
    { swara: "R2", octave: 0 },
    { swara: "Sa", octave: 0 },
  ],

  // Symmetric — same swaras in both directions
  swarasUsed: ["Sa", "R2", "G3", "Pa", "D2"]
}
```

> **Note:** Mohanam is **audava–audava** and fully symmetric. M1 and N2 are absent. It shares R2, G3, Pa with Hamsadhwani — the key differentiator is D2 (Mohanam) vs N3 (Hamsadhwani).

***

## Bilahari

A **shadava–sampurna janya raga** derived from Melakarta #29 (Dheerasankarabharanam). Notably **asymmetric** — the ascent skips G3 and D2, but both appear fully in the descent.

```typescript
const BILAHARI: RagaDefinition = {
  id: "bilahari",
  name: "Bilahari",
  aliases: [],
  melakartha: null,           // janya raga
  chakra: null,
  timeOfDay: "Morning",
  rasa: ["Hasya", "Veera"],
  hindustaniEquivalent: "Bilawal (partial)",

  arohanam: [
    { swara: "Sa",  octave: 0 },
    { swara: "R2",  octave: 0 },
    // G3 skipped in ascent
    { swara: "M1",  octave: 0 },
    { swara: "Pa",  octave: 0 },
    // D2 skipped in ascent
    { swara: "N3",  octave: 0 },
    { swara: "Sa",  octave: 1 },
  ],

  avarohanam: [
    { swara: "Sa",  octave: 1 },
    { swara: "N3",  octave: 0 },
    { swara: "D2",  octave: 0 },  // D2 present in descent
    { swara: "Pa",  octave: 0 },
    { swara: "M1",  octave: 0 },
    { swara: "G3",  octave: 0 },  // G3 present in descent
    { swara: "R2",  octave: 0 },
    { swara: "Sa",  octave: 0 },
  ],

  // Union of ascent + descent
  swarasUsed: ["Sa", "R2", "G3", "M1", "Pa", "D2", "N3"]
}
```

> **Note:** Bilahari is **shadava–sampurna** (6 notes up, 7 notes down). The asymmetry — G3 and D2 absent on the way up — gives it its characteristic lively lilt. All 7 swaras are present across the raga, but only 6 appear in the arohanam.

***

## Quick Reference

| Raga | Structure | Parent Melakarta | Swaras Used | Hindustani |
|---|---|---|---|---|
| Hamsadhwani | Audava–Audava (5–5), symmetric | #29 Dheerasankarabharanam | S R2 G3 P N3 | Hansdhwani |
| Mohanam | Audava–Audava (5–5), symmetric | #28 Harikambhoji | S R2 G3 P D2 | Bhoopali |
| Bilahari | Shadava–Sampurna (6–7), asymmetric | #29 Dheerasankarabharanam | S R2 G3 M1 P D2 N3 | Bilawal (partial) |