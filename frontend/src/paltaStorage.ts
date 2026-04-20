import { type PaltaConfig, DEFAULT_PALTA_CONFIG } from './paltaConfig'

const STORAGE_KEY = 'sapasa-palta-config-v1'

export function loadPaltaConfig(): PaltaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PALTA_CONFIG }
    const j = JSON.parse(raw) as Partial<PaltaConfig>
    return normalizePaltaConfig(j)
  } catch {
    return { ...DEFAULT_PALTA_CONFIG }
  }
}

export function savePaltaConfig(c: PaltaConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

function normalizePaltaConfig(j: Partial<PaltaConfig>): PaltaConfig {
  const base: PaltaConfig = { ...DEFAULT_PALTA_CONFIG }
  if (typeof j.scaleRagaId === 'string' && j.scaleRagaId) base.scaleRagaId = j.scaleRagaId
  if (typeof j.patternLength === 'number') base.patternLength = clampLen(j.patternLength)
  if (typeof j.offsetMin === 'number') base.offsetMin = j.offsetMin
  if (typeof j.offsetMax === 'number') base.offsetMax = j.offsetMax
  if (typeof j.rootLow === 'number') base.rootLow = j.rootLow
  if (typeof j.rootHigh === 'number') base.rootHigh = j.rootHigh
  if (typeof j.includeDescending === 'boolean') base.includeDescending = j.includeDescending
  if (typeof j.wholePhraseMaxSteps === 'number' && Number.isFinite(j.wholePhraseMaxSteps)) {
    base.wholePhraseMaxSteps = Math.max(0, Math.min(500_000, Math.round(j.wholePhraseMaxSteps)))
  }
  if (Array.isArray(j.offsets) && j.offsets.every(x => typeof x === 'number' && Number.isFinite(x))) {
    base.offsets = j.offsets.map(x => Math.round(x))
  }
  return base
}

function clampLen(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PALTA_CONFIG.patternLength
  return Math.max(1, Math.min(64, Math.round(n)))
}
