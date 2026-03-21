# Feature Spec: Drone / Tanpura

## Overview

A continuous background drone grounding the student to the selected shruti (Sa). It runs independently of free play and quiz mode — toggled on/off, never interrupted by note playback. Implemented entirely on the frontend using **Tone.js**.

***

## Tone.js Setup

Add Tone.js to the project:
```bash
npm install tone
```

The existing raw `AudioContext` used for swara playback should be replaced or unified with Tone.js's internal context (`Tone.getContext()`). This avoids running two separate audio contexts simultaneously, which causes drift and browser warnings. Specifically:
- Migrate `playPiano()`, `playGuitar()`, etc. to use `Tone.Synth` / `Tone.PolySynth` equivalents, or
- Keep the raw Web Audio API synths but connect them into Tone's context via `Tone.context.rawContext`

Either approach is valid; the second is lower-risk if the existing synths already work well.

***

## Tanpura Model

A real tanpura has 4 strings typically tuned: **Pa – Sa' – Sa' – Sa** (low to high), plucked in a slow rolling cycle. The synthesis approximates this with three persistent voices:

| Voice | Pitch | Ratio to Sa |
|---|---|---|
| Low Sa | Sa (base pitch) | 1/1 |
| Pa | Perfect fifth | 3/2 |
| High Sa | Octave above | 2/1 |

Pa can be toggled off optionally (some ragas omit Pa), but default is all three on.

***

## Synthesis with Tone.js

Use a **`Tone.PolySynth`** with a custom `Tone.Synth` voice configured to approximate the tanpura's sustained, slightly buzzy timbre:

```ts
const tanpura = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: {
    attack: 0.8,       // slow bow-like swell
    decay: 0.3,
    sustain: 0.9,
    release: 2.5       // long ring-off when toggled off
  }
}).connect(new Tone.Reverb({ decay: 3, wet: 0.4 })).toDestination();
```

The three drone notes are played in a **rolling sequence** using `Tone.Pattern` or `Tone.Sequence`, mimicking the slow cyclic pluck of a real tanpura:

```ts
const droneNotes = [lowSaFreq, paFreq, highSaFreq]; // in Hz
const pattern = new Tone.Sequence((time, freq) => {
  tanpura.triggerAttackRelease(freq, "2n", time);
}, droneNotes, "2n");  // each note every half-note at chosen BPM
```

- Default tempo for the drone cycle: **40 BPM** (slow, meditative)
- Each note sustains long enough to overlap with the next, creating a continuous wash
- `Tone.Transport` controls start/stop — call `Tone.Transport.start()` / `.stop()` on toggle

***

## State

Add to `EarTrainerPanel` (or a dedicated `useDrone` custom hook):

| State | Type | Description |
|---|---|---|
| `droneActive` | `boolean` | Whether drone is currently running |
| `droneIncludePa` | `boolean` | Whether Pa voice is included (default: `true`) |
| `droneVolume` | `number` | Volume in dB, range −20 to 0 (default: −6) |

The `useDrone` hook is the recommended approach — it encapsulates the `Tone.Sequence`, `Tone.PolySynth`, and `Tone.Reverb` instances in refs, exposes only `{ droneActive, toggle, setVolume, setIncludePa }`, and cleans up via `useEffect` return.

***

## Behaviour

### Starting the drone
1. Call `await Tone.start()` (required by browser autoplay policy — must be inside a user gesture handler)
2. Set `droneNotes` based on current `basePitchHz` and `droneIncludePa`
3. Start `Tone.Transport` if not already running
4. Start the `Tone.Sequence`
5. Set `droneActive = true`

### Stopping the drone
1. Stop the `Tone.Sequence`
2. Call `tanpura.releaseAll()` — allows the long release envelope to ring off naturally rather than cutting abruptly
3. Do **not** stop `Tone.Transport` globally — other features may use it in future
4. Set `droneActive = false`

### Shruti change while drone is active
- When `basePitchHz` changes and `droneActive` is true: stop the sequence, recompute `droneNotes`, restart the sequence immediately — no gap longer than one beat

### Note playback interaction
- The drone continues uninterrupted when the user clicks a swara button or the quiz plays a note
- The swara playback uses a separate `Tone.Synth` instance — they mix naturally through Tone's shared context

***

## UI

The drone control lives in a dedicated **`DroneControl`** strip, positioned between the `ShrutiSelector` row and the `SwaraKeyboard`. It contains:

- **Toggle button**: `▶ Start Drone` / `⏹ Stop Drone` — large, clearly distinct from quiz buttons; pulsing or glowing border animation when active to give a persistent visual cue
- **Volume knob or slider**: labelled "Drone Volume", range maps to −20dB → 0dB
- **Pa toggle**: small checkbox or pill toggle — "Include Pa", default on

No tempo control exposed to the user — 40 BPM is fixed and deliberate.

***

## Accessibility

- Toggle button must have `aria-pressed` reflecting `droneActive` state
- When drone starts, announce via `aria-live` region: "Drone started on [shruti label]"
- Volume slider has `aria-label="Drone volume"`

***

## Out of Scope

- Ma as an additional drone string (used in some traditions) — can be added later via the Pa toggle pattern
- Adjustable drone tempo
- Recording or exporting the drone
- Gamaka / pitch wobble on drone strings