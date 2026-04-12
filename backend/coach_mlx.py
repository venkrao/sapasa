"""In-process Qwen2.5-Omni via mlx-lm-omni (Apple Silicon — real local inference, no vLLM)."""

from __future__ import annotations

import asyncio
import inspect
import os
import threading
from pathlib import Path
from typing import Any

import numpy as np

from coach_llm import build_system_prompt
from coach_logging import log_mlx_coach_request


def _patch_mlx_lm_utils_for_omni() -> None:
    """``mlx-lm-omni`` expects ``get_model_path`` on older ``mlx-lm``; current ``mlx-lm`` uses ``_download`` instead."""
    try:
        import mlx_lm.utils as u
    except ImportError:
        return
    if hasattr(u, "get_model_path"):
        return

    def get_model_path(path_or_hf_repo: str, revision: str | None = None) -> Path:
        # Must return pathlib.Path so callers can use ``path / "config.json"`` (str would break).
        return u._download(path_or_hf_repo, revision=revision)

    u.get_model_path = get_model_path  # type: ignore[attr-defined]


def _patch_mlx_nn_quantize_for_legacy_to_quantized() -> None:
    """Omni models define ``ExtendedEmbedding.to_quantized`` without a ``mode`` arg; current ``mlx.nn.quantize`` always passes ``mode=``."""
    try:
        import mlx.nn as nn
    except ImportError:
        return
    if getattr(nn, "_sapasa_quantize_patched", False):
        return

    from mlx.utils import tree_map_with_path

    _orig = nn.quantize

    def _kwargs_for(method: Any, kwargs: dict[str, Any]) -> dict[str, Any]:
        try:
            sig = inspect.signature(method)
        except (TypeError, ValueError):
            return kwargs
        names = sig.parameters.keys()
        return {k: v for k, v in kwargs.items() if k in names}

    def quantize(
        model: Any,
        group_size: int | None = None,
        bits: int | None = None,
        *,
        mode: str = "affine",
        quantize_input: bool = False,
        class_predicate: Any = None,
    ) -> None:
        class_predicate = class_predicate or (lambda _, m: hasattr(m, "to_quantized"))

        def _maybe_quantize(path: str, m: Any) -> Any:
            if not (bool_or_params := class_predicate(path, m)):
                return m
            if hasattr(m, "to_quantized"):
                if isinstance(bool_or_params, bool):
                    kwargs: dict[str, Any] = {
                        "group_size": group_size,
                        "bits": bits,
                        "mode": mode,
                    }
                    if quantize_input:
                        kwargs["quantize_input"] = quantize_input
                    kwargs = _kwargs_for(m.to_quantized, kwargs)
                    return m.to_quantized(**kwargs)
                if isinstance(bool_or_params, dict):
                    bp = dict(bool_or_params)
                    if ("quantize_input" in bp) and not bp["quantize_input"]:
                        bp.pop("quantize_input")
                    bp = _kwargs_for(m.to_quantized, bp)
                    return m.to_quantized(**bp)
                raise ValueError(
                    "``class_predicate`` must return a bool"
                    " or a dict of parameters to pass to ``to_quantized``"
                )
            raise ValueError(f"Unable to quantize model of type {type(m)}")

        leaves = model.leaf_modules()
        leaves = tree_map_with_path(_maybe_quantize, leaves, is_leaf=nn.Module.is_module)
        model.update_modules(leaves)

    quantize.__doc__ = getattr(_orig, "__doc__", None)
    nn.quantize = quantize  # type: ignore[assignment]
    nn._sapasa_quantize_patched = True  # type: ignore[attr-defined]


_patch_mlx_lm_utils_for_omni()
_patch_mlx_nn_quantize_for_legacy_to_quantized()


def _find_inner_hf_tokenizer(tok: Any) -> Any | None:
    """``TokenizerWithAudio`` wraps the text HF tokenizer — find it for attribute delegation."""
    for attr in (
        "tokenizer",
        "text_tokenizer",
        "_tokenizer",
        "hf_tokenizer",
        "base_tokenizer",
        "inner",
        "_inner",
    ):
        cand = getattr(tok, attr, None)
        if cand is None:
            continue
        if callable(getattr(cand, "get_vocab", None)):
            return cand
        if getattr(cand, "chat_template", None) not in (None, ""):
            return cand
    return None


def _ensure_tokenizer_hf_surface(tok: Any) -> Any:
    """Bridge Omni's wrapper to attrs ``mlx-lm`` expects on the base HF tokenizer (``get_vocab``, ``chat_template``, …)."""
    inner = _find_inner_hf_tokenizer(tok)
    if inner is None:
        return tok

    for name in (
        "get_vocab",
        "vocab_size",
        "model_max_length",
        "eos_token_id",
        "bos_token_id",
        "pad_token_id",
        "unk_token_id",
    ):
        if hasattr(tok, name):
            continue
        if hasattr(inner, name):
            setattr(tok, name, getattr(inner, name))

    ct = getattr(tok, "chat_template", None)
    if (ct is None or ct == "") and getattr(inner, "chat_template", None):
        tok.chat_template = inner.chat_template  # type: ignore[attr-defined]

    return tok


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

    _tokenizer = _ensure_tokenizer_hf_surface(_tokenizer)


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
        log_mlx_coach_request(
            mlx_model=os.environ.get("SAPASA_COACH_MLX_MODEL", "").strip(),
            messages=messages,
            system_prompt=system,
            prompt=prompt,
            audio_16k_samples=int(audio.shape[0]),
        )
        out = mlx_generate(model, tokenizer, prompt=prompt, verbose=False)
        if isinstance(out, str):
            return out.strip()
        return str(out).strip()

    return await asyncio.to_thread(_infer)
