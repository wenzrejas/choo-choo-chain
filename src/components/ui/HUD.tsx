import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react'
import gsap from 'gsap'
import { useGameStore } from '../../store/gameStore'
import { ENERGY_MAX, SHIELD_DURATION } from '../../utils/constants'

const WAGON_COLORS = { copper: '#b87333', silver: '#aaaaaa', gold: '#f5a400' } as const

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon(): JSX.Element {
  return (
    <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
      {/* 3D rim — dark purple for depth */}
      <circle cx="18" cy="22" r="15" fill="#6b21a8" />
      {/* Face border ring */}
      <circle cx="18" cy="18" r="15" fill="#ddd6fe" />
      {/* Face */}
      <circle cx="18" cy="18" r="13" fill="white" />
      {/* Top-left highlight arc */}
      <path d="M8 11 A13 13 0 0 1 23 6" stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Hands */}
      <line x1="18" y1="18" x2="18" y2="8"  stroke="#4c1d95" strokeWidth="3" strokeLinecap="round" />
      <line x1="18" y1="18" x2="26" y2="18" stroke="#4c1d95" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2.5" fill="#4c1d95" />
    </svg>
  )
}

function OctahedronIcon({ color }: { color: string }): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {/* Top face */}
      <polygon points="7,0 13,6 7,7 1,6" fill={color} />
      {/* Bottom face — slightly darker */}
      <polygon points="7,14 13,8 7,7 1,8" fill={color} opacity="0.6" />
      {/* Left edge */}
      <polygon points="1,6 7,7 1,8" fill="rgba(0,0,0,0.08)" />
      {/* Right edge */}
      <polygon points="13,6 7,7 13,8" fill="rgba(0,0,0,0.08)" />
    </svg>
  )
}

function StarIcon(): JSX.Element {
  return (
    <svg width="32" height="34" viewBox="0 0 30 32" fill="none">
      {/* 3D depth — shadow layer offset down */}
      <polygon
        points="15,2 18.3,10 27,11 21,17 22.5,26 15,21 7.5,26 9,17 3,11 11.7,10"
        fill="#b87200"
        transform="translate(0,3)"
      />
      {/* Main body */}
      <polygon
        points="15,2 18.3,10 27,11 21,17 22.5,26 15,21 7.5,26 9,17 3,11 11.7,10"
        fill="#f5a400"
      />
      {/* Top highlight face */}
      <polygon
        points="15,2 18.3,10 27,11 21,17 15,13.5 9,17 3,11 11.7,10"
        fill="#ffe040"
      />
    </svg>
  )
}

function LightningIcon({ active }: { active: boolean }): JSX.Element {
  const front = active ? '#ff9500' : '#ffe040'
  const side  = active ? '#cc5500' : '#d4880a'
  return (
    <svg width="22" height="30" viewBox="0 0 22 30" fill="none">
      {/* Side face — peeks out right for depth */}
      <path d="M14 3 L5 17 H11 L10 30 L20 14 H14 Z" fill={side} />
      {/* Front face */}
      <path d="M11 1 L2 15 H8 L7 28 L17 12 H11 Z" fill={front} />
    </svg>
  )
}

function ShieldIcon(): JSX.Element {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
      {/* Drop shadow depth layer */}
      <path d="M11 3 L20 7 L20 16 C20 22 11 26 11 26 C11 26 2 22 2 16 L2 7 Z" fill="#4a1080" />
      {/* Main body */}
      <path d="M11 2 L20 6 L20 15 C20 21 11 25 11 25 C11 25 2 21 2 15 L2 6 Z" fill="#7c3aed" />
      {/* Top bevel highlight */}
      <path d="M11 2 L20 6 L16 9 L11 7 L6 9 L2 6 Z" fill="#a855f7" />
      {/* Shine stroke */}
      <path d="M11 4 L18 8 L18 15 C18 20 11 23 11 23" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ─── Shield card with circular progress ──────────────────────────────────────

function ShieldCard({ pct }: { pct: number }): JSX.Element {
  const R = 20
  const C = 2 * Math.PI * R
  const offset = C * (1 - pct / 100)
  return (
    <div style={{ ...styles.card, padding: 6, position: 'relative', justifyContent: 'center' }}>
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r={R} stroke="rgba(124,58,237,0.18)" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={R}
          stroke="#7c3aed" strokeWidth="5"
          strokeDasharray={C} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 0.15s linear' }}
        />
      </svg>
      <div style={styles.shieldIconOverlay}>
        <ShieldIcon />
      </div>
    </div>
  )
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

export default function HUD(): JSX.Element {
  const score               = useGameStore((s) => s.score)
  const timeRemaining       = useGameStore((s) => s.timeRemaining)
  const energy              = useGameStore((s) => s.energy)
  const isBoosting          = useGameStore((s) => s.isBoosting)
  const shieldActive        = useGameStore((s) => s.shieldActive)
  const shieldTimeRemaining = useGameStore((s) => s.shieldTimeRemaining)
  const wagonsCollected     = useGameStore((s) => s.wagonsCollected)

  const [bonusAmt, setBonusAmt] = useState(10)
  const prevTimeRef = useRef(timeRemaining)
  const bonusRef    = useRef<HTMLDivElement>(null)

  const energyPct   = (energy / ENERGY_MAX) * 100
  const shieldPct   = (shieldTimeRemaining / SHIELD_DURATION) * 100
  const timeWarning = timeRemaining < 15

  const mins = Math.floor(timeRemaining / 60)
  const secs = Math.floor(timeRemaining % 60)
  const timeDisplay = `${mins}:${String(secs).padStart(2, '0')}`

  useEffect(() => {
    const prev = prevTimeRef.current
    prevTimeRef.current = timeRemaining
    if (timeRemaining - prev > 1 && bonusRef.current) {
      setBonusAmt(Math.round(timeRemaining - prev))
      gsap.killTweensOf(bonusRef.current)
      gsap.fromTo(
        bonusRef.current,
        { y: 0, opacity: 1 },
        { y: -36, opacity: 0, duration: 1.3, ease: 'power2.out' },
      )
    }
  }, [timeRemaining])

  return (
    <div style={styles.root}>

      {/* ── Timer (top-left) ──────────────────────────────────────────────── */}
      <div style={styles.topLeft}>
        <div style={styles.timerCard}>
          <ClockIcon />
          <span style={{ ...styles.timerValue, color: timeWarning ? '#e53935' : '#5b21b6' }}>
            {timeDisplay}
          </span>
        </div>
        <div ref={bonusRef} style={styles.bonusPopup}>+{bonusAmt}</div>
      </div>

      {/* ── Score + wagon breakdown (top-right) ───────────────────────────── */}
      <div style={styles.scoreArea}>
        <div style={styles.scoreCard}>
          <StarIcon />
          <span style={styles.scoreValue}>{score}</span>
        </div>
        <div style={styles.breakdownRow}>
          {(['copper', 'silver', 'gold'] as const).map((type) => (
            <div key={type} style={styles.breakdownItem}>
              <OctahedronIcon color={WAGON_COLORS[type]} />
              <span style={styles.breakdownNum}>{wagonsCollected[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Countdown overlay (center) ───────────────────────────────────── */}
      {timeRemaining > 0 && timeRemaining < 5 && (
        <div style={styles.countdown}>{Math.ceil(timeRemaining)}</div>
      )}

      {/* ── Bottom-right: shield + boost ──────────────────────────────────── */}
      <div style={styles.bottomRight}>
        {shieldActive && <ShieldCard pct={shieldPct} />}

        <div style={{ ...styles.card, ...styles.boostCard }}>
          <div style={styles.boostTrack}>
            <div style={{
              ...styles.boostFill,
              height:     `${energyPct}%`,
              background: isBoosting
                ? 'linear-gradient(to top, #cc4400, #ff8800)'
                : 'linear-gradient(to top, #f5a400, #ffe040)',
            }} />
          </div>
          <LightningIcon active={isBoosting} />
        </div>
      </div>

    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    position:      'absolute',
    inset:         0,
    pointerEvents: 'none',
    fontFamily:    "'Fredoka One', cursive",
  } satisfies CSSProperties,

  card: {
    background:   'white',
    borderRadius:  10,
    padding:       '8px 14px',
    display:       'flex',
    alignItems:    'center',
    gap:           8,
    boxShadow:     '0 2px 10px rgba(0,0,0,0.12)',
  } satisfies CSSProperties,

  // ── Timer ──────────────────────────────────────────────────────────────────
  timerCard: {
    width:          180,
    background:     'white',
    borderRadius:   10,
    padding:        '10px 16px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    boxShadow:      '0 2px 10px rgba(0,0,0,0.12)',
  } satisfies CSSProperties,

  topLeft: {
    position:   'absolute',
    top:        24,
    left:       28,
    display:    'flex',
    alignItems: 'center',
    gap:        10,
  } satisfies CSSProperties,

  timerValue: {
    fontSize:           36,
    lineHeight:         1,
    fontVariantNumeric: 'tabular-nums',
  } satisfies CSSProperties,

  bonusPopup: {
    fontSize:   26,
    color:      '#3399ff',
    fontFamily: "'Fredoka One', cursive",
    opacity:    0,
  } satisfies CSSProperties,

  // ── Score + breakdown ──────────────────────────────────────────────────────
  scoreArea: {
    position:      'absolute',
    top:           24,
    right:         28,
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'flex-end',
    gap:           8,
  } satisfies CSSProperties,

  scoreCard: {
    width:          190,
    background:     'white',
    borderRadius:   10,
    padding:        '10px 16px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    boxShadow:      '0 2px 10px rgba(0,0,0,0.12)',
  } satisfies CSSProperties,

  scoreValue: {
    fontSize:           36,
    color:              '#1a1a2e',
    lineHeight:         1,
    fontVariantNumeric: 'tabular-nums',
  } satisfies CSSProperties,

  breakdownRow: {
    width:          '100%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    background:     'white',
    borderRadius:   10,
    padding:        '6px 14px',
    boxShadow:      '0 2px 10px rgba(0,0,0,0.12)',
    boxSizing:      'border-box',
  } satisfies CSSProperties,

  breakdownItem: {
    display:    'flex',
    alignItems: 'center',
    gap:        5,
  } satisfies CSSProperties,

  breakdownNum: {
    fontSize:           16,
    color:              '#1a1a2e',
    fontVariantNumeric: 'tabular-nums',
    lineHeight:         1,
    minWidth:           16,
    textAlign:          'center',
  } satisfies CSSProperties,

  // ── Shield ─────────────────────────────────────────────────────────────────
  shieldIconOverlay: {
    position:  'absolute',
    top:       '50%',
    left:      '50%',
    transform: 'translate(-50%, -50%)',
  } satisfies CSSProperties,

  // ── Bottom-right ───────────────────────────────────────────────────────────
  bottomRight: {
    position:      'absolute',
    bottom:        28,
    right:         28,
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'stretch',
    gap:           16,
  } satisfies CSSProperties,

  boostCard: {
    flexDirection: 'column',
    alignItems:    'center',
    padding:       '16px 22px',
    gap:           14,
  } satisfies CSSProperties,

  countdown: {
    position:           'absolute',
    top:                '50%',
    left:               '50%',
    transform:          'translate(-50%, -50%)',
    fontSize:           260,
    lineHeight:         1,
    fontVariantNumeric: 'tabular-nums',
    color:              '#1a1a2e',
    opacity:            0.1,
    userSelect:         'none',
  } satisfies CSSProperties,

  boostTrack: {
    width:          12,
    height:         250,
    background:     'rgba(0,0,0,0.18)',
    borderRadius:   8,
    overflow:       'hidden',
    display:        'flex',
    flexDirection:  'column',
    justifyContent: 'flex-end',
  } satisfies CSSProperties,

  boostFill: {
    width:        '100%',
    borderRadius: 8,
    transition:   'height 0.12s linear, background 0.3s ease',
  } satisfies CSSProperties,
}
