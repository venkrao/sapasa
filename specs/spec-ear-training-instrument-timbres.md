# Spec Addendum: Instrument Timbres

## Approach Summary

Each timbre is a self-contained synthesis strategy using the Web Audio API's native nodes. The existing `playSwara(ratio)` function should be refactored into a `playNote(frequencyHz, timbre)` dispatcher that routes to the appropriate synth function.

| Timbre | Technique | Nodes Used |
|---|---|---|
| **Piano-ish** | Additive synthesis + fast decay | Multiple `OscillatorNode`s + `GainNode` |
| **Guitar** | Karplus-Strong algorithm | `AudioBufferSourceNode` + `DelayNode` + `BiquadFilterNode` |
| **Veena** | Additive synthesis + slow drone decay + slight detune | Multiple `OscillatorNode`s + `GainNode` + subtle `DelayNode` |

***

## Piano-ish (Additive Synthesis)

A piano tone is rich in harmonics at attack, then decays quickly with the upper harmonics fading faster than the fundamental. [teropa](https://teropa.info/blog/2016/09/20/additive-synthesis)

**Algorithm:**
1. Spawn 6 `OscillatorNode`s at harmonics `f × [1, 2, 3, 4, 5, 6]`
2. Set each to `sine` waveform
3. Assign amplitude weights per harmonic: `[1.0, 0.6, 0.4, 0.2, 0.1, 0.05]`
4. Each harmonic gets its own `GainNode` with an individual exponential decay — higher harmonics decay faster:
   - Harmonic 1: decay over `duration`
   - Harmonic 2–3: decay over `duration × 0.6`
   - Harmonic 4–6: decay over `duration × 0.3`
5. All gain nodes feed into a master `GainNode` → destination

**Why it works:** The fast death of upper partials mimics the hammer-struck string losing its brightness quickly, leaving a warm fundamental. [stackoverflow](https://stackoverflow.com/questions/15185730/sound-additive-synthesis-any-harmonic-amplitudes)

***

## Guitar (Karplus-Strong)

Karplus-Strong generates a realistic plucked string from a short burst of white noise fed through a feedback delay loop with a low-pass filter. This is fully implementable in the Web Audio API using a `DelayNode`. [luciopaiva](https://luciopaiva.com/karplus/)

**Algorithm:**
1. Create a short `AudioBuffer` filled with `Math.random() * 2 - 1` white noise (length = `sampleRate / frequency` samples)
2. Play it via `AudioBufferSourceNode` with `loop: false`
3. Connect it into a feedback loop: `BufferSource → GainNode(0.98) → DelayNode(1/frequency seconds) → BiquadFilterNode(lowpass, ~2000Hz) → back into the same GainNode`
4. The feedback loop self-sustains and decays naturally
5. A separate master `GainNode` with a slow exponential release cleans up the tail

**Limitation to note:** The Web Audio API `DelayNode` has a minimum delay of ~`128/sampleRate` (~3ms at 44.1kHz), which means frequencies below ~333Hz may not render accurately with this method. For lower shrutis (below C4), fall back to the additive piano synth automatically, or use `AudioWorklet` for full fidelity (out of scope for now). [youtube](https://www.youtube.com/watch?v=-3wJfyBSWNw)

**Nylon vs steel string:** Apply a second `BiquadFilterNode(lowpass, ~800Hz)` after the loop output to roll off highs further — this makes it sound like nylon strings / more veena-adjacent. [luciopaiva](https://luciopaiva.com/karplus/)

***

## Veena-ish (Additive + Drone Character)

The veena has a distinctive buzzy, sustained quality with slow decay and slight inharmonicity. It can be approximated with additive synthesis plus a few tweaks. [reddit](https://www.reddit.com/r/synthesizers/comments/byccdy/building_drone_sounds_in_webaudioapi/)

**Algorithm:**
1. Spawn 5 `OscillatorNode`s at harmonics `f × [1, 2, 3, 4, 5]`
2. Add a very slight detuning to harmonics 2–5 (`detune: ±3–8 cents` randomly) to simulate the natural imperfection of a string
3. Amplitude weights: `[1.0, 0.7, 0.5, 0.35, 0.2]` — more sustain in upper harmonics than piano
4. Add a short `DelayNode` (5–10ms, feedback ~0.15) on the output to simulate the resonance box / kuzhal drone buzz
5. Apply a `BiquadFilterNode(peaking, Q: 5, gain: +6dB)` at around `f × 2.7` to emphasise the characteristic veena mid-bark
6. Long decay: `duration × 1.5` — veena notes ring much longer than piano

***

## Timbre Selector — Update to Existing UI

The current dropdown already has "Piano-ish (filtered)" and "Guitar-ish (filtered)". Replace the current options with these three canonical timbres: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/37454559/603aa84c-cd11-46f6-a658-2fa2a930741f/Screenshot-2026-03-19-at-16.10.07.jpg?AWSAccessKeyId=ASIA2F3EMEYEQNJZY4X2&Signature=W6j1o5hbf%2FhUoBzFexj9hF9d4xI%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEFcaCXVzLWVhc3QtMSJIMEYCIQCCnopv5Wdi0oN3Arqv4GpR299Ikx4igZO4juDBYE%2FxDwIhAOVZWf%2FU%2BYC48YkB0tkz8W8EtyUfMzx4IhWIlJnzDZmsKvMECCAQARoMNjk5NzUzMzA5NzA1Igxyg9qSop5ZjTomdY0q0ARaYCNhnWTfWk5tsBlaoqtcDonKCFbEmLzZia%2BwjoU7vLj18%2Fst5jpWDnxlNg76KhUz9NVxTNH9AX%2FwgGApaMT7%2B0r2N%2BmTaPM8q%2FAe8wyUmTqCXtbnYbOewOJ5TU9IfYuWgSNhHoFeidYWukKAQUndGGIUybRuQ0Wp4e%2F1lvELveLpzpz6dFJW5jOK3Sb6T91ui9KYJgaN0KaO0swWT%2BvYNa%2F90hsk7dZSf3AC%2BNFvxyExtBjCJdEAmIvs%2BJIvIHWX23eQaBOy9P3%2BW7mSioWgPSevahxJV5Cswk1XG5LYSqkSpjt0ap%2BH%2BtU28Un1tlxuwnOpjhZFPlNvCaTPE09Y3WGsCq8%2FAvXrKEzhcf81wUFhzCcuFDJiul8B0tWZI1s%2BtiP5SdL9Tu%2Be5OW4RLpJzSYJwOVRrRqBMMW44rKLK%2BErNiQEax%2BwgMx4PbZakSqclcVQf1I3TXHnpcOEITHXOW5NzbHwCGydtszaSHsZR6bU1VQnQ64%2Bm3X794JOFFh7jshcoHfqgb5S7TY4JqAfzwQ4PpB1NyhVrxOPSwhca6%2Bi5%2Foz3hE4W0r3ALj2lEr8WBWKc5aWpDbYZCqKAo%2F%2BPJSiR0L2JTdNW3QOf1FIW232LZ00kf1w0r6CZOKzC5h9EAs4vZBRrGtBJK8PEUzEDo35Ks2Y4MuBps5l1RtFAnyQ2Z9y398dv0GdLL%2FBi%2FdDGJ8%2F1gm7uvd7WgQY8n3by0mr6AFBUUK9JeieNqZLeqs4tI0Wz73DaxEWZXZHa4NmSDDbeKyRAKqwIfiXA%2BFYMJWU8M0GOpcBzDn%2B4G0BTzuWQ8q6zoSVuRxfHbjTufZm5T5aVoYaJv9d2lmw7g%2Fbbxd0aS5J4cp6zJ5oDhy2aE%2F%2FTJDBP9vEId6rhZd%2BMjEWlOO%2BoFyUA7oqXSXVFw9iXcZWZZPnUitkD%2BJAx2JBL1rs9Gb5uA%2F8cXQ6vLmu2d58FFc4p0stmgFVp9zqbdRrZjxh40ZUZMhvIXSLpHMNPw%3D%3D&Expires=1773933726)

| Option label | Internal key |
|---|---|
| Veena-ish | `veena` |
| Piano-ish | `piano` |
| Guitar-ish | `guitar` |
| Sine (pure) | `sine` |
| Triangle | `triangle` |

Remove "Carnatic (triangle)", "Square", and "Sawtooth" — they are not musically useful for this ear training context and clutter the selector.

***

## Refactor Note for Cursor

The `playSwara` function should be split into:
- `playNote(frequencyHz: number, duration: number, timbre: Timbre, audioCtx: AudioContext)` — pure audio function, no React state
- One named function per timbre: `playPiano()`, `playGuitar()`, `playVeena()`, each with the same signature
