"""
carnatic_engine.py — Carnatic swara frequency system

Single source of truth for JI ratios, frequency derivation, and swara
identification. No other module should replicate this logic.

Shruti is fixed at D# / Eb for now (SA_HZ = 311.13). When shruti
selection is added, only SA_HZ needs to change here.
"""

from fractions import Fraction
import math

# ── Shruti ────────────────────────────────────────────────────────────────────

SA_HZ: float = 311.13  # D# / Eb  — will become user-selectable in v0.2

# ── JI ratio table (13 unique pitch positions) ────────────────────────────────
# Overlapping pairs (R2=G1, R3=G2, D2=N1, D3=N2) are stored under the Ri/Dha
# key; their display label shows both names separated by " / ".

JI_RATIOS: dict[str, Fraction] = {
    "Sa":  Fraction(1, 1),
    "R1":  Fraction(256, 243),
    "R2":  Fraction(9, 8),      # = G1
    "R3":  Fraction(32, 27),    # = G2
    "G3":  Fraction(5, 4),
    "M1":  Fraction(4, 3),
    "M2":  Fraction(45, 32),
    "Pa":  Fraction(3, 2),
    "D1":  Fraction(128, 81),
    "D2":  Fraction(5, 3),      # = N1
    "D3":  Fraction(16, 9),     # = N2
    "N3":  Fraction(15, 8),
    "Sa'": Fraction(2, 1),
}

SWARA_LABELS: dict[str, str] = {
    "Sa":  "Sa",
    "R1":  "R1",
    "R2":  "R2 / G1",
    "R3":  "R3 / G2",
    "G3":  "G3",
    "M1":  "M1",
    "M2":  "M2",
    "Pa":  "Pa",
    "D1":  "D1",
    "D2":  "D2 / N1",
    "D3":  "D3 / N2",
    "N3":  "N3",
    "Sa'": "Sa'",
}


# ── Core functions ────────────────────────────────────────────────────────────

def swara_hz(swara: str, sa_hz: float, octave: int = 0) -> float:
    """Absolute frequency of a swara given sa_hz and octave displacement."""
    return sa_hz * float(JI_RATIOS[swara]) * (2 ** octave)


def cents_deviation(f_sung: float, f_target: float) -> float:
    return 1200.0 * math.log2(f_sung / f_target)


def build_frequency_map(
    sa_hz: float,
    octaves: range = range(-2, 3),
) -> dict[str, float]:
    """
    Build a flat map of {swara_octave: hz} for all 13 positions across the
    given octave range.  Keys look like "Pa_0", "R2_-1", "Sa'_1".
    """
    return {
        f"{swara}_{oct}": swara_hz(swara, sa_hz, oct)
        for swara in JI_RATIOS
        for oct in octaves
    }


def nearest_swara(
    f_sung: float,
    freq_map: dict[str, float],
) -> tuple[str, str, float]:
    """
    Find the closest swara in freq_map to f_sung.

    Returns (swara_key, display_label, cents_deviation).
    swara_key is like "Pa_0"; display_label is the human-readable name.
    Always returns the nearest — no tolerance filtering, so callers always
    get a result.
    """
    best_key = min(freq_map, key=lambda k: abs(cents_deviation(f_sung, freq_map[k])))
    swara = best_key.rsplit("_", 1)[0]          # "R2_-1" → "R2"
    label = SWARA_LABELS.get(swara, swara)
    cents = cents_deviation(f_sung, freq_map[best_key])
    return best_key, label, round(cents, 1)


# ── Pre-built map for the default shruti ─────────────────────────────────────

FREQ_MAP: dict[str, float] = build_frequency_map(SA_HZ)
