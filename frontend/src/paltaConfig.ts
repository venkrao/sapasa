/** User-controlled palta parameters (persisted). Offsets are scale-degree deltas from each root. */
export type PaltaConfig = {
  /** Raga whose arohanam defines the degree ladder (madhya sthayi only). */
  scaleRagaId: string
  /** Number of offsets per stamped group (e.g. 4, 8, 16). */
  patternLength: number
  /** Inclusive range for random offset generation (clamped to scale at runtime). */
  offsetMin: number
  offsetMax: number
  /**
   * Inclusive root indices along the scale (0 = Sa … n−1 = top madhya degree).
   * Values ≥ scale length mean “use full scale” at build time.
   */
  rootLow: number
  rootHigh: number
  includeDescending: boolean
  /**
   * Cap on total notes in the built sequence (asc + optional desc). `0` = no cap (use full root sweep).
   * The sweep is shortened from the top by dropping whole root-groups so groups stay intact.
   */
  wholePhraseMaxSteps: number
  /** Current offset pattern; length should match `patternLength`. */
  offsets: number[]
}

export const DEFAULT_PALTA_CONFIG: PaltaConfig = {
  scaleRagaId: 'mayamalavagowla',
  patternLength: 4,
  offsetMin: 0,
  offsetMax: 96,
  rootLow: 0,
  rootHigh: 96,
  includeDescending: true,
  wholePhraseMaxSteps: 0,
  offsets: [],
}
