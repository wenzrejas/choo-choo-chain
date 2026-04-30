import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react'
import gsap from 'gsap'
import { useGameStore } from '../../store/gameStore'
import { WAGON_POINTS } from '../../utils/constants'
import { sfxClick } from '../../audio/sfx'

// ─── Wagon icon ───────────────────────────────────────────────────────────────

const WAGON_COLORS = { copper: '#b87333', silver: '#aaaaaa', gold: '#f5a400' } as const

function OctahedronIcon({ color }: { color: string }): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polygon points="7,0 13,6 7,7 1,6" fill={color} />
      <polygon points="7,14 13,8 7,7 1,8" fill={color} opacity="0.6" />
      <polygon points="1,6 7,7 1,8" fill="rgba(0,0,0,0.08)" />
      <polygon points="13,6 7,7 13,8" fill="rgba(0,0,0,0.08)" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EndScreen(): JSX.Element {
  const score           = useGameStore((s) => s.score)
  const wagonsCollected = useGameStore((s) => s.wagonsCollected)
  const startGame       = useGameStore((s) => s.startGame)
  const goToIdle        = useGameStore((s) => s.goToIdle)

  const rootRef     = useRef<HTMLDivElement>(null)
  const titleRef    = useRef<HTMLDivElement>(null)
  const scoreSectRef = useRef<HTMLDivElement>(null)
  const scoreValRef = useRef<HTMLSpanElement>(null)
  const rowsRef     = useRef<HTMLDivElement>(null)
  const btnsRef     = useRef<HTMLDivElement>(null)

  const [displayScore, setDisplayScore]         = useState(0)
  const [primaryHovered,   setPrimaryHovered]   = useState(false)
  const [primaryPressed,   setPrimaryPressed]   = useState(false)
  const [secondaryHovered, setSecondaryHovered] = useState(false)
  const [secondaryPressed, setSecondaryPressed] = useState(false)

  useEffect(() => {
    const tl = gsap.timeline()

    tl.fromTo(titleRef.current,
      { opacity: 0, y: -24 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      0.1,
    )

    tl.fromTo(scoreSectRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' },
      0.4,
    )

    // Score counting animation — "calculating" feel
    const counter = { val: 0 }
    tl.to(counter, {
      val:        score,
      duration:   1.6,
      ease:       'power2.out',
      onUpdate:   () => setDisplayScore(Math.round(counter.val)),
      onComplete: () => setDisplayScore(score),
    }, 0.5)

    if (rowsRef.current) {
      tl.fromTo(
        Array.from(rowsRef.current.children),
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.1, ease: 'power2.out' },
        0.75,
      )
    }

    tl.fromTo(btnsRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      1.25,
    )
  }, [score])

  const exitThen = (action: () => void): void => {
    gsap.to(rootRef.current, {
      opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: action,
    })
  }

  return (
    <div ref={rootRef} style={styles.root}>
      <div style={styles.content}>

        <div ref={titleRef} style={styles.title}>GAME OVER</div>

        <div ref={scoreSectRef} style={styles.scoreSection}>
          <span style={styles.scoreLabel}>FINAL SCORE</span>
          <span ref={scoreValRef} style={styles.scoreValue}>{displayScore}</span>
        </div>

        <div ref={rowsRef} style={styles.breakdown}>
          {(['copper', 'silver', 'gold'] as const).map((type) => (
            <div key={type} style={styles.row}>
              <div style={styles.rowLeft}>
                <OctahedronIcon color={WAGON_COLORS[type]} />
                <span style={{ ...styles.typeName, color: WAGON_COLORS[type] }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
                <span style={styles.typeCount}>× {wagonsCollected[type]}</span>
              </div>
              <span style={styles.rowPts}>
                {wagonsCollected[type] * WAGON_POINTS[type]} pts
              </span>
            </div>
          ))}
        </div>

        <div ref={btnsRef} style={styles.buttonGroup}>
          <button
            style={{
              ...styles.primaryBtn,
              ...(primaryHovered && !primaryPressed ? styles.primaryBtnHover    : {}),
              ...(primaryPressed                    ? styles.primaryBtnPressed  : {}),
            }}
            onClick={() => { sfxClick(); exitThen(startGame) }}
            onMouseEnter={() => setPrimaryHovered(true)}
            onMouseLeave={() => { setPrimaryHovered(false); setPrimaryPressed(false) }}
            onMouseDown={() => setPrimaryPressed(true)}
            onMouseUp={() => setPrimaryPressed(false)}
          >
            PLAY AGAIN
          </button>
          <button
            style={{
              ...styles.secondaryBtn,
              ...(secondaryHovered && !secondaryPressed ? styles.secondaryBtnHover    : {}),
              ...(secondaryPressed                      ? styles.secondaryBtnPressed  : {}),
            }}
            onClick={() => exitThen(goToIdle)}
            onMouseEnter={() => setSecondaryHovered(true)}
            onMouseLeave={() => { setSecondaryHovered(false); setSecondaryPressed(false) }}
            onMouseDown={() => setSecondaryPressed(true)}
            onMouseUp={() => setSecondaryPressed(false)}
          >
            MAIN MENU
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const NOISE_BG = [
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E")`,
  `radial-gradient(ellipse 85% 65% at 50% 45%, transparent 20%, rgba(0,0,0,0.45) 100%)`,
].join(', ')

const styles = {
  root: {
    position:         'absolute',
    inset:            0,
    display:          'flex',
    alignItems:       'center',
    justifyContent:   'center',
    backgroundColor:  '#18202e',
    backgroundImage:  NOISE_BG,
    backgroundRepeat: 'repeat, no-repeat',
    backgroundSize:   '256px 256px, 100% 100%',
    userSelect:       'none',
    fontFamily:       "'Fredoka One', cursive",
  } satisfies CSSProperties,

  content: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           36,
    padding:       32,
    width:         '100%',
    maxWidth:      620,
  } satisfies CSSProperties,

  title: {
    fontSize:      82,
    letterSpacing: 4,
    color:         '#ffe040',
    textAlign:     'center',
  } satisfies CSSProperties,

  scoreSection: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           4,
  } satisfies CSSProperties,

  scoreLabel: {
    fontSize:      12,
    letterSpacing: 5,
    color:         '#7a8a9a',
    fontFamily:    "'Nunito', sans-serif",
    fontWeight:    700,
  } satisfies CSSProperties,

  scoreValue: {
    fontSize:           96,
    color:              '#ffffff',
    lineHeight:         1,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing:      0,
  } satisfies CSSProperties,

  breakdown: {
    width:         '100%',
    display:       'flex',
    flexDirection: 'column',
    gap:           14,
    borderTop:     '1px solid rgba(255,255,255,0.08)',
    borderBottom:  '1px solid rgba(255,255,255,0.08)',
    padding:       '20px 0',
  } satisfies CSSProperties,

  row: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
  } satisfies CSSProperties,

  rowLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        14,
  } satisfies CSSProperties,

  typeName: {
    fontSize:      18,
    letterSpacing: 1,
  } satisfies CSSProperties,

  typeCount: {
    fontSize:   15,
    color:      '#6a7a8a',
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 700,
  } satisfies CSSProperties,

  rowPts: {
    fontSize:      15,
    color:         '#aabbcc',
    fontFamily:    "'Nunito', sans-serif",
    fontWeight:    700,
    letterSpacing: 1,
  } satisfies CSSProperties,

  buttonGroup: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
  } satisfies CSSProperties,

  primaryBtn: {
    padding:       '14px 54px',
    fontSize:      20,
    letterSpacing: 2,
    fontFamily:    "'Fredoka One', cursive",
    color:         '#1a1000',
    background:    'linear-gradient(to bottom, #ffe040 0%, #f5a400 100%)',
    border:        'none',
    borderBottom:  '6px solid #b87200',
    borderRadius:  20,
    cursor:        'pointer',
    transition:    'transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease',
  } satisfies CSSProperties,

  primaryBtnHover: {
    transform:  'scale(1.07) translateY(-3px)',
    filter:     'brightness(1.12)',
    boxShadow:  '0 8px 28px rgba(245,164,0,0.45)',
  } satisfies CSSProperties,

  primaryBtnPressed: {
    transform: 'scale(0.96) translateY(2px)',
    filter:    'brightness(0.9)',
    boxShadow: 'none',
  } satisfies CSSProperties,

  secondaryBtn: {
    padding:       '14px 0',
    fontSize:      20,
    letterSpacing: 3,
    cursor:        'pointer',
    background:    'transparent',
    color:         '#7a8a9a',
    border:        '1px solid rgba(255,255,255,0.15)',
    borderRadius:  20,
    fontFamily:    "'Fredoka One', cursive",
    transition:    'transform 0.1s ease, filter 0.1s ease',
  } satisfies CSSProperties,

  secondaryBtnHover:   { transform: 'scale(1.04)', filter: 'brightness(1.5)'  } satisfies CSSProperties,
  secondaryBtnPressed: { transform: 'scale(0.97)', filter: 'brightness(0.8)'  } satisfies CSSProperties,
}
