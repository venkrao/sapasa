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

- **Shruti selection**: choose Sa as any Western pitch (C .. B) from the top-right selector.
- **Live pitch detection**: shows **Carnatic swara name** + **Western note name** + **cents** in the bottom panel.
- **Scrolling pitch graph**:
  - **3-octave viewport** that follows your voice (log-frequency scale)
  - **Drag up/down** on the graph to reposition the viewport (auto-follow resumes after a short pause)
  - **60s history** trace for gamaka / movement

## How it works

The backend estimates your fundamental frequency (Hz) and the frontend renders it over time.
For swara identification, the app builds a JI frequency grid from the selected Sa and finds the nearest swarasthana.

The colour indicates how close you are to the nearest swarasthana:

- **Green** — within ±10¢ (in tune)
- **Amber** — ±10–25¢ (needs work)
- **Red** — ±25–50¢ (significantly off)
- **Dim grey** — more than ±50¢ from any swarasthana
