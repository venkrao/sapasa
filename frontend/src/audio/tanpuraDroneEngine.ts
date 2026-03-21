import * as Tone from 'tone'

/** Fixed tempo for the rolling pluck pattern (spec). */
export const TANPURA_DRONE_BPM = 40

/** Time between plucks in the cycle (quarter @ DRONE_BPM ≈ 1.5s). */
const STEP_SUBDIV = '4n'

/**
 * Note length per trigger — half note so voices overlap the next pluck
 * at quarter-note spacing (continuous wash).
 */
const NOTE_LEN = '2n'

export function tanpuraDroneFreqs(saHz: number, includePa: boolean): number[] {
  const low = saHz
  const high = saHz * 2
  const pa = saHz * (3 / 2)
  if (includePa) return [low, pa, high]
  return [low, high]
}

/**
 * Rolling JI drone (low Sa — Pa — high Sa) for pitch practice.
 * Uses Tone.Transport for timing; does not call Transport.stop() on drone
 * stop so other features can share the clock later.
 */
export class TanpuraDroneEngine {
  private synth: Tone.PolySynth<Tone.Synth> | null = null
  private reverb: Tone.Reverb | null = null
  private gain: Tone.Gain | null = null
  private sequence: Tone.Sequence | null = null
  private running = false

  private saHz = 261.63
  private includePa = true

  get isRunning(): boolean {
    return this.running
  }

  private async ensureChain(volumeDb: number) {
    if (this.synth) {
      this.applyVolumeDb(volumeDb)
      return
    }

    const reverb = new Tone.Reverb({ decay: 3, wet: 0.38 })
    await reverb.generate()

    const gain = new Tone.Gain(Tone.dbToGain(clampDb(volumeDb)))
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.65, decay: 0.32, sustain: 0.88, release: 2.4 },
      volume: -5,
    })
    synth.connect(gain)
    gain.connect(reverb)
    reverb.toDestination()

    this.synth = synth
    this.gain = gain
    this.reverb = reverb
  }

  private rebuildSequence() {
    if (this.sequence) {
      this.sequence.stop(0)
      this.sequence.dispose()
      this.sequence = null
    }
    if (!this.running || !this.synth) return

    const freqs = tanpuraDroneFreqs(this.saHz, this.includePa)
    const synth = this.synth

    this.sequence = new Tone.Sequence(
      (time, freq) => {
        if (typeof freq === 'number') synth.triggerAttackRelease(freq, NOTE_LEN, time)
      },
      freqs,
      STEP_SUBDIV,
    )
    this.sequence.loop = true
    this.sequence.start(0)
  }

  /**
   * Start or restart the drone (must run from a user gesture for Tone.start()).
   */
  async start(saHz: number, includePa: boolean, volumeDb: number) {
    await Tone.start()
    Tone.getTransport().bpm.value = TANPURA_DRONE_BPM

    this.saHz = saHz
    this.includePa = includePa
    this.running = true

    await this.ensureChain(volumeDb)
    this.rebuildSequence()

    if (Tone.getTransport().state !== 'started') Tone.getTransport().start()
  }

  stop() {
    this.running = false
    if (this.sequence) {
      this.sequence.stop(0)
      this.sequence.dispose()
      this.sequence = null
    }
    this.synth?.releaseAll()
  }

  dispose() {
    this.stop()
    this.synth?.dispose()
    this.reverb?.dispose()
    this.gain?.dispose()
    this.synth = null
    this.reverb = null
    this.gain = null
  }

  /** Re-tie strings to a new Sa while the drone is on (shruti change). */
  updateShruti(saHz: number) {
    this.saHz = saHz
    if (this.running) this.rebuildSequence()
  }

  updateIncludePa(includePa: boolean) {
    this.includePa = includePa
    if (this.running) this.rebuildSequence()
  }

  setVolumeDb(db: number) {
    this.applyVolumeDb(db)
  }

  private applyVolumeDb(db: number) {
    if (!this.gain) return
    this.gain.gain.value = Tone.dbToGain(clampDb(db))
  }
}

function clampDb(db: number): number {
  return Math.max(-20, Math.min(0, db))
}
