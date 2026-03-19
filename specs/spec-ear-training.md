# Feature Spec: Carnatic Swara Ear Trainer

## Overview

Add an ear training module to the existing React/TypeScript frontend that synthesizes all 16 Carnatic swarasthanas programmatically using the Web Audio API. No recorded audio files, no new backend routes, no required new dependencies.

***

## Swaras & Frequency Ratios

Use **just intonation** ratios relative to the tonic (Sa). These 16 swarasthanas map to 12 distinct pitch positions; shared positions are noted.

| # | Name | Short | Ratio | Notes |
|---|---|---|---|---|
| 1 | Shadja | Sa | 1/1 | Achala (fixed) |
| 2 | Shuddha Rishabha | Ri1 | 256/243 | |
| 3 | Chatushruti Rishabha | Ri2 | 9/8 | Same pitch as Ga1 |
| 4 | Shuddha Gandhara | Ga1 | 9/8 | Same pitch as Ri2 |
| 5 | Sadharana Gandhara | Ga2 | 32/27 | |
| 6 | Antara Gandhara | Ga3 | 5/4 | |
| 7 | Shuddha Madhyama | Ma1 | 4/3 | |
| 8 | Prati Madhyama | Ma2 | 45/32 | |
| 9 | Panchama | Pa | 3/2 | Achala (fixed) |
| 10 | Shuddha Dhaivata | Dha1 | 128/81 | |
| 11 | Chatushruti Dhaivata | Dha2 | 27/16 | Same pitch as Ni1 |
| 12 | Shuddha Nishada | Ni1 | 27/16 | Same pitch as Dha2 |
| 13 | Kaisiki Nishada | Ni2 | 16/9 | |
| 14 | Kakali Nishada | Ni3 | 15/8 | |
| 15 | Tara Shadja | Sa' | 2/1 | Upper octave Sa |

***

## Audio Engine

- Use the native **Web Audio API** (`AudioContext`) — no external library required
- One shared `AudioContext` instance, instantiated lazily on first user interaction (browser autoplay policy requires a user gesture before audio can start)
- Each swara plays via an `OscillatorNode` connected to a `GainNode`
- **Waveform**: `triangle` (warmer timbre, more natural for Carnatic context than `sine`)
- **Envelope**: Short linear attack (~20ms), exponential release ramp to near-zero over the note duration, to avoid clicks/pops
- **Default note duration**: 1.5 seconds (configurable)
- Stop any currently playing note before starting a new one (single-voice, monophonic)

***

## Shruti (Pitch) Selector

- Let the user select the **base frequency** of Sa from a predefined list:

| Label | Hz |
|---|---|
| C3 | 130.81 |
| C#3 | 138.59 |
| D3 | 146.83 |
| D#3 | 155.56 |
| E3 | 164.81 |
| F3 | 174.61 |
| F#3 | 185.00 |
| G3 | 196.00 |
| G#3 | 207.65 |
| A3 | 220.00 |
| A#3 | 233.08 |
| B3 | 246.94 |
| C4 (default) | 261.63 |

- The selected shruti multiplies all ratios at playback time — no recomputation needed at definition time

***

## UI Components

### `SwaraKeyboard`
- Displays all 16 swaras as clickable buttons/keys arranged in a single row or two-row layout (Sa–Ma1 / Ma2–Sa')
- Each button shows the short name (e.g. "Ri2") and full name on hover/tooltip
- Clicking a button plays that swara's synthesized tone
- Buttons for swaras sharing a pitch position (e.g. Ri2/Ga1, Dha2/Ni1) should be visually grouped or annotated

### `ShrutiSelector`
- A dropdown or segmented control to pick the base pitch from the list above
- Shows the selected label (e.g. "C4") and Hz value

### `EarTrainerPanel` (main page container)
- Composes `ShrutiSelector` + `SwaraKeyboard`
- Holds shared `AudioContext` ref and base frequency state
- Passes `playSwara(ratio)` down as a prop

***

## State

| State | Type | Location | Description |
|---|---|---|---|
| `basePitchHz` | `number` | `EarTrainerPanel` | Currently selected shruti in Hz |
| `activeSwara` | `string \| null` | `EarTrainerPanel` | Short name of currently playing swara, for visual highlight |
| `audioCtx` | `React.MutableRefObject<AudioContext>` | `EarTrainerPanel` | Shared audio context ref |
| `currentOscRef` | `React.MutableRefObject<OscillatorNode>` | `EarTrainerPanel` | Ref to stop the previous note before starting a new one |

***

## Accessibility

- All swara buttons must have `aria-label` with the full swara name
- Playing state should be indicated visually (e.g. highlighted border) and not rely on color alone
- Keyboard navigation: tab through swaras, `Space`/`Enter` to play

***

## Out of Scope (for this iteration)

- Quiz / ear training game mode
- Recording or saving sessions
- 22-shruti extended mode
- Gamala (ornaments / gamakas) or glide between swaras
- Backend involvement of any kind