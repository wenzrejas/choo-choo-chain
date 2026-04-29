import type { CSSProperties, JSX } from 'react'
import { useGameStore } from '../../store/gameStore'
import { getDifficulty } from '../../utils/difficulty'
import { ENERGY_MAX, SHIELD_DURATION } from '../../utils/constants'

export default function HUD(): JSX.Element {
  const score               = useGameStore((s) => s.score)
  const timeRemaining       = useGameStore((s) => s.timeRemaining)
  const energy              = useGameStore((s) => s.energy)
  const isBoosting          = useGameStore((s) => s.isBoosting)
  const shieldActive        = useGameStore((s) => s.shieldActive)
  const shieldTimeRemaining = useGameStore((s) => s.shieldTimeRemaining)
  const wagonsCollected     = useGameStore((s) => s.wagonsCollected)
  const tailTypes           = useGameStore((s) => s.tailTypes)

  const tailLength  = tailTypes.length
  const energyPct   = (energy / ENERGY_MAX) * 100
  const shieldPct   = (shieldTimeRemaining / SHIELD_DURATION) * 100
  const timeWarning = timeRemaining < 15

  // Difficulty indicator — read every render (cheap pure function)
  const { factor } = getDifficulty(timeRemaining, score)
  const diffLabel   =
    factor < 0.25 ? 'EASY' :
    factor < 0.50 ? 'NORMAL' :
    factor < 0.75 ? 'HARD' :
                    'EXTREME'
  const diffColor   =
    factor < 0.25 ? '#44cc44' :
    factor < 0.50 ? '#aacc44' :
    factor < 0.75 ? '#ffaa00' :
                    '#ff3333'

  return (
    <div style={styles.root}>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        {/* Timer */}
        <div style={{ ...styles.timerBox, color: timeWarning ? '#ff4444' : '#fff' }}>
          <span style={styles.label}>TIME</span>
          <span style={styles.timerValue}>{Math.ceil(timeRemaining)}</span>
          {timeWarning && <span style={styles.pulse}>!</span>}
        </div>

        {/* Score + difficulty badge */}
        <div style={styles.centerCluster}>
          <div style={styles.scoreBox}>
            <span style={styles.scoreValue}>{score}</span>
            <span style={styles.label}>PTS</span>
          </div>
          {/* <div style={{ ...styles.diffBadge, color: diffColor, borderColor: diffColor }}>
            {diffLabel}
          </div> */}
        </div>

        {/* Wagon breakdown */}
        <div style={styles.wagonBreakdown}>
          {/* <span style={{ color: '#b87333' }}>🟤 {wagonsCollected.copper}</span>
          <span style={{ color: '#c0c0c0' }}>⬜ {wagonsCollected.silver}</span>
          <span style={{ color: '#ffd700' }}>🟡 {wagonsCollected.gold}</span>
          <span style={{ color: '#888', fontSize: 11 }}>│ {tailLength} cars</span> */}
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────── */}
      <div style={styles.bottomBar}>
        {/* Energy gauge */}
        <div style={styles.gaugeContainer}>
          <span style={styles.label}>ENERGY  {isBoosting && <span style={{ color: '#00ffaa', letterSpacing: 3 }}>BOOST!</span>}</span>
          <div style={styles.gaugeTrack}>
            <div style={{
              ...styles.gaugeFill,
              width: `${energyPct}%`,
              background: isBoosting
                ? 'linear-gradient(90deg, #00cc55, #00ffaa)'
                : 'linear-gradient(90deg, #226633, #44aa66)',
              boxShadow: isBoosting ? '0 0 8px #00ffaa' : 'none',
            }} />
          </div>
        </div>

        {/* Shield gauge */}
        {shieldActive && (
          <div style={styles.gaugeContainer}>
            <span style={{ ...styles.label, color: '#ff8800' }}>
              SHIELD  <span style={{ letterSpacing: 3 }}>{Math.ceil(shieldTimeRemaining)}s</span>
            </span>
            <div style={styles.gaugeTrack}>
              <div style={{
                ...styles.gaugeFill,
                width: `${shieldPct}%`,
                background: 'linear-gradient(90deg, #994400, #ff8800)',
                boxShadow: '0 0 8px #ff8800',
              }} />
            </div>
          </div>
        )}

        {/* Difficulty bar */}
        {/* <div style={styles.gaugeContainer}>
          <span style={{ ...styles.label, color: diffColor }}>DIFFICULTY</span>
          <div style={styles.gaugeTrack}>
            <div style={{
              ...styles.gaugeFill,
              width: `${factor * 100}%`,
              background: `linear-gradient(90deg, #44cc44, ${diffColor})`,
              transition: 'width 1s linear, background 1s linear',
            }} />
          </div>
        </div> */}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    fontFamily: '"Courier New", monospace',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  } satisfies CSSProperties,

  topBar: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)',
  } satisfies CSSProperties,

  bottomBar: {
    display: 'flex', alignItems: 'flex-end', gap: 20,
    padding: '16px 24px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 100%)',
  } satisfies CSSProperties,

  label: { fontSize: 10, letterSpacing: 4, color: '#888', display: 'block', marginBottom: 3 } satisfies CSSProperties,

  timerBox: { display: 'flex', alignItems: 'baseline', gap: 8 } satisfies CSSProperties,
  timerValue: { fontSize: 44, fontWeight: 900, lineHeight: 1 } satisfies CSSProperties,
  pulse: { fontSize: 28, color: '#ff4444' } satisfies CSSProperties,

  centerCluster: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } satisfies CSSProperties,
  scoreBox: { display: 'flex', flexDirection: 'column', alignItems: 'center' } satisfies CSSProperties,
  scoreValue: { fontSize: 38, fontWeight: 900, color: '#ffd700', lineHeight: 1 } satisfies CSSProperties,

  diffBadge: {
    fontSize: 10, letterSpacing: 5, padding: '2px 8px',
    border: '1px solid', fontWeight: 700, transition: 'color 1s, border-color 1s',
  } satisfies CSSProperties,

  wagonBreakdown: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700, alignItems: 'flex-end' } satisfies CSSProperties,

  gaugeContainer: { display: 'flex', flexDirection: 'column', minWidth: 150 } satisfies CSSProperties,
  gaugeTrack: {
    height: 7, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
  } satisfies CSSProperties,
  gaugeFill: { height: '100%', transition: 'width 0.12s linear' } satisfies CSSProperties,
}
