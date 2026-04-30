export type MelodyFrame = {
  tMs: number
  freq: number | null
}

export type MelodyNoteEvent = {
  startMs: number
  endMs: number
  durMs: number
  freqHz: number
  midi: number
  velocity: number
}

export type MelodyExtractConfig = {
  minNoteMs: number
  endSilenceMs: number
  minFreqHz: number
  maxFreqHz: number
}

export const DEFAULT_MELODY_EXTRACT_CONFIG: MelodyExtractConfig = {
  minNoteMs: 90,
  endSilenceMs: 140,
  minFreqHz: 80,
  maxFreqHz: 1200,
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function hzToMidi(hz: number): number {
  const midi = 69 + 12 * Math.log2(hz / 440)
  return Math.max(21, Math.min(108, Math.round(midi)))
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function extractMelodyNoteEvents(
  frames: MelodyFrame[],
  cfg: MelodyExtractConfig = DEFAULT_MELODY_EXTRACT_CONFIG,
): MelodyNoteEvent[] {
  if (frames.length === 0) return []
  const events: MelodyNoteEvent[] = []

  let runStartT: number | null = null
  let lastVoicedT: number | null = null
  let voicedFreqs: number[] = []
  const baseT = frames[0].tMs

  const closeRun = () => {
    if (runStartT == null || lastVoicedT == null || voicedFreqs.length === 0) return
    const durMs = lastVoicedT - runStartT
    if (durMs >= cfg.minNoteMs) {
      const freqHz = median(voicedFreqs)
      const midi = hzToMidi(freqHz)
      events.push({
        startMs: Math.max(0, runStartT - baseT),
        endMs: Math.max(0, lastVoicedT - baseT),
        durMs,
        freqHz,
        midi,
        velocity: 0.72,
      })
    }
    runStartT = null
    lastVoicedT = null
    voicedFreqs = []
  }

  for (const frame of frames) {
    const voiced = frame.freq != null && frame.freq >= cfg.minFreqHz && frame.freq <= cfg.maxFreqHz
    if (voiced) {
      if (runStartT == null) runStartT = frame.tMs
      lastVoicedT = frame.tMs
      voicedFreqs.push(frame.freq!)
      continue
    }
    if (runStartT != null && lastVoicedT != null && frame.tMs - lastVoicedT > cfg.endSilenceMs) {
      closeRun()
    }
  }

  closeRun()
  return events
}

