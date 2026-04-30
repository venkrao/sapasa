# Spec: Melody Capture & Piano Replay Module

Repository: `github.com/venkrao/sapasa`  
Primary surface: new module screen `frontend/src/MelodyCaptureScreen.tsx`  
Document version: `0.1`  
Status: Draft (pre-implementation)  
Depends on: existing pitch backend stream (`ws://localhost:8765/ws`), existing Tone playback engine  
Relates to: `AppMain`, `HomeScreen`, `PitchGraph`, `EarTrainerAudioEngine`, pitch stream wiring

***

## 1) Summary

Build a **new standalone module** that captures melody notes from incoming **vocals-only audio** and replays them using piano keys while preserving note timing intervals.

This should **not** be embedded into Carnatic Training. It should appear alongside current modules on Home.

Core requirement: **reuse existing pitch-monitor components/logic** rather than duplicating pitch graph and stream code.

***

## 2) Why this module

1. Feature is not Carnatic-specific; it is broadly useful for ear training and imitation.
2. Carnatic Training toolbar/screen is already dense.
3. A separate module keeps workflows clear:
   - Carnatic Training = sing vs swara grid + exercises
   - Melody Capture = record melody contour -> replay as keys

***

## 3) Scope (v1)

### In scope

1. New Home card + new screen route.
2. Capture from live pitch stream while user plays/sings vocals-only source.
3. Convert pitch frames to note events.
4. Replay note events using piano synth with original relative timing.
5. Clear/re-capture flow.

### Out of scope

1. Polyphonic source separation.
2. MIDI export.
3. Notation editor / detailed manual note editing.
4. Tala/beat-grid quantization.
5. Automatic swara naming UI in v1.

***

## 4) User assumptions

1. User provides **vocals-only** audio (no instruments).
2. User handles source extraction externally.
3. Mic permissions and backend process are already functioning.

***

## 5) Reuse-first architecture (no duplication)

### 5.1 Reuse existing pitch visual

Use current `PitchGraph` component directly in the new module:

- Same `onMount(push)` event ingestion contract.
- Same grid and rendering behaviors.
- Module-level options can disable exercise-only visuals.

### 5.2 Reuse pitch stream client behavior

Extract or reuse existing WebSocket pitch stream handling from `PitchMonitorScreen`:

Option A (preferred):
1. Introduce shared hook/service, e.g. `usePitchStream()` or `pitchStreamClient.ts`.
2. Both `PitchMonitorScreen` and `MelodyCaptureScreen` consume this shared source.

Option B:
1. If extraction is too large for first pass, minimally factor the stream logic into a shared utility first, then integrate.

### 5.3 Reuse audio playback engine

Use existing Tone-backed engine (`EarTrainerAudioEngine`) for replay.  
Do not create a parallel synth stack.

***

## 6) New screen UX

### Header

1. App name + screen name (`Melody Capture`).
2. `Home` button only.

### Main layout

1. Left: reused `PitchGraph`.
2. Right/top control panel:
   - `Capture melody` / `Stop capture`
   - `Replay melody` / `Stop replay`
   - `Clear`
   - optional tone selector (piano default; can defer)
3. Status area:
   - capture state
   - duration
   - extracted note count
   - warning/error text

No exercise panel controls on this screen.

***

## 7) State model

```ts
type MelodyFrame = {
  tMs: number
  freq: number | null
}

type MelodyNoteEvent = {
  startMs: number
  endMs: number
  durMs: number
  freqHz: number
  midi: number
  velocity: number
}

type CaptureStatus = 'idle' | 'capturing' | 'captured' | 'replaying'
```

Runtime state:
1. `status`
2. `captureStartedAt`
3. `frames`
4. `events`
5. `error`

***

## 8) Capture and extraction logic (v1)

### Tunable constants

1. `MIN_NOTE_MS = 90`
2. `END_SILENCE_MS = 140`
3. `MIN_FREQ_HZ = 80`
4. `MAX_FREQ_HZ = 1200`
5. `MAX_NOTE_MS = 1800` (replay clamp)

### Algorithm

1. While capturing, append `(timestamp, freq|null)` from pitch stream.
2. Build voiced runs:
   - start on first voiced frame,
   - end when silence exceeds `END_SILENCE_MS`.
3. Drop runs shorter than `MIN_NOTE_MS`.
4. Representative pitch = median Hz of run.
5. Quantize to MIDI:
   - `midi = round(69 + 12 * log2(hz/440))`
6. Emit `MelodyNoteEvent` with preserved run timing.

***

## 9) Replay behavior

1. Replay schedules each note at original `startMs` offsets from replay start.
2. Duration = `clamp(durMs, 70, MAX_NOTE_MS)`.
3. Playback uses reused engine (piano preset default).
4. `Stop replay` cancels pending schedule + active notes cleanly.

Conflict policy:
1. Start capture while replaying -> stop replay first.
2. Start replay while capturing -> stop capture first, then replay extracted events.

***

## 10) Integration changes

## 10.1 `HomeScreen.tsx`
1. Add card callback prop, e.g. `onChooseMelodyCapture`.
2. Add new Home card tile text:
   - title: `Melody Capture`
   - desc: `Capture vocals-only melodies and replay them as piano notes.`

## 10.2 `AppMain.tsx`
1. Extend `Screen` union with new key (e.g. `'melody'`).
2. Route to `MelodyCaptureScreen`.

## 10.3 New files
1. `frontend/src/MelodyCaptureScreen.tsx`
2. `frontend/src/MelodyCaptureScreen.css` (if needed)
3. Optional shared helpers:
   - `frontend/src/melodyCapture.ts`
   - `frontend/src/pitchStreamClient.ts` or `frontend/src/hooks/usePitchStream.ts`

***

## 11) Acceptance criteria (v1)

1. New module appears on Home and opens correctly.
2. Capture flow works end-to-end:
   - start capture
   - stop capture
   - note events extracted
3. Replay audibly follows captured inter-note timing.
4. Pitch graph renders using reused component.
5. No behavior regressions in existing modules.

***

## 12) Risks and mitigations

1. **Vibrato over-segmentation**
   - Mitigate with minimum duration + silence thresholds.
2. **Noisy room input**
   - Show low-confidence/no-notes warnings.
3. **Timing drift**
   - Use Tone scheduler patterns instead of naive `setTimeout` chains when possible.

***

## 13) Open questions

1. Should v1 include a tiny timeline preview of captured notes, or summary-only?
2. Piano-only in v1, or expose sine preset toggle immediately?
3. Should capture auto-stop after max duration (e.g. 30s)?
4. Should microtonal cents offsets be retained in metadata for future non-ET replay?

***

## 14) Implementation sequence

1. Factor shared pitch stream logic from `PitchMonitorScreen` into reusable hook/service.
2. Create `MelodyCaptureScreen` with reused `PitchGraph`.
3. Implement capture + extract + replay loop.
4. Add Home + App routing.
5. Tune thresholds with sample vocals-only clips and finalize tooltips.

