# Spec: Melody Performance Analysis (Reference vs Student)

Repository: `github.com/venkrao/sapasa`  
Primary module: `Melody Capture` (standalone module)  
Document version: `0.1`  
Status: Draft (design-only)  
Depends on: `spec-melody-capture-module.md`  
Relates to: captured note events, replay flow, student feedback UX

***

## 1) Goal

After a student captures a reference melody (from vocals-only audio), allow them to record their own singing attempt and receive a clear summary of how closely they matched the reference.

This phase is analysis-oriented: compare **pitch**, **timing**, and **duration control** between:

1. Reference capture (original song melody)
2. Student attempt capture (student singing the same melody)

***

## 2) User flow

1. User captures reference melody (already supported by Melody Capture module).
2. User clicks `Practice against reference`.
3. User sings attempt while module records second pass.
4. System compares attempt against reference.
5. User sees:
   - overall score
   - pitch/rhythm/stability sub-scores
   - concise coaching summary

***

## 3) Scope (v1)

### In scope

1. Two-pass workflow (reference + attempt).
2. Note-event alignment with tolerance windows.
3. Human-readable summary with actionable feedback.
4. Basic score breakdown.

### Out of scope (v1)

1. Lyric-aware alignment.
2. Phrase boundary auto-detection from text.
3. Full DTW contour scoring (can come later).
4. Teacher-grade ornament/gamaka evaluation.

***

## 4) Data model additions

Uses existing `MelodyNoteEvent` from capture module; adds analysis outputs.

```ts
type MatchedNote = {
  refIndex: number
  attemptIndex: number
  pitchCentsError: number      // signed; +sharp, -flat
  onsetErrorMs: number         // signed; +late, -early
  durationErrorMs: number      // signed
  confidence: number           // 0..1 based on match quality
}

type PerformanceAnalysis = {
  matched: MatchedNote[]
  unmatchedReference: number[] // ref indices
  unmatchedAttempt: number[]   // attempt indices

  pitchScore: number           // 0..100
  rhythmScore: number          // 0..100
  stabilityScore: number       // 0..100 (v1 approximated)
  overallScore: number         // 0..100

  dominantPitchBias: 'sharp' | 'flat' | 'balanced'
  dominantTimingBias: 'early' | 'late' | 'balanced'

  summaryLines: string[]       // user-facing bullets
}
```

***

## 5) Matching strategy (v1)

Use pragmatic note-level matching (not full DTW yet):

1. Iterate reference notes in order.
2. For each reference note, search forward in attempt notes within a timing window.
3. Pick best candidate by weighted cost:
   - pitch distance (cents)
   - onset distance (ms)
   - duration ratio mismatch
4. Enforce monotonic matching (attempt index increases).

### Suggested thresholds

1. `MAX_ONSET_WINDOW_MS = 450`
2. `MAX_PITCH_WINDOW_CENTS = 180`
3. `MAX_DURATION_RATIO = 2.5` (for rejecting pathological matches)

These are tunable constants.

***

## 6) Scoring model (v1)

### 6.1 Pitch score

For each matched note:

- 100 at <= 10 cents
- linearly decays to 0 by 120 cents

Overall pitch score = average of matched-note pitch scores, penalized by low match coverage.

### 6.2 Rhythm score

For each matched note:

- 100 at <= 40 ms onset error
- linearly decays to 0 by 350 ms

Overall rhythm score = average of matched-note rhythm scores.

### 6.3 Stability score (v1 approximation)

Until per-note intra-frame variance is explicitly stored, v1 can approximate stability using:

1. excessive micro-note fragmentation in attempt capture
2. high duration inconsistency vs reference

### 6.4 Overall score

Weighted blend:

- Pitch: 0.5
- Rhythm: 0.35
- Stability: 0.15

Clamp to 0..100.

***

## 7) Feedback summary generation

Generate concise bullets from analysis:

1. Match coverage summary:
   - e.g. `Matched 24/31 reference notes`
2. Pitch tendency:
   - `You were mostly slightly sharp on sustained notes`
3. Timing tendency:
   - `You tended to enter late by ~90 ms on average`
4. One strongest area:
   - `Best section: opening phrase had good pitch centering`
5. One concrete next step:
   - `Practice with slower replay and focus on phrase 3 timing`

***

## 8) UI additions in Melody Capture module

Add a secondary mode panel:

1. `Reference` tab (existing capture behavior)
2. `Attempt` tab (student recording against reference)
3. `Analyze` button (enabled when both captures exist)

Result card shows:

1. Overall score
2. Subscores (pitch, rhythm, stability)
3. Summary bullets
4. Optional compact table of most off notes (v1 optional)

***

## 9) Edge cases

1. Attempt has too few notes:
   - show `Insufficient attempt data` + suggestion.
2. Reference is too short:
   - require minimum note count (e.g. >= 6).
3. Very different tempo:
   - still attempt matching with wide onset window; warn if low confidence.
4. No reliable matches:
   - no score; show diagnostic guidance.

***

## 10) Acceptance criteria

1. User can run reference capture + attempt capture in one session.
2. Analysis produces stable output for normal vocals-only clips.
3. Summary is understandable to non-technical students.
4. Scores update consistently when attempt quality changes.
5. No regressions to baseline melody capture/replay flow.

***

## 11) Risks and mitigation

1. **False confidence from simple matcher**
   - Mitigate with confidence indicator + conservative wording.
2. **Over-penalizing expressive timing**
   - Keep wide onset windows and avoid hard fail language.
3. **Fragmented attempt notes**
   - Optionally pre-merge near-adjacent same-midi notes before matching.

***

## 12) Future upgrades (v2+)

1. DTW-based contour alignment.
2. Phrase-level scoring and phrase heatmap.
3. Replay A/B mode: reference vs student alternating playback.
4. Optional swara-aware scoring overlay for Carnatic users.
5. Export analysis history.

