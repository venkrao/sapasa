# Spec: AI Vocal Coach Feature for SaPaSa

## Overview

Add an **AI Vocal Coach** module to SaPaSa that uses a locally running Qwen2.5-Omni-7B instance to provide natural-language feedback on a singer's practice session. The coach listens to short audio clips captured during practice and responds with pedagogically useful commentary — covering pitch, tone, breath, and stylistic execution. Everything runs locally; no audio leaves the machine.

***

## Guiding Principles

- **Privacy-first**: audio is never uploaded; inference is local, consistent with how pitch analysis already works.
- **Complementary, not competing**: the AI coach reads *from* SaPaSa's existing data (pitch events, exercise context, raga selection) and uses it to give informed feedback, not just raw audio opinions.
- **Non-intrusive**: the coach is opt-in and asynchronous — it does not interrupt active singing.

***

## New Module: "AI Coach"

Add a sixth card to the SaPaSa home screen: **AI Coach**. It is accessible as a standalone module and also as a **sidebar panel** inside the existing Carnatic Training module.

***

## Core User Flow

1. User finishes singing a phrase or exercise segment in Carnatic Training.
2. User taps **"Ask Coach"** — this captures the last N seconds of audio from the existing microphone stream (no new mic permission needed) and bundles it with session context (current raga, selected exercise, shruti/kattai, any pitch accuracy summary from the graph).
3. A request is sent to the **local LLM backend** (see below).
4. The coach response appears as a text card in the sidebar. Optionally, the model can speak it back using its own TTS output.

***

## What the Coach Can Comment On

The system prompt should guide the model to focus on:

- **Pitch accuracy** — informed by the pitch event summary passed as context (e.g., "you were consistently ~15 cents flat on Ni")
- **Phrase shape** — did the sung phrase match the exercise's expected arohanam/avarohanam structure?
- **Breath and support** — inferred from audio envelope characteristics (duration of held notes, audible breaks)
- **Gamaka and ornamentation** — where the model can pick up on characteristic oscillations in the audio
- **Encouragement and progression** — frame feedback constructively, appropriate for a student in riyaz

The model should be explicitly told it is a **Carnatic vocal coach**, the raga and exercise in context, and the student's shruti reference.

***

## Backend Changes

Add a new service alongside the existing FastAPI/WebSocket pitch server in `backend/`:

| Component | Detail |
|---|---|
| **Audio buffer** | Ring buffer in the Python backend that keeps the last 30s of raw mic audio (configurable). Existing pitch stream already has mic access — tap into it. |
| **Clip export** | On "Ask Coach" trigger, slice N seconds (default: 15s) from the buffer, encode as WAV or FLAC in memory. |
| **LLM client** | A lightweight Python module that sends the audio clip + structured context to the local Qwen2.5-Omni instance via its OpenAI-compatible API endpoint. |
| **Context payload** | JSON alongside the audio: `{ raga, exercise, shruti_hz, kattai, pitch_summary: [{swara, cents_deviation, duration_ms}], session_elapsed_s }` |
| **New REST endpoint** | `POST /coach/feedback` — frontend calls this; backend handles clip extraction + LLM call + returns response text. |
| **LLM process** | Qwen2.5-Omni runs as a separate local process (e.g., via `mlx_lm.server` or vLLM), not embedded in the FastAPI process. The backend talks to it over localhost. |

***

## Frontend Changes

Inside **Carnatic Training** sidebar:

- Add an **"Ask Coach"** button below the exercise list, visible when an exercise is active.
- A **Coach panel** that shows the latest response as a text card with a timestamp.
- A small **history list** (last 5 responses, session-scoped, not persisted) so the student can scroll back.
- A **speaking toggle**: if enabled, the model's TTS audio response is played back through the browser's audio context (the backend streams it as audio).
- A loading/thinking indicator while the LLM is responding (typically 3–10s on M3 Pro).

In the **standalone AI Coach module** (home screen card):

- A free-form **text input** for asking questions without an active session (e.g., "explain the arohanam of Bhairavi to me").
- A microphone button for singing a phrase and getting direct feedback without going through Carnatic Training.

***

## System Prompt Template

The backend constructs this before each call:

```
You are a Carnatic vocal coach assistant integrated into a practice app called SaPaSa.
The student is currently practicing the raga {raga} using shruti Sa = {shruti_hz} Hz ({kattai} kattai).
The exercise is: {exercise_description}.

Pitch summary from the last phrase:
{pitch_summary_as_natural_language}

Listen to the audio clip the student just sang and provide brief, constructive feedback.
Focus on: pitch accuracy (especially deviations noted above), breath support, and phrase shape.
Keep your response under 100 words. Be encouraging but specific.
Do not repeat the pitch data back verbatim — interpret it.
```

***

## What This Feature Deliberately Does Not Do

- No real-time, word-by-word feedback during singing — the coach is always post-phrase.
- No tala/rhythm evaluation (consistent with the existing limitation noted in your README).
- No cloud calls, no data persistence of audio clips.
- No replacement of the existing JI pitch graph — the coach supplements it with language, not numbers.

***

## Phased Build Suggestion

| Phase | Scope |
|---|---|
| **1 — Plumbing** | Audio ring buffer in backend, `/coach/feedback` endpoint, LLM client module talking to local Qwen2.5-Omni — **initial slice implemented** (`backend/coach_ring.py`, `coach_llm.py`, `coach_api.py`; `GET /coach/health`; mock without `SAPASA_COACH_LLM_BASE_URL`). |
| **2 — Basic UI** | "Ask Coach" button + text response card in Carnatic Training sidebar — **implemented** (`ExercisePanel` coach block; `PitchMonitorScreen` → `POST /coach/feedback`; session history ×5; pitch context empty until phase 3). |
| **3 — Context enrichment** | Pass pitch summary + exercise context into the prompt; refine system prompt |
| **4 — Standalone module** | Home screen AI Coach card with free-form Q&A and direct mic input |
| **5 — TTS playback** | Stream spoken response back to frontend (optional, lower priority) |

**Inference backends:** (1) **Apple Silicon — MLX in-process** — `pip install -r backend/requirements-coach-mlx.txt`, set `SAPASA_COACH_MLX_MODEL` (e.g. `giangndm/qwen2.5-omni-3b-mlx-4bit`); no separate server; real local Omni. (2) **OpenAI-compatible HTTP** — vLLM on CUDA (`scripts/local-omni-llm-server.sh`), or tunnel to such a host (`--print-sapasa-env`). (3) **Mock** — neither `SAPASA_COACH_MLX_MODEL` nor `SAPASA_COACH_LLM_BASE_URL` set. See `scripts/local-omni-llm-server.sh --apple-silicon-help`.