import type { ExerciseGroup } from './exerciseModel'
import { DEFAULT_CUSTOM_MELODY_TEXT, groupsToText } from './customMelodyParse'

export const CUSTOM_MELODY_EXERCISE_ID = '__custom_melody__'

const STORAGE_KEY_V2 = 'sapasa-custom-melody-v2'
const STORAGE_KEY_V1 = 'sapasa-custom-melody-v1'

export function defaultCustomMelodyText(): string {
  return DEFAULT_CUSTOM_MELODY_TEXT
}

function clampOctave(o: number): number {
  if (Number.isFinite(o)) return Math.max(-1, Math.min(1, o))
  return 0
}

export function defaultCustomMelodyGroups(): ExerciseGroup[] {
  return [{ steps: [{ swara: 'Sa', octave: 0 }] }]
}

/** One step per group; splits multi-step groups from legacy data. */
export function normalizeCustomMelodyGroups(groups: ExerciseGroup[]): ExerciseGroup[] {
  const out: ExerciseGroup[] = []
  for (const g of groups) {
    if (!Array.isArray(g.steps) || g.steps.length === 0) continue
    for (let i = 0; i < g.steps.length; i++) {
      const st = g.steps[i]
      out.push({
        steps: [
          {
            swara: st.swara,
            octave: clampOctave(st.octave),
            ...(typeof (st as { displayAs?: string }).displayAs === 'string'
              ? { displayAs: (st as { displayAs: string }).displayAs }
              : {}),
          },
        ],
        beatBoundary: i === g.steps.length - 1 ? g.beatBoundary : false,
        lineBreak: i === g.steps.length - 1 ? g.lineBreak : undefined,
      })
    }
  }
  return out.length > 0 ? out : defaultCustomMelodyGroups()
}

function isValidGroup(g: unknown): g is ExerciseGroup {
  if (!g || typeof g !== 'object') return false
  const steps = (g as ExerciseGroup).steps
  if (!Array.isArray(steps) || steps.length === 0) return false
  for (const st of steps) {
    if (!st || typeof st !== 'object') return false
    if (typeof (st as { swara?: string }).swara !== 'string') return false
    if (typeof (st as { octave?: number }).octave !== 'number') return false
  }
  return true
}

export function loadCustomMelodyText(): string {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY_V2)
    if (v2 !== null && v2.trim() !== '') return v2

    const v1 = localStorage.getItem(STORAGE_KEY_V1)
    if (v1) {
      const parsed = JSON.parse(v1) as unknown
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidGroup)) {
        const text = groupsToText(normalizeCustomMelodyGroups(parsed as ExerciseGroup[]))
        try {
          localStorage.setItem(STORAGE_KEY_V2, text)
        } catch {
          /* ignore */
        }
        return text
      }
    }
  } catch {
    /* ignore */
  }
  return defaultCustomMelodyText()
}

export function saveCustomMelodyText(text: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_V2, text)
  } catch {
    /* quota / private mode */
  }
}
