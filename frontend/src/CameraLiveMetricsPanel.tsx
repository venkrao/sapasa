import './CameraObservationLab.css'
import type { LiveMetrics, ShoulderLevel } from './cameraMetrics'

export type CameraRecordState = 'baseline' | 'ready' | 'recording' | 'done'

type Props = {
  /** `embedded` = scrollable stack for PiP; `full` = same blocks as Camera Lab right column */
  variant: 'full' | 'embedded'
  recordState: CameraRecordState
  baselineProgress: number
  metrics: LiveMetrics | null
  currentLevel: ShoulderLevel | null
  currentElevPct: number
  isHeadForward: boolean
  jawPct: number | null
  mouthShape: string | null
  asymVisible: boolean
  asymNotable: boolean
}

/**
 * The "Live metrics" UI from Camera Observation Lab — baseline progress, status,
 * and the full metrics list — reused in embedded camera views (organ training, Carnatic PiP).
 */
export default function CameraLiveMetricsPanel({
  variant,
  recordState,
  baselineProgress,
  metrics,
  currentLevel,
  currentElevPct,
  isHeadForward,
  jawPct,
  mouthShape,
  asymVisible,
  asymNotable,
}: Props) {
  const blocks = (
    <>
      {recordState === 'baseline' && (
        <div className="panel-block">
          <div className="panel-block-label">Establishing baseline</div>
          <div className="baseline-track">
            <div className="baseline-fill" style={{ width: `${baselineProgress}%` }} />
          </div>
          <div className="panel-hint">
            Stand naturally — this records your resting shoulder and head position as a reference.
          </div>
        </div>
      )}

      {recordState !== 'baseline' && (
        <div className="panel-block status-block">
          <span className={`rec-dot ${recordState === 'recording' ? 'rec-dot-live' : ''}`} />
          <span className="status-label">
            {recordState === 'recording' ? 'Recording phrase…' :
             recordState === 'done'      ? 'Phrase complete' :
                                           'Ready'}
          </span>
        </div>
      )}

      <div className="panel-block">
        <div className="metrics-heading">Live metrics</div>
        <div className="metrics-list">

          <div className="metric-row metric-row-col">
            <div className="metric-row-top">
              <span className="metric-label">Shoulders</span>
              <span className={`metric-value metric-${
                !metrics?.shouldersVisible ? 'off' :
                currentLevel === 'raised'  ? 'raised' :
                currentLevel === 'tension' ? 'warn' : 'ok'
              }`}>
                {!metrics?.shouldersVisible ? '—' :
                 currentLevel === 'raised'  ? 'raised' :
                 currentLevel === 'tension' ? 'mild tension' :
                 currentLevel === 'settled' ? 'settled' : '—'}
              </span>
            </div>
            <div className="shoulder-bar-track">
              <div
                className={`shoulder-bar-fill shoulder-bar-${currentLevel ?? 'off'}`}
                style={{ width: `${currentElevPct}%` }}
              />
              <div className="shoulder-bar-tick" style={{ left: '20%' }} />
              <div className="shoulder-bar-tick" style={{ left: '63%' }} />
            </div>
          </div>

          {asymVisible && (
            <MetricRow
              label="Asymmetry"
              value={asymNotable ? 'one side higher' : 'even'}
              status={asymNotable ? 'warn' : 'ok'}
              indent
            />
          )}

          <MetricRow
            label="Head"
            value={metrics?.headForward != null
              ? isHeadForward ? 'forward' : 'aligned'
              : '—'}
            status={metrics?.shouldersVisible ? (isHeadForward ? 'warn' : 'ok') : 'off'}
          />
          <MetricRow
            label="Jaw open"
            value={jawPct != null ? `${jawPct}%` : '—'}
            status={metrics?.faceVisible
              ? (jawPct != null && jawPct < 18 ? 'warn' : 'ok')
              : 'off'}
          />
          <MetricRow
            label="Mouth shape"
            value={mouthShape ?? '—'}
            status={metrics?.faceVisible
              ? (mouthShape === 'spread' ? 'warn' : 'ok')
              : 'off'}
          />
        </div>
      </div>
    </>
  )

  if (variant === 'embedded') {
    return <div className="camera-embedded-metrics-stack">{blocks}</div>
  }
  return blocks
}

function MetricRow({
  label, value, status, indent,
}: {
  label: string
  value: string
  status: 'ok' | 'warn' | 'raised' | 'off'
  indent?: boolean
}) {
  return (
    <div className={`metric-row${indent ? ' metric-row-indent' : ''}`}>
      <span className="metric-label">{label}</span>
      <span className={`metric-value metric-${status}`}>{value}</span>
    </div>
  )
}
