# SaPaSa — a practice companion for singers

**SaPaSa** is a desktop web app for **Carnatic vocal practice** and related skills. It runs in your browser and, for live pitch tracking, uses a small **Python audio server** that reads your microphone. Think of it as a practice room helper: you sing, and the app shows **where your pitch sits** relative to Just Intonation (JI) swarasthanas; **capture simple melodies** and replay them as piano-like notes; helps you **train your ear**, work on **breath and body**, and optionally **watch posture** with your camera — all on your machine.

This guide is written for **music students** starting from zero with the project. You do **not** need to read code to use it.

---

## Features

- **Carnatic Training** — Live microphone pitch vs Just Intonation swaras, scrolling graph, optional tanpura drone, raga exercises with expected-swara guidance, optional camera overlay and hold markers.
- **Melody Capture** — Record vocals-only melodies via the same pitch stream; replay captured timing on piano or sine keys, scrub the timeline, compare reference vs attempt with a simple performance summary.
- **Ear Training** — Swara keyboard and quiz in JI from a chosen Sa (runs entirely in the browser).
- **Organ Training** — Breath and vocal-organ drills with optional camera metrics and a progress graph.
- **Consonant Training** — Structured consonant drills for singers (guidance-first).
- **Camera Lab** — Full-screen posture and alignment observation with live metrics (browser-only processing).

---

## What you need

| | |
|--|--|
| **Computer** | macOS, Windows, or Linux |
| **Browser** | A recent Chrome, Edge, or Firefox (Safari often works; use Chromium-based if in doubt) |
| **Microphone** | Built-in or external — place yourself at a comfortable distance |
| **Python** | 3.10 or newer (for modules that use the pitch/session server: **Carnatic Training**, **Melody Capture**, parts of **Organ Training**) |
| **Node.js** | 18 or newer (to build and run the web UI) |

**Headphones** are strongly recommended for **Ear Training** (and any module that plays reference tones), so synthesized sound does not confuse what the mic hears.

---

## Install and run (first time)

You will use **two terminals**: one for the audio server, one for the web app.

### 1. Backend (Python) — microphone & pitch analysis

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- **macOS / Linux:** `source .venv/bin/activate`
- **Windows (cmd):** `.venv\Scripts\activate.bat`
- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`

Then:

```bash
pip install -r requirements.txt
python main.py
```

Leave this running. It starts an API/WebSocket server (default **port 8765**) and opens the microphone. The first run may ask for **microphone permission** (OS-dependent).

### 2. Frontend (web UI)

```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Home screen

You’ll see **SaPaSa** and **six** practice modules. Use **← Home** (or equivalent) inside any module to return here.

---

## The six modules (what each one is for)

### Carnatic Training (live pitch — needs the Python server)

The **main pitch monitor** for Carnatic singing. Run **`python main.py`** first; the UI streams pitch over **WebSocket** (port **8765** — fix **disconnected** by checking the server and firewall).

Set **Shruti (kattai)** so **Sa** (Western name + Hz) drives labels, graph, exercises, and drone. **Listen / Pause listening** toggles detection (pause freezes the trace). Optional **tanpura strip** adds Sa–Pa drone on **speakers** — loud playback can bleed into the mic and confuse pitch; keep it moderate or use **headphones** for other audio.

The **pitch graph** scrolls your trace against a **JI swara** grid (color ≈ cents from nearest swarasthana); **drag vertically** to explore registers. **Sidebar exercises**: pick **raga** + **material**; the app highlights **expected swara** and steps forward when you **hold** in tolerance. **Play note** plays a reference and briefly ignores matching so speaker bleed doesn’t skip steps. **Holds** annotate sustained in-tune segments; **camera** is a movable/resizable overlay on the graph. Timer, octave shift, **Home**, and tooltips round out the toolbar.

---

### Melody Capture (live pitch — needs the Python server)

Uses the **same mic pitch stream** as Carnatic Training. Aim for **vocals-only** material you play yourself (no backing track on the mic). **Capture** builds a note timeline from live frames; **replay** plays it with **piano** or **sine**, with a **scrubber** under the toolbar for jumping around while testing.

Tabs **Reference** / **Attempt** let you capture a phrase then sing along; **Analyze attempt** summarizes pitch/rhythm-style alignment vs the reference. **Processing modes** adjust how aggressively notes are segmented (including options tuned for octave stability). Requires **`python main.py`** when you see disconnected.

---

### Ear Training (browser only — no Python)

**JI swara keyboard** from a chosen **Sa**, plus adjustable note length and tone. **Quiz mode** plays a mystery swara and scores guesses (**aliases** accepted where two names share a pitch). Prefer **headphones** so quiz tones don’t feed back through an open mic.

---

### Organ Training (physical singing technique)

**Breath and vocal-organ** drills (list + active pane). **Progress Graph** (beside camera) opens charts over saved practice data. **Watch shoulders** enables embedded **camera** metrics (shoulders, head, jaw, mouth — processed **in-browser**). Session completions can persist via the backend when it’s running.

---

### Consonant Training

Articulation drills on **consonants** for singers (plosives, nasals, fricatives) with graded progression — **guidance-first**, not a substitute for a teacher’s ear.

---

### Camera Lab

Full-screen **posture / alignment** view with the same metric pipeline as mini-camera overlays — useful when you want **body work** without the pitch graph. **Privacy:** video stays **local** in the browser; nothing is uploaded by this app.

---

## Tips for reliable pitch tracking (Carnatic Training)

1. **Run the Python server** and accept **microphone** access.
2. Prefer a **quiet room** and a stable mic position.
3. Keep **speaker playback** (tanpura, YouTube, etc.) at a level that does **not** dominate what the mic hears, or use **headphones** for anything you play from the computer.
4. If the trace is jumpy, check for fans, noise, or clipping.

---

## Data and privacy (short)

- **Pitch audio** is analyzed **locally** by the Python process; the UI receives **events** (e.g. note / idle), not recordings stored as sound files by default in this flow.
- **Exercise session durations** for some organ exercises can be stored in a local **SQLite** database (`backend/sapasa.db`) when the backend is used.
- **Camera** frames are handled in the **browser** for visualization and metrics; read your browser’s own privacy settings for site permissions.

---

## Troubleshooting

| Problem | Things to try |
|--------|----------------|
| No live pitch / disconnected | Start `python main.py` from `backend`; check firewall on **8765**. |
| No microphone | OS privacy settings → allow terminal/Python (or your IDE) to use the mic. |
| Strange pitch when tanpura is loud | Lower drone volume or use headphones for other audio. |
| Frontend won’t start | `cd frontend && npm install` then `npm run dev`; need Node 18+. |

---

## For developers (repo layout)

| Path | Role |
|------|------|
| `backend/` | FastAPI + WebSocket pitch stream, aubio YIN pitch, Carnatic/JI helpers, SQLite session storage |
| `frontend/` | React + Vite + TypeScript UI (Tone.js, MediaPipe for camera features) |

Build production assets: `cd frontend && npm run build` — output under `frontend/dist/`.

### AI vocal coach (optional — Apple Silicon)

The backend can run a **local Qwen2.5-Omni** model for natural-language practice feedback (see `specs/spec-llm-vocal-coach.md`). On **Mac with M1/M2/M3/M4**, inference uses **MLX** in the same Python process as the pitch server — not vLLM (CUDA).

Create `backend/.venv` and install **base** dependencies first (`pip install -r requirements.txt` as in the backend section above). Then **one-time coach setup** from the **repository root** (installs `mlx-lm-omni` into `backend/.venv` and **pre-downloads** the default MLX checkpoint from Hugging Face; expect a long run and several gigabytes of disk):

```bash
./scripts/local-omni-llm-server.sh --mlx-setup
```

Use `./scripts/local-omni-llm-server.sh --mlx-model HF/model-id --mlx-setup` if you want a different checkpoint. If a repo is gated, run `huggingface-cli login` or set `HF_TOKEN` first.

**Run the backend with the coach enabled:**

```bash
cd backend
source .venv/bin/activate
export SAPASA_COACH_MLX_MODEL=giangndm/qwen2.5-omni-3b-mlx-4bit
python main.py
```

Confirm the coach is using MLX: `curl -s http://127.0.0.1:8765/coach/health` should show `"inference":"mlx"`. In **Carnatic Training**, start **Sing & Test**, then use **Ask Coach** in the sidebar to send the last ~15 seconds of mic audio to the local coach (with the dev server, the UI talks to `http://127.0.0.1:8765`). More options: `./scripts/local-omni-llm-server.sh --apple-silicon-help`.

**Coach request logging (terminal):** enabled by default (`SAPASA_COACH_LOG=1`). Set `SAPASA_COACH_LOG=0` to disable. Set `SAPASA_COACH_LOG_FULL=1` to log full system and chat-template prompts (can be large).

**Linux + NVIDIA:** use an OpenAI-compatible **vLLM** server instead; see `./scripts/local-omni-llm-server.sh --help` and `--print-sapasa-env`.

---

## Limitations (honest scope)

- Pitch detection is **fundamental-frequency** based; it reflects what a typical monophonic pitch tracker hears — not a full substitute for a guru’s ear or a DAW-grade analysis suite.
- **Raga / exercise catalog** grows over time but is **bounded**; check the in-app lists for what is available today.
- **Tāla** and rhythm are not a dedicated tutor beyond what exercises encode in their notation.

---

## License and contributing

If the repository publishes a **LICENSE** file, follow that document. For changes and issues, use your project’s normal Git hosting workflow (e.g. issues and pull requests on GitHub).

---

*Happy practice — SaPaSa is a tool to support your riyaz, not a replacement for listening deeply and studying with a knowledgeable teacher.*
