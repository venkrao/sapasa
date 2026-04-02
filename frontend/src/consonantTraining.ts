export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export type ConsonantExercise = {
  id: string
  name: string
  instructions: string
  target: string
  duration?: string
  difficulty: DifficultyLevel
  carnaticTip?: string
}

export type ConsonantCategory = {
  id: string
  name: string
  examples: string
  summary: string
  carnaticRelevance: string
  exercises: ConsonantExercise[]
}

export type ThreeRoundDrillRound = {
  number: 1 | 2 | 3
  label: string
  instruction: string
  target: string
}

export type ThreeRoundDrill = {
  name: string
  description: string
  rounds: ThreeRoundDrillRound[]
  completionCue: string
}

export const CORE_PRINCIPLE =
  "Consonants are transitions, not events. The vowel carries the pitch and resonance — the consonant's only job is to get out of the way as fast as possible."

export const THREE_ROUND_DRILL: ThreeRoundDrill = {
  name: 'The Three-Round Drill',
  description:
    'Take any phrase — from Sarali Varisai, from a song, from anything. Sing it three times in sequence without stopping.',
  rounds: [
    {
      number: 1,
      label: 'Pure Aa',
      instruction:
        'Sing the entire phrase on a single open "Aa" vowel. No consonants at all. Establish the pitch, resonance, and breath support in their purest form.',
      target:
        'Notice what the phrase feels like at its most resonant. This is the reference state.',
    },
    {
      number: 2,
      label: 'Hum on M',
      instruction:
        'Sing the same phrase humming on M throughout — lips closed, same pitches, same breath. No consonants, no vowels.',
      target:
        'The resonance in your chest and face should be at least as strong as Round 1. If it drops, the palate is falling on the transition to hum.',
    },
    {
      number: 3,
      label: 'Actual syllables',
      instruction:
        'Sing the phrase with its real lyrics or swara syllables. Consciously try to preserve the resonance and ease from Rounds 1 and 2.',
      target:
        'Round 3 should feel identical to Rounds 1 and 2. The moment it does, consonants are no longer breaking your tone.',
    },
  ],
  completionCue:
    'When Round 3 stops feeling different from Rounds 1 and 2, consonants are no longer breaking your tone. That is the only target.',
}

export const CONSONANT_CATEGORIES: ConsonantCategory[] = [
  {
    id: 'plosives',
    name: 'Plosives',
    examples: 'P, B, T, D, K, G',
    summary: 'Require a complete stop of airflow — they physically interrupt resonance.',
    carnaticRelevance:
      'K and G on upper notes are the most common plosive problem in Carnatic singing. The back-of-tongue contact needed for K/G happens at exactly the same location as the raised soft palate needed for high pitches — the consonant and the resonance space compete.',
    exercises: [
      {
        id: 'plosive-late-placement',
        name: 'Late Placement Drill',
        instructions:
          'Sustain a vowel, then insert the plosive as late as possible before the next vowel.\n\n"aaaaaa-Ba" — not "Ba-aaaaa"\n"aaaaaa-Ga" — not "Ga-aaaaa"\n\nThe consonant should feel like a flick at the end of the vowel, not a gate at the beginning.',
        target: 'The listener should struggle to hear the consonant — the vowel dominates.',
        duration: '5 minutes',
        difficulty: 'beginner',
        carnaticTip:
          'Apply this to "Ga Ma Pa" in Sarali Varisai. The G of "Ga" should arrive at the last possible moment before the "a" vowel sounds.',
      },
      {
        id: 'plosive-on-scale',
        name: 'Plosive on Scale',
        instructions:
          'Sing Sarali Varisai replacing each swara syllable with a single plosive + "aa":\n\nPa-aa  Ba-aa  Ta-aa  Da-aa  Ka-aa  Ga-aa\n\nOne syllable per swara, ascending and descending.',
        target:
          'The plosive must not cause a pitch dip. The note should arrive fully formed immediately after the consonant — not scooped in from below.',
        duration: '3 full runs through Sarali 1',
        difficulty: 'intermediate',
      },
      {
        id: 'plosive-silent',
        name: 'Silent Plosive',
        instructions:
          'Mouth the consonant with zero voicing — just the lip or tongue movement — while the vocal tone continues unbroken underneath. Sing a sustained "aaa" and insert silent B, D, G shapes without pausing the sound.',
        target:
          'Reveals how much airflow interruption you are actually creating vs. how much is truly necessary.',
        duration: '10 repetitions per consonant',
        difficulty: 'intermediate',
      },
    ],
  },

  {
    id: 'nasals',
    name: 'Nasals',
    examples: 'M, N, Ng',
    summary:
      'The only consonants that actively enhance resonance if used correctly — they route sound through the nasal cavity.',
    carnaticRelevance:
      'The "Ma" syllable is used in foundational Carnatic scale practice (Ma-Me-Mi-Mo-Mu) precisely because the M resets lip position before each vowel, preventing accumulated tongue and jaw tension across a long practice session.',
    exercises: [
      {
        id: 'nasal-m-to-vowel',
        name: 'M-to-Vowel Sustain',
        instructions:
          'Hum on M for 4 counts, then open to "Ma" for 4 counts — no gap, no change in resonance.\n\nThe "Ma" should feel like a door opening on a room that was already resonating — not a new sound starting.',
        target:
          'The resonance sensation in your chest and face should be continuous before and after opening. If it drops on the vowel, the palate collapsed.',
        duration: '10 repetitions at different pitches',
        difficulty: 'beginner',
        carnaticTip:
          'This is the single most efficient consonant exercise for Carnatic singers. The M-to-vowel transition is identical to what happens in "Ma Re Ga Ma Pa Da Ni Sa" when sung correctly.',
      },
      {
        id: 'nasal-scale-pattern',
        name: 'Ma-Me-Mi-Mo-Mu Scale Pattern',
        instructions:
          'Sing Sarali Varisai with the syllables Ma-Me-Mi-Mo-Mu cycling across the notes — one syllable per note.\n\nThe M on each note resets lip position before each new vowel shape.',
        target:
          'After 5 minutes, notice whether jaw and tongue tension has accumulated. It should not — the M resets prevent it.',
        duration: '10 minutes, combined with Sarali Varisai 1',
        difficulty: 'beginner',
      },
      {
        id: 'nasal-ng-to-ah',
        name: '"Ng" to "Ah" Lift',
        instructions:
          'Sustain "Ng" (as in "singing") on a pitch, then open to "Ah" without letting the soft palate drop.\n\nThe "Ng" engages both nasal resonance and the palate. The transition to "Ah" should feel like opening a dome — not collapsing it.',
        target:
          'Dual-purpose: consonant transition training + soft palate training in one exercise.',
        duration: '10 repetitions across different pitches',
        difficulty: 'beginner',
      },
    ],
  },

  {
    id: 'fricatives',
    name: 'Fricatives',
    examples: 'S, Sh, V, H, F',
    summary:
      'Bleed air before the vowel begins — depleting breath pressure and causing the following vowel to start weak.',
    carnaticRelevance:
      'The word "Sa" (the tonic swara) starts with a fricative S. A singer with poor fricative control has a microsecond of audible hiss before the swara actually sounds — this is immediately noticeable to a trained teacher.',
    exercises: [
      {
        id: 'fricative-compressed-s',
        name: 'Compressed S Drill',
        instructions:
          'Sing "Sa" on a sustained pitch. Make the S as brief as physically possible — the vowel should dominate absolutely.\n\nIf you have a recording device, record it and listen back. The goal: the S is so brief it barely registers. The ear hears the vowel, not the hiss.',
        target: 'Zero gap between the S and when the full tone begins.',
        duration: '10 repetitions at 3 different pitches',
        difficulty: 'beginner',
        carnaticTip: 'This directly improves the onset of every "Sa" in your varisai practice.',
      },
      {
        id: 'fricative-h-awareness',
        name: 'H Onset Awareness',
        instructions:
          'The H is the most damaging fricative because it has no lip or tongue resistance — it is pure escaping air.\n\nSing "Ha" on different pitches. Feel whether the H drains pressure before the vowel. Then sing "Aa" on the same pitches and compare the pressure you feel on the onset. The "Ha" onset should feel as immediate as the "Aa" onset.',
        target: 'The H becomes the minimum possible gesture — the vowel pressure is waiting behind it.',
        duration: '5 minutes',
        difficulty: 'intermediate',
      },
      {
        id: 'fricative-nasal-substitution',
        name: 'Fricative Substitution',
        instructions:
          'Take any phrase with fricatives and temporarily replace them with their nasal equivalents:\n\n"Sa Ri Ga" → "Ma Ri Nga" → "Sa Ri Ga"\n\nSing the nasal version first to establish full resonance. Then sing the fricative version — try to preserve that same resonance.',
        target:
          'The fricative version should feel identical to the nasal version. If it collapses, the fricative is still bleeding too much air.',
        duration: '5 minutes on any varisai phrase',
        difficulty: 'intermediate',
      },
    ],
  },
]
