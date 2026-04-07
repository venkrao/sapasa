import './HomeScreen.css'

type Props = {
  onChoosePitch: () => void
  onChooseEar: () => void
  onChooseOrgan: () => void
  onChooseConsonant: () => void
  onChooseCamera: () => void
}

export default function HomeScreen({ onChoosePitch, onChooseEar, onChooseOrgan, onChooseConsonant, onChooseCamera }: Props) {
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
            aria-label="Open Carnatic training module"
          >
            <div className="home-card-title">Carnatic Training</div>
            <div className="home-card-desc">
              Sing Carnatic phrases and varisai exercises with live pitch tracking and swara guidance.
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

          <button
            type="button"
            className="home-card home-card-organ"
            onClick={onChooseOrgan}
            aria-label="Open organ-specific training module"
          >
            <div className="home-card-title">Organ Training</div>
            <div className="home-card-desc">
              Exercises for the physical organs of singing — breath, folds, palate, and more.
            </div>
            <div className="home-card-cta">Open</div>
          </button>

          <button
            type="button"
            className="home-card home-card-consonant"
            onClick={onChooseConsonant}
            aria-label="Open consonant training module"
          >
            <div className="home-card-title">Consonant Training</div>
            <div className="home-card-desc">
              Learn to handle consonants without breaking tone — plosives, nasals, and fricatives.
            </div>
            <div className="home-card-cta">Open</div>
          </button>

          <button
            type="button"
            className="home-card home-card-camera"
            onClick={onChooseCamera}
            aria-label="Open camera observation lab"
          >
            <div className="home-card-title">Camera Lab</div>
            <div className="home-card-desc">
              Watch posture in real time — shoulders, head alignment, jaw opening, and mouth shape.
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

