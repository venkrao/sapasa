/** Shared UX microcopy for trust, limits, and recovery — Carnatic Training & Melody Capture. */

export const PRACTICE_UX = {
  pitchServerDisconnected:
    'The pitch server is not reachable. From the project folder run `python main.py` in `backend/` (default WebSocket port 8765). Allow microphone access when prompted.',

  pitchServerReconnecting:
    'Reconnecting to the pitch server… If this lasts more than a few seconds, confirm `python main.py` is running.',

  pitchLimitsSummary:
    'Live pitch uses a fundamental-frequency tracker (YIN). It can briefly lock an octave high/low on some vowels or when speakers bleed into the mic. Loud tanpura or backing audio through speakers makes traces unreliable — use headphones for playback when possible.',

  melodyTimelineHint:
    'Scrubber length follows captured notes on the timeline, not total recording clock time (silence after the last note is usually omitted).',

  melodyModes: {
    raw: {
      label: 'Raw (detector-close)',
      title:
        'Minimal smoothing — closest to what the pitch detector emits. Expect more jitter and octave spikes; useful for debugging.',
    },
    piano_friendly: {
      label: 'Balanced (recommended)',
      title:
        'Smoothed notes suited to piano replay — fewer tiny fragments; still faithful for most melodies.',
    },
    ultra_aggressive: {
      label: 'Fine segmentation (test)',
      title:
        'Splits notes aggressively for dense vocals; may add fragments or octave slips — compare with Balanced.',
    },
    anti_octave_aggressive: {
      label: 'Fewer octave jumps (test)',
      title:
        'Strong octave stabilization for piano replay; may lag slightly on real octave leaps in the song.',
    },
  },

  analysisLowConfidence:
    'Match scores below rely on fewer confident alignments — repeat capture with clearer vocals or slower source if this feels off.',
} as const
