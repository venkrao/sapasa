import { useState } from 'react'
import './ProgressChart.css'

export type ProgressSession = { day: string; best: number }
export type AttemptRecord   = { ts: string; durationSec: number }

type Props = {
  sessions: ProgressSession[]
  /** Horizontal guide line value (e.g. 45 for SSS Hiss target) */
  targetSec?: number
  /** Unit label shown on y-axis and tooltip */
  unit?: string
}

const CHART_H = 110
const PAD_L   = 30   // y-axis labels
const PAD_R   = 12
const PAD_T   = 14
const PAD_B   = 24   // x-axis labels

/** "2025-04-07" → "Apr 7" */
function fmtDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtVal(v: number, unit: string) {
  return v.toFixed(1) + unit
}

// ── Daily-best line chart ─────────────────────────────────────────────────────

export default function ProgressChart({ sessions, targetSec = 45, unit = 's' }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (sessions.length === 0) {
    return (
      <p className="prog-empty">
        No sessions yet — complete an exercise to start tracking.
      </p>
    )
  }

  const maxVal = Math.max(targetSec * 1.15, ...sessions.map(s => s.best))

  // Chart width scales with number of sessions; minimum fills the column.
  const minW    = 480
  const perPt   = 36                                   // px per data point
  const innerW  = Math.max(minW - PAD_L - PAD_R, (sessions.length - 1) * perPt)
  const totalW  = PAD_L + innerW + PAD_R
  const svgH    = CHART_H + PAD_T + PAD_B

  function xOf(i: number) {
    if (sessions.length === 1) return PAD_L + innerW / 2
    return PAD_L + (i / (sessions.length - 1)) * innerW
  }

  function yOf(val: number) {
    return PAD_T + CHART_H - (val / maxVal) * CHART_H
  }

  const targetY = yOf(targetSec)

  // Build polyline points string
  const polyPts = sessions
    .map((s, i) => `${xOf(i).toFixed(1)},${yOf(s.best).toFixed(1)}`)
    .join(' ')

  // Y-axis ticks
  const yTicks = Array.from(new Set([0, 15, 30, targetSec]))
    .filter(t => t <= maxVal)
    .sort((a, b) => a - b)

  // X-axis: show label every N points so they don't crowd
  const labelEvery = sessions.length <= 7 ? 1 : sessions.length <= 14 ? 2 : 3
  const showMonth = (i: number) =>
    i === 0 ||
    fmtDay(sessions[i].day).split(' ')[0] !== fmtDay(sessions[i - 1].day).split(' ')[0]

  const hovered = hoveredIdx !== null ? sessions[hoveredIdx] : null

  return (
    <div className="prog-wrap">
      <div className="prog-scroll">
        <svg
          className="prog-svg"
          width={totalW}
          height={svgH}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Y gridlines */}
          {yTicks.map(t => (
            <g key={t}>
              <line
                x1={PAD_L} y1={yOf(t)} x2={PAD_L + innerW} y2={yOf(t)}
                className="prog-grid"
              />
              <text x={PAD_L - 5} y={yOf(t) + 4} className="prog-axis-lbl" textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          {/* Target line */}
          <line
            x1={PAD_L} y1={targetY} x2={PAD_L + innerW} y2={targetY}
            className="prog-target"
            strokeDasharray="4 3"
          />
          <text x={PAD_L + innerW} y={targetY - 4} className="prog-target-lbl" textAnchor="end">
            target
          </text>

          {/* Area fill under the line */}
          <path
            d={`M ${xOf(0).toFixed(1)},${yOf(sessions[0].best).toFixed(1)} ` +
               sessions.slice(1).map((s, i) =>
                 `L ${xOf(i + 1).toFixed(1)},${yOf(s.best).toFixed(1)}`
               ).join(' ') +
               ` L ${xOf(sessions.length - 1).toFixed(1)},${PAD_T + CHART_H}` +
               ` L ${xOf(0).toFixed(1)},${PAD_T + CHART_H} Z`}
            className="prog-area"
          />

          {/* Line */}
          <polyline points={polyPts} className="prog-line" />

          {/* Dots + hit targets */}
          {sessions.map((s, i) => {
            const cx = xOf(i)
            const cy = yOf(s.best)
            const isH = hoveredIdx === i
            const isGood = s.best >= targetSec
            return (
              <g key={s.day}>
                <circle
                  cx={cx} cy={cy} r={isH ? 5 : 3.5}
                  className={isGood ? 'prog-dot prog-dot-good' : 'prog-dot prog-dot-low'}
                />
                {/* Invisible larger hit area */}
                <circle
                  cx={cx} cy={cy} r={10}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                />
                {/* X-axis labels */}
                {i % labelEvery === 0 && (
                  <text
                    x={cx} y={svgH - 4}
                    className={'prog-axis-lbl' + (showMonth(i) ? ' prog-month-tick' : '')}
                    textAnchor="middle"
                  >
                    {showMonth(i)
                      ? fmtDay(s.day).replace(' ', '\u00a0')   // "Apr\u00a07"
                      : fmtDay(s.day).split(' ')[1]}
                  </text>
                )}
              </g>
            )
          })}

          {/* Tooltip */}
          {hovered && hoveredIdx !== null && (() => {
            const tx = xOf(hoveredIdx)
            const ty = yOf(hovered.best)
            const boxW = 68
            const boxH = 28
            const bx = Math.min(tx - boxW / 2, totalW - boxW - 2)
            const by = ty - boxH - 8
            return (
              <g className="prog-tip">
                <rect x={bx} y={by} width={boxW} height={boxH} rx={4} className="prog-tip-bg" />
                <text x={bx + boxW / 2} y={by + 10} className="prog-tip-day" textAnchor="middle">
                  {fmtDay(hovered.day)}
                </text>
                <text x={bx + boxW / 2} y={by + 22} className="prog-tip-val" textAnchor="middle">
                  {fmtVal(hovered.best, unit)}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}

// ── Daily completions count (bar chart) ──────────────────────────────────────

type DailyCountProps = {
  attempts: AttemptRecord[]
}

export function DailyCountChart({ attempts }: DailyCountProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (attempts.length === 0) {
    return (
      <p className="prog-empty">
        No completions yet — mark an exercise done to start tracking.
      </p>
    )
  }

  // Group attempts by calendar day → count
  const dayMap = new Map<string, number>()
  for (const a of attempts) {
    const day = a.ts.slice(0, 10)
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }
  const days = Array.from(dayMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))

  const maxCount  = Math.max(...days.map(d => d.count), 3)
  const yMax      = maxCount + 1

  const BAR_W = 28
  const GAP   = 8
  const minW  = 480
  const innerW = Math.max(minW - PAD_L - PAD_R, days.length * (BAR_W + GAP))
  const totalW = PAD_L + innerW + PAD_R
  const svgH   = CHART_H + PAD_T + PAD_B

  const yOf   = (v: number) => PAD_T + CHART_H - (v / yMax) * CHART_H
  const xOfBar = (i: number) => PAD_L + i * (BAR_W + GAP)

  // Y ticks: 0, mid, max
  const mid = Math.round(maxCount / 2)
  const yTicks = Array.from(new Set([0, mid, maxCount])).sort((a, b) => a - b)

  const hovered = hoveredIdx !== null ? days[hoveredIdx] : null

  return (
    <div className="prog-wrap">
      <div className="prog-scroll">
        <svg
          className="prog-svg"
          width={totalW}
          height={svgH}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Y gridlines */}
          {yTicks.map(t => (
            <g key={t}>
              <line
                x1={PAD_L} y1={yOf(t)} x2={PAD_L + innerW} y2={yOf(t)}
                className="prog-grid"
              />
              <text x={PAD_L - 5} y={yOf(t) + 4} className="prog-axis-lbl" textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          {/* Bars */}
          {days.map((d, i) => {
            const bx   = xOfBar(i)
            const by   = yOf(d.count)
            const bh   = PAD_T + CHART_H - by
            const isH  = hoveredIdx === i
            const good = d.count >= 3
            return (
              <g key={d.day}>
                <rect
                  x={bx} y={by} width={BAR_W} height={Math.max(bh, 2)}
                  className={good ? 'prog-bar prog-bar-good' : 'prog-bar prog-bar-low'}
                  opacity={isH ? 1 : 0.75}
                />
                {/* Hit area */}
                <rect
                  x={bx} y={PAD_T} width={BAR_W} height={CHART_H}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                />
                {/* X-axis date label */}
                <text
                  x={bx + BAR_W / 2} y={svgH - 4}
                  className="prog-axis-lbl prog-month-tick"
                  textAnchor="middle"
                >
                  {fmtDay(d.day).replace(' ', '\u00a0')}
                </text>
              </g>
            )
          })}

          {/* Tooltip */}
          {hovered && hoveredIdx !== null && (() => {
            const tx   = xOfBar(hoveredIdx) + BAR_W / 2
            const ty   = yOf(hovered.count)
            const boxW = 60
            const boxH = 28
            const bx   = Math.min(Math.max(tx - boxW / 2, PAD_L), totalW - boxW - 2)
            const by   = Math.max(PAD_T + 2, ty - boxH - 8)
            return (
              <g className="prog-tip">
                <rect x={bx} y={by} width={boxW} height={boxH} rx={4} className="prog-tip-bg" />
                <text x={bx + boxW / 2} y={by + 10} className="prog-tip-day" textAnchor="middle">
                  {fmtDay(hovered.day)}
                </text>
                <text x={bx + boxW / 2} y={by + 22} className="prog-tip-val" textAnchor="middle">
                  {hovered.count}×
                </text>
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}

// ── All-attempts chart ────────────────────────────────────────────────────────

type AttemptsProps = {
  attempts: AttemptRecord[]
  targetSec?: number
  unit?: string
}

/** "2025-04-07T10:30:00" → "Apr 7" */
function fmtAttemptDay(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "2025-04-07T10:30:00" → "10:30" */
function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

export function AttemptsChart({ attempts, targetSec = 45, unit = 's' }: AttemptsProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Guard against stale/malformed data (e.g. backend not yet restarted)
  const valid = attempts.filter(a => a.ts != null && a.durationSec != null)

  if (valid.length === 0) {
    return (
      <p className="prog-empty">
        No attempts yet — complete an exercise to start tracking.
      </p>
    )
  }

  const attempts_ = valid   // use only validated rows below
  const maxVal = Math.max(targetSec * 1.15, ...attempts_.map(a => a.durationSec))

  const minW   = 480
  const perPt  = 26
  const innerW = Math.max(minW - PAD_L - PAD_R, (attempts_.length - 1) * perPt)
  const totalW = PAD_L + innerW + PAD_R
  const svgH   = CHART_H + PAD_T + PAD_B

  function xOf(i: number) {
    if (attempts_.length === 1) return PAD_L + innerW / 2
    return PAD_L + (i / (attempts_.length - 1)) * innerW
  }

  function yOf(val: number) {
    return PAD_T + CHART_H - (val / maxVal) * CHART_H
  }

  const targetY = yOf(targetSec)

  const polyPts = attempts_
    .map((a, i) => `${xOf(i).toFixed(1)},${yOf(a.durationSec).toFixed(1)}`)
    .join(' ')

  const yTicks = Array.from(new Set([0, 15, 30, targetSec]))
    .filter(t => t <= maxVal)
    .sort((a, b) => a - b)

  // Day boundary indices: where the calendar day changes
  const dayBoundaries: number[] = []
  for (let i = 1; i < attempts_.length; i++) {
    if (isoDay(attempts_[i].ts) !== isoDay(attempts_[i - 1].ts)) {
      dayBoundaries.push(i)
    }
  }

  // Day labels: show at the first attempt of each day
  const dayLabelIndices = [0, ...dayBoundaries]

  const hovered = hoveredIdx !== null ? attempts_[hoveredIdx] : null

  return (
    <div className="prog-wrap">
      <div className="prog-scroll">
        <svg
          className="prog-svg"
          width={totalW}
          height={svgH}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Y gridlines */}
          {yTicks.map(t => (
            <g key={t}>
              <line
                x1={PAD_L} y1={yOf(t)} x2={PAD_L + innerW} y2={yOf(t)}
                className="prog-grid"
              />
              <text x={PAD_L - 5} y={yOf(t) + 4} className="prog-axis-lbl" textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          {/* Target line */}
          <line
            x1={PAD_L} y1={targetY} x2={PAD_L + innerW} y2={targetY}
            className="prog-target"
            strokeDasharray="4 3"
          />
          <text x={PAD_L + innerW} y={targetY - 4} className="prog-target-lbl" textAnchor="end">
            target
          </text>

          {/* Day boundary separators */}
          {dayBoundaries.map(i => {
            // Place the divider halfway between the last attempt of the prev day and first of new day
            const bx = (xOf(i - 1) + xOf(i)) / 2
            return (
              <line
                key={`bd-${i}`}
                x1={bx} y1={PAD_T}
                x2={bx} y2={PAD_T + CHART_H}
                className="prog-day-boundary"
              />
            )
          })}

          {/* Area fill */}
          {attempts_.length > 1 && (
            <path
              d={`M ${xOf(0).toFixed(1)},${yOf(attempts_[0].durationSec).toFixed(1)} ` +
                 attempts_.slice(1).map((a, i) =>
                   `L ${xOf(i + 1).toFixed(1)},${yOf(a.durationSec).toFixed(1)}`
                 ).join(' ') +
                 ` L ${xOf(attempts_.length - 1).toFixed(1)},${PAD_T + CHART_H}` +
                 ` L ${xOf(0).toFixed(1)},${PAD_T + CHART_H} Z`}
              className="prog-area"
            />
          )}

          {/* Line */}
          {attempts_.length > 1 && (
            <polyline points={polyPts} className="prog-line" />
          )}

          {/* Dots + hit areas */}
          {attempts_.map((a, i) => {
            const cx   = xOf(i)
            const cy   = yOf(a.durationSec)
            const isH  = hoveredIdx === i
            const good = a.durationSec >= targetSec
            return (
              <g key={`${a.ts}-${i}`}>
                <circle
                  cx={cx} cy={cy} r={isH ? 5 : 3}
                  className={good ? 'prog-dot prog-dot-good' : 'prog-dot prog-dot-low'}
                />
                <circle
                  cx={cx} cy={cy} r={10}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                />
              </g>
            )
          })}

          {/* X-axis day labels at first attempt of each calendar day */}
          {dayLabelIndices.map(i => (
            <text
              key={`dl-${i}`}
              x={xOf(i)} y={svgH - 4}
              className="prog-axis-lbl prog-month-tick"
              textAnchor="middle"
            >
              {fmtAttemptDay(attempts_[i].ts)}
            </text>
          ))}

          {/* Tooltip */}
          {hovered && hoveredIdx !== null && (() => {
            const tx   = xOf(hoveredIdx)
            const ty   = yOf(hovered.durationSec)
            const boxW = 72
            const boxH = 30
            const bx   = Math.min(Math.max(tx - boxW / 2, PAD_L), totalW - boxW - 2)
            const by   = Math.max(PAD_T + 2, ty - boxH - 8)
            return (
              <g className="prog-tip">
                <rect x={bx} y={by} width={boxW} height={boxH} rx={4} className="prog-tip-bg" />
                <text x={bx + boxW / 2} y={by + 11} className="prog-tip-day" textAnchor="middle">
                  {fmtAttemptDay(hovered.ts)} · {fmtTime(hovered.ts)}
                </text>
                <text x={bx + boxW / 2} y={by + 23} className="prog-tip-val" textAnchor="middle">
                  {fmtVal(hovered.durationSec, unit)}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
