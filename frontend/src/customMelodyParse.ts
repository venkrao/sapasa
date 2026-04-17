import type { ExerciseGroup, SequenceStep } from './exerciseModel'
import { JI_RATIOS } from './swaras'

/** JI keys except Sa′ — tara Sa is written Sa′ in text and stored as Sa + octave. */
const SWARA_IDS = Object.keys(JI_RATIOS).filter(k => k !== "Sa'")

/** Ascending order for UI buttons (matches common practice). */
export const MELODY_SWARA_BUTTON_ORDER = [
  'Sa',
  'R1',
  'R2',
  'R3',
  'G3',
  'M1',
  'M2',
  'Pa',
  'D1',
  'D2',
  'D3',
  'N3',
] as const

const SWARA_BY_LOWER = new Map<string, string>(
  SWARA_IDS.map(id => [id.toLowerCase(), id]),
)

function clampOctave(o: number): number {
  if (!Number.isFinite(o)) return 0
  return Math.max(-1, Math.min(1, o))
}

/** Parse trailing octave marks: ′ tara, ′ mandra (comma). Applied right-to-left. */
function parseOctaveSuffix(raw: string): { base: string; octave: number } {
  let i = raw.length
  let octave = 0
  while (i > 0) {
    const c = raw[i - 1]
    if (c === "'" || c === '\u2019') {
      octave += 1
      i -= 1
      continue
    }
    if (c === ',') {
      octave -= 1
      i -= 1
      continue
    }
    break
  }
  const base = raw.slice(0, i).trim()
  return { base, octave: clampOctave(octave) }
}

function parseNoteToken(word: string, wordIndex: number): { ok: true; step: SequenceStep } | { ok: false; error: string } {
  const w = word.trim()
  if (!w) return { ok: false, error: 'Empty note token' }

  const { base, octave } = parseOctaveSuffix(w)
  if (!base) return { ok: false, error: `Invalid note “${word}” (token ${wordIndex + 1})` }

  const canon = SWARA_BY_LOWER.get(base.toLowerCase())
  if (!canon) {
    return {
      ok: false,
      error: `Unknown swara “${base}”. Use Sa, R1, G3, M1, Pa, D1, N3, … (see hint below).`,
    }
  }

  return { ok: true, step: { swara: canon, octave } }
}

export type ParseCustomMelodyResult =
  | { ok: true; groups: ExerciseGroup[] }
  | { ok: false; error: string }

/**
 * Whitespace-separated swaras; `|` draws a bar after the previous note (same as beatBoundary in exercises).
 * Octave: append ′ for tara, comma for mandra (e.g. Sa′, Sa,).
 */
function tokenizeMelody(input: string): Array<'|' | string> {
  const out: Array<'|' | string> = []
  const segments = input.split('|')
  for (let i = 0; i < segments.length; i++) {
    const words = segments[i].trim().split(/\s+/).filter(Boolean)
    out.push(...words)
    if (i < segments.length - 1) out.push('|')
  }
  return out
}

export function parseCustomMelodyText(input: string): ParseCustomMelodyResult {
  const s = input.trim()
  if (!s) return { ok: false, error: 'Enter at least one note.' }

  const tokens = tokenizeMelody(s)
  const groups: ExerciseGroup[] = []
  let noteIndex = 0
  for (const token of tokens) {
    if (token === '|') {
      if (groups.length > 0) groups[groups.length - 1].beatBoundary = true
      continue
    }
    const parsed = parseNoteToken(token, noteIndex)
    if (!parsed.ok) return parsed
    groups.push({ steps: [parsed.step] })
    noteIndex += 1
  }

  if (groups.length === 0) return { ok: false, error: 'No notes found — add swaras separated by spaces.' }

  return { ok: true, groups }
}

/** Encode one step the same way as `groupsToText` (for button builder). */
export function sequenceStepToMelodyToken(step: SequenceStep): string {
  let o = step.octave
  let suf = ''
  while (o > 0) {
    suf += "'"
    o -= 1
  }
  while (o < 0) {
    suf += ','
    o += 1
  }
  return step.swara + suf
}

export function appendNoteToMelodyText(text: string, step: SequenceStep): string {
  const token = sequenceStepToMelodyToken(step)
  const t = text.trim()
  return t ? `${t} ${token}` : token
}

/** Inserts `|` so the bar follows the last note (same as typing ` |`). */
export function appendBarToMelodyText(text: string): string {
  const t = text.trim()
  if (!t) return t
  return `${t} |`
}

export function removeLastMelodyGroup(text: string): string {
  const s = text.trim()
  if (!s) return 'Sa'
  const r = parseCustomMelodyText(s)
  if (!r.ok) return text
  if (r.groups.length <= 1) return 'Sa'
  return groupsToText(r.groups.slice(0, -1))
}

export const DEFAULT_CUSTOM_MELODY_TEXT = 'Sa'

/** Round-trip for storage / migration (one step per group). */
export function groupsToText(groups: ExerciseGroup[]): string {
  const pieces: string[] = []
  for (const g of groups) {
    const st = g.steps[0]
    if (!st) continue
    let o = st.octave
    let suf = ''
    while (o > 0) {
      suf += "'"
      o -= 1
    }
    while (o < 0) {
      suf += ','
      o += 1
    }
    pieces.push(st.swara + suf)
    if (g.beatBoundary) pieces.push('|')
  }
  return pieces.join(' ')
}
