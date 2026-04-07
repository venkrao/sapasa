import { useState } from 'react'
import './HissChart.css'

export type HissSession = { day: string; best: number }

type Props = { sessions: HissSession[] }

const TARGET_SEC = 45
const CHART_H    = 100   // inner SVG height (px)
const BAR_W      = 14
const BAR_GAP    = 5
const PAD_L      = 32    // space for y-axis labels
const PAD_B      = 20    // space for x-axis labels
const PAD_T      = 8
const PAD_R      = 8

/** Abbreviate "2025-04-07" → "Apr 7" */
function fmtDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtSec(s: number): string {
  return s.toFixed(1) + 's'
}

export default function HissChart({ sessions }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; best: number } | null>(null)

  if (sessions.length === 0) {
    return <p className="hiss-chart-empty">No sessions recorded yet — complete a hiss to start tracking.</p>
  }

  const maxVal  = Math.max(TARGET_SEC * 1.1, ...sessions.map(s => s.best))
  const totalW  = PAD_L + sessions.length * (BAR_W + BAR_GAP) - BAR_GAP + PAD_R
  const svgH    = CHART_H + PAD_T + PAD_B

  function yOf(val: number) {
    return PAD_T + CHART_H - (val / maxVal) * CHART_H
  }

  const targetY = yOf(TARGET_SEC)

  // Y-axis ticks: 0, 15, 30, 45, and max if it exceeds 45
  const yTicks = [0, 15, 30, 45]
  if (maxVal > 50) yTicks.push(Math.round(maxVal / 5) * 5)

  return (
    <div className="hiss-chart-wrap">
      <div className="hiss-chart-scroll">
        <svg
          className="hiss-chart-svg"
          width={totalW}
          height={svgH}
          aria-label="SSS Hiss daily best times"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Y-axis gridlines + labels */}
          {yTicks.map(t => {
            const cy = yOf(t)
            return (
              <g key={t}>
                <line
                  x1={PAD_L} y1={cy} x2={totalW - PAD_R} y2={cy}
                  className="hiss-grid-line"
                />
                <text x={PAD_L - 4} y={cy + 4} className="hiss-axis-label" textAnchor="end">
                  {t}
                </text>
              </g>
            )
          })}

          {/* 45 s target line */}
          <line
            x1={PAD_L} y1={targetY} x2={totalW - PAD_R} y2={targetY}
            className="hiss-target-line"
            strokeDasharray="4 3"
          />
          <text x={totalW - PAD_R - 2} y={targetY - 4} className="hiss-target-label" textAnchor="end">
            target
          </text>

          {/* Bars */}
          {sessions.map((s, i) => {
            const barH   = (s.best / maxVal) * CHART_H
            const bx     = PAD_L + i * (BAR_W + BAR_GAP)
            const by     = yOf(s.best)
            const isGood = s.best >= TARGET_SEC

            return (
              <g
                key={s.day}
                onMouseEnter={e => {
                  const rect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect()
                  setTooltip({
                    x: bx + BAR_W / 2,
                    y: by - 6,
                    day: s.day,
                    best: s.best,
                  })
                }}
              >
                <rect
                  x={bx} y={by} width={BAR_W} height={barH}
                  rx={3}
                  className={isGood ? 'hiss-bar hiss-bar-good' : 'hiss-bar hiss-bar-low'}
                />
                {/* X-axis label — show every other bar when many sessions */}
                {(sessions.length <= 14 || i % 2 === 0) && (
                  <text
                    x={bx + BAR_W / 2}
                    y={svgH - 4}
                    className="hiss-axis-label"
                    textAnchor="middle"
                  >
                    {fmtDay(s.day).split(' ')[1]}
                  </text>
                )}
              </g>
            )
          })}

          {/* Tooltip */}
          {tooltip && (
            <g className="hiss-tooltip-group">
              <rect
                x={tooltip.x - 36} y={tooltip.y - 26}
                width={72} height={24}
                rx={4}
                className="hiss-tooltip-bg"
              />
              <text x={tooltip.x} y={tooltip.y - 18} className="hiss-tooltip-day" textAnchor="middle">
                {fmtDay(tooltip.day)}
              </text>
              <text x={tooltip.x} y={tooltip.y - 7} className="hiss-tooltip-val" textAnchor="middle">
                {fmtSec(tooltip.best)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Month labels below scroll area */}
      <div className="hiss-chart-months">
        {sessions
          .filter((_, i) => i === 0 || fmtDay(sessions[i - 1].day).split(' ')[0] !== fmtDay(sessions[i].day).split(' ')[0])
          .map(s => (
            <span key={s.day} className="hiss-chart-month-label">
              {fmtDay(s.day).split(' ')[0]}
            </span>
          ))}
      </div>
    </div>
  )
}
