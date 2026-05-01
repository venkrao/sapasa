import { Piano } from '@tonejs/piano/build/piano/Piano'
import * as Tone from 'tone'

export type TonePreset = 'piano' | 'sine'

/** Options for {@link EarTrainerAudioEngine.playNote}. */
export type PlayNoteOptions = {
  /**
   * When true (default), the returned promise settles after the scheduled note duration (+ release pad).
   * When false, sound is scheduled and the promise resolves immediately — use when the caller already
   * paces beats (e.g. exercise auto-play uses `setTimeout` per BPM).
   */
  waitForTail?: boolean
}

type ActiveHandle = {
  dispose: () => void
  timeoutId: number
}

/**
 * Same velocity→layer mapping as @tonejs/piano `PianoStrings.triggerAttack`
 * (see node_modules/@tonejs/piano/src/piano/Strings.ts).
 */
function pianoStringIndex(velocity: number, layerCount: number): number {
  const scaledVel = ((velocity - 0) / (1 - 0)) * (layerCount - 0.51 - (-0.5)) + (-0.5)
  return Math.max(Math.round(scaledVel), 0)
}

export class EarTrainerAudioEngine {
  private active: ActiveHandle | null = null
  private piano: Piano | null = null
  private pianoLoadPromise: Promise<void> | null = null
  /** Resolves when `playNote` finishes waiting for note duration (cleared early in `stop`). */
  private noteTailResolve: (() => void) | null = null
  private noteTailTimer: ReturnType<typeof setTimeout> | null = null

  async ensureStarted() {
    await Tone.start()
  }

  private finishNoteTailWaitEarly() {
    if (this.noteTailTimer != null) {
      window.clearTimeout(this.noteTailTimer)
      this.noteTailTimer = null
    }
    if (this.noteTailResolve != null) {
      const r = this.noteTailResolve
      this.noteTailResolve = null
      r()
    }
  }

  stop() {
    this.finishNoteTailWaitEarly()
    if (this.active) {
      window.clearTimeout(this.active.timeoutId)
      this.active.dispose()
      this.active = null
    }
    this.piano?.stopAll()
  }

  dispose() {
    this.stop()
    this.piano?.dispose()
    this.piano = null
    this.pianoLoadPromise = null
  }

  /**
   * Schedules a note. By default waits until duration (+ pad) so melody replay can pace by timeline.
   * Pass `{ waitForTail: false }` when the caller controls timing between notes (exercise auto-play).
   */
  async playNote(
    frequencyHz: number,
    durationSec: number,
    timbre: TonePreset,
    opts?: PlayNoteOptions,
  ) {
    await this.ensureStarted()
    this.stop()

    const dur = Math.max(0.08, durationSec)
    const tailPadMs =
      timbre === 'piano'
        ? 480
        : 420 /* matches dispose timeouts in registerActive + small cushion */

    switch (timbre) {
      case 'piano':
        await this.playSalamanderJiPiano(frequencyHz, dur)
        break
      case 'sine':
      default:
        this.playSimpleWave(frequencyHz, dur, -6)
        break
    }

    const waitForTail = opts?.waitForTail !== false
    if (!waitForTail) return

    await new Promise<void>(resolve => {
      this.noteTailResolve = resolve
      this.noteTailTimer = window.setTimeout(() => {
        this.noteTailTimer = null
        this.noteTailResolve = null
        resolve()
      }, Math.ceil(dur * 1000 + tailPadMs))
    })
  }

  async playConfirmTone(correct: boolean, basePitchHz: number) {
    await this.ensureStarted()
    this.stop()

    const freq = correct ? Math.max(1100, basePitchHz * 4) : Math.min(300, Math.max(90, basePitchHz / 3))
    const dur = correct ? 0.12 : 0.16

    const synth = new Tone.Synth({
      oscillator: { type: correct ? 'sine' : 'square' },
      envelope: { attack: 0.004, decay: 0.08, sustain: 0, release: 0.03 },
    })
    const gain = new Tone.Gain(correct ? 0.2 : 0.16).toDestination()
    synth.connect(gain)
    synth.triggerAttackRelease(freq, dur)

    this.registerActive(
      () => {
        synth.dispose()
        gain.dispose()
      },
      dur + 0.2,
    )
  }

  /**
   * Salamander samples via @tonejs/piano, but pitch targets are exact JI Hz.
   * `Piano.keyDown` rounds to MIDI note names; Tone's underlying `Sampler` instead
   * repitches from float MIDI (`ftomf`) — we pass `"${hz}hz"` so playbackRate lands on JI.
   * (The `Piano` class does not expose `detune`; we use the internal string `Sampler`.)
   */
  private async playSalamanderJiPiano(frequencyHz: number, durationSec: number) {
    try {
      const piano = await this.ensurePiano()
      const strings = (piano as unknown as { _strings: { _strings: Array<{ output: Tone.Sampler }> } })
        ._strings
      const layers = strings._strings
      const velocity = 0.85
      const idx = pianoStringIndex(velocity, layers.length)
      const sampler = layers[idx].output
      const pitch = `${frequencyHz}hz` as Tone.Unit.Frequency
      sampler.triggerAttackRelease(pitch, durationSec, Tone.now(), velocity)
      this.registerActive(() => {}, durationSec + 0.45)
    } catch {
      this.playBrightJiTone(frequencyHz, durationSec)
    }
  }

  private async ensurePiano(): Promise<Piano> {
    if (!this.piano) {
      this.piano = new Piano({ velocities: 4, pedal: false, release: true }).toDestination()
      this.pianoLoadPromise = this.piano.load()
    }
    if (this.pianoLoadPromise) {
      await this.pianoLoadPromise
      this.pianoLoadPromise = null
    }
    return this.piano
  }

  private registerActive(dispose: () => void, releaseAfterSec: number) {
    const timeoutId = window.setTimeout(() => {
      dispose()
      this.active = null
    }, Math.ceil(releaseAfterSec * 1000))
    this.active = { dispose, timeoutId }
  }

  private playSimpleWave(
    frequencyHz: number,
    durationSec: number,
    volumeDb: number,
  ) {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      // sustain at 0.75 keeps the note clearly audible through the full duration;
      // 0.12 was nearly silent (-30 dB) and inaudible at short durations
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.75, release: 0.25 },
      volume: volumeDb,
    }).toDestination()
    synth.triggerAttackRelease(frequencyHz, durationSec)

    this.registerActive(() => synth.dispose(), durationSec + 0.4)
  }

  /** Triangle + octave layer at exact JI Hz — fallback if Salamander fails to load. */
  private playBrightJiTone(frequencyHz: number, durationSec: number) {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.008, decay: 0.25, sustain: 0, release: 0.25 },
      volume: -11,
    })
    const lowpass = new Tone.Filter({ type: 'lowpass', frequency: Math.min(2600, frequencyHz * 3.2), Q: 0.7 })
    const gain = new Tone.Gain(0.72).toDestination()
    synth.connect(lowpass)
    lowpass.connect(gain)

    const notes = [frequencyHz, frequencyHz * 2]
    synth.triggerAttackRelease(notes, durationSec)

    this.registerActive(
      () => {
        synth.dispose()
        lowpass.dispose()
        gain.dispose()
      },
      durationSec + 0.35,
    )
  }
}
