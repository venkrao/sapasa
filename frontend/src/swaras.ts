/**
 * swaras.ts — Carnatic swara frequency system (frontend mirror of carnatic_engine.py)
 *
 * All swara frequencies are derived from SA_HZ using just intonation ratios.
 * When shruti selection is added, only SA_HZ needs to change.
 */

export const SA_HZ = 311.13 // D# / Eb

// 13 unique pitch positions (overlapping pairs stored under the Ri/Dha key)
export const JI_RATIOS: Record<string, [number, number]> = {
  "Sa":  [1, 1],
  "R1":  [256, 243],
  "R2":  [9, 8],       // = G1
  "R3":  [32, 27],     // = G2
  "G3":  [5, 4],
  "M1":  [4, 3],
  "M2":  [45, 32],
  "Pa":  [3, 2],
  "D1":  [128, 81],
  "D2":  [5, 3],       // = N1
  "D3":  [16, 9],      // = N2
  "N3":  [15, 8],
  "Sa'": [2, 1],
}

export const SWARA_LABELS: Record<string, string> = {
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

// Colour groups: Sa/Sa'=green, Pa=blue, Ri+Ga=orange, Ma=yellow, Dha+Ni=purple
export const SWARA_COLORS: Record<string, string> = {
  "Sa":  "#4ade80",
  "R1":  "#fb923c",
  "R2":  "#fb923c",
  "R3":  "#fb923c",
  "G3":  "#fb923c",
  "M1":  "#facc15",
  "M2":  "#facc15",
  "Pa":  "#60a5fa",
  "D1":  "#a78bfa",
  "D2":  "#a78bfa",
  "D3":  "#a78bfa",
  "N3":  "#a78bfa",
  "Sa'": "#4ade80",
}

export type SwaraBand = {
  swara: string
  label: string
  freq:  number
  color: string
}

export function swaraHz(swara: string, saHz: number, octave = 0): number {
  const [num, den] = JI_RATIOS[swara]
  return saHz * (num / den) * Math.pow(2, octave)
}

/** All octave repetitions of every swara visible within [minFreq, maxFreq]. */
export function buildSwaraBands(
  saHz: number,
  minFreq: number,
  maxFreq: number,
): SwaraBand[] {
  const bands: SwaraBand[] = []
  for (const [swara, [num, den]] of Object.entries(JI_RATIOS)) {
    for (const oct of [-3, -2, -1, 0, 1, 2, 3]) {
      const f = saHz * (num / den) * Math.pow(2, oct)
      if (f >= minFreq && f <= maxFreq) {
        bands.push({ swara, label: SWARA_LABELS[swara], freq: f, color: SWARA_COLORS[swara] })
      }
    }
  }
  return bands
}

/** Cents distance from freq to the nearest JI swara in the supplied bands. */
export function nearestSwaraCents(freq: number, bands: SwaraBand[]): number {
  let min = Infinity
  for (const b of bands) {
    const c = Math.abs(1200 * Math.log2(freq / b.freq))
    if (c < min) min = c
  }
  return min
}
