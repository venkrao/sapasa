"""Structured logging for AI coach LLM requests (optional, privacy-aware)."""

from __future__ import annotations

import copy
import json
import logging
import os
from typing import Any

_LOG = logging.getLogger("sapasa.coach")


def coach_log_enabled() -> bool:
    return os.environ.get("SAPASA_COACH_LOG", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def coach_log_full_prompt() -> bool:
    return os.environ.get("SAPASA_COACH_LOG_FULL", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def _ensure_handler() -> None:
    if _LOG.handlers:
        return
    _LOG.setLevel(logging.INFO)
    h = logging.StreamHandler()
    h.setFormatter(
        logging.Formatter("%(asctime)s [sapasa.coach] %(levelname)s: %(message)s")
    )
    _LOG.addHandler(h)
    _LOG.propagate = False


def _truncate(s: str, max_len: int) -> str:
    if len(s) <= max_len:
        return s
    return s[: max_len - 3] + "..."


def _sanitize_payload(obj: Any, wav_bytes_len: int) -> Any:
    if isinstance(obj, list):
        return [_sanitize_payload(x, wav_bytes_len) for x in obj]
    if isinstance(obj, dict):
        if obj.get("type") == "audio_url" and isinstance(obj.get("audio_url"), dict):
            url = obj["audio_url"].get("url", "")
            approx = len(url) if isinstance(url, str) else 0
            return {
                "type": "audio_url",
                "audio_url": {
                    "url": f"<data URL ~{approx} chars from {wav_bytes_len} bytes WAV>",
                },
            }
        return {k: _sanitize_payload(v, wav_bytes_len) for k, v in obj.items()}
    return obj


def log_http_chat_completions_request(
    *,
    base_url: str,
    model: str,
    payload: dict[str, Any],
    wav_bytes_len: int,
) -> None:
    if not coach_log_enabled():
        return
    _ensure_handler()
    safe = _sanitize_payload(copy.deepcopy(payload), wav_bytes_len)
    _LOG.info(
        "HTTP coach POST %s/chat/completions model=%s body=%s",
        base_url.rstrip("/"),
        model,
        json.dumps(safe, ensure_ascii=False),
    )


def log_mlx_coach_request(
    *,
    mlx_model: str,
    messages: list[dict[str, Any]],
    system_prompt: str,
    prompt: str,
    audio_16k_samples: int,
) -> None:
    if not coach_log_enabled():
        return
    _ensure_handler()

    import numpy as np

    safe_msgs: list[dict[str, Any]] = []
    for m in messages:
        m2 = dict(m)
        if "audio" in m2 and m2["audio"] is not None:
            a = m2["audio"]
            if isinstance(a, np.ndarray):
                m2["audio"] = f"<float32 ndarray shape={tuple(a.shape)} len={a.size}>"
            else:
                m2["audio"] = f"<{type(a).__name__}>"
        safe_msgs.append(m2)

    if coach_log_full_prompt():
        sp = system_prompt
        pr = prompt
    else:
        sp = _truncate(system_prompt, 4000)
        pr = _truncate(prompt, 4000)

    _LOG.info(
        "MLX coach model=%s audio_16k_samples=%s messages=%s",
        mlx_model,
        audio_16k_samples,
        json.dumps(safe_msgs, ensure_ascii=False),
    )
    _LOG.info("MLX coach system_prompt (%d chars): %s", len(system_prompt), sp)
    _LOG.info("MLX coach prompt after chat_template (%d chars): %s", len(prompt), pr)
