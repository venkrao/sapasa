export type TrainingExercise = {
  name: string
  description: string
  duration?: string
  /** Optional citation for curated exercises */
  sourceLabel?: string
  sourceUrl?: string
  /** Identifies exercises that have a dedicated guided animation. */
  guideId?: string
}

export type VocalOrgan = {
  id: string
  name: string
  emoji: string
  role: string
  whyItMatters: string
  exercises: TrainingExercise[]
  carnaticRelevance: string
}

/** Organs where breath-control essentials are merged into the exercise list (diaphragm + core). */
export const BREATH_ORGAN_IDS = new Set(['diaphragm', 'core'])

export type BreathEssentialItem = {
  title: string
  /** Optional ID linking this item to a guided animation. */
  guideId?: string
  /** Nose only, mouth, or nose + mouth — quick inhale guidance per exercise. */
  inhaleThrough: string
  /** Why this inhale pattern fits the exercise. */
  inhaleWhy: string
  body: string
  sourceLabel: string
  sourceUrl: string
}

/**
 * Curated “if you could only do five” breath exercises — each trains a distinct skill.
 * Prepended to diaphragm and core exercise lists in organ training.
 */
export const BREATH_CONTROL_ESSENTIAL_FIVE: BreathEssentialItem[] = [
  {
    title: 'Belly Breathing Reset (4-in / 4-out)',
    inhaleThrough: 'Nose only',
    inhaleWhy: 'Slow, no rush — trains depth and diaphragm engagement.',
    body: 'Inhale through your nose for 4 counts — belly out, chest still, shoulders down. Exhale for 4 counts, belly back in. This is the non-negotiable foundation. Every other exercise on this list collapses without this one being automatic.',
    sourceLabel: 'K&M Music School',
    sourceUrl: 'https://kandmmusicschool.com/blogs/voice-lessons/15-science-backed-breathing-exercises-to-improve-your-singing-voice/',
  },
  {
    title: 'Sustained “SSS” Hiss',
    inhaleThrough: 'Nose + mouth',
    inhaleWhy: 'You need a full, fast tank of air before the long exhale.',
    body: 'Full diaphragmatic breath in, then release through a steady, thin hiss (“sssss”) for as long as possible. Time it every session — aim to grow from 15 sec to 45+ sec. This is the single most honest test of breath control: the hiss exposes every air leak and pressure inconsistency immediately.',
    guideId: 'sss-hiss',
    sourceLabel: 'School of Rock',
    sourceUrl: 'https://www.schoolofrock.com/resources/vocals/6-easy-effective-breath-exercises-for-singers',
  },
  {
    title: '4-in / 8-out (then extend)',
    inhaleThrough: 'Nose only',
    inhaleWhy: 'The 4-count is slow enough — the nose reinforces calm, measured control.',
    body: 'Inhale for 4 counts, exhale on a sustained “f” or “v” for 8. Then 4-in / 10-out. Then 4-in / 12-out. Progress the ratio over weeks. This trains your abs and diaphragm to regulate — not dump — air, which is the exact mechanism behind long phrases and powerful sustained notes.',
    sourceLabel: 'Theatrefolk',
    sourceUrl: 'https://www.theatrefolk.com/blog/a-simple-breath-control-exercise-for-actors-singers',
  },
  {
    title: 'Staccato “Ha” Pulses',
    inhaleThrough: 'Mouth',
    inhaleWhy: 'Recovery breaths between bursts are too quick for the nose alone.',
    body: 'Take a breath, then fire short, sharp “ha-ha-ha-ha” bursts on a single pitch, each one driven by a quick belly contraction. This builds the fast-twitch engagement reflex your body needs for dynamic, accented, and rhythmic singing. Without it, your support only works on slow, sustained lines.',
    sourceLabel: 'Forbrain',
    sourceUrl: 'https://www.forbrain.com/how-to-sing-better/breathing-exercises/',
  },
  {
    title: 'Singing Through a Straw (SOVT)',
    inhaleThrough: 'Nose + mouth',
    inhaleWhy: 'You need a full breath; with the straw, the lips are already open for a quick top-up.',
    body: 'Hum or sing a simple 5-note scale through a regular drinking straw. The resistance forces your breath to support the sound instead of overpower it — it’s the fastest way to feel what correct breath-to-tone balance actually is. Professionals use this as a daily reset.',
    sourceLabel: 'Singing Revealed',
    sourceUrl: 'https://www.singingrevealed.com/blog/best-vocal-exercises-using-sovts-semi-occluded-vocal-tract',
  },
]

export const BREATH_CONTROL_ESSENTIAL_SUMMARY =
  'These five cover the full breath chain: awareness → capacity → control → power → application. That’s all you ever need.'

function breathEssentialsToExercises(): TrainingExercise[] {
  return BREATH_CONTROL_ESSENTIAL_FIVE.map(item => ({
    name: item.title,
    description: [
      item.body,
      '',
      `Inhale through ${item.inhaleThrough} — ${item.inhaleWhy}`,
    ].join('\n'),
    sourceLabel: item.sourceLabel,
    sourceUrl: item.sourceUrl,
    ...(item.guideId ? { guideId: item.guideId } : {}),
  }))
}

export const VOCAL_ORGANS: VocalOrgan[] = [
  {
    id: 'diaphragm',
    name: 'The Diaphragm',
    emoji: '🫁',
    role: 'A dome-shaped muscle below the lungs — the engine of the voice. It contracts on inhale and releases on exhale, and controlling its release rate directly controls air pressure and phrase sustain.',
    whyItMatters: 'A weak diaphragm leads to shallow breathing, short phrases, and throat strain — the voice runs out of fuel mid-phrase.',
    carnaticRelevance: 'Carnatic music demands long unbroken phrases (especially in kalpana swaras and alapana). Without diaphragmatic control, a singer cannot sustain a note like Pa or N3 through a full avarthanam without audible pressure drops.',
    exercises: [
      ...breathEssentialsToExercises(),
      {
        name: 'Panting with hand on belly',
        description: 'Place one hand flat on your belly button. Pant rapidly like a dog — short, sharp bursts of exhale. Your hand should bounce outward on each exhale. This builds muscle awareness and fast-twitch diaphragm response.',
        duration: '30 seconds, 3 sets',
      },
      {
        name: 'Sustained SSS exhale',
        description: 'Inhale slowly through the nose for 4 counts (belly expands). Then exhale through clenched teeth making a steady "sss" sound for 10–15 counts, keeping the pressure absolutely even. Do not let the "sss" fade or waver.',
        duration: '5 minutes daily',
      },
      {
        name: 'Bhastrika Pranayama (Bellows Breath)',
        description: 'Inhale deeply through the nose, then exhale forcefully engaging the diaphragm. Sets of 20 breaths, gradually increasing speed. A yogic exercise with direct carryover to breath control in fast-paced swaras.',
        duration: '3 sets of 20 breaths',
      },
      {
        name: 'Plank while singing',
        description: 'Hold a forearm plank for 20–30 seconds while singing a sustained Sa. The core engagement during the plank forces the diaphragm to work efficiently — it cannot be lazy when the abs are already engaged.',
        duration: '3 × 20 second holds',
      },
    ],
  },

  {
    id: 'core',
    name: 'Abdominal & Core Muscles',
    emoji: '💪',
    role: 'Act as a pressure regulator — they support the diaphragm and prevent air from dumping out too fast. This is what singers mean by "breath support."',
    whyItMatters: 'Without core engagement, the breath pressure cannot be sustained evenly — singers compensate by pushing from the throat, causing strain and thinning of tone.',
    carnaticRelevance: 'Gamakas (oscillations) in Carnatic music require extremely fine breath pressure control — a slight surge or dip in air pressure makes the gamaka uneven. Core strength makes this micro-regulation possible.',
    exercises: [
      ...breathEssentialsToExercises(),
      {
        name: 'Leg raises with vowel singing',
        description: 'Lie flat on your back. Raise both legs to 45° and hold, while singing a sustained "aaaaah" on Sa. The abdominal tension during the hold should be felt as supporting the tone, not constricting it.',
        duration: '5 repetitions',
      },
      {
        name: 'Crunches on the exhale',
        description: 'Slow crunches where the exhale phase is extended — as you crunch, sing a long "sss" or "vvv" sound. The crunch should compress your air supply; the goal is to keep the sound even despite the physical movement.',
        duration: '3 sets of 10',
      },
      {
        name: 'Seated vowel pressure holds',
        description: 'Sit upright, engage the core as if bracing for a punch, and sing a single vowel ("aa") at a consistent pitch for 15 seconds without the pressure wavering. Use your pitch monitor to verify you are not drifting.',
        duration: '5 × 15 second holds',
      },
    ],
  },

  {
    id: 'vocal-folds',
    name: 'The Vocal Folds',
    emoji: '🎙️',
    role: 'Two small muscle-membranes inside the larynx that vibrate to produce sound. Their closure tightness controls volume and tone; the cricothyroid (CT) muscle stretches them for higher pitches.',
    whyItMatters: 'Too-loose folds give a breathy, weak tone with poor pitch accuracy. Too-tight folds cause strain, cracking, and eventual nodules. Correct closure is the foundation of a healthy, centred tone.',
    carnaticRelevance: 'Every swara in Carnatic music must be sung with a clear, centred onset — not breathy, not pressed. R1 and D1 in Mayamalavagowla in particular require precise fold closure to land cleanly on the narrow pitch target without scooping.',
    exercises: [
      {
        name: 'Lip trills on scales',
        description: 'Press your lips together gently and blow air so the lips vibrate in a "brrr" sound while vocalising. Sing Sarali Varisai on lip trills instead of open vowels. This is a Semi-Occluded Vocal Tract (SOVT) exercise — it reduces fold pressure while maintaining closure, allowing the folds to train without strain.',
        duration: '10 minutes daily',
      },
      {
        name: 'Falsetto "oo" hoots',
        description: 'Sing a gentle, pure "oo" sound in your upper range (falsetto/head voice) — think of an owl hoot. Hold it steady for 5 seconds. This isolates the CT muscle and trains the folds to stretch without gripping.',
        duration: '10 repetitions across different pitches',
      },
      {
        name: 'Straw phonation',
        description: 'Sing into a thin straw (coffee stirrer) — the resistance back-pressure balances fold closure automatically. Hum or sing swaras into the straw. Particularly effective for healing a tired or strained voice.',
        duration: '5 minutes',
      },
      {
        name: 'Bhramari Pranayama (Humming Breath)',
        description: 'Inhale deeply, then hum softly on the exhale with lips closed, creating a steady "mmmm" vibration. Focus on sensing the vibration in the chest and face. Builds fold tone and resonance simultaneously.',
        duration: '5 minutes daily',
      },
    ],
  },

  {
    id: 'soft-palate',
    name: 'The Soft Palate (Velum)',
    emoji: '👄',
    role: 'A fleshy flap at the back of the roof of the mouth — when raised, it opens resonating space and separates the oral from the nasal cavity, giving the voice its "domed," spacious quality.',
    whyItMatters: 'A low or flaccid soft palate produces a nasal, compressed tone. Most beginners have almost no awareness or voluntary control over it at first.',
    carnaticRelevance: 'A raised soft palate is essential for the rich, resonant tone quality expected in Carnatic vocal performances. It also allows the singer to project without forcing — critical for long practice sessions and stage performance.',
    exercises: [
      {
        name: 'Mirror yawn observation',
        description: 'Yawn with your mouth open in front of a mirror. Watch the soft palate lift at the back of your throat. The raised position during a yawn is exactly the position you want during singing. Practice inducing the "pre-yawn" sensation voluntarily without actually yawning.',
        duration: '5 minutes observation + awareness practice',
      },
      {
        name: '"Ng" to "Ah" transitions',
        description: 'Sing a sustained "ng" sound (as in "singing"), then open to a full "ah" without letting the velum drop. The "ng" position keeps the palate engaged; the transition to "ah" should feel like opening a dome, not collapsing it.',
        duration: '10 repetitions at different pitches',
      },
      {
        name: 'Silent inhalation with palate lift',
        description: 'With mouth open, inhale silently and slowly as if trying not to make any sound. The palate naturally rises. Hold for 5 seconds while maintaining the lifted position, then speak or sing a phrase in that state.',
        duration: '5 repetitions',
      },
    ],
  },

  {
    id: 'tongue',
    name: 'The Tongue',
    emoji: '👅',
    role: 'One of the most tension-prone muscles in singing — its position dramatically affects resonance, vowel clarity, and larynx height.',
    whyItMatters: 'A pulled-back or tense tongue chokes the sound and raises the larynx involuntarily, thinning and straining the voice. A forward, relaxed tongue opens the resonating space.',
    carnaticRelevance: 'Carnatic music uses a very wide range of vowel sounds ("aa", "ee", "oo", "ri", "la") across rapid passages. A tense tongue causes vowels to blur into each other and prevents clean articulation of swaras in fast kalpana swara sequences.',
    exercises: [
      {
        name: 'Tongue twisters on pitch',
        description: '"Tadha tadha tadha" and "la-li-la-li" patterns across Sarali Varisai. The repeated tongue-tip contact at the roof of the mouth loosens habitual tongue root tension while staying musically relevant.',
        duration: '5 minutes',
      },
      {
        name: '"Ma-Me-Mi-Mo-Mu" scale patterns',
        description: 'Sing the 5 vowels on each swara of Sarali Varisai — "Ma" on Sa, "Me" on R1, "Mi" on G3 etc. The lip closure on each "M" resets tongue position before each vowel, preventing accumulated tension.',
        duration: '10 minutes combined with Sarali practice',
      },
      {
        name: 'Tongue forward placement drill',
        description: 'Place the tip of your tongue just behind your lower front teeth. Maintain this position while singing open "aa" vowels across the scale. The tongue should stay forward and slightly spread — never pulled back. Check in a mirror.',
        duration: '5 minutes',
      },
      {
        name: 'Tongue stretch and release',
        description: 'Stick the tongue out as far as possible and hold for 5 seconds, then relax. Repeat 10 times before a practice session. Reduces baseline tension in the tongue root and floor of the mouth.',
        duration: '2 minutes pre-practice',
      },
    ],
  },
]
