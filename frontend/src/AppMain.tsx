import { useState } from 'react'
import './App.css'
import HomeScreen from './HomeScreen'
import PitchMonitorScreen from './PitchMonitorScreen'
import EarTrainingScreen from './EarTrainingScreen'
import OrganTrainingScreen from './OrganTrainingScreen'

type Screen = 'home' | 'pitch' | 'ear' | 'organ'

export default function AppMain() {
  const [screen, setScreen] = useState<Screen>('home')

  if (screen === 'home') {
    return (
      <HomeScreen
        onChoosePitch={() => setScreen('pitch')}
        onChooseEar={() => setScreen('ear')}
        onChooseOrgan={() => setScreen('organ')}
      />
    )
  }

  if (screen === 'pitch') return <PitchMonitorScreen onHome={() => setScreen('home')} />
  if (screen === 'organ') return <OrganTrainingScreen onHome={() => setScreen('home')} />

  return <EarTrainingScreen onHome={() => setScreen('home')} />
}

