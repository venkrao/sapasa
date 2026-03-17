# Spec: Dynamic Pitch Display & Multi-Voice Support

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**Document version:** 0.2
**Status:** Draft
**Depends on:** `spec-swara-frequencies.md` (v0.1)
**Relates to:** Pitch roll UI component, audio engine

***

## 1. Purpose

This document specifies the behaviour of the **dynamic pitch display** — the vertically scrolling pitch roll that follows the singer's voice in real time without any manual configuration. It also specifies the Y-axis range requirements to ensure the display works correctly for all voice types and shruti settings, including female singers in higher shrutis.

***

## 2. Design Principle

The display must require **zero configuration from the user** beyond the shruti selection already made on their tanpura app. It must:

- Automatically follow the detected pitch vertically
- Work correctly for any singer, any voice type, any shruti
- Never show empty, unusable space by default
- Never require the user to scroll, zoom, or adjust the view manually

***

## 3. Y-Axis: Pitch Grid

### 3.1 Range

The display renders swara reference lines from **E2 (lowest bass Sa) to C7 (above highest soprano note)**, covering all practical singing voices.

| Boundary | Note | Hz | Reason |
|---|---|---|---|
| Floor | E2 | 82.41 Hz | Below lowest practical male Sa (C#2 area) |
| Ceiling | C7 | 2093.00 Hz | One octave above highest soprano note |

Rendering beyond C7 is not required. No human singing voice reaches this range, and extending further would waste render resources on empty space.

### 3.2 Swara Reference Lines

For every swara in the 16-swara table (per `spec-swara-frequencies.md`), a horizontal reference line is drawn at each octave within the E2–C7 range. Lines are recomputed every time the shruti changes.

Reference line rendering rules:

- **Sa lines** — bright green, slightly thicker than other lines
- **Pa lines** — blue, slightly thicker than other lines
- **All other swara lines** — dim, colour-coded by swara group (Ri, Ga, Ma, Dha, Ni) matching the existing colour scheme
- **Western note markers** (C3, D4 etc.) — rendered as very faint grey lines between swara lines, labelled on the right edge of the display only, for reference

### 3.3 Y-Axis Labels

Each swara line is labelled on the **left edge** of the display. For overlapping swaras (R2/G1, R3/G2, D2/N1, D3/N2), both names are shown stacked, as already implemented in v0.1. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/37454559/03467707-0f55-4778-bd2f-bf6b27701a90/Screenshot-2026-03-17-at-22.41.06.jpg)

Labels do not change with shruti — they are always swara names (Sa, Pa, R1, R2/G1 etc.), not Hz values or Western note names. Western note names are shown alongside as secondary labels in smaller text.

***

## 4. Voice Range Coverage by Singer Type

The following table documents the expected pitch ranges the display must correctly handle. All fall within the E2–C7 grid defined above.

| Voice type | Typical shruti | Sa Hz | Practical singing range | Upper Sa' |
|---|---|---|---|---|
| Bass | C – C# | 261–277 Hz | C3 – C5 | C4–C#4 |
| Baritone | C# – D# | 277–311 Hz | C#3 – C#5 | C#4–D#4 |
| Tenor | D# – F# | 311–370 Hz | D#3 – D#5 | D#4–F#4 |
| Contralto | F – G# | 349–415 Hz | F3 – F5 | F4–G#4 |
| Mezzo-soprano | G – A | 392–440 Hz | G3 – G5 | G4–A4 |
| Soprano | G# – B | 415–494 Hz | G#3 – G#5 | G#4–B5 |

No code changes are needed to support any of these voice types beyond ensuring the grid renders to C7 and the shruti frequency map is correctly recomputed on change.

***

## 5. Dynamic Scroll Behaviour

### 5.1 Overview

The visible viewport is a **floating window** of fixed height covering approximately **3 octaves** of the full pitch grid. It scrolls vertically to follow the singer's detected pitch, keeping the active singing region centred in view at all times.

### 5.2 Viewport Centre Tracking

The viewport centre is driven by a **smoothed trailing pitch average**, not the raw instantaneous pitch. This prevents the display from jittering with every micro-variation in the voice.

**Smoothing algorithm:**

```python
SMOOTHING_FACTOR = 0.08  # tune between 0.05 (slow/gentle) and 0.15 (faster)

# Called every frame (~60fps)
def update_display_centre(display_centre_hz, target_pitch_hz):
    return display_centre_hz + SMOOTHING_FACTOR * (target_pitch_hz - display_centre_hz)
```

The `target_pitch_hz` is the median of the last 2 seconds of confident pitch readings (confidence > 0.85). This gives the scroll a natural, gentle inertia — it follows the voice with a slight lag, which feels smooth rather than mechanical.

### 5.3 Scroll Behaviour on Silence

When no confident pitch is detected (silence, breath, pause):

- The viewport **freezes** at its current position
- It does not snap back to a default position
- It does not drift
- It resumes tracking as soon as confident pitch returns

This means if the singer pauses mid-exercise, the display stays exactly where their voice was — the reference lines remain visible and contextually relevant.

### 5.4 Handling Sudden Large Pitch Jumps

Octave errors, voice cracks, and microphone noise can cause sudden large pitch jumps that would throw the display violently if acted upon immediately. A **jump guard** is applied:

```python
MAX_JUMP_CENTS_PER_FRAME = 50  # ~half a semitone per frame at 60fps

def guarded_target(current_centre_hz, raw_pitch_hz):
    jump_cents = abs(cents_deviation(raw_pitch_hz, current_centre_hz))
    if jump_cents > 300:  # more than 3 semitones in one reading
        return current_centre_hz  # ignore, hold position this frame
    return raw_pitch_hz
```

Jumps larger than 3 semitones in a single frame are ignored for scroll purposes. They are still rendered on the pitch trace (the voice line) — the guard only affects the viewport scroll, not the pitch data display.

### 5.5 Session Initialisation

At session start, before any pitch is detected, the viewport is centred on the **Sa of the chosen shruti** in the middle octave. For a male singer at D# shruti, this means the display opens centred on D#3/D#4, with Sa and Pa lines prominently visible.

Once confident pitch is detected, the dynamic scroll takes over immediately.

***

## 6. Pitch Trace Rendering

The continuous voice line rendered on the pitch roll follows these rules:

| Condition | Colour |
|---|---|
| Within ±10¢ of any swara target | 🟢 Green |
| Within ±25¢ of any swara target | 🟡 Amber |
| Within ±50¢ of any swara target | 🔴 Red |
| More than ±50¢ from any target | ⬜ Dim white/grey (between notes) |
| Confidence < 0.85 | Not rendered (dropped) |

The trace scrolls horizontally leftward continuously at a fixed speed (time axis). Historical trace data is retained for the **last 60 seconds** of the session and then discarded.

***

## 7. Shruti Change Behaviour

When the user changes shruti mid-session:

1. The frequency map is immediately recomputed from the new Sa Hz
2. All swara reference lines reposition instantly on the grid
3. The pitch trace history is **cleared** — it is no longer meaningful against the new reference lines
4. The viewport recentres on the new Sa in the middle octave
5. Dynamic scroll resumes immediately on next pitch detection

***

## 8. Performance Constraints

| Metric | Target |
|---|---|
| Display frame rate | 60 fps |
| Pitch polling interval | 20ms (50Hz) |
| Scroll update interval | Every frame (16ms) |
| Max rendered swara lines | ~180 (16 swaras × ~11 octaves within E2–C7) |
| Pitch trace history | 60 seconds rolling |
| Memory budget for trace | < 50MB |

The ~180 swara reference lines are static geometry redrawn only on shruti change — they do not contribute to per-frame render cost meaningfully.

***

## 9. Out of Scope for This Document

- Metronome mode and exercise sequencer
- Settled note detection and cents logging
- Session statistics panel
- Swara label switching between exercise-aware and exercise-unaware mode

These are covered in their respective spec documents.
