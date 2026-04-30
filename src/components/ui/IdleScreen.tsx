import type { CSSProperties, JSX } from 'react'
import { useGameStore } from '../../store/gameStore'
import { sfxClick } from '../../audio/sfx'
import { AudioEngine } from '../../audio/AudioEngine'

export default function IdleScreen(): JSX.Element {
  const startGame = useGameStore((s) => s.startGame)

  const handleStart = (): void => {
    AudioEngine.resume()
    sfxClick()
    startGame()
  }

  return (
    <div style={styles.root}>
      <div style={styles.content}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} width={'100%'} />
        <button style={styles.startBtn} onClick={handleStart}>
          START GAME
        </button>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    position:        'absolute',
    inset:           0,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#18202e',
    userSelect: 'none',
  } satisfies CSSProperties,

  content: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            72,
    padding:        32,
    width:          '100%',
    maxWidth:       620,
    marginTop:      -200,
  } satisfies CSSProperties,

  startBtn: {
    padding:     '17px 54px',
    fontSize:    21,
    fontWeight:  900,
    letterSpacing: 3,
    fontFamily:  '"Arial Black","Helvetica Neue",Arial,sans-serif',
    color:       '#1a1000',
    background:  'linear-gradient(to bottom, #ffe040 0%, #f5a400 100%)',
    border:      'none',
    borderBottom: '6px solid #b87200',
    borderRadius: 20,
    cursor:      'pointer',
  } satisfies CSSProperties,
}
