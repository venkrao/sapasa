import { useState, useEffect, useRef, useCallback } from 'react'
import './CameraObservationLab.css'
import type { LiveMetrics, ShoulderLevel } from './cameraMetrics'
import { shoulderLevel, elevationPct } from './cameraMetrics'
import CameraLiveMetricsPanel from './CameraLiveMetricsPanel'

type Baseline = {
  shoulderY: number
  noseZ: number
  shoulderZ: number
}

type Phase = 'consent' | 'loading' | 'active' | 'declined' | 'error'
type RecordState = 'baseline' | 'ready' | 'recording' | 'done'

// ── Observation generation ─────────────────────────────────────────────────────

function generateObservation(frames: LiveMetrics[]): string {
  if (frames.length < 5) return 'Phrase was too short to observe anything. Try a longer one.'

  // Shoulder: classify each frame and count levels
  const raisedFrames  = frames.filter(d => shoulderLevel(d.shoulderSmoothed) === 'raised').length
  const tensionFrames = frames.filter(d => shoulderLevel(d.shoulderSmoothed) === 'tension').length
  const raisedPct  = raisedFrames  / frames.length
  const tensionPct = tensionFrames / frames.length

  // Asymmetry: average across the phrase
  const asymFrames = frames.filter(d => d.shoulderAsymmetry !== null)
  const avgAsym = asymFrames.length > 0
    ? asymFrames.reduce((a, d) => a + (d.shoulderAsymmetry ?? 0), 0) / asymFrames.length
    : null

  const jawFrames = frames.filter(d => d.jawOpen !== null)
  const avgJaw = jawFrames.length > 0
    ? jawFrames.reduce((a, d) => a + (d.jawOpen ?? 0), 0) / jawFrames.length
    : null

  const mouthFrames = frames.filter(d => d.mouthRatio !== null)
  const avgMouth = mouthFrames.length > 0
    ? mouthFrames.reduce((a, d) => a + (d.mouthRatio ?? 0), 0) / mouthFrames.length
    : null

  const headFrames = frames.filter(d => d.headForward !== null && d.headForward > 0.04)
  const headPct = headFrames.length / frames.length

  // Single most notable observation, in priority order
  if (raisedPct > 0.5) {
    return "Your shoulders were raised for most of that phrase — try letting them drop before you begin and keeping them there."
  }
  if (raisedPct > 0.25) {
    return "Your shoulders came up noticeably toward the end of that phrase. It's worth pausing and releasing them before the next one."
  }
  if (tensionPct > 0.6) {
    return "Your shoulders stayed in a mildly tense position through most of that phrase — not raised dramatically, but not fully settled either. Try taking a slow breath out and letting them drop before you begin."
  }
  if (tensionPct > 0.35) {
    return "There was some shoulder tension through parts of that phrase. This often comes up with deeper breaths — try consciously releasing them on the exhale just before you start singing."
  }
  if (avgAsym !== null && avgAsym > 0.018) {
    return "One of your shoulders was consistently held a little higher than the other through that phrase. Even small asymmetries like this can affect resonance over time — worth checking in a mirror."
  }
  if (avgJaw !== null && avgJaw < 0.18) {
    return "Your jaw stayed fairly closed through that phrase. Give it a little more room, especially on open vowels."
  }
  if (avgMouth !== null && avgMouth < 0.22) {
    return "Your mouth was spreading horizontally rather than opening tall. Think of a taller, more vertical aperture."
  }
  if (headPct > 0.4) {
    return "Your head moved forward during that phrase. Try keeping your chin gently back, aligned over your shoulders."
  }
  return "Posture looked settled on that phrase — shoulders stayed down and jaw had reasonable space."
}

// ── Component ──────────────────────────────────────────────────────────────────

type Props = {
  onHome: () => void
  /** Render as a compact panel inside another component (no app wrapper, no header, no phrase recording) */
  embedded?: boolean
  /** Carnatic PiP: use grid layout so live metrics never collapse (flex + % heights can flicker away) */
  embeddedPip?: boolean
  /** Called when the embedded panel is dismissed */
  onClose?: () => void
}

export default function CameraObservationLab({ onHome, embedded = false, embeddedPip = false, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('consent')
  const [recordState, setRecordState] = useState<RecordState>('baseline')
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null)
  const [observation, setObservation] = useState<string | null>(null)
  const [baselineProgress, setBaselineProgress] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Toggle purple mouth landmark outline on the canvas (metrics unchanged). */
  const [showMouthOutline, setShowMouthOutline] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const poseLandmarkerRef = useRef<any>(null)
  const faceLandmarkerRef = useRef<any>(null)
  const baselineRef = useRef<Baseline | null>(null)
  const baselineSamplesRef = useRef<{ shoulderY: number; noseZ: number; shoulderZ: number }[]>([])
  const phraseFramesRef = useRef<LiveMetrics[]>([])
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const recordStateRef = useRef<RecordState>('baseline')
  const baselineStartRef = useRef<number>(0)
  const lastTsRef = useRef<number>(0)
  // Rolling window of raw elevation values for smoothing (~20 frames ≈ 0.33 s at 60 fps)
  const elevWindowRef = useRef<number[]>([])
  // Stable ref to the processFrame fn so rAF always calls the latest version
  const loopRef = useRef<() => void>()

  // Keep recordStateRef in sync with state
  useEffect(() => { recordStateRef.current = recordState }, [recordState])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  // ── Drawing helpers ──────────────────────────────────────────────────────────

  function drawFrame(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    poseLms: any[],
    faceLms: any[],
    level: ShoulderLevel | null,
    drawMouthOutline: boolean
  ) {
    // clearRect and video draw are done by the caller before this function.
    // x is mirrored programmatically (1-x) because CSS transform is removed —
    // the video is drawn onto the canvas with a canvas-level flip instead.
    const px = (x: number) => (1 - x) * w
    const py = (y: number) => y * h

    // Shoulder line + head dot
    if (poseLms.length > 12) {
      const ls = poseLms[11]
      const rs = poseLms[12]
      const nose = poseLms[0]

      if ((ls?.visibility ?? 0) > 0.4 && (rs?.visibility ?? 0) > 0.4) {
        const color =
          level === 'raised'  ? 'rgba(248,113,113,0.9)' :
          level === 'tension' ? 'rgba(251,191,36,0.9)'  :
                                'rgba(52,211,153,0.9)'

        // Dashed baseline reference line
        if (baselineRef.current) {
          ctx.beginPath()
          ctx.moveTo(0, baselineRef.current.shoulderY * h)
          ctx.lineTo(w, baselineRef.current.shoulderY * h)
          ctx.strokeStyle = 'rgba(255,255,255,0.10)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 10])
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Shoulder connector
        ctx.beginPath()
        ctx.moveTo(px(ls.x), py(ls.y))
        ctx.lineTo(px(rs.x), py(rs.y))
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Shoulder dots
        for (const lm of [ls, rs]) {
          ctx.beginPath()
          ctx.arc(px(lm.x), py(lm.y), 5.5, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }

        // Nose dot + neck line
        if (nose) {
          const midX = (px(ls.x) + px(rs.x)) / 2
          const midY = (py(ls.y) + py(rs.y)) / 2
          ctx.beginPath()
          ctx.moveTo(px(nose.x), py(nose.y))
          ctx.lineTo(midX, midY)
          ctx.strokeStyle = 'rgba(147,197,253,0.3)'
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(px(nose.x), py(nose.y), 4, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(147,197,253,0.9)'
          ctx.fill()
        }
      }
    }

    // Mouth outline (optional overlay — face landmarks still drive metrics when hidden)
    if (drawMouthOutline && faceLms.length > 291) {
      const outerMouth = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
      ctx.beginPath()
      let started = false
      for (const idx of outerMouth) {
        const lm = faceLms[idx]
        if (!lm) continue
        if (!started) { ctx.moveTo(px(lm.x), py(lm.y)); started = true }
        else ctx.lineTo(px(lm.x), py(lm.y))
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(216,180,254,0.65)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // ── rAF loop ─────────────────────────────────────────────────────────────────

  // Assigned on each render so the loop always reads up-to-date refs
  loopRef.current = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const pose = poseLandmarkerRef.current
    const face = faceLandmarkerRef.current

    if (!video || !canvas || !pose || !face || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(loopRef.current!)
      return
    }

    // Sync canvas pixels to video frame size
    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

    const now = performance.now()
    if (now <= lastTsRef.current) {
      animFrameRef.current = requestAnimationFrame(loopRef.current!)
      return
    }
    lastTsRef.current = now

    let poseResult: any, faceResult: any
    try {
      poseResult = pose.detectForVideo(video, now)
      faceResult = face.detectForVideo(video, now)
    } catch {
      animFrameRef.current = requestAnimationFrame(loopRef.current!)
      return
    }

    const poseLms: any[] = poseResult.landmarks[0] ?? []
    const faceLms: any[] = faceResult.faceLandmarks[0] ?? []
    const blendshapes: any[] = faceResult.faceBlendshapes?.[0]?.categories ?? []

    const shouldersVisible =
      poseLms.length > 12 &&
      (poseLms[11]?.visibility ?? 0) > 0.4 &&
      (poseLms[12]?.visibility ?? 0) > 0.4
    const faceVisible = faceLms.length > 0

    let shoulderElevation: number | null = null
    let shoulderSmoothed: number | null = null
    let shoulderAsymmetry: number | null = null
    let headForward: number | null = null

    if (shouldersVisible) {
      const ls = poseLms[11]
      const rs = poseLms[12]
      const avgY = (ls.y + rs.y) / 2
      const avgZ = (ls.z + rs.z) / 2
      const nose = poseLms[0]
      const st = recordStateRef.current

      if (st === 'baseline') {
        baselineSamplesRef.current.push({
          shoulderY: avgY,
          noseZ: nose?.z ?? 0,
          shoulderZ: avgZ,
        })
        const elapsed = Date.now() - baselineStartRef.current
        setBaselineProgress(Math.min(100, Math.round((elapsed / 3000) * 100)))

        if (elapsed >= 3000 && baselineSamplesRef.current.length >= 10) {
          const s = baselineSamplesRef.current
          const n = s.length
          baselineRef.current = {
            shoulderY: s.reduce((a, x) => a + x.shoulderY, 0) / n,
            noseZ:     s.reduce((a, x) => a + x.noseZ, 0) / n,
            shoulderZ: s.reduce((a, x) => a + x.shoulderZ, 0) / n,
          }
          elevWindowRef.current = []
          setRecordState('ready')
        }
      } else if (baselineRef.current) {
        // Raw per-frame elevation (lower y = higher in frame = raised)
        shoulderElevation = baselineRef.current.shoulderY - avgY

        // Rolling average over the last 20 frames to smooth breath-by-breath noise
        const win = elevWindowRef.current
        win.push(shoulderElevation)
        if (win.length > 20) win.shift()
        shoulderSmoothed = win.reduce((a, v) => a + v, 0) / win.length

        // Asymmetry: one shoulder pulled higher than the other
        shoulderAsymmetry = Math.abs(ls.y - rs.y)

        if (nose) {
          const baseRel = baselineRef.current.noseZ - baselineRef.current.shoulderZ
          const currRel = nose.z - avgZ
          headForward = baseRel - currRel
        }
      }
    }

    const jawBlend = blendshapes.find((b: any) => b.categoryName === 'jawOpen')
    const jawOpen: number | null = jawBlend ? (jawBlend.score as number) : null

    let mouthRatio: number | null = null
    if (faceVisible && faceLms.length > 291) {
      const upper = faceLms[13]
      const lower = faceLms[14]
      const left  = faceLms[61]
      const right = faceLms[291]
      if (upper && lower && left && right) {
        const v = Math.abs(upper.y - lower.y)
        const h = Math.abs(left.x - right.x)
        if (h > 0.001) mouthRatio = v / h
      }
    }

    const level = shoulderLevel(shoulderSmoothed)
    const elevated = level === 'tension' || level === 'raised'

    const m: LiveMetrics = {
      shoulderElevation,
      shoulderSmoothed,
      shoulderAsymmetry,
      headForward,
      jawOpen,
      mouthRatio,
      shouldersVisible,
      faceVisible,
    }
    setMetrics(m)

    if (recordStateRef.current === 'recording') {
      phraseFramesRef.current.push(m)
    }

    const ctx = canvas.getContext('2d')
    if (ctx) {
      const w = canvas.width
      const h = canvas.height
      // Clear, then draw the mirrored video frame directly onto the canvas.
      // This replaces the CSS transform: scaleX(-1) approach and means the
      // video pixels and landmark coordinates are always in the same coordinate
      // space — no matter what aspect ratio the container has.
      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, w, h)
      ctx.restore()
      drawFrame(ctx, w, h, poseLms, faceLms, level, showMouthOutline)
    }

    animFrameRef.current = requestAnimationFrame(loopRef.current!)
  }

  // ── Connect stream → video element once the active phase renders it ───────────
  // startSession stores the stream in streamRef before calling setPhase('active').
  // The video element only exists in the DOM during the active phase, so we wire
  // everything up here, after React has committed the new render.
  useEffect(() => {
    if (phase !== 'active') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.play().catch(console.error)

    // Wait for the first frame before starting the detection loop
    const onReady = () => {
      lastTsRef.current = 0
      baselineStartRef.current = Date.now()
      baselineSamplesRef.current = []
      baselineRef.current = null
      setBaselineProgress(0)
      setRecordState('baseline')
      animFrameRef.current = requestAnimationFrame(loopRef.current!)
    }

    if (video.readyState >= 2) {
      onReady()
    } else {
      video.addEventListener('loadeddata', onReady, { once: true })
    }

    return () => {
      video.removeEventListener('loadeddata', onReady)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Session start ─────────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    setPhase('loading')
    setLoadError(null)

    // 1. Camera — just acquire the stream; the effect above wires it to the video
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
    } catch {
      setLoadError('Camera access was denied. Please allow camera access in your browser settings and try again.')
      setPhase('error')
      return
    }

    // 2. MediaPipe models (WASM + models via CDN)
    try {
      const { FilesetResolver, PoseLandmarker, FaceLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )
      const [poseModel, faceModel] = await Promise.all([
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        }),
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        }),
      ])
      poseLandmarkerRef.current = poseModel
      faceLandmarkerRef.current = faceModel
    } catch (err) {
      console.error(err)
      setLoadError('Could not load vision models. Check your internet connection and try again.')
      setPhase('error')
      stopCamera()
      return
    }

    // 3. Transition to active — the useEffect above starts the loop once the
    //    video element is in the DOM and the stream is playing
    setPhase('active')
  }, [stopCamera])

  // ── Phrase controls ───────────────────────────────────────────────────────────

  const handlePhraseToggle = useCallback(() => {
    if (recordState === 'ready') {
      phraseFramesRef.current = []
      setObservation(null)
      setRecordState('recording')
    } else if (recordState === 'recording') {
      const frames = [...phraseFramesRef.current]
      setRecordState('done')
      setObservation(generateObservation(frames))
    } else if (recordState === 'done') {
      setObservation(null)
      setRecordState('ready')
    }
  }, [recordState])

  /** Same sampling window as startup — lets the user recalibrate posture reference mid-session. */
  const establishBaseline = useCallback(() => {
    if (phase !== 'active') return
    baselineRef.current = null
    baselineSamplesRef.current = []
    baselineStartRef.current = Date.now()
    elevWindowRef.current = []
    phraseFramesRef.current = []
    setObservation(null)
    setBaselineProgress(0)
    recordStateRef.current = 'baseline'
    setRecordState('baseline')
  }, [phase])

  // ── Derived display values ────────────────────────────────────────────────────

  const currentLevel     = shoulderLevel(metrics?.shoulderSmoothed ?? null)
  const currentElevPct   = elevationPct(metrics?.shoulderSmoothed ?? null)
  const isHeadForward    = (metrics?.headForward ?? 0) > 0.04
  const jawPct           = metrics?.jawOpen != null ? Math.round(metrics.jawOpen * 100) : null
  const mouthShape       = metrics?.mouthRatio != null
    ? metrics.mouthRatio > 0.3 ? 'tall ✓' : 'spread'
    : null
  const asymVisible      = Boolean(metrics?.shouldersVisible && metrics.shoulderAsymmetry != null)
  const asymNotable      = (metrics?.shoulderAsymmetry ?? 0) > 0.018

  // ── Embedded render ───────────────────────────────────────────────────────────
  // Used when mounted inside another component (e.g. during the SSS hiss exercise).
  // No app wrapper, no header, no phrase recording — just live camera + shoulder metrics.

  const handleEmbeddedClose = () => { stopCamera(); (onClose ?? onHome)() }

  if (embedded) {
    // Non-active states: compact setup card
    if (phase !== 'active') {
      return (
        <div className="camera-embedded camera-embedded-setup">
          <button className="camera-embedded-close" onClick={handleEmbeddedClose} aria-label="Close">×</button>
          {phase === 'consent' && (
            <>
              <p className="emb-consent-text">
                Allow camera to monitor your shoulder position while you do the exercise.
              </p>
              <p className="emb-consent-note">Video stays on your device — nothing is transmitted.</p>
              <button className="cam-btn-primary" onClick={startSession}>Allow camera</button>
            </>
          )}
          {phase === 'loading' && (
            <>
              <div className="cam-spinner" />
              <p className="emb-consent-note" style={{ marginTop: 14 }}>Loading vision models…</p>
            </>
          )}
          {(phase === 'error' || phase === 'declined') && (
            <>
              {loadError && <p className="emb-error-text">{loadError}</p>}
              <button className="cam-btn-primary" style={{ marginTop: 12 }} onClick={() => setPhase('consent')}>
                Try again
              </button>
            </>
          )}
        </div>
      )
    }

    // Active state: camera feed + live metrics only
    return (
      <div
        className={
          'camera-embedded camera-embedded-active' + (embeddedPip ? ' camera-embedded--pip' : '')
        }
      >
        <button className="camera-embedded-close" onClick={handleEmbeddedClose} aria-label="Close camera">×</button>

        {/* Camera feed */}
        <div className="camera-embedded-feed">
          <div className="camera-feed-inner">
            <video ref={videoRef} className="camera-video" muted playsInline aria-hidden="true" />
            <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />
          </div>
          <div className="camera-badges" style={{ marginTop: 8 }}>
            <span className={`cam-badge ${metrics?.shouldersVisible ? 'cam-badge-ok' : 'cam-badge-warn'}`}>
              {metrics?.shouldersVisible ? '✓ Shoulders' : '⚠ Shoulders'}
            </span>
            <span className={`cam-badge ${metrics?.faceVisible ? 'cam-badge-ok' : 'cam-badge-warn'}`}>
              {metrics?.faceVisible ? '✓ Face' : '⚠ Face'}
            </span>
            <button
              type="button"
              className={'camera-mouth-outline-toggle' + (showMouthOutline ? ' camera-mouth-outline-toggle-on' : '')}
              onClick={() => setShowMouthOutline(v => !v)}
              aria-pressed={showMouthOutline}
              aria-label={
                showMouthOutline
                  ? 'Mouth outline overlay on — click to hide lip contour'
                  : 'Mouth outline overlay off — click to show lip contour'
              }
              title={showMouthOutline ? 'Hide purple mouth outline on video' : 'Show purple mouth outline on video'}
            >
              <span className="camera-mouth-outline-toggle-label">Outline</span>
              <span className="camera-mouth-outline-toggle-pill">{showMouthOutline ? 'On' : 'Off'}</span>
            </button>
            <button
              type="button"
              className="camera-baseline-btn"
              onClick={establishBaseline}
              disabled={recordState === 'baseline'}
              title={
                recordState === 'baseline'
                  ? 'Baseline capture in progress…'
                  : 'Re-record resting shoulder & head reference (~3 seconds), same as when the camera starts'
              }
              aria-label={
                recordState === 'baseline'
                  ? 'Establishing baseline — please wait'
                  : 'Establish baseline again — recalibrate shoulder reference'
              }
            >
              Baseline
            </button>
          </div>
        </div>

        {/* Same Live metrics UI as Camera Lab (shared component) */}
        <div className="camera-embedded-metrics">
          <CameraLiveMetricsPanel
            variant="embedded"
            recordState={recordState}
            baselineProgress={baselineProgress}
            metrics={metrics}
            currentLevel={currentLevel}
            currentElevPct={currentElevPct}
            isHeadForward={isHeadForward}
            jawPct={jawPct}
            mouthShape={mouthShape}
            asymVisible={asymVisible}
            asymNotable={asymNotable}
          />
        </div>
      </div>
    )
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  function renderConsentOrStatus() {
    return (
      <div className="app camera-lab">
        <header className="header">
          <span className="app-name">SaPaSa</span>
          <div className="header-controls">
            <button className="back-btn" onClick={onHome}>← Home</button>
          </div>
        </header>
        <div className="cam-center">
          {phase === 'consent' && (
            <div className="cam-card">
              <div className="cam-card-eyebrow">Camera Observation Lab</div>
              <h2 className="cam-card-title">Watch the body,<br />hear the voice.</h2>
              <p className="cam-card-body">
                A vocal teacher spends as much time watching the body as listening to the sound.
                This lab uses your front-facing camera to observe the same things a teacher watches —
                shoulder tension, forward head position, jaw opening, and mouth shape.
              </p>
              <div className="cam-privacy-note">
                Your video never leaves your device. No frames are stored or transmitted.
                All processing runs locally in your browser using WebAssembly.
              </div>
              <div className="cam-card-actions">
                <button className="cam-btn-primary" onClick={startSession}>Allow camera</button>
                <button className="cam-btn-ghost" onClick={() => setPhase('declined')}>Not now</button>
              </div>
            </div>
          )}
          {phase === 'declined' && (
            <div className="cam-card" style={{ textAlign: 'center' }}>
              <p className="cam-card-body" style={{ color: '#737373' }}>
                No problem — come back whenever you're ready.
              </p>
              <button className="cam-btn-primary" style={{ marginTop: 24 }} onClick={() => setPhase('consent')}>
                Try again
              </button>
            </div>
          )}
          {phase === 'loading' && (
            <div className="cam-card" style={{ textAlign: 'center' }}>
              <div className="cam-spinner" />
              <p className="cam-card-body" style={{ marginTop: 20 }}>Loading vision models…</p>
              <p className="cam-card-sub">First load takes a few seconds while the models download.</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="cam-card" style={{ textAlign: 'center' }}>
              <p className="cam-card-body" style={{ color: '#f87171' }}>{loadError}</p>
              <button className="cam-btn-primary" style={{ marginTop: 24 }} onClick={() => setPhase('consent')}>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main active render ────────────────────────────────────────────────────────

  if (phase !== 'active') return renderConsentOrStatus()

  return (
    <div className="app camera-lab">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <div className="header-controls">
          <span className="header-screen-name">Camera Observation Lab</span>
        </div>
        <button className="back-btn" onClick={() => { stopCamera(); onHome() }}>← Home</button>
      </header>

      <main className="camera-main">
        <div className="camera-layout">

          {/* ── Left: Camera feed ──────────────────────────────── */}
          <div className="camera-feed-col">
            <div className="camera-feed-wrap">
              {/* Video element — CSS mirrors it so the singer sees themselves naturally */}
              <video
                ref={videoRef}
                className="camera-video"
                muted
                playsInline
                aria-hidden="true"
              />
              {/* Canvas overlay for landmarks — also CSS-mirrored to match video */}
              <canvas
                ref={canvasRef}
                className="camera-canvas"
                aria-hidden="true"
              />
            </div>

            <div className="camera-badges">
              <span className={`cam-badge ${metrics?.shouldersVisible ? 'cam-badge-ok' : 'cam-badge-warn'}`}>
                {metrics?.shouldersVisible ? '✓ Shoulders visible' : '⚠ Shoulders not visible'}
              </span>
              <span className={`cam-badge ${metrics?.faceVisible ? 'cam-badge-ok' : 'cam-badge-warn'}`}>
                {metrics?.faceVisible ? '✓ Face visible' : '⚠ Face not visible'}
              </span>
              <button
                type="button"
                className={'camera-mouth-outline-toggle' + (showMouthOutline ? ' camera-mouth-outline-toggle-on' : '')}
                onClick={() => setShowMouthOutline(v => !v)}
                aria-pressed={showMouthOutline}
                aria-label={
                  showMouthOutline
                    ? 'Mouth outline overlay on — click to hide lip contour'
                    : 'Mouth outline overlay off — click to show lip contour'
                }
                title={showMouthOutline ? 'Hide purple mouth outline on video' : 'Show purple mouth outline on video'}
              >
                <span className="camera-mouth-outline-toggle-label">Outline</span>
                <span className="camera-mouth-outline-toggle-pill">{showMouthOutline ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                className="camera-baseline-btn"
                onClick={establishBaseline}
                disabled={recordState === 'baseline'}
                title={
                  recordState === 'baseline'
                    ? 'Baseline capture in progress…'
                    : 'Re-record resting shoulder & head reference (~3 seconds), same as when the camera starts'
                }
                aria-label={
                  recordState === 'baseline'
                    ? 'Establishing baseline — please wait'
                    : 'Establish baseline again — recalibrate shoulder reference'
                }
              >
                Baseline
              </button>
            </div>
            <p className="camera-setup-tip">
              Face the camera with your face and both shoulders clearly in frame. Good lighting helps accuracy.
            </p>
          </div>

          {/* ── Right: Controls & metrics ──────────────────────── */}
          <div className="camera-panel">

            <CameraLiveMetricsPanel
              variant="full"
              recordState={recordState}
              baselineProgress={baselineProgress}
              metrics={metrics}
              currentLevel={currentLevel}
              currentElevPct={currentElevPct}
              isHeadForward={isHeadForward}
              jawPct={jawPct}
              mouthShape={mouthShape}
              asymVisible={asymVisible}
              asymNotable={asymNotable}
            />

            {/* Phrase controls */}
            {recordState !== 'baseline' && (
              <div className="panel-block">
                <button
                  className={`phrase-btn ${
                    recordState === 'recording' ? 'phrase-btn-stop' :
                    recordState === 'done'      ? 'phrase-btn-reset' :
                                                  'phrase-btn-start'
                  }`}
                  onClick={handlePhraseToggle}
                >
                  {recordState === 'recording' ? 'End phrase' :
                   recordState === 'done'      ? 'Try another phrase' :
                                                 'Start phrase'}
                </button>
                {recordState === 'ready' && (
                  <p className="panel-hint" style={{ marginTop: 10 }}>
                    Sing or hum a phrase. Press "End phrase" when you finish — the camera will share what it noticed.
                  </p>
                )}
              </div>
            )}

            {/* Observation */}
            {observation && recordState === 'done' && (
              <div className="obs-card">
                <div className="obs-card-label">Observation</div>
                <p className="obs-card-text">{observation}</p>
              </div>
            )}

            {/* About section */}
            <div className="panel-block panel-about">
              <div className="about-heading">What the camera tracks</div>
              <ul className="about-list">
                <li><strong>Shoulders</strong> — three levels: settled / mild tension / raised, using a 20-frame smoothed average so the bar doesn't jitter on every breath</li>
                <li><strong>Asymmetry</strong> — whether one shoulder is held consistently higher than the other</li>
                <li><strong>Head</strong> — forward displacement relative to your baseline (via z-depth)</li>
                <li><strong>Jaw</strong> — opening score from face blendshapes (0–100%)</li>
                <li><strong>Mouth</strong> — vertical vs. horizontal aperture ratio</li>
              </ul>
              <p className="about-note">
                Processing runs entirely in your browser via WebAssembly. Nothing is sent anywhere.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
