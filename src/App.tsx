import { useLayoutEffect, useRef, type JSX } from 'react'
import gsap from 'gsap'
import { useGameStore } from './store/gameStore'
import IdleScreen   from './components/ui/IdleScreen'
import EndScreen    from './components/ui/EndScreen'
import GameScene    from './components/game/GameScene'
import HUD          from './components/ui/HUD'
import AudioManager from './audio/AudioManager'

export default function App(): JSX.Element {
  const phase      = useGameStore((s) => s.phase)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Flash a black overlay on every phase transition so the incoming screen
  // fades in cleanly rather than popping in.
  useLayoutEffect(() => {
    const el = overlayRef.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.set(el, { opacity: 1 })
    gsap.to(el, { opacity: 0, duration: 0.45, ease: 'power2.out', delay: 0.05 })
  }, [phase])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a0a' }}>
      <AudioManager />

      {phase === 'playing' && (
        <>
          <GameScene />
          <HUD />
        </>
      )}
      {phase === 'idle' && <IdleScreen />}
      {phase === 'end'  && <EndScreen  />}

      <div
        ref={overlayRef}
        style={{
          position:      'absolute',
          inset:         0,
          background:    '#000',
          pointerEvents: 'none',
          zIndex:        9999,
          opacity:       0,
        }}
      />
    </div>
  )
}
