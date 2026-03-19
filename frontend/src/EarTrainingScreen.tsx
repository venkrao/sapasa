import EarTrainerPanel from './EarTrainerPanel'
import './EarTrainingScreen.css'

type Props = {
  onHome: () => void
}

export default function EarTrainingScreen({ onHome }: Props) {
  return (
    <div className="app">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <div className="header-controls">
          <button className="listen-button home-nav-button" onClick={onHome} type="button" title="Back to home">
            Home
          </button>
        </div>
      </header>

      <div className="ear-training-main">
        <h1 className="ear-training-title">Ear Training</h1>
        <EarTrainerPanel />
      </div>
    </div>
  )
}

