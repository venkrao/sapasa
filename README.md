# SaPaSa

A Carnatic pitch training tool for macOS. Listens to your voice and shows live cents deviation for Sa, Pa, and Sa′ against the D♯ (Eb) shruti.

## Requirements

- Python 3.10+ (Apple Silicon native recommended)
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

macOS will prompt for microphone access the first time the Python server starts.

## How it works

| Swara  | Target Hz | Ratio |
|--------|-----------|-------|
| Sa     | 311.13 Hz | 1 : 1 |
| Pa     | 466.70 Hz | 3 : 2 |
| Sa′    | 622.25 Hz | 2 : 1 |

The app detects which swara you're singing automatically and shows the deviation in cents:

- **Green** — within ±10¢ (in tune)
- **Amber** — ±10–25¢ (needs work)
- **Red** — beyond ±25¢ (significantly off)

Notes more than ±50¢ from any target are ignored.
