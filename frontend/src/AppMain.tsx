import { useState } from 'react'
import './App.css'
import HomeScreen from './HomeScreen'
import PitchMonitorScreen from './PitchMonitorScreen'
import EarTrainingScreen from './EarTrainingScreen'
import OrganTrainingScreen from './OrganTrainingScreen'
import ConsonantTrainingScreen from './ConsonantTrainingScreen'
import CameraObservationLab from './CameraObservationLab'

type Screen = 'home' | 'pitch' | 'ear' | 'organ' | 'consonant' | 'camera'

export default function AppMain() {
  const [screen, setScreen] = useState<Screen>('home')

  if (screen === 'home') {
    return (
      <HomeScreen
        onChoosePitch={() => setScreen('pitch')}
        onChooseEar={() => setScreen('ear')}
        onChooseOrgan={() => setScreen('organ')}
        onChooseConsonant={() => setScreen('consonant')}
        onChooseCamera={() => setScreen('camera')}
      />
    )
  }

  if (screen === 'pitch')    return <PitchMonitorScreen onHome={() => setScreen('home')} />
  if (screen === 'organ')    return <OrganTrainingScreen onHome={() => setScreen('home')} />
  if (screen === 'consonant') return <ConsonantTrainingScreen onHome={() => setScreen('home')} />
  if (screen === 'camera')   return <CameraObservationLab onHome={() => setScreen('home')} />

  return <EarTrainingScreen onHome={() => setScreen('home')} />
}

