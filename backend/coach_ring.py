"""Ring buffer of raw mic samples for the AI vocal coach (thread-safe).

Must use the same sample rate as ``main.py`` (pitch server).
"""

from __future__ import annotations

import io
import threading
import wave
from collections import deque

import numpy as np

# Keep in sync with backend/main.py SAMPLE_RATE
SAMPLE_RATE = 44100


class AudioRingBuffer:
    """Stores the last ``max_seconds`` of mono float32 audio in [-1, 1]."""

    def __init__(self, max_seconds: float) -> None:
        self._lock = threading.Lock()
        self._chunks: deque[np.ndarray] = deque()
        self._total = 0
        self._max_samples = max(1, int(SAMPLE_RATE * max_seconds))

    def append(self, chunk: np.ndarray) -> None:
        """Append one block of mono float32 samples."""
        if chunk.size == 0:
            return
        flat = np.asarray(chunk, dtype=np.float32).reshape(-1)
        with self._lock:
            self._chunks.append(flat.copy())
            self._total += len(flat)
            while self._total > self._max_samples and self._chunks:
                old = self._chunks.popleft()
                self._total -= len(old)

    def duration_s(self) -> float:
        with self._lock:
            return self._total / SAMPLE_RATE

    def tail_seconds(self, seconds: float) -> np.ndarray:
        """Return up to ``seconds`` of the most recent audio (float32 mono)."""
        want = max(0, int(SAMPLE_RATE * float(seconds)))
        with self._lock:
            if self._total == 0 or want == 0:
                return np.array([], dtype=np.float32)
            parts = list(self._chunks)
        if not parts:
            return np.array([], dtype=np.float32)
        full = np.concatenate(parts)
        return full[-want:].copy() if len(full) > want else full.copy()


def pcm_wav_bytes_mono_float32(mono: np.ndarray, sample_rate: int = SAMPLE_RATE) -> bytes:
    """Encode mono float32 [-1, 1] as 16-bit PCM WAV."""
    mono = np.clip(np.asarray(mono, dtype=np.float32).reshape(-1), -1.0, 1.0)
    pcm = (mono * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()
