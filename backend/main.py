import asyncio
import json
import math
import queue
import threading
from contextlib import asynccontextmanager
from typing import AsyncIterator

import numpy as np
import sounddevice as sd
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from carnatic_engine import FREQ_MAP, nearest_swara

SAMPLE_RATE = 44100
BLOCK_SIZE = 512       # ~11 ms per audio callback
WINDOW_SIZE = 2048     # YIN analysis window (~46 ms)
PROCESS_HOP = 512      # re-run YIN every ~11 ms

CONFIDENCE_THRESHOLD = 0.30
RMS_SILENCE = 0.002    # discard below this amplitude
MIN_FREQ = 80.0        # ~E2 — covers most vocal ranges
MAX_FREQ = 1200.0      # ~D6
EMA_ALPHA = 0.15       # exponential smoothing — lower = smoother but more lag

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

# ── Shared state ──────────────────────────────────────────────────────────────
_rolling_buffer: np.ndarray = np.zeros(WINDOW_SIZE, dtype=np.float32)
_audio_queue: queue.Queue[np.ndarray] = queue.Queue(maxsize=64)
_latest_event: dict = {"status": "idle"}
_event_lock = threading.Lock()
_ema_freq: float | None = None  # smoothed frequency, reset on silence


# ── YIN pitch detector (pure numpy) ──────────────────────────────────────────

def _yin_pitch(
    audio: np.ndarray,
    sr: int,
    min_freq: float = MIN_FREQ,
    max_freq: float = MAX_FREQ,
    threshold: float = 0.15,
) -> tuple[float, float]:
    """Return (frequency_hz, confidence) using the YIN algorithm.

    confidence is 1 − aperiodicity; higher = more certain it's a pitched sound.
    """
    n = len(audio)
    tau_min = max(2, int(sr / max_freq))
    tau_max = min(n // 2, int(sr / min_freq) + 1)
    if tau_max <= tau_min:
        return 0.0, 0.0

    # Step 1 + 2: difference function and cumulative mean normalised difference
    diff = np.empty(tau_max, dtype=np.float64)
    diff[0] = 0.0
    for tau in range(1, tau_max):
        d = audio[: n - tau].astype(np.float64) - audio[tau:].astype(np.float64)
        diff[tau] = float(np.dot(d, d))

    cmnd = np.empty(tau_max, dtype=np.float64)
    cmnd[0] = 1.0
    cumsum = np.cumsum(diff)
    taus = np.arange(tau_max, dtype=np.float64)
    with np.errstate(divide="ignore", invalid="ignore"):
        cmnd[1:] = np.where(
            cumsum[1:] > 0,
            diff[1:] * taus[1:] / cumsum[1:],
            1.0,
        )

    # Step 3: first tau below the absolute threshold
    tau_est = -1
    for tau in range(tau_min, tau_max - 1):
        if cmnd[tau] < threshold:
            while tau + 1 < tau_max and cmnd[tau + 1] < cmnd[tau]:
                tau += 1
            tau_est = tau
            break

    if tau_est == -1:
        tau_est = tau_min + int(np.argmin(cmnd[tau_min:tau_max]))

    # Step 4: parabolic interpolation for sub-sample accuracy
    if 0 < tau_est < tau_max - 1:
        s0, s1, s2 = cmnd[tau_est - 1], cmnd[tau_est], cmnd[tau_est + 1]
        denom = 2.0 * (2.0 * s1 - s2 - s0)
        tau_refined = tau_est + (s2 - s0) / denom if abs(denom) > 1e-9 else tau_est
    else:
        tau_refined = float(tau_est)

    freq = sr / tau_refined if tau_refined > 0 else 0.0
    confidence = max(0.0, 1.0 - float(cmnd[tau_est]))
    return freq, confidence


# ── Music logic ───────────────────────────────────────────────────────────────

def _nearest_note(freq: float) -> str:
    """Return the Western note name (e.g. 'D#3') for the nearest ET semitone."""
    midi_f = 69.0 + 12.0 * math.log2(freq / 440.0)
    midi   = round(midi_f)
    octave = midi // 12 - 1
    return _NOTE_NAMES[midi % 12] + str(octave)


# ── Audio processing thread ───────────────────────────────────────────────────

def _process_audio() -> None:
    global _rolling_buffer, _latest_event, _ema_freq
    samples_since_process = 0

    while True:
        try:
            chunk = _audio_queue.get(timeout=0.1)
        except queue.Empty:
            continue

        n = len(chunk)
        _rolling_buffer = np.roll(_rolling_buffer, -n)
        _rolling_buffer[-n:] = chunk
        samples_since_process += n

        if samples_since_process < PROCESS_HOP:
            continue
        samples_since_process = 0

        rms = float(np.sqrt(np.mean(_rolling_buffer ** 2)))
        if rms < RMS_SILENCE:
            _ema_freq = None
            event: dict = {"status": "idle"}
        else:
            freq, confidence = _yin_pitch(_rolling_buffer, SAMPLE_RATE)
            if confidence >= CONFIDENCE_THRESHOLD and MIN_FREQ <= freq <= MAX_FREQ:
                # Apply EMA smoothing to reduce jitter; reset when a new note starts
                if _ema_freq is None:
                    _ema_freq = freq
                else:
                    _ema_freq = EMA_ALPHA * freq + (1.0 - EMA_ALPHA) * _ema_freq
                note               = _nearest_note(_ema_freq)
                _, swara, cents_ji = nearest_swara(_ema_freq, FREQ_MAP)
                event = {
                    "status": "note",
                    "note":   note,       # nearest Western ET semitone, e.g. "D#3"
                    "swara":  swara,      # nearest Carnatic swarasthana, e.g. "Sa"
                    "cents":  cents_ji,   # deviation from JI target
                    "freq":   round(_ema_freq, 1),
                }
            else:
                _ema_freq = None
                event = {"status": "idle"}

        with _event_lock:
            _latest_event = event


def _audio_callback(indata: np.ndarray, frames: int, time_info, status) -> None:
    try:
        _audio_queue.put_nowait(indata[:, 0].astype(np.float32))
    except queue.Full:
        pass  # drop if the processing thread is behind


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            with _event_lock:
                event = dict(_latest_event)
            await websocket.send_text(json.dumps(event))
            await asyncio.sleep(0.02)
    except (WebSocketDisconnect, Exception):
        pass


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
