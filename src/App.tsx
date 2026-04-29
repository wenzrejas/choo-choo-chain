import { useGameStore } from './store/gameStore'
import IdleScreen  from './components/ui/IdleScreen'
import EndScreen   from './components/ui/EndScreen'
import GameScene   from './components/game/GameScene'
import HUD         from './components/ui/HUD'
import AudioManager from './audio/AudioManager'
import type { JSX } from 'react'

export default function App(): JSX.Element {
  const phase = useGameStore((s) => s.phase)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a0a' }}>
      {/* AudioManager lives outside phase-gated rendering so BGM
          transitions fire even when screens mount/unmount. */}
      <AudioManager />

      {phase === 'playing' && (
        <>
          <GameScene />
          <HUD />
        </>
      )}
      {phase === 'idle' && <IdleScreen />}
      {phase === 'end'  && <EndScreen  />}
    </div>
  )
}
