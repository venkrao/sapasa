# 🎵 SaPaSa

**A Carnatic music pitch training tool for macOS**

***

## What Is This App?

SaPaSa is a macOS desktop application designed to help students of Carnatic classical music develop accurate pitch — one of the most fundamental and demanding skills in the tradition. It listens to your voice through the microphone in real time, detects the pitch of each note you sing, and visually shows you how close or far you were from the ideal target frequency, measured in **cents** (1/100th of a semitone).

The app is not a general-purpose tuner. It is purpose-built around the specific exercises that form the foundation of Carnatic vocal training — starting with the most basic: **Sa, Pa, Sa** (the tonic, the fifth, and the upper octave).

***

## Why Ear Training Matters in Carnatic Music

Carnatic classical music is one of the world's most sophisticated melodic systems. Unlike Western music, which operates on a fixed 12-note equal-tempered scale, Carnatic music uses **just intonation** — a tuning system based on pure harmonic ratios. This means the precise frequency of each note is not fixed in absolute terms, but defined *relative to Sa*, the chosen tonic.

The system recognises **16 named swara variants** (called *swarasthanas*) across a single octave, built from 7 note names — Sa, Ri, Ga, Ma, Pa, Dha, Ni — where five of them have multiple variants (e.g. Ri1, Ri2, Ri3). Each variant corresponds to a specific harmonic ratio from Sa, and the difference between some variants is as small as a single semitone or less.

This places extraordinary demands on a singer's ear. A Carnatic vocalist must be able to:

- Anchor their pitch precisely to their chosen Sa at all times
- Reproduce each swara at its correct just-intonation frequency, not the tempered approximation
- Navigate between notes with microtonal accuracy, even in fast passages
- Sustain notes without drifting

This precision is developed over years of **systematic, repetitive practice** of foundational exercises, beginning with the simplest patterns and gradually building complexity. The ear must be trained, not just the voice.

***

## The Role of the Tanpura

Traditional Carnatic practice always happens against the backdrop of the **tanpura** — a long-necked Indian drone instrument with four to six strings, plucked continuously throughout a performance. The tanpura does not play melody. It drones on Sa, Pa, and the octave Sa in a slow, cyclic pattern, producing a rich, shimmering harmonic field.

This drone serves as the singer's tonal anchor. It continuously broadcasts the tonic and its harmonic overtones, allowing the singer's ear to calibrate and self-correct in real time. Without it, even experienced singers drift.

In modern practice, physical tanpuras are often replaced by **digital tanpura apps**, which offer the same drone at any chosen shruti (pitch level) via a simple button interface. These apps label their pitch buttons using Western note names — C, C#, D, D#, E, F, F#, G, G#, A, A#, B — which represent the 12 equally spaced semitones of the Western chromatic scale, all derived from the international standard of **A = 440 Hz**.

When a singer sets their tanpura app to, say, **D#**, they are declaring: *"D# is my Sa."* Every other swara in their practice session is then defined relative to that frequency.

***

## Why This App Exists

Digital tanpura apps solve the drone problem. What they do not solve is **feedback**. A student can sing Sa, Pa, Sa for an hour against the drone and have no objective way of knowing whether their Pa was 5 cents flat or 30 cents flat. The ear alone, especially an untrained one, cannot reliably detect its own errors.

A good teacher listens and corrects. But teachers are not always available, and even when they are, the volume of repetitive foundational practice needed cannot be entirely supervised.

SaPaSa fills this gap. It gives the student the one thing they lack during solo practice: **honest, precise, visual feedback** on every note they sing.

***

## How It Works

### Shruti Selection
The student selects their shruti — the pitch they have set on their tanpura app. In v0.1, this is fixed at **D# (Eb)**. The app computes the just-intonation target frequencies for Sa, Pa, and upper Sa relative to that shruti:

| Swara | Ratio to Sa | Target Hz (D# shruti) |
|---|---|---|
| Sa (lower) | 1 : 1 | 311.13 Hz |
| Pa | 3 : 2 | 466.70 Hz |
| Sa (upper) | 2 : 1 | 622.25 Hz |

### Pitch Detection
The app listens to the microphone continuously. It uses a machine-learning pitch detection model (`crepe`) to estimate the fundamental frequency of the voice every 20ms, along with a confidence score. Readings below 0.85 confidence (noise, breath, silence) are discarded.

### Settled Note Detection
A note is considered "settled" when the pitch has been stable for at least 120ms — specifically, when the standard deviation of the last 6 pitch readings is below 15 cents. This filters out transitions between notes, gamakas (ornaments), and the natural attack at the start of a note. Only settled, stable pitches are logged and displayed.

### Cents Deviation
Once a settled pitch is detected, the app identifies the nearest target swara and computes the deviation in **cents** using the formula:

$$\text{cents} = 1200 \times \log_2\left(\frac{f_\text{sung}}{f_\text{target}}\right)\$$

A positive value means sharp (too high); negative means flat (too low). Notes more than ±50 cents from any target are ignored as unclassified.

***

## The Display

### Pitch Roll
The main view shows three horizontal lanes — one each for Sa, Pa, and Sa'. As the student sings, each settled note appears as a vertical bar in the appropriate lane:

- **Position** on the time axis shows when it was sung
- **Width** of the bar represents how long the note was held
- **Colour** indicates accuracy:
  - 🟢 Green — within ±10 cents (excellent)
  - 🟡 Amber — ±10 to ±25 cents (acceptable, needs work)
  - 🔴 Red — beyond ±25 cents (significantly off)
- **Label** on the bar shows the exact deviation (e.g. `+17¢`)

### Last Note Panel
Below the pitch roll, the most recently sung note is shown in large text with its swara name, cents deviation, and duration held.

### Session Stats
A summary panel tracks:
- Total notes sung this session
- Average absolute deviation per swara
- Best consecutive streak within ±10 cents

***

## Exercises Supported

### v0.1 — Sa Pa Sa
The most fundamental exercise in Carnatic vocal training. The student sings Sa, then Pa (a perfect fifth above), then the upper octave Sa, against the tanpura drone. This single exercise, practiced daily, builds the foundational pitch memory that all other learning depends on.

### Planned for Future Versions
- **Sarali Varisai** — stepwise scale exercises: S R G M P D N S and descending
- **Janta Varisai** — repeated pairs: S S R R G G M M...
- **Alankaras** — structured patterns across the scale in all seven talas
- Full shruti selection (all 12 notes)
- Metronome mode with tempo and beats-per-note control
- Free mode (student-paced, no metronome)
- Session history and progress tracking over time

***

## Technical Architecture

```
┌─────────────────────────────────────┐
│     UI Layer (React + TypeScript)   │
│  Pitch roll, stats, last note panel │
├─────────────────────────────────────┤
│   App Logic (Python via WebSocket)  │
│  Swara tables, cents math,          │
│  settled note detection             │
├─────────────────────────────────────┤
│   Audio Layer (Python)              │
│  sounddevice + crepe                │
│  44100 Hz mono, macOS microphone    │
├─────────────────────────────────────┤
│   Packaging (Electron + PyInstaller)│
│  Single .app bundle, no deps needed │
└─────────────────────────────────────┘
```

- **Python** handles all audio and music logic — no Swift required
- **FastAPI + WebSocket** streams note events from Python to the UI
- **React + TypeScript** renders the UI in an Electron window
- **Electron** launches Python as a subprocess and packages everything into a standard macOS `.app`
- Runs natively on **Apple Silicon (M-series)** Macs

***

## Design Principles

- **Just intonation first** — target frequencies are based on pure harmonic ratios, not equal temperament, respecting the Carnatic tradition
- **Exercise-aware** — the app knows what the student is practicing, not just what pitch they sang
- **No gamaka tracking at beginner level** — junior exercises use plain, sustained notes; the settled-pitch algorithm naturally handles this
- **Visual over numeric** — the pitch roll gives instant gestalt understanding; the student sees their session at a glance, not just a number
- **Honest feedback** — the app does not soften or encourage; it shows exactly what happened

***

## Roadmap

| Version | Features |
|---|---|
| v0.1 | Sa Pa Sa monitor, D# shruti, pitch roll UI, session stats |
| v0.2 | All 12 shrutis selectable |
| v0.3 | Sarali Varisai and Janta Varisai exercises |
| v0.4 | Alankaras, all talas |
| v0.5 | Metronome mode with tempo control |
| v1.0 | Session history, progress charts, export |
| v1.x | Mobile (iOS) via Flutter port |

***

## A Note on Tuning Philosophy

SaPaSa uses **just intonation** ratios for its target frequencies, consistent with Carnatic tradition. The tanpura apps that students use alongside it are calibrated to **equal temperament** (A440). The difference between the two systems is small — typically 2–15 Hz on the affected notes — and in practice, a skilled singer naturally adjusts toward pure intervals by ear even when the drone is equal-tempered. The app's targets reflect the ideal the student is training toward, not the approximation of the tool accompanying them.

***
