import { useState } from 'react'
import OrganTrainingPanel from './OrganTrainingPanel'

type Props = {
  onHome: () => void
}

export default function OrganTrainingScreen({ onHome }: Props) {
  const [selectedOrganId, setSelectedOrganId] = useState('')

  return (
    <div className="app">
      <header className="header">
        <span className="app-name">SaPaSa</span>
        <div className="header-controls">
          <button className="listen-button home-nav-button" onClick={onHome} type="button">
            Home
          </button>
        </div>
      </header>

      <div className="graph-container organ-training-only">
        <OrganTrainingPanel selectedOrganId={selectedOrganId} onOrganChange={setSelectedOrganId} />
      </div>
    </div>
  )
}
