import type { CSSProperties } from 'react'
import { useGameStore } from '../../store/gameStore'
import { WAGON_POINTS } from '../../utils/constants'
import { sfxClick } from '../../audio/sfx'

export default function EndScreen(): JSX.Element {
  const score           = useGameStore((s) => s.score)
  const wagonsCollected = useGameStore((s) => s.wagonsCollected)
  const startGame       = useGameStore((s) => s.startGame)
  const goToIdle        = useGameStore((s) => s.goToIdle)

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.title}>GAME OVER</div>

        <div style={styles.scoreDisplay}>
          <span style={styles.scoreLabel}>FINAL SCORE</span>
          <span style={styles.scoreValue}>{score}</span>
        </div>

        <div style={styles.breakdown}>
          {(['copper', 'silver', 'gold'] as const).map((type) => (
            <div key={type} style={styles.row}>
              <span style={{ color: type === 'copper' ? '#b87333' : type === 'silver' ? '#c0c0c0' : '#ffd700' }}>
                {type.charAt(0).toUpperCase() + type.slice(1)} × {wagonsCollected[type]}
              </span>
              <span>{wagonsCollected[type] * WAGON_POINTS[type]} pts</span>
            </div>
          ))}
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryBtn}   onClick={() => { sfxClick(); startGame() }}>PLAY AGAIN</button>
          <button style={styles.secondaryBtn} onClick={() => { sfxClick(); goToIdle() }}>MAIN MENU</button>
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.88)',
    fontFamily: '"Courier New", monospace',
  } satisfies CSSProperties,

  card: {
    background: '#0a150a', border: '1px solid #4a9',
    padding: '48px 56px', minWidth: 360, color: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
  } satisfies CSSProperties,

  title: { fontSize: 36, fontWeight: 900, letterSpacing: 12, color: '#ff4444' } satisfies CSSProperties,

  scoreDisplay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } satisfies CSSProperties,
  scoreLabel:   { fontSize: 11, letterSpacing: 6, color: '#888' } satisfies CSSProperties,
  scoreValue:   { fontSize: 72, fontWeight: 900, color: '#ffd700', lineHeight: 1 } satisfies CSSProperties,

  breakdown: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: 8,
    borderTop: '1px solid #2a4a2a', borderBottom: '1px solid #2a4a2a',
    padding: '16px 0',
  } satisfies CSSProperties,

  row: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#ccc' } satisfies CSSProperties,

  buttonGroup: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%' } satisfies CSSProperties,

  primaryBtn: {
    padding: '14px 0', fontSize: 16, letterSpacing: 6, cursor: 'pointer',
    background: '#00cc55', color: '#000', border: 'none',
    fontFamily: 'inherit', fontWeight: 700,
  } satisfies CSSProperties,

  secondaryBtn: {
    padding: '12px 0', fontSize: 13, letterSpacing: 5, cursor: 'pointer',
    background: 'transparent', color: '#4a9', border: '1px solid #4a9',
    fontFamily: 'inherit', fontWeight: 700,
  } satisfies CSSProperties,
}
