/** Built-line stats for the Palta editor hint row. */
export type PaltaPhraseStats = {
  /** Groups if there were no repeat cap (full root walk + optional descent). */
  fullGroups: number
  /** Groups actually kept after applying `wholePhraseMaxGroups`. */
  usedGroups: number
  /** Total sung steps in the built line (`usedGroups` × pattern length when groups are uniform). */
  noteCount: number
}

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
   * Max number of stamped pattern repeats in the built line (one repeat = pattern at one root).
   * `0` = no cap. Order is ascending passes first, then descending until the cap is reached.
   */
  wholePhraseMaxGroups: number
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
  wholePhraseMaxGroups: 0,
  offsets: [],
}
