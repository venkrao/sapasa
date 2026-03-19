import { swaraHz } from './swaras'

export type SequenceStep = {
  swara: string  // swara key, e.g. 'Sa', 'R1', 'Pa'
  octave: number // octave relative to Sa (0 = madhya, 1 = tara, -1 = mandra)
}

export type ExerciseGroup = {
  // Atomic rendering unit ("gesture"). E.g. Sarali groupSize=1, Janta groupSize=2,
  // Alankara groupSize=3.
  steps: SequenceStep[]
  // If true, renderer draws a visible bar separator after this group.
  beatBoundary?: boolean
  // Optional hint for the renderer: start a new visual line AFTER this group
  // within the same phrase (useful for long tala cycles like alankaram rows).
  lineBreak?: boolean
}

export type ExercisePhrase = {
  // Usually "ascending" / "descending". For non-arc exercises, this can be custom.
  label: string
  // Ordered left-to-right (within the phrase/row), top-to-bottom across phrases.
  groups: ExerciseGroup[]
}

export type ExerciseDefinition = {
  id: string
  label: string
  phrases: ExercisePhrase[]
  // Derived at load time by flattening phrases -> groups -> steps.
  // The matcher reads this timeline; the renderer reads `phrases` only.
  flatSequence: SequenceStep[]
  allowedSwaras: string[] // graph band keys (e.g. "Sa'") for dimming during exercise
}

export type RagaDefinition = {
  id: string
  label: string
  talaLabel: string
  exercises: ExerciseDefinition[]

  // Spec-driven raga identity
  arohanam: SequenceStep[] // ascending (Sa to Sa')
  avarohanam: SequenceStep[] // descending (Sa' to Sa)
  swarasUsed: string[] // unique swara ids used (octave-agnostic)
}

export function deriveFlatSequence(phrases: ExercisePhrase[]): SequenceStep[] {
  return phrases.flatMap(phrase => phrase.groups.flatMap(group => group.steps))
}

/** Target Hz for an exercise step at the given Sa (matches pitch-matching logic). */
export function sequenceStepHz(step: SequenceStep, saHz: number): number {
  return swaraHz(step.swara, saHz, step.octave)
}

