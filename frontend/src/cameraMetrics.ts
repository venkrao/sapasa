// Shared types + helpers for camera posture metrics (Camera Lab + embedded views).

export type LiveMetrics = {
  shoulderElevation: number | null
  shoulderSmoothed: number | null
  shoulderAsymmetry: number | null
  headForward: number | null
  jawOpen: number | null
  mouthRatio: number | null
  shouldersVisible: boolean
  faceVisible: boolean
}

export type ShoulderLevel = 'settled' | 'tension' | 'raised'

export function shoulderLevel(smoothed: number | null): ShoulderLevel | null {
  if (smoothed === null) return null
  if (smoothed < 0.012) return 'settled'
  if (smoothed < 0.038) return 'tension'
  return 'raised'
}

export function elevationPct(smoothed: number | null): number {
  if (smoothed === null) return 0
  return Math.min(100, Math.round((Math.max(0, smoothed) / 0.06) * 100))
}
