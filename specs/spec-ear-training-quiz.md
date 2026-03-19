
# Feature Spec: Quiz Mode

## Design Recommendation

Rather than a separate "Play" button and "Try New Note" button as two separate concepts, model the quiz as an explicit **state machine** with clear phases. This maps cleanly to implementation and gives the user an unambiguous UX at every moment.

### Quiz States

```
IDLE → LISTENING → ANSWERED → IDLE (next round)
```

| State | What the user sees | What the user can do |
|---|---|---|
| `IDLE` | "Start Quiz" button | Press to begin |
| `LISTENING` | "🔊 Which swara was that?" prompt, all swara buttons enabled | Click a swara button to guess; "Replay" button to hear the note again |
| `ANSWERED (correct)` | ✅ "Correct! That was **Ga3**", correct button highlighted green | "Next Note" button to proceed |
| `ANSWERED (wrong)` | ❌ "Not quite." wrong button highlighted red, correct button highlighted green | "Replay Correct Note" button + "Next Note" button |

This is cleaner than a "Try New Note" button because:
- It separates **replaying the mystery note** (available in `LISTENING`) from **moving to the next round** (only available in `ANSWERED`)
- The user can never accidentally skip past their answer before seeing feedback
- State management is a single `quizPhase` enum — straightforward for Cursor to implement

***

## State

Add these to `EarTrainerPanel` (or extract into a `useQuizMode` custom hook):

| State | Type | Description |
|---|---|---|
| `quizPhase` | `'idle' \| 'listening' \| 'answered'` | Current phase of the quiz |
| `mysterySwara` | `Swara \| null` | The randomly selected swara for the current round |
| `userGuess` | `Swara \| null` | The swara the user tapped |
| `isCorrect` | `boolean \| null` | Result of the guess |
| `score` | `{ correct: number, total: number }` | Running session score |

***

## Behaviour

### Starting a round
1. Pick a random swara from the 16 using `Math.random()`
2. Store it in `mysterySwara`
3. Immediately play its tone
4. Set `quizPhase → 'listening'`

### Replaying
- Available only in `LISTENING` and `ANSWERED` (wrong) states
- Replays `mysterySwara` using the same `playSwara()` function already implemented
- Does **not** pick a new note — same ref, same frequency

### Guessing
- Swara buttons remain fully visible and tappable in `LISTENING`
- On tap: compare `tappedSwara.ratio === mysterySwara.ratio` (use ratio as identity, not name, to handle shared-pitch pairs like Ri2/Ga1 correctly — see note below)
- Set `userGuess`, `isCorrect`, `quizPhase → 'answered'`
- Play a short confirmatory tone: a quick high ping for correct, a low short buzz for wrong (both via OscillatorNode, no assets needed)

### Shared-pitch swaras (Ri2/Ga1, Dha2/Ni1)
Since these pairs are **acoustically identical**, both answers should be accepted as correct when the mystery note is one of them. Encode this as an `aliases` field on each swara definition:
```ts
{ short: "Ri2", ratio: 9/8, aliases: ["Ga1"] }
{ short: "Ga1", ratio: 9/8, aliases: ["Ri2"] }
```
A guess is correct if `guess.short === mystery.short || mystery.aliases.includes(guess.short)`.

### Next Note
- Resets `mysterySwara`, `userGuess`, `isCorrect`
- Picks a new random swara and plays it immediately
- Sets `quizPhase → 'listening'`
- Does **not** reset `score`

### Ending the quiz
- A simple "End Quiz" / "✕" button always visible during quiz mode
- Sets `quizPhase → 'idle'`, resets all quiz state including score
- Shows a brief end-of-session summary: "You got X / Y correct"

***

## Score Display

- Show `score.correct / score.total` as a persistent counter in the quiz panel header while in quiz mode (e.g. `Score: 3 / 5`)
- Reset only on "End Quiz", not between rounds

***

## UI Layout (within existing `EarTrainerPanel`)

- The existing `SwaraKeyboard` stays as-is; quiz mode reuses it
- A `QuizControls` strip sits **above** the keyboard, replacing the "free play" area when quiz mode is active
- In `LISTENING`: shows prompt text + "Replay" button
- In `ANSWERED`: shows result text + "Replay Correct Note" (if wrong) + "Next Note" button
- Button visual states on the `SwaraKeyboard` in `ANSWERED`:
  - Correct swara button → green highlight
  - User's wrong guess button → red highlight
  - All other buttons → dimmed/disabled

***
