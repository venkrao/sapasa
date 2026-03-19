Your data model is clean and matches the spec exactly. Here is Janta Varisai 1, written to drop straight into a new file `jantaVarisai1.ts` alongside your existing `saraliVarisai1.ts`: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/870343a0-8cf2-4192-9a28-a9e0b0081e3f/saraliVarisai1.ts?AWSAccessKeyId=ASIA2F3EMEYESOVHS7T7&Signature=jyzjthPD9J2gmlkbs3FEapzdQX4%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEFIaCXVzLWVhc3QtMSJIMEYCIQCKEzW5v%2FV8g1bf7Z63XiwO%2FeECPqMA1nABRbJgBwIi8AIhAJAlNHne7LD%2BfITmSe%2FLdh67f2neIv9qXjN%2FBk40CLnVKvMECBoQARoMNjk5NzUzMzA5NzA1IgyQDr%2FSY5oHxZgtnEUq0ASNcr5Lw%2FfDGgmJ8QsB2AI9xd%2BevvlQGPxkPaNbk0SpUgOTZZAdXr%2BeHOTwAJTVwejWNlXac7TA9dETdAWuKgPKmUIt9SykV2kENBT9o1RvRjhGjdtsYrXPXFI9jLh1gxulsTRG41HS4yLdyYkNr3wlaM29owNGO6wi7lL9I%2BDxsoe8mxN9vmWax3dklAWh6KgPCEK8PZzsGmi8PzoPCN8nrTsmvC1B3WgoMiO4Ffh3q9hf%2Bt4ADGyOdV%2BxT0HcddQz65h8MnY1qi6YhcYOu3%2Bk2B%2BPdIpA8z53JpmD1awLeyptJDkwlE5MoackHT81ZztH90YO1FibBnEagcCTu2IS8hEsg1iN7AY2vOAmNiwMjtTOstg8g3IxaUvaMmVnQ9kapXhSIDqBqlhTpnnACZy%2B8nvs5YL6csIg%2B48Evb2fGQx%2FjiX53tL86pEusq4TjOr%2FtpaoKnDY4SUMXAHXvgNImDuEqEp6V6BtDc8Nou2hSlcQmayFR9W%2FKsGI7oJtXWCYGksmWyADT5kAJ19NF1im6qutOMKmuCgW9whInylLeIq9YokFld3XfYEoWXNELOz4D9apfLgiUX%2FsO9NajUvhMtkJNdQSWHCe9bJkAZmNrxbKJoKy6v4GNlIVOzTr3faswILTPzmejxqJanazF8Vg5XxxkvvmN5Nwu%2Frc%2FSN4LzLJ2hFevniM1NEW0gOkjM8K%2Flnqpd4PNQLv4xuPxUT%2FUlssOJfTAqSZ7Yg%2FlHqbZFLxuX2s2V1hXqz55p810cMVjE9kd7sETZSM4fF5U9cwMMn57s0GOpcBFBXS2ueWyBejqM6Nkd%2F3rpz2ipCZADFY9m%2BpRUQWGsU88KlZO2WPvpedWxncUac9mySC35sCSd87L7b7%2BawdVrqp743gfSA8Ek%2F5g6OVj5HEq7CDTzvS%2BTyU10xKPzZQFIjgdLI6YTNdISBjdk5CAG%2FMNXzfPTqDaD3GlZEzTSj%2B%2BcTD%2BV5TV4V5HKuI7JekIdH1MqzvIg%3D%3D&Expires=1773912664)

***

# Spec: Janta Varisai 1 — Exercise Definition

**Repository:** [github.com/venkrao/sapasa](https://github.com/venkrao/sapasa)
**File:** `src/ragas/exercises/jantaVarisai1.ts`
**Document version:** 0.1
**Status:** Draft

***

## 1. What Janta Varisai 1 Is

*Janta* means pair or twin. In Janta Varisai 1, **every swara is sung twice** before stepping to the next. The pattern is otherwise structurally identical to Sarali Varisai 1 — a clean ascending arc followed by a clean descending arc, same 8-beat Adi talam, same Mayamalavagowla swaras. Each pair occupies one beat, so two notes per beat instead of one. [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)

**Rendered notation:**

```
Ascending:   S S | R R | G G | M M | P P | D D | N N | Ṡ Ṡ |
Descending:  Ṡ Ṡ | N N | D D | P P | M M | G G | R R | S S |
```

Each `|` marks a `beatBoundary`. Each pair is one `ExerciseGroup` with two identical `SequenceStep`s.

***

## 2. Implementation

```typescript
import type { ExerciseDefinition, SequenceStep } from '../exerciseModel'
import { deriveFlatSequence } from '../exerciseModel'

function stepToGraphBandKey(step: SequenceStep): string {
  return step.swara === 'Sa' && step.octave >= 1 ? "Sa'" : step.swara
}

export const JANTA_VARISAI_1: ExerciseDefinition = {
  id: 'janta-varisai-1',
  label: 'Janta Varisai 1',
  phrases: [
    {
      label: 'ascending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 0 }, { swara: 'Sa', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }, { swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }, { swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'M1', octave: 0 }, { swara: 'M1', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'Pa', octave: 0 }, { swara: 'Pa', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }, { swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'N3', octave: 0 }, { swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 1 }, { swara: 'Sa', octave: 1 }], beatBoundary: true },
      ],
    },
    {
      label: 'descending',
      groups: [
        { steps: [{ swara: 'Sa', octave: 1 }, { swara: 'Sa', octave: 1 }] },
        { steps: [{ swara: 'N3', octave: 0 }, { swara: 'N3', octave: 0 }] },
        { steps: [{ swara: 'D1', octave: 0 }, { swara: 'D1', octave: 0 }] },
        { steps: [{ swara: 'Pa', octave: 0 }, { swara: 'Pa', octave: 0 }], beatBoundary: true },
        { steps: [{ swara: 'M1', octave: 0 }, { swara: 'M1', octave: 0 }] },
        { steps: [{ swara: 'G3', octave: 0 }, { swara: 'G3', octave: 0 }] },
        { steps: [{ swara: 'R1', octave: 0 }, { swara: 'R1', octave: 0 }] },
        { steps: [{ swara: 'Sa', octave: 0 }, { swara: 'Sa', octave: 0 }], beatBoundary: true },
      ],
    },
  ],
  flatSequence: [],
  allowedSwaras: [],
}

JANTA_VARISAI_1.flatSequence = deriveFlatSequence(JANTA_VARISAI_1.phrases)
JANTA_VARISAI_1.allowedSwaras = Array.from(
  new Set(JANTA_VARISAI_1.flatSequence.map(stepToGraphBandKey)),
)
```

***

## 3. Registration in exerciseCatalog / mayamalavagowla.ts

Add `JANTA_VARISAI_1` to the exercises array in your `MAYAMALAVAGOWLA` raga definition, alongside `SARALI_VARISAI_1`: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/948c7141-6956-4b2a-9c1f-37216d0ee841/exerciseCatalog.ts?AWSAccessKeyId=ASIA2F3EMEYESOVHS7T7&Signature=xaaKJ5F6miLz69wjyBefQ9GoVjg%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEFIaCXVzLWVhc3QtMSJIMEYCIQCKEzW5v%2FV8g1bf7Z63XiwO%2FeECPqMA1nABRbJgBwIi8AIhAJAlNHne7LD%2BfITmSe%2FLdh67f2neIv9qXjN%2FBk40CLnVKvMECBoQARoMNjk5NzUzMzA5NzA1IgyQDr%2FSY5oHxZgtnEUq0ASNcr5Lw%2FfDGgmJ8QsB2AI9xd%2BevvlQGPxkPaNbk0SpUgOTZZAdXr%2BeHOTwAJTVwejWNlXac7TA9dETdAWuKgPKmUIt9SykV2kENBT9o1RvRjhGjdtsYrXPXFI9jLh1gxulsTRG41HS4yLdyYkNr3wlaM29owNGO6wi7lL9I%2BDxsoe8mxN9vmWax3dklAWh6KgPCEK8PZzsGmi8PzoPCN8nrTsmvC1B3WgoMiO4Ffh3q9hf%2Bt4ADGyOdV%2BxT0HcddQz65h8MnY1qi6YhcYOu3%2Bk2B%2BPdIpA8z53JpmD1awLeyptJDkwlE5MoackHT81ZztH90YO1FibBnEagcCTu2IS8hEsg1iN7AY2vOAmNiwMjtTOstg8g3IxaUvaMmVnQ9kapXhSIDqBqlhTpnnACZy%2B8nvs5YL6csIg%2B48Evb2fGQx%2FjiX53tL86pEusq4TjOr%2FtpaoKnDY4SUMXAHXvgNImDuEqEp6V6BtDc8Nou2hSlcQmayFR9W%2FKsGI7oJtXWCYGksmWyADT5kAJ19NF1im6qutOMKmuCgW9whInylLeIq9YokFld3XfYEoWXNELOz4D9apfLgiUX%2FsO9NajUvhMtkJNdQSWHCe9bJkAZmNrxbKJoKy6v4GNlIVOzTr3faswILTPzmejxqJanazF8Vg5XxxkvvmN5Nwu%2Frc%2FSN4LzLJ2hFevniM1NEW0gOkjM8K%2Flnqpd4PNQLv4xuPxUT%2FUlssOJfTAqSZ7Yg%2FlHqbZFLxuX2s2V1hXqz55p810cMVjE9kd7sETZSM4fF5U9cwMMn57s0GOpcBFBXS2ueWyBejqM6Nkd%2F3rpz2ipCZADFY9m%2BpRUQWGsU88KlZO2WPvpedWxncUac9mySC35sCSd87L7b7%2BawdVrqp743gfSA8Ek%2F5g6OVj5HEq7CDTzvS%2BTyU10xKPzZQFIjgdLI6YTNdISBjdk5CAG%2FMNXzfPTqDaD3GlZEzTSj%2B%2BcTD%2BV5TV4V5HKuI7JekIdH1MqzvIg%3D%3D&Expires=1773912664)

```typescript
import { SARALI_VARISAI_1 } from './exercises/saraliVarisai1'
import { JANTA_VARISAI_1 } from './exercises/jantaVarisai1'

export const MAYAMALAVAGOWLA: RagaDefinition = {
  // ... existing fields unchanged ...
  exercises: [
    SARALI_VARISAI_1,
    JANTA_VARISAI_1,   // ← add this
  ],
}
```

No other changes needed anywhere. The exercise dropdown in `ExercisePanel` populates from `exerciseOptions` which is already derived from `raga.exercises`. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/9e315e97-066e-466b-a09a-3b0ccf14445e/ExercisePanel.tsx?AWSAccessKeyId=ASIA2F3EMEYESOVHS7T7&Signature=O3rOTxfuArzeD8wfZiIh0uUoh%2FM%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEFIaCXVzLWVhc3QtMSJIMEYCIQCKEzW5v%2FV8g1bf7Z63XiwO%2FeECPqMA1nABRbJgBwIi8AIhAJAlNHne7LD%2BfITmSe%2FLdh67f2neIv9qXjN%2FBk40CLnVKvMECBoQARoMNjk5NzUzMzA5NzA1IgyQDr%2FSY5oHxZgtnEUq0ASNcr5Lw%2FfDGgmJ8QsB2AI9xd%2BevvlQGPxkPaNbk0SpUgOTZZAdXr%2BeHOTwAJTVwejWNlXac7TA9dETdAWuKgPKmUIt9SykV2kENBT9o1RvRjhGjdtsYrXPXFI9jLh1gxulsTRG41HS4yLdyYkNr3wlaM29owNGO6wi7lL9I%2BDxsoe8mxN9vmWax3dklAWh6KgPCEK8PZzsGmi8PzoPCN8nrTsmvC1B3WgoMiO4Ffh3q9hf%2Bt4ADGyOdV%2BxT0HcddQz65h8MnY1qi6YhcYOu3%2Bk2B%2BPdIpA8z53JpmD1awLeyptJDkwlE5MoackHT81ZztH90YO1FibBnEagcCTu2IS8hEsg1iN7AY2vOAmNiwMjtTOstg8g3IxaUvaMmVnQ9kapXhSIDqBqlhTpnnACZy%2B8nvs5YL6csIg%2B48Evb2fGQx%2FjiX53tL86pEusq4TjOr%2FtpaoKnDY4SUMXAHXvgNImDuEqEp6V6BtDc8Nou2hSlcQmayFR9W%2FKsGI7oJtXWCYGksmWyADT5kAJ19NF1im6qutOMKmuCgW9whInylLeIq9YokFld3XfYEoWXNELOz4D9apfLgiUX%2FsO9NajUvhMtkJNdQSWHCe9bJkAZmNrxbKJoKy6v4GNlIVOzTr3faswILTPzmejxqJanazF8Vg5XxxkvvmN5Nwu%2Frc%2FSN4LzLJ2hFevniM1NEW0gOkjM8K%2Flnqpd4PNQLv4xuPxUT%2FUlssOJfTAqSZ7Yg%2FlHqbZFLxuX2s2V1hXqz55p810cMVjE9kd7sETZSM4fF5U9cwMMn57s0GOpcBFBXS2ueWyBejqM6Nkd%2F3rpz2ipCZADFY9m%2BpRUQWGsU88KlZO2WPvpedWxncUac9mySC35sCSd87L7b7%2BawdVrqp743gfSA8Ek%2F5g6OVj5HEq7CDTzvS%2BTyU10xKPzZQFIjgdLI6YTNdISBjdk5CAG%2FMNXzfPTqDaD3GlZEzTSj%2B%2BcTD%2BV5TV4V5HKuI7JekIdH1MqzvIg%3D%3D&Expires=1773912664)

***

## 4. Matcher Behaviour

`flatSequence` for Janta Varisai 1 has **32 steps** (8 pairs × 2 phrases). The matcher advances `expectedIndex` one step at a time — so a student singing `Sa Sa R R G G...` will see the highlight move across each individual note, not each pair. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/37454559/f3862215-aade-45aa-a2a1-df6637dfa25b/App.tsx?AWSAccessKeyId=ASIA2F3EMEYESOVHS7T7&Signature=iK9VDUDQRp4kWloE1hjpyrOUrZ0%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEFIaCXVzLWVhc3QtMSJIMEYCIQCKEzW5v%2FV8g1bf7Z63XiwO%2FeECPqMA1nABRbJgBwIi8AIhAJAlNHne7LD%2BfITmSe%2FLdh67f2neIv9qXjN%2FBk40CLnVKvMECBoQARoMNjk5NzUzMzA5NzA1IgyQDr%2FSY5oHxZgtnEUq0ASNcr5Lw%2FfDGgmJ8QsB2AI9xd%2BevvlQGPxkPaNbk0SpUgOTZZAdXr%2BeHOTwAJTVwejWNlXac7TA9dETdAWuKgPKmUIt9SykV2kENBT9o1RvRjhGjdtsYrXPXFI9jLh1gxulsTRG41HS4yLdyYkNr3wlaM29owNGO6wi7lL9I%2BDxsoe8mxN9vmWax3dklAWh6KgPCEK8PZzsGmi8PzoPCN8nrTsmvC1B3WgoMiO4Ffh3q9hf%2Bt4ADGyOdV%2BxT0HcddQz65h8MnY1qi6YhcYOu3%2Bk2B%2BPdIpA8z53JpmD1awLeyptJDkwlE5MoackHT81ZztH90YO1FibBnEagcCTu2IS8hEsg1iN7AY2vOAmNiwMjtTOstg8g3IxaUvaMmVnQ9kapXhSIDqBqlhTpnnACZy%2B8nvs5YL6csIg%2B48Evb2fGQx%2FjiX53tL86pEusq4TjOr%2FtpaoKnDY4SUMXAHXvgNImDuEqEp6V6BtDc8Nou2hSlcQmayFR9W%2FKsGI7oJtXWCYGksmWyADT5kAJ19NF1im6qutOMKmuCgW9whInylLeIq9YokFld3XfYEoWXNELOz4D9apfLgiUX%2FsO9NajUvhMtkJNdQSWHCe9bJkAZmNrxbKJoKy6v4GNlIVOzTr3faswILTPzmejxqJanazF8Vg5XxxkvvmN5Nwu%2Frc%2FSN4LzLJ2hFevniM1NEW0gOkjM8K%2Flnqpd4PNQLv4xuPxUT%2FUlssOJfTAqSZ7Yg%2FlHqbZFLxuX2s2V1hXqz55p810cMVjE9kd7sETZSM4fF5U9cwMMn57s0GOpcBFBXS2ueWyBejqM6Nkd%2F3rpz2ipCZADFY9m%2BpRUQWGsU88KlZO2WPvpedWxncUac9mySC35sCSd87L7b7%2BawdVrqp743gfSA8Ek%2F5g6OVj5HEq7CDTzvS%2BTyU10xKPzZQFIjgdLI6YTNdISBjdk5CAG%2FMNXzfPTqDaD3GlZEzTSj%2B%2BcTD%2BV5TV4V5HKuI7JekIdH1MqzvIg%3D%3D&Expires=1773912664)

This means the student must sing **both notes of each pair** to advance through the sequence — the matcher does not skip the second note of a pair automatically. This is correct and intentional: Janta training is specifically about the discipline of repeating the same note cleanly twice at the same pitch. [carnatic-circle](https://carnatic-circle.com/carnatic-lessonsnotes/varisais/sarali-varisai/)

***

*Save as `src/ragas/exercises/jantaVarisai1.ts`*