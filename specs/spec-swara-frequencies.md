# Spec: Carnatic Swara Frequency System

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**Document version:** 0.1
**Status:** Draft
**Relates to:** `carnatic_engine` core module

***

## 1. Purpose

This document specifies how the SaPaSa application represents, computes, and resolves Carnatic swara frequencies at runtime. It covers the just intonation ratio table, the frequency derivation model, the handling of overlapping swarasthanas, and the interface contract between the swara engine and the rest of the application.

***

## 2. Background

### 2.1 Movable Tonic

Carnatic music uses a **movable tonic** system. Sa (the tonic) has no fixed absolute frequency — it is chosen by the singer based on their vocal range and set on the tanpura (or digital tanpura app) before practice begins. Every other swara is defined purely by its **ratio to Sa**, not by any absolute Hz value.

This means the application must never hardcode swara frequencies. All frequencies are derived at runtime from a single input: the user's chosen Sa in Hz.

### 2.2 Just Intonation

Carnatic music traditionally uses **just intonation** (JI) — a tuning system where intervals are defined by small integer ratios derived from the natural harmonic series. This differs from **equal temperament** (ET), the Western standard used by digital tanpura apps (A = 440 Hz), where every semitone is an equal multiplicative step of the twelfth root of 2 (≈ 1.05946).

The SaPaSa app uses **just intonation ratios as its pitch targets**, since these represent the ideal the student is training toward. The tanpura drone the student sings against may be equal-tempered, but the deviation measurement is always against the JI ideal.

### 2.3 The 16 Swarasthanas

Carnatic theory defines **16 named swara positions** (swarasthanas) within a single octave, built from 7 swara names. Sa and Pa are fixed and invariant (*achala swaras*). The remaining five — Ri, Ga, Ma, Dha, Ni — have multiple variants (*vikruti swaras*), giving the system its expressive range.

Critically, four of the 16 positions share pitch with another — R2=G1, R3=G2, D2=N1, D3=N2. These are **not errors or duplicates**; they reflect the functional role of the note within a raga, which determines whether a pitch is treated as Ri or Ga, Dha or Ni.

***

## 3. Swara Ratio Table

The following table defines all 16 swarasthanas, their just intonation ratios, decimal equivalents, and computed Hz values for the reference shruti of **D# / Eb (Sa = 311.13 Hz)**.

| # | Swara | Full Name | JI Ratio | Decimal | Hz (Sa = D#) | Overlap |
|---|---|---|---|---|---|---|
| 0 | **Sa** | Shadjam | 1 : 1 | 1.0000 | 311.13 | — |
| 1 | **R1** | Shuddha Rishabham | 256 : 243 | 1.0535 | 327.56 | — |
| 2 | **R2** | Chatushruti Rishabham | 9 : 8 | 1.1250 | 350.02 | = G1 |
| 2 | **G1** | Shuddha Gandharam | 9 : 8 | 1.1250 | 350.02 | = R2 |
| 3 | **R3** | Shatshruti Rishabham | 32 : 27 | 1.1852 | 368.74 | = G2 |
| 3 | **G2** | Sadharana Gandharam | 32 : 27 | 1.1852 | 368.74 | = R3 |
| 4 | **G3** | Antara Gandharam | 5 : 4 | 1.2500 | 388.91 | — |
| 5 | **M1** | Shuddha Madhyamam | 4 : 3 | 1.3333 | 414.84 | — |
| 6 | **M2** | Prati Madhyamam | 45 : 32 | 1.4063 | 437.53 | — |
| 7 | **Pa** | Panchamam | 3 : 2 | 1.5000 | 466.70 | — |
| 8 | **D1** | Shuddha Dhaivatam | 128 : 81 | 1.5802 | 491.52 | — |
| 9 | **D2** | Chatushruti Dhaivatam | 5 : 3 | 1.6667 | 518.55 | = N1 |
| 9 | **N1** | Shuddha Nishadam | 5 : 3 | 1.6667 | 518.55 | = D2 |
| 10 | **D3** | Shatshruti Dhaivatam | 16 : 9 | 1.7778 | 553.12 | = N2 |
| 10 | **N2** | Kaisika Nishadam | 16 : 9 | 1.7778 | 553.12 | = D3 |
| 11 | **N3** | Kakali Nishadam | 15 : 8 | 1.8750 | 583.37 | — |
| 12 | **Sa'** | Upper Shadjam | 2 : 1 | 2.0000 | 622.25 | — |

> **Note on R1 and D1:** The ratios 256:243 and 128:81 are the most widely accepted values in Carnatic theory for Shuddha Rishabham and Shuddha Dhaivatam. Some scholarly traditions use alternative ratios (e.g. 16:15 for R1). This may be revisited in a future version. All other ratios are uncontested.

***

## 4. Frequency Derivation Model

### 4.1 Principle

Given the user's chosen Sa frequency `sa_hz`, the target frequency for any swara is:

```
target_hz = sa_hz × ratio
```

Where `ratio` is the decimal value from the table above.

The application must compute this at the moment the user sets their shruti and pass the resulting frequency map to all downstream components. No component outside `carnatic_engine` should perform its own frequency calculations.

### 4.2 Octave Extension

The table above covers one octave (the *madhya sthayi*, middle octave). For display on the full pitch roll (which spans multiple octaves), frequencies extend by doubling or halving:

```
target_hz (octave n) = sa_hz × ratio × 2^n
```

Where `n = 0` is the middle octave, `n = 1` is the upper octave (*tara sthayi*), `n = -1` is the lower octave (*mandra sthayi*).

### 4.3 Reference Implementation

```python
from fractions import Fraction

JI_RATIOS: dict[str, Fraction] = {
    "Sa":  Fraction(1, 1),
    "R1":  Fraction(256, 243),
    "R2":  Fraction(9, 8),
    "G1":  Fraction(9, 8),
    "R3":  Fraction(32, 27),
    "G2":  Fraction(32, 27),
    "G3":  Fraction(5, 4),
    "M1":  Fraction(4, 3),
    "M2":  Fraction(45, 32),
    "Pa":  Fraction(3, 2),
    "D1":  Fraction(128, 81),
    "D2":  Fraction(5, 3),
    "N1":  Fraction(5, 3),
    "D3":  Fraction(16, 9),
    "N2":  Fraction(16, 9),
    "N3":  Fraction(15, 8),
    "Sa'": Fraction(2, 1),
}

def swara_hz(swara: str, sa_hz: float, octave: int = 0) -> float:
    """
    Returns the just intonation target frequency for a swara.
    sa_hz: the user's chosen Sa frequency in Hz
    octave: 0 = middle, 1 = upper, -1 = lower
    """
    ratio = float(JI_RATIOS[swara])
    return sa_hz * ratio * (2 ** octave)

def build_frequency_map(sa_hz: float, octaves: range = range(-1, 3)) -> dict[str, float]:
    """
    Builds a complete frequency map for all swaras across multiple octaves.
    Returns a flat dict keyed by e.g. "Pa_0", "Sa_1", "R2_-1" etc.
    """
    freq_map = {}
    for swara in JI_RATIOS:
        for octave in octaves:
            key = f"{swara}_{octave}"
            freq_map[key] = swara_hz(swara, sa_hz, octave)
    return freq_map
```

***

## 5. Cents Deviation Calculation

Given a sung frequency `f_sung` and a target frequency `f_target`, the deviation in cents is:

$$\text{cents} = 1200 \times \log_2\left(\frac{f_\text{sung}}{f_\text{target}}\right)$$

- Positive = sharp (too high)
- Negative = flat (too low)
- 0 = perfect

### Accuracy thresholds used in the UI:

| Range | Label | Colour |
|---|---|---|
| Within ±10¢ | IN TUNE | 🟢 Green |
| ±10¢ to ±25¢ | SLIGHTLY OFF | 🟡 Amber |
| Beyond ±25¢ | OFF | 🔴 Red |

***

## 6. Swara Resolution (Overlap Handling)

### 6.1 Exercise-Unaware Mode (current — v0.1)

The pitch roll does not attempt to distinguish R2 from G1 at the same pitch position. It identifies the nearest swara position by Hz distance and labels it with the Western note name and cents deviation. This is the behaviour currently implemented.

### 6.2 Exercise-Aware Mode (planned — v0.3+)

When an exercise is active (e.g. Sarali Varisai), the engine knows the expected swara sequence. The next expected swara in the sequence determines which of the two overlapping names applies. For example:

- If the exercise expects R2 and the student sings ~350 Hz → labelled **R2**, deviation computed against R2's target
- If the exercise expects G1 and the student sings ~350 Hz → labelled **G1**, deviation computed against G1's target (same Hz, different label and context)

This requires the exercise sequencer to be active and feeding the expected swara to the pitch resolver at all times.

***

## 7. Shruti Reference Table

The following Sa frequencies are derived from the international standard **A4 = 440 Hz**, equal temperament. These are the values a user implicitly sets when they choose a shruti on a digital tanpura app.

| Button | Sa Hz (ET) |
|---|---|
| C | 261.63 |
| C# / Db | 277.18 |
| D | 293.66 |
| D# / Eb | **311.13** ← current default |
| E | 329.63 |
| F | 349.23 |
| F# / Gb | 369.99 |
| G | 392.00 |
| G# / Ab | 415.30 |
| A | 440.00 |
| A# / Bb | 466.16 |
| B | 493.88 |

> Sa is read from the tanpura app setting using equal temperament Hz, but all swara targets are computed using just intonation ratios from that Sa. This is the intended and correct behaviour — the drone is ET, the ideal target is JI.

***

## 8. Module Interface Contract

The `carnatic_engine` module exposes the following public interface. No other module should replicate this logic.

```python
# Input
sa_hz: float                  # user's chosen shruti in Hz

# Outputs
swara_hz(swara, sa_hz, octave) -> float
build_frequency_map(sa_hz, octaves) -> dict[str, float]
cents_deviation(f_sung, f_target) -> float
nearest_swara(f_sung, freq_map, tolerance_cents=50) -> tuple[str, float] | None
```

`nearest_swara` returns the closest swara key and its cents deviation, or `None` if no swara is within `tolerance_cents`.

***

## 9. Out of Scope for This Document

- Exercise sequencer design
- Settled pitch detection algorithm
- Audio I/O and WebSocket protocol
- UI rendering logic

These are covered in their respective spec documents.

***

