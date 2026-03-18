# Spec: Exercise Module — Sarali Varisai in Mayamalavagowla
**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**Document version:** 0.1
**Status:** Draft
**Depends on:** `spec-swara-frequencies.md`, `spec-dynamic-display.md`
**Relates to:** Exercise sequencer, pitch roll UI, exercise engine

***
## 1. Purpose
This document specifies the first exercise module to be added to SaPaSa: **Sarali Varisai** in the raga **Mayamalavagowla**. It covers the raga's identity and musical properties, the complete exercise sequence definitions, and the behavioural spec for how the app presents and evaluates the exercises.

***
## 2. Raga: Mayamalavagowla
### 2.1 Identity
| Property | Value |
|---|---|
| Name | Mayamalavagowla (māyāmāḷavagauḷa) |
| Also known as | Malavagowla (original name), Suddha Gowla (Venkatamakhi) |
| Melakarta number | **15** (out of 72) |
| Chakra | 3rd chakra — *Agni* (fire) |
| Mnemonic phrase | *sa ra gu ma pa dha nu* |
| Time of day | Morning raga — traditionally sung at dawn |
| Rasa (mood) | Shantha (peace), devotion (bhakti), majesty |
| Hindustani equivalent | Bhairav that |

Mayamalavagowla is widely considered **the gateway raga of Carnatic music**. All foundational exercises — Sarali Varisai, Janta Varisai, Alankaras — are set in this raga, a standardisation credited to the 16th century composer-saint **Purandara Dasa**, who is regarded as the father of Carnatic music pedagogy. [en.wikipedia](https://en.wikipedia.org/wiki/Mayamalavagowla)
### 2.2 Scale Structure
Mayamalavagowla is a **Sampurna raga** — it uses all 7 swaras in both ascent and descent, with no skipped notes. [scribd](https://www.scribd.com/document/817844343/Ragalakshanam)

**Arohanam (ascending):**
```
S  R₁  G₃  M₁  P  D₁  N₃  Ṡ
```

**Avarohanam (descending):**
```
Ṡ  N₃  D₁  P  M₁  G₃  R₁  S
```
### 2.3 Swara Variants Used
| Swara | Variant | JI Ratio | Semitones from Sa |
|---|---|---|---|
| Sa | Shadjam | 1 : 1 | 0 |
| **R₁** | Shuddha Rishabham | 256 : 243 | 1 |
| **G₃** | Antara Gandharam | 5 : 4 | 4 |
| **M₁** | Shuddha Madhyamam | 4 : 3 | 5 |
| Pa | Panchamam | 3 : 2 | 7 |
| **D₁** | Shuddha Dhaivatam | 128 : 81 | 8 |
| **N₃** | Kakali Nishadam | 15 : 8 | 11 |
| Sa' | Upper Shadjam | 2 : 1 | 12 |

Note the characteristic **large interval jumps** between R₁→G₃ (3 semitones) and D₁→N₃ (3 semitones), and the equally large gaps between G₃→M₁ and N₃→Sa. This asymmetric interval structure is precisely why Mayamalavagowla is chosen for beginners — the large gaps train the ear to navigate uneven intervals from day one, unlike a major scale where all intervals are either 1 or 2 semitones. [artiumacademy](https://artiumacademy.com/blogs/sarali-varisai-in-carnatic-music/)
### 2.4 Gamaka Character
In Mayamalavagowla, three of the seven swaras are traditionally sung with **oscillation (kampita gamaka)** rather than as plain sustained notes: [en.wikipedia](https://en.wikipedia.org/wiki/Mayamalavagowla)

| Swara | Treatment |
|---|---|
| **R₁** | Oscillated between Sa and R₁ |
| **G₃** | Oscillated between M₁ and G₃ |
| **D₁** | Oscillated between Pa and D₁ |
| Sa, M₁, Pa, N₃ | Held as plain, constant notes |

> **Important for v0.1:** Sarali Varisai at beginner level is practiced as **plain notes only** — no gamakas. Gamaka treatment is introduced by teachers only after the student has mastered the plain note positions. The app evaluates against plain just-intonation targets exclusively at this stage.

***
## 3. Exercise: Sarali Varisai
### 3.1 What It Is
*Sarali* means "simple" or "straight." Sarali Varisai is a set of **14 progressive exercises** that systematically introduce the student to every note in the Mayamalavagowla scale, then to the relationships between notes at increasing intervals. They are sung in **Adi talam** (8-beat cycle) and practiced at three speeds: slow (*vilamba*), medium (*madhyama*), and fast (*druta*). [studocu](https://www.studocu.com/row/document/university-of-mauritius/bahons-english/sarali-varisai/53752166)

The exercises always begin on **madhya sthayi Sa** (middle octave) and extend upward to **tara sthayi Sa** (upper octave) in later exercises. [studocu](https://www.studocu.com/row/document/university-of-mauritius/bahons-english/sarali-varisai/53752166)
### 3.2 Talam: Adi
Adi talam has **8 beats per cycle**, divided as 4 + 2 + 2. Each swara in the basic Sarali Varisai occupies **one beat**. This gives a natural grouping of 4 swaras per phrase:

```
Beat:  1   2   3   4  |  5   6  |  7   8
       S   R   G   M  |  P   D  |  N   Ṡ   (ascending phrase)
```
### 3.3 Complete Exercise Sequences (v0.1 — Exercises 1–7)
All sequences are given in Carnatic swara notation. Capital letters denote the upper octave (tara sthayi).

***

**Sarali Varisai 1** — Plain stepwise ascent and descent [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)
```
Ascending:   S  R  G  M  |  P  D  N  Ṡ
Descending:  Ṡ  N  D  P  |  M  G  R  S
```

***

**Sarali Varisai 2** — Two-step jumps
```
Ascending:   S  R  G  M  |  P  D  N  Ṡ
             S  G  R  G  |  M  P  D  N  |  Ṡ  ...
Descending:  Ṡ  N  D  P  |  M  G  R  S
```
*(Exact pattern per teacher tradition — the app uses the pattern from Purandara Dasa's standard notation)*

***

**Sarali Varisai 3 through 7** — Progressive interval expansion, dheergam (elongated) notes introduced on specific swaras. These introduce held Pa (Sarali 5), held N and R (Sarali 7), and movement between non-adjacent swaras. [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)

> **Implementation note for v0.1:** Begin with **Sarali Varisai 1 only**. The remaining exercises share the same engine and can be added by populating the sequence table — no architectural change is required.
### 3.4 Sequence Data Model
Each exercise is defined as an ordered list of swara events:

```python
MAYAMALAVAGOWLA_SWARAS = ["S", "R1", "G3", "M1", "P", "D1", "N3"]

SARALI_VARISAI = {
    "1": {
        "name": "Sarali Varisai 1",
        "description": "Plain stepwise ascent and descent",
        "talam": "Adi",
        "beats_per_swara": 1,
        "sequence": [
            # Ascending — madhya sthayi
            ("S",  0),   # octave 0 = madhya
            ("R1", 0),
            ("G3", 0),
            ("M1", 0),
            ("P",  0),
            ("D1", 0),
            ("N3", 0),
            # Sa tara
            ("S",  1),   # octave 1 = tara
            # Descending — back to madhya
            ("N3", 0),
            ("D1", 0),
            ("P",  0),
            ("M1", 0),
            ("G3", 0),
            ("R1", 0),
            ("S",  0),
        ]
    }
}
```

Each tuple is `(swara_name, octave_relative_to_madhya)`. The engine resolves this to Hz using `swara_hz(swara, sa_hz, octave)` from `carnatic_engine`.

***
## 4. App Behaviour During Exercise
### 4.1 Exercise Selection UI
A new panel or screen allows the student to select:

- **Raga** — Mayamalavagowla (only option in v0.1)
- **Exercise** — Sarali Varisai 1 (only option in v0.1)
- **Mode** — Free (student-paced) or Metronome (tempo-locked)
- **Tempo** — BPM selector, visible only in Metronome mode (default: 40 BPM for beginners)
### 4.2 Exercise-Aware Swara Labels
When an exercise is active, the pitch roll highlights only the **swaras used in Mayamalavagowla** (S, R₁, G₃, M₁, P, D₁, N₃) in full brightness. The remaining swara lines (R2, R3, G1, G2, M2, D2, D3, N1, N2) are dimmed — still visible for reference but clearly de-emphasised.

This visually narrows the student's attention to the 7 notes that matter for this exercise.
### 4.3 Next Expected Swara Indicator
In both Free and Metronome modes, the **next expected swara** in the sequence is highlighted on the pitch roll — a subtle glow or thicker line on that swara's reference lane. This gives the student a visual cue of where to aim before they sing.
### 4.4 Free Mode Sequencing
- App waits for a settled pitch (per `spec-dynamic-display.md` settled note algorithm)
- Settled pitch is matched to the nearest Mayamalavagowla swara within ±50 cents
- If it matches the next expected swara → advance sequence pointer, log result
- If it matches a different swara → log as wrong note, do not advance
- If no match within ±50 cents → ignore (treated as a transition or breath)
### 4.5 Metronome Mode Sequencing
- A beat clock fires at the selected BPM
- Each beat pre-assigns the next swara in the sequence as the target
- The app samples the settled pitch within that beat window
- At beat end: log whatever was detected (or "missed" if nothing settled)
- Advance to next swara regardless — the beat does not wait
### 4.6 Per-Note Result Logging
Each evaluated note produces a result record:

```python
{
    "exercise": "Sarali Varisai 1",
    "sequence_position": 3,       # 0-indexed position in sequence
    "expected_swara": "M1",
    "expected_hz": 414.84,        # at D# shruti
    "sung_hz": 418.20,
    "cents_deviation": +13.9,
    "duration_ms": 420,
    "octave": 0,
    "correct_swara": True,        # was the right swara sung?
    "in_tune": True,              # within ±25 cents?
    "timestamp": 1710684123.7
}
```
### 4.7 Session Summary
At the end of a complete run through the exercise (all sequence positions evaluated once), display a summary:

| Metric | Description |
|---|---|
| Completion | % of notes that had a detected pitch (not missed) |
| Accuracy | % of notes that were the correct swara |
| Average deviation | Mean absolute cents error across all correctly identified notes |
| Per-swara deviation | Individual avg cents error for each of the 7 swaras |
| Best/worst swara | Which swara was most and least accurate |

***
## 5. Raga Reference Card (In-App)
A collapsible info panel within the exercise screen shows:

```
Mayamalavagowla — Melakarta #15

Arohanam:   S  R₁  G₃  M₁  P  D₁  N₃  Ṡ
Avarohanam: Ṡ  N₃  D₁  P  M₁  G₃  R₁  S

Time: Morning
Mood: Peaceful, devotional
Known for: Gateway raga of Carnatic music.
           All beginner exercises are in this raga.
           Characteristic large jumps: R₁→G₃ and D₁→N₃
           (3 semitones each — unlike the Western major scale)
```

This gives the student musical and cultural context without leaving the app.

***
## 6. Out of Scope for This Document
- Janta Varisai and Alankaras (subsequent spec)
- Gamaka evaluation
- Second raga support
- Audio playback of reference exercise
- Teacher mode / student progress sharing
