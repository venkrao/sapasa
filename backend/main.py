import asyncio
import datetime
import json
import math
import pathlib
import queue
import sqlite3
import threading
from collections import deque
from contextlib import asynccontextmanager
from typing import AsyncIterator

import aubio
import numpy as np
import sounddevice as sd
import uvicorn
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import carnatic_engine

# ── Persistent storage ────────────────────────────────────────────────────────

DB_PATH = pathlib.Path(__file__).parent / "sapasa.db"


def _init_db() -> None:
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS exercise_sessions (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                exercise_id  TEXT    NOT NULL,
                ts           TEXT    NOT NULL,
                duration_sec REAL    NOT NULL
            )
        """)
        con.execute(
            "CREATE INDEX IF NOT EXISTS idx_ex_ts "
            "ON exercise_sessions (exercise_id, ts)"
        )


_init_db()

SAMPLE_RATE = 44100
BLOCK_SIZE  = 512   # hop size: new samples per audio callback (~11 ms)
WINDOW_SIZE = 2048  # aubio analysis window (~46 ms)

MIN_FREQ = 80.0    # ~E2 — covers most vocal ranges
MAX_FREQ = 1200.0  # ~D6

# Silence gate: aubio returns freq=0 for frames below this dBFS level.
SILENCE_DB = -60.0

# Minimum confidence for the yin detector to accept a frame.
# yin (unlike yinfft) reports meaningful confidence: ~0.85-0.99 for clean
# voiced frames, much lower for sub-harmonic or transient errors.
CONFIDENCE_THRESHOLD = 0.8

# Median filter window — outlier frames cannot move the median.
MEDIAN_SIZE = 5

# How many consecutive rejected frames before we declare silence and clear
# the buffer.  Bridges brief dropouts without creating gaps in the trace.
SILENCE_HOLD_FRAMES = 10   # ~110 ms at 11 ms/hop

_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    worker = threading.Thread(target=_process_audio, daemon=True)
    worker.start()

    stream = sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        blocksize=BLOCK_SIZE,
        callback=_audio_callback,
        dtype="float32",
    )
    stream.start()

    yield

    stream.stop()
    stream.close()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── aubio pitch detector ──────────────────────────────────────────────────────
# Using "yin" rather than "yinfft": get_confidence() is functional for yin
# (yinfft always returns 0.0 in this release), giving us a proper per-frame
# quality gate to reject sub-harmonic and transient errors before they enter
# the median buffer.
_pitch_o = aubio.pitch("yin", WINDOW_SIZE, BLOCK_SIZE, SAMPLE_RATE)
_pitch_o.set_unit("Hz")
_pitch_o.set_silence(SILENCE_DB)

# ── Shared state ──────────────────────────────────────────────────────────────
_audio_queue: queue.Queue[np.ndarray] = queue.Queue(maxsize=64)
_latest_event: dict = {"status": "idle"}
_event_lock = threading.Lock()
_freq_buffer: deque[float] = deque(maxlen=MEDIAN_SIZE)
_silence_count: int = 0


# ── Music logic ───────────────────────────────────────────────────────────────

def _nearest_note(freq: float) -> str:
    """Return the Western note name (e.g. 'D#3') for the nearest ET semitone."""
    midi_f = 69.0 + 12.0 * math.log2(freq / 440.0)
    midi   = round(midi_f)
    octave = midi // 12 - 1
    return _NOTE_NAMES[midi % 12] + str(octave)


# ── Audio processing thread ───────────────────────────────────────────────────

def _process_audio() -> None:
    global _latest_event, _silence_count

    while True:
        try:
            chunk = _audio_queue.get(timeout=0.1)
        except queue.Empty:
            continue

        freq       = float(_pitch_o(chunk)[0])
        confidence = float(_pitch_o.get_confidence())

        if freq > 0.0 and confidence >= CONFIDENCE_THRESHOLD and MIN_FREQ <= freq <= MAX_FREQ:
            _silence_count = 0
            _freq_buffer.append(freq)

            # Emit as soon as we have any reading — no warmup wait.
            smoothed           = sorted(_freq_buffer)[len(_freq_buffer) // 2]
            note               = _nearest_note(smoothed)
            _, swara, cents_ji = carnatic_engine.nearest_swara(smoothed, carnatic_engine.FREQ_MAP)
            event: dict = {
                "status": "note",
                "note":   note,
                "swara":  swara,
                "cents":  cents_ji,
                "freq":   round(smoothed, 1),
            }
        else:
            _silence_count += 1
            if _silence_count >= SILENCE_HOLD_FRAMES:
                # Sustained silence — clear buffer so the next note starts fresh.
                _freq_buffer.clear()
                event = {"status": "idle"}
            else:
                # Brief dropout (single bad frame, breath noise) — hold last event.
                with _event_lock:
                    event = dict(_latest_event)

        with _event_lock:
            _latest_event = event


def _audio_callback(indata: np.ndarray, frames: int, time_info, status) -> None:
    try:
        _audio_queue.put_nowait(indata[:, 0].astype(np.float32))
    except queue.Full:
        pass  # drop if the processing thread is behind


def _apply_shruti(hz: float) -> None:
    carnatic_engine.set_sa_hz(hz)
    _freq_buffer.clear()  # reset smoothing so next note re-anchors to new shruti


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()

    async def send_loop() -> None:
        while True:
            with _event_lock:
                event = dict(_latest_event)
            await websocket.send_text(json.dumps(event))
            await asyncio.sleep(0.02)

    send_task = asyncio.create_task(send_loop())
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                if msg.get("type") == "set_shruti":
                    _apply_shruti(float(msg["sa_hz"]))
            except (json.JSONDecodeError, KeyError, ValueError):
                pass
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        send_task.cancel()


@app.post("/api/exercise-sessions")
async def save_exercise_session(body: dict) -> dict:
    """Record one completed exercise attempt.

    Body: { "exerciseId": str, "durationSec": float }
    """
    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            "INSERT INTO exercise_sessions (exercise_id, ts, duration_sec) "
            "VALUES (?, ?, ?)",
            (
                str(body["exerciseId"]),
                datetime.datetime.utcnow().isoformat(),
                float(body["durationSec"]),
            ),
        )
    return {"ok": True}


@app.get("/api/exercise-sessions")
async def get_exercise_sessions(
    exerciseId: str = Query(...),
    days: int = Query(default=30, ge=1, le=365),
) -> list[dict]:
    """Return daily-best durations for the given exercise over the last N days."""
    with sqlite3.connect(DB_PATH) as con:
        rows = con.execute(
            """
            SELECT date(ts) AS day, MAX(duration_sec) AS best
            FROM exercise_sessions
            WHERE exercise_id = ?
              AND ts >= date('now', ? || ' days')
            GROUP BY day
            ORDER BY day
            """,
            (exerciseId, f"-{days}"),
        ).fetchall()
    return [{"day": r[0], "best": r[1]} for r in rows]


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
