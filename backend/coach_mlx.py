"""In-process Qwen2.5-Omni via mlx-lm-omni (Apple Silicon — real local inference, no vLLM)."""

from __future__ import annotations

import asyncio
import os
import threading
from typing import Any

import numpy as np

from coach_llm import build_system_prompt

# Qwen Omni audio pipeline commonly uses 16 kHz (see mlx-lm-omni examples).
_TARGET_SR = 16000
_SOURCE_SR = 44100

_lock = threading.Lock()
_model: Any = None
_tokenizer: Any = None


def _resample_linear(mono: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    mono = np.asarray(mono, dtype=np.float32).reshape(-1)
    if orig_sr == target_sr:
        return mono
    if mono.size == 0:
        return mono
    duration = len(mono) / orig_sr
    n_out = max(1, int(duration * target_sr))
    t_orig = np.arange(len(mono), dtype=np.float64) / orig_sr
    t_new = np.linspace(0.0, duration, n_out, endpoint=False)
    return np.interp(t_new, t_orig, mono.astype(np.float64)).astype(np.float32)


def _load_locked() -> None:
    global _model, _tokenizer
    if _model is not None:
        return
    try:
        from mlx_lm_omni import load as mlx_load
    except ImportError as e:
        raise ImportError(
            "mlx_lm_omni is not installed. On Apple Silicon, run:\n"
            "  pip install -r requirements-coach-mlx.txt"
        ) from e

    model_id = os.environ.get("SAPASA_COACH_MLX_MODEL", "").strip()
    if not model_id:
        raise RuntimeError("SAPASA_COACH_MLX_MODEL is empty")

    cfg = os.environ.get("SAPASA_COACH_MLX_MODEL_CONFIG", "").strip()
    if cfg:
        import json

        _model, _tokenizer = mlx_load(model_id, model_config=json.loads(cfg))
    else:
        _model, _tokenizer = mlx_load(model_id)


def get_model() -> tuple[Any, Any]:
    with _lock:
        _load_locked()
    assert _model is not None and _tokenizer is not None
    return _model, _tokenizer


async def run_coach_mlx(mono_44100: np.ndarray, context: dict[str, Any]) -> str:
    """Run Qwen2.5-Omni with system prompt + audio; return text feedback."""
    from mlx_lm_omni import generate as mlx_generate

    system = build_system_prompt(context)
    audio = _resample_linear(mono_44100, _SOURCE_SR, _TARGET_SR)
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                "Listen to this singing clip and respond exactly as instructed "
                "in the system message."
            ),
            "audio": audio,
        },
    ]

    model, tokenizer = get_model()

    def _infer() -> str:
        prompt = tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
        )
        out = mlx_generate(model, tokenizer, prompt=prompt, verbose=False)
        if isinstance(out, str):
            return out.strip()
        return str(out).strip()

    return await asyncio.to_thread(_infer)
