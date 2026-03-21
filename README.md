# SaPaSa

A Carnatic pitch training tool for desktop (macOS / Windows / Linux). Listens to your voice and shows live cents deviation against Just Intonation (JI) swarasthanas for the selected shruti.

## Requirements

- Python 3.10+
- Node.js 18+

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Running

**Terminal 1 — start the Python audio server:**

```bash
cd backend
source .venv/bin/activate
python main.py
```

**Terminal 2 — start the UI:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The Python backend uses your system microphone:

- **macOS**: you may be prompted for microphone access the first time you start `python main.py`.
- **Windows**: ensure microphone permission is enabled for desktop apps in Windows Privacy settings.
- **Linux**: ensure your audio stack (PipeWire/PulseAudio/ALSA) has an input device available.

## Currently supported

The app opens a **home screen** with two modules (both are early / learning-focused; data is limited on purpose).

### Pitch Monitor (live microphone — requires the Python backend)

- **Shruti**: header selector lists **Carnatic kattai** (½-kattai steps) with a Western note name and Hz; this sets **Sa** for both the JI grid and pitch matching.
- **Tanpura drone** (optional): synthesized rolling **JI Sa — Pa — Sa′** (Pa can be unchecked) under the header — tempo fixed at **40 BPM**, volume **−20…0 dB**, **Tone.js** + light reverb; ties to the selected shruti when you change it. Uses speakers — can interfere with the mic like any playback.
- **Live readout**:
  - **Western note** (ET nearest semitone), **large and color-matched** to intonation, **centered in the header**.
  - **Carnatic swara** (nearest JI swarasthana) + **cents** from that target + a short **in tune / sharp / flat** label in the **bottom** bar.
- **Pitch graph**:
  - **3-octave** log-frequency viewport that **tracks** your singing (median pitch over ~2s, smoothed); **large jumps or notes outside the frame snap / recenter** so the trace stays usable after manual panning.
  - **Drag** vertically to pan; auto-follow pauses briefly after drag, or **resumes immediately** if you sing **outside** the current view (unless you are still holding the pointer).
  - **~60s** scrolling history; grid shows Western chromatic lines with **Western names on the left** and **JI swara bands** with **Carnatic labels on the right**.
- **Guided exercises** (sidebar): pick raga **Mayamalavagowla** (Adi tala today in data), then either:
  - **Arohanam & Avarohanam** (generated from the raga’s scale), or
  - **Sarali Varisai 1**, **Janta Varisai 1**, **Daatu Varisai 1**, **Melsthayi Varisai 1**, **Madhya Sthayi Varisai 1**, **Mandra Sthayi Varisai 1**, **Alankaram 1** (Dhruva talam).
  - While an exercise runs, the graph can **emphasize the expected swara** and **dim** out-of-scale positions; matching advances when you **hold** the expected pitch within tolerance.
  - Optional **Play note** plays a **reference tone** for the current expected swara (Tone.js in your browser) — matching is **ignored briefly** right after playback so speaker bleed doesn’t skip steps.

### Ear Training (browser audio only — no Python)

- **Swara keyboard** for the full **16-name** layout (including shared-pitch pairs like Ri2/Ga1); playback uses **JI ratios** from a chosen **base Sa** (presets from **C3** through **B3**, plus **C4** default).
- **Note length** slider and **tone presets**: Veena-ish, Piano-ish, Guitar-ish, pure **sine**, **triangle** (all synthesized; **headphones recommended**).
- **Quiz**: plays a random swara; you pick the answer; scoring counts **alias** names as correct where pitches coincide.

### Scope / not here yet

- **One raga** (`Mayamalavagowla`) and the exercises bundled with it — no other ragas in the catalog yet.
- Pitch detection is **fundamental-only** (YIN on mono input); **no** separate tāla / rhythm tutor beyond what’s encoded in exercise notation.

## How it works

The backend estimates your fundamental frequency (Hz) and the frontend renders it over time.
For swara identification, the app builds a JI frequency grid from the selected Sa and finds the nearest swarasthana.

The colour indicates how close you are to the nearest swarasthana:

- **Green** — within ±10¢ (in tune)
- **Amber** — ±10–25¢ (needs work)
- **Red** — ±25–50¢ (significantly off)
- **Dim grey** — more than ±50¢ from any swarasthana
