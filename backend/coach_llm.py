"""Local OpenAI-compatible client for Qwen2.5-Omni (or mock for plumbing tests)."""

from __future__ import annotations

import base64
import os
from typing import Any

import httpx
import numpy as np

from coach_ring import SAMPLE_RATE, pcm_wav_bytes_mono_float32

DEFAULT_MODEL = "Qwen2.5-Omni-7B"


def _pitch_summary_nl(ctx: dict[str, Any]) -> str:
    items = ctx.get("pitch_summary") or []
    if not items:
        return "No structured pitch summary was provided for this clip."
    lines: list[str] = []
    for it in items[:50]:
        if isinstance(it, dict):
            sw = it.get("swara", "?")
            cents = it.get("cents_deviation", 0)
            dur = it.get("duration_ms", 0)
            lines.append(f"{sw}: ~{cents:.0f} cents, ~{dur:.0f} ms")
        else:
            lines.append(str(it))
    return "; ".join(lines) if lines else "(empty)"


def build_system_prompt(ctx: dict[str, Any]) -> str:
    raga = ctx.get("raga") or "—"
    shruti = ctx.get("shruti_hz")
    shruti_s = f"{float(shruti):.2f}" if shruti is not None else "—"
    kattai = ctx.get("kattai") or "—"
    exercise = ctx.get("exercise") or "—"
    pitch_nl = _pitch_summary_nl(ctx)
    return f"""You are a Carnatic vocal coach assistant integrated into a practice app called SaPaSa.
The student is currently practicing the raga {raga} using shruti Sa = {shruti_s} Hz ({kattai} kattai).
The exercise is: {exercise}.

Pitch summary from the last phrase:
{pitch_nl}

Listen to the audio clip the student just sang and provide brief, constructive feedback.
Focus on: pitch accuracy (especially deviations noted above), breath support, and phrase shape.
Keep your response under 100 words. Be encouraging but specific.
Do not repeat the pitch data back verbatim — interpret it."""


def coach_feedback_mock(
    *,
    clip_duration_s: float,
    buffer_duration_s: float,
    wav_size_bytes: int,
) -> str:
    return (
        f"[Mock coach] Received ~{clip_duration_s:.2f}s of audio "
        f"({wav_size_bytes} bytes WAV). Ring buffer holds ~{buffer_duration_s:.2f}s. "
        "For real inference: on Apple Silicon set SAPASA_COACH_MLX_MODEL and "
        "pip install -r requirements-coach-mlx.txt; elsewhere set "
        "SAPASA_COACH_LLM_BASE_URL to an OpenAI-compatible server (e.g. vLLM)."
    )


async def request_coach_completion(
    *,
    wav_bytes: bytes,
    context: dict[str, Any],
    base_url: str,
    model: str,
    api_key: str | None,
) -> str:
    """Call ``POST {base_url}/chat/completions`` with audio URL + text (vLLM-style)."""
    b64 = base64.standard_b64encode(wav_bytes).decode("ascii")
    data_url = f"data:audio/wav;base64,{b64}"
    system_prompt = build_system_prompt(context)
    user_text = (
        "Listen to the attached clip and respond as instructed in the system message."
    )
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "audio_url", "audio_url": {"url": data_url}},
                    {"type": "text", "text": user_text},
                ],
            },
        ],
    }
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    timeout = httpx.Timeout(120.0, connect=10.0)
    async with httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout) as client:
        r = await client.post("/chat/completions", json=payload, headers=headers)
        r.raise_for_status()
        data = r.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("LLM response missing choices")
    msg = choices[0].get("message") or {}
    content = msg.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()
    raise RuntimeError("LLM response missing text content")


async def run_coach(
    *,
    mono: np.ndarray,
    context: dict[str, Any],
) -> tuple[str, bool]:
    """
    Real inference: (1) mlx-lm-omni in-process on Apple Silicon if
    ``SAPASA_COACH_MLX_MODEL`` is set, (2) else OpenAI-compatible HTTP if
    ``SAPASA_COACH_LLM_BASE_URL`` is set, (3) else mock.

    Returns (text, is_mock).
    """
    wav = pcm_wav_bytes_mono_float32(mono)

    force_mock = os.environ.get("SAPASA_COACH_MOCK", "").strip() in ("1", "true", "yes")
    mlx_model = os.environ.get("SAPASA_COACH_MLX_MODEL", "").strip()
    base_url = os.environ.get("SAPASA_COACH_LLM_BASE_URL", "").strip()

    if force_mock or (not mlx_model and not base_url):
        clip_d = float(len(mono)) / SAMPLE_RATE
        buf_d = float(context.get("_buffer_duration_s") or 0.0)
        return (
            coach_feedback_mock(
                clip_duration_s=clip_d,
                buffer_duration_s=buf_d,
                wav_size_bytes=len(wav),
            ),
            True,
        )

    if mlx_model:
        from coach_mlx import run_coach_mlx

        text = await run_coach_mlx(mono, context)
        return text, False

    model = os.environ.get("SAPASA_COACH_LLM_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    api_key = os.environ.get("SAPASA_COACH_LLM_API_KEY", "").strip() or None
    text = await request_coach_completion(
        wav_bytes=wav,
        context=context,
        base_url=base_url,
        model=model,
        api_key=api_key,
    )
    return text, False
