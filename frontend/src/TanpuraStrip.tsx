import { useCallback, useEffect, useRef, useState } from 'react'
import { TanpuraDroneEngine } from './audio/tanpuraDroneEngine'

export type TanpuraStripProps = {
  saHz: number
  shrutiSummary: string
}

const VOLUME_MIN = -20
const VOLUME_MAX = 0
const VOLUME_DEFAULT = -6

export default function TanpuraStrip({ saHz, shrutiSummary }: TanpuraStripProps) {
  const engineRef = useRef<TanpuraDroneEngine | null>(null)
  const liveClearRef = useRef<number | null>(null)
  const [active, setActive] = useState(false)
  const [includePa, setIncludePa] = useState(true)
  const [volumeDb, setVolumeDb] = useState(VOLUME_DEFAULT)
  const [liveMsg, setLiveMsg] = useState('')

  useEffect(() => {
    engineRef.current?.updateShruti(saHz)
  }, [saHz])

  useEffect(() => {
    engineRef.current?.updateIncludePa(includePa)
  }, [includePa])

  useEffect(() => {
    if (engineRef.current?.isRunning) engineRef.current.setVolumeDb(volumeDb)
  }, [volumeDb])

  useEffect(() => {
    return () => {
      if (liveClearRef.current != null) window.clearTimeout(liveClearRef.current)
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  const toggleDrone = useCallback(async () => {
    if (!engineRef.current) engineRef.current = new TanpuraDroneEngine()

    if (engineRef.current.isRunning) {
      engineRef.current.stop()
      setActive(false)
      setLiveMsg('')
      if (liveClearRef.current != null) {
        window.clearTimeout(liveClearRef.current)
        liveClearRef.current = null
      }
      return
    }

    await engineRef.current.start(saHz, includePa, volumeDb)
    setActive(true)
    setLiveMsg(`Tanpura drone started, Sa ${shrutiSummary}`)
    if (liveClearRef.current != null) window.clearTimeout(liveClearRef.current)
    liveClearRef.current = window.setTimeout(() => {
      setLiveMsg('')
      liveClearRef.current = null
    }, 4000)
  }, [saHz, includePa, volumeDb, shrutiSummary])

  return (
    <div className="tanpura-bar">
      <div className="tanpura-bar-inner" aria-label="Tanpura drone controls">
        <button
          type="button"
          className={'tanpura-toggle ' + (active ? 'tanpura-toggle-on' : '')}
          onClick={() => void toggleDrone()}
          aria-pressed={active}
          title={active ? 'Stop tanpura drone' : 'Start tanpura drone (uses speakers — mind mic bleed)'}
        >
          {active ? 'Stop tanpura' : 'Start tanpura'}
        </button>

        <label className="tanpura-pa">
          <input
            type="checkbox"
            checked={includePa}
            onChange={e => setIncludePa(e.target.checked)}
          />
          <span>Pa</span>
        </label>

        <label className="tanpura-vol">
          <span className="tanpura-vol-label">Drone vol</span>
          <input
            className="tanpura-range"
            type="range"
            min={VOLUME_MIN}
            max={VOLUME_MAX}
            step={1}
            value={volumeDb}
            onChange={e => setVolumeDb(Number(e.target.value))}
            aria-label="Tanpura drone volume"
          />
          <span className="tanpura-vol-val">{volumeDb} dB</span>
        </label>
      </div>
      <span className="tanpura-live" aria-live="polite">
        {liveMsg}
      </span>
    </div>
  )
}
