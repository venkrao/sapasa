import './HomeScreen.css'

type Props = {
  onChoosePitch: () => void
  onChooseEar: () => void
}

export default function HomeScreen({ onChoosePitch, onChooseEar }: Props) {
  return (
    <div className="app home-screen">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <div className="header-controls">
          <span className="home-subtitle">Choose a practice module</span>
        </div>
      </header>

      <main className="home-main">
        <div className="home-card-grid">
          <button
            type="button"
            className="home-card home-card-pitch"
            onClick={onChoosePitch}
            aria-label="Open pitch monitor and exercise"
          >
            <div className="home-card-title">Pitch Monitor</div>
            <div className="home-card-desc">
              Listen and practice Carnatic phrases using live pitch detection.
            </div>
            <div className="home-card-cta">Open</div>
          </button>

          <button
            type="button"
            className="home-card home-card-ear"
            onClick={onChooseEar}
            aria-label="Open ear training module"
          >
            <div className="home-card-title">Ear Training</div>
            <div className="home-card-desc">
              Click swaras to synthesize tones and improve your intonation.
            </div>
            <div className="home-card-cta">Open</div>
          </button>
        </div>

        <div className="home-hint" role="note">
          Ear Training uses generated audio (no recordings). For best results, use headphones.
        </div>
      </main>
    </div>
  )
}

