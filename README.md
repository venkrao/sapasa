# SaPaSa — a practice companion for singers

**SaPaSa** is a desktop web app for **Carnatic vocal practice** and related skills. It runs in your browser and, for live pitch tracking, uses a small **Python audio server** that reads your microphone. Think of it as a practice room helper: you sing, and the app shows **where your pitch sits** relative to Just Intonation (JI) swarasthanas, helps you **train your ear**, work on **breath and body**, and optionally **watch posture** with your camera — all on your machine.

This guide is written for **music students** starting from zero with the project. You do **not** need to read code to use it.

---

## What you need

| | |
|--|--|
| **Computer** | macOS, Windows, or Linux |
| **Browser** | A recent Chrome, Edge, or Firefox (Safari often works; use Chromium-based if in doubt) |
| **Microphone** | Built-in or external — place yourself at a comfortable distance |
| **Python** | 3.10 or newer (only for **Carnatic Training** and **Organ Training** features that talk to the server) |
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

You’ll see **SaPaSa** and five practice modules. Use **← Home** (or equivalent) inside any module to return here.

---

## The five modules (what each one is for)

### Carnatic Training (live pitch — needs the Python server)

This is the **main pitch monitor** for serious singing practice.

1. **Start the backend** (`python main.py`) before you rely on live pitch; the UI connects over the network to analyze your voice.
2. **Shruti (kattai)** — Pick your **Sa** reference (Carnatic kattai with Western name and Hz). Everything — graph, exercises, optional drone — follows this Sa.
3. **Listen / Pause listening** — Turns live pitch detection on or off. Pausing freezes the graph without leaving the screen.
4. **Tanpura strip** — Optional **synthetic tanpura** (Sa–Pa drone, volume, Pa on/off). It uses **your speakers**; if it is loud, it can leak into the mic and confuse pitch detection — keep drone level moderate or use headphones for reference tracks elsewhere.
5. **Pitch graph** — A scrolling view of your pitch over time against a **JI swara** grid. Colors show **how close** you are to the nearest swarasthana (green ≈ on pitch, warmer/redder = further off). You can **drag** the view vertically; it recenters when you jump registers.
6. **Sidebar exercises** — Choose a **raga** and an **exercise** (e.g. arohanam/avarohanam, varisai-style material). While an exercise runs, the app can highlight the **expected swara** and advance when you **hold** the right pitch within tolerance. **Play note** plays a reference tone; the app briefly ignores matching so speaker bleed does not skip steps.
7. **⏱ Holds** — Optional labels for **how long** you sustain stable, in-tune segments on the graph.
8. **📷 Cam** — Optional small **camera overlay** on the graph (shoulders/posture hints). Drag the header to move it; drag the corner to resize.
9. **Session timer**, **octave shift**, and **Home** are self-explanatory; hover controls for short tips where provided.

If something says **not connected**, ensure `python main.py` is running and nothing else is blocking port **8765**.

---

### Ear Training (browser only — no Python required)

- A **swara keyboard** with **Just Intonation** ratios from a chosen **base Sa**.
- Adjustable **note length** and **tone** presets (e.g. piano, sine).
- A **quiz mode** that plays a random swara and scores your guesses (including **alias** names where two syllables share the same pitch).

Use **headphones** so the quiz tones stay clear and do not feed back into a mic if one is active.

---

### Organ Training (physical singing technique)

- Guided **breath and vocal-organ** exercises (e.g. hisses, timed breath work) in a two-column layout: **exercise list** on the left, **active exercise** on the right.
- **Progress Graph** (top right, next to the camera control) opens a **progress tracker** with charts tied to your practice data.
- **Watch shoulders** turns on an **embedded camera** view with live posture metrics (shoulders, head, jaw, etc.). Video is processed **in the browser**; follow your browser’s camera permission prompts.
- Some completions are saved via the **same backend** (exercise sessions API) when the server is running.

---

### Consonant Training

- Structured material on **consonants** in singing — plosives, nasals, fricatives — with **beginner / intermediate / advanced** style progression and **drill** ideas.
- This module is **guidance-first**; it does not replace a teacher’s ear.

---

### Camera Lab

- Full-screen **camera observation** for **posture and alignment** (shoulders, head, jaw, mouth shape) with the same live metrics stack used in embedded camera views.
- Useful when you want to focus on **body habits** without the pitch graph.
- **Privacy:** video stays **local** to your browser session; nothing is uploaded by this app.

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

Confirm the coach is using MLX: `curl -s http://127.0.0.1:8765/coach/health` should show `"inference":"mlx"`. More options: `./scripts/local-omni-llm-server.sh --apple-silicon-help`.

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
