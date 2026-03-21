import { Piano } from '@tonejs/piano/build/piano/Piano'
import * as Tone from 'tone'

export type TonePreset = 'piano' | 'guitar' | 'sine' | 'triangle'

type ActiveHandle = {
  dispose: () => void
  timeoutId: number
}

export class EarTrainerAudioEngine {
  private active: ActiveHandle | null = null
  private piano: Piano | null = null
  private pianoLoadPromise: Promise<void> | null = null

  async ensureStarted() {
    await Tone.start()
  }

  stop() {
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

  async playNote(frequencyHz: number, durationSec: number, timbre: TonePreset) {
    await this.ensureStarted()
    this.stop()

    const dur = Math.max(0.08, durationSec)

    switch (timbre) {
      case 'guitar':
        this.playGuitar(frequencyHz, dur)
        return
      case 'piano':
        await this.playPiano(frequencyHz, dur)
        return
      case 'sine':
        this.playSimpleWave(frequencyHz, dur, 'sine', -12)
        return
      case 'triangle':
      default:
        this.playSimpleWave(frequencyHz, dur, 'triangle', -10)
        return
    }
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
    oscillatorType: 'sine' | 'triangle',
    volumeDb: number,
  ) {
    const synth = new Tone.Synth({
      oscillator: { type: oscillatorType },
      envelope: { attack: 0.02, decay: 0.14, sustain: 0.12, release: 0.2 },
      volume: volumeDb,
    }).toDestination()
    synth.triggerAttackRelease(frequencyHz, durationSec)

    this.registerActive(() => synth.dispose(), durationSec + 0.3)
  }

  private async playPiano(frequencyHz: number, durationSec: number) {
    try {
      const piano = await this.ensurePiano()
      const midi = this.frequencyToMidi(frequencyHz)
      piano.keyDown({ midi, velocity: 0.9 })

      this.registerActive(() => {
        piano.keyUp({ midi })
      }, durationSec + 0.15)
      return
    } catch {
      // Fallback keeps behavior intact if the external sampler fails at runtime.
      this.playPianoFallback(frequencyHz, durationSec)
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

  private frequencyToMidi(frequencyHz: number): number {
    const raw = 69 + 12 * Math.log2(frequencyHz / 440)
    return Math.max(21, Math.min(108, Math.round(raw)))
  }

  private playPianoFallback(frequencyHz: number, durationSec: number) {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.008, decay: 0.25, sustain: 0, release: 0.25 },
      volume: -11,
    })
    const lowpass = new Tone.Filter({ type: 'lowpass', frequency: Math.min(2600, frequencyHz * 3.2), Q: 0.7 })
    const gain = new Tone.Gain(0.72).toDestination()
    synth.connect(lowpass)
    lowpass.connect(gain)

    // Add a light octave layer to mimic brighter piano hammer harmonics.
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

  private playGuitar(frequencyHz: number, durationSec: number) {
    const pluck = new Tone.PluckSynth({
      attackNoise: 0.7,
      dampening: Math.min(4200, Math.max(1600, frequencyHz * 5.8)),
      resonance: 0.8,
      volume: -10,
    })
    const lowpass = new Tone.Filter({ type: 'lowpass', frequency: Math.min(2300, Math.max(1000, frequencyHz * 3.1)), Q: 0.65 })
    const gain = new Tone.Gain(0.68).toDestination()
    pluck.connect(lowpass)
    lowpass.connect(gain)

    pluck.triggerAttack(frequencyHz)

    // Fade output to avoid abrupt ring artifacts.
    const now = Tone.now()
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(0.68, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 1.05)

    this.registerActive(
      () => {
        pluck.dispose()
        lowpass.dispose()
        gain.dispose()
      },
      durationSec * 1.2 + 0.3,
    )
  }
}

