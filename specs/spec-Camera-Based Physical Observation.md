## Purpose

A vocal teacher standing in the room spends as much time watching the body as listening to the voice. The way a singer holds their shoulders, opens their jaw, and carries their head directly shapes the sound being produced. This feature brings that observational layer into Sapasa using the device's front-facing camera — passively, without interrupting the practice session.

The camera runs alongside everything else. The singer doesn't interact with it. It watches, and speaks up only when it has something useful to say.

***

## The Library

Everything in this feature is built on **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`), Google's official vision library. It runs entirely in the browser — nothing is sent to a server, no API key is needed, no cost is incurred per session. It processes the camera feed locally using WebAssembly, which means it works in the existing React/Vite setup without any backend changes.

Two models from this library are used:

- **Pose Landmarker** — tracks the body, specifically the shoulders, neck, and head position
- **Face Landmarker** — tracks the face, specifically jaw opening and mouth shape

***

## Setup and Consent

The first time the singer uses any exercise that involves the camera, Sapasa asks permission clearly and explains why: *"The camera helps Sapasa notice things like raised shoulders or a tight jaw — the kind of thing a teacher would point out. Your video never leaves your device."* This explanation is important. People are sensitive about cameras and will not grant permission without understanding the value.

If the singer declines, the session continues normally. The feature is an enhancement, never a requirement.

Once granted, the camera activates automatically at the start of any relevant exercise and deactivates when the session ends. There is no persistent recording. No frames are stored.

***

## What It Observes

### Shoulder Position
The Pose Landmarker tracks both shoulders in real time. A baseline is established in the first few seconds of each session — where the singer's shoulders naturally rest. From that point, the system watches for sustained elevation above that baseline. Occasional shoulder movement is ignored. The trigger is when the shoulders are raised and *stay* raised for several seconds, which is the pattern of tension a teacher would notice and correct.

### Head and Neck Alignment
The same Pose Landmarker tracks the relationship between the head and the shoulders beneath it. Forward head posture — the chin jutting out ahead of the body — is one of the most common physical habits that restricts vocal resonance. The system watches for this and notes when the head has moved significantly forward of its resting position.

### Jaw Opening
The Face Landmarker provides a `jawOpen` score on every frame — a number between zero and one representing how wide the jaw is open. This directly maps to the "tall mouth" concept central to Sapasa's coaching philosophy. During exercises where an open jaw is expected, the system can notice when the singer is consistently underopening and flag it after the phrase ends. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_8054103b-b0e5-4cc2-8670-4d64b8535976/5b64c314-9aa6-444c-821c-545980469d16/pasted-text.txt)

### Mouth Shape
Beyond how *wide* the jaw opens, the Face Landmarker also tracks the horizontal versus vertical stretch of the mouth. A horizontally wide, spread mouth shape collapses resonance space. A tall, vertical aperture supports it. The system can distinguish between these and offer the relevant observation.

***

## How Feedback Is Delivered

The physical observations follow the same feedback philosophy as the rest of Sapasa: nothing interrupts the singing, and nothing is judgmental.

**During the phrase:** No feedback at all. The singer should never be distracted by a notification while performing. The camera watches silently.

**Immediately after a phrase ends:** If something notable was observed — shoulders were raised for the majority of the phrase, or the jaw barely opened on a vowel that needed space — a single, plain-language observation appears. One thing only, not a list. Something like: *"Your shoulders came up toward the end of that phrase — try letting them drop before you begin."* Or: *"Your jaw stayed fairly closed on those open vowels. Give it a little more room."*

**Over time:** Physical habits are deeply ingrained and rarely fixed in a single session. If the same observation appears repeatedly across sessions, Sapasa eventually names the pattern: *"You tend to raise your shoulders when the melody goes higher. This has come up in your last few sessions — it might be worth making that the focus of your next warmup."*

***

## What It Does Not Try to Do

This feature is explicitly limited to what the camera can reliably see. It does not attempt to infer:

- Tongue position or soft palate height (not externally visible)
- Breath support or rib expansion (requires a wearable sensor)
- Whether the singer is tense emotionally versus physically
- The *cause* of any physical habit

When the camera cannot determine something with confidence — poor lighting, camera angle too extreme, the singer has stepped back too far — it stays silent. A silent observation is always preferable to a wrong one.

***

## Camera Setup Guidance

Because the accuracy of this feature depends on the camera seeing the singer properly, Sapasa guides the setup at the start of the first session that uses it. The guidance is simple: face and shoulders both visible, reasonably centered, reasonable light. A short visual confirmation — showing the singer what the camera currently sees, with an overlay indicating whether shoulders and face are in frame — lets them self-correct before beginning. After that, the setup check does not appear again unless the system detects it can no longer see the necessary landmarks.