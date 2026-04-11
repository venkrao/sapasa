"""HTTP routes for the AI vocal coach (Phase 1 — plumbing)."""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from coach_llm import run_coach


def _coach_inference_mode() -> str:
    if os.environ.get("SAPASA_COACH_MOCK", "").strip().lower() in ("1", "true", "yes"):
        return "mock"
    if os.environ.get("SAPASA_COACH_MLX_MODEL", "").strip():
        return "mlx"
    if os.environ.get("SAPASA_COACH_LLM_BASE_URL", "").strip():
        return "http"
    return "mock"
from coach_ring import SAMPLE_RATE, AudioRingBuffer

_COACH_RING = AudioRingBuffer(
    max_seconds=float(os.environ.get("SAPASA_COACH_RING_SECONDS", "30"))
)


def coach_ring_append(chunk: Any) -> None:
    """Called from the audio callback with mono float32 samples."""
    _COACH_RING.append(chunk)


class PitchSummaryItem(BaseModel):
    swara: str = ""
    cents_deviation: float = 0.0
    duration_ms: float = 0.0


class CoachContext(BaseModel):
    raga: str = ""
    exercise: str = ""
    shruti_hz: float | None = None
    kattai: str | None = None
    pitch_summary: list[PitchSummaryItem] = Field(default_factory=list)
    session_elapsed_s: float | None = None


class CoachFeedbackRequest(BaseModel):
    clip_seconds: float = Field(default=15.0, ge=0.5, le=60.0)
    context: CoachContext = Field(default_factory=CoachContext)


class CoachFeedbackResponse(BaseModel):
    text: str
    mock: bool = False
    clip_duration_s: float
    buffer_duration_s: float
    sample_rate: int


router = APIRouter(prefix="/coach", tags=["coach"])


@router.get("/health")
async def coach_health() -> dict[str, Any]:
    mode = _coach_inference_mode()
    out: dict[str, Any] = {
        "ok": True,
        "inference": mode,
        "sample_rate_hz": SAMPLE_RATE,
        "ring_max_s": float(os.environ.get("SAPASA_COACH_RING_SECONDS", "30")),
        "buffer_duration_s": round(_COACH_RING.duration_s(), 3),
    }
    if mode == "mlx":
        out["mlx_model"] = os.environ.get("SAPASA_COACH_MLX_MODEL", "").strip()
    elif mode == "http":
        out["llm_base_url"] = os.environ.get("SAPASA_COACH_LLM_BASE_URL", "").strip()
    return out


@router.post("/feedback", response_model=CoachFeedbackResponse)
async def coach_feedback(body: CoachFeedbackRequest) -> CoachFeedbackResponse:
    clip = _COACH_RING.tail_seconds(body.clip_seconds)
    buf_d = _COACH_RING.duration_s()
    if clip.size == 0:
        raise HTTPException(
            status_code=400,
            detail="No audio in the ring buffer yet. Sing for a moment while the "
            "pitch server is running, then try again.",
        )

    ctx = body.context.model_dump()
    ctx["_buffer_duration_s"] = buf_d
    try:
        text, is_mock = await run_coach(mono=clip, context=ctx)
    except httpx.HTTPStatusError as e:  # type: ignore[name-defined]
        raise HTTPException(
            status_code=502,
            detail=f"LLM server returned an error: {e!s}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Coach inference failed: {e!s}",
        ) from e

    clip_d = float(clip.size) / SAMPLE_RATE
    return CoachFeedbackResponse(
        text=text,
        mock=is_mock,
        clip_duration_s=round(clip_d, 4),
        buffer_duration_s=round(buf_d, 4),
        sample_rate=SAMPLE_RATE,
    )
