import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react'
import gsap from 'gsap'
import { useGameStore } from '../../store/gameStore'
import { preloadAssets } from '../../utils/preload'
import { sfxClick } from '../../audio/sfx'

let assetsLoaded = false

export default function IdleScreen(): JSX.Element {
  const startGame = useGameStore((s) => s.startGame)

  const rootRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [loaded,   setLoaded]   = useState(assetsLoaded)
  const [progress, setProgress] = useState(assetsLoaded ? 100 : 0)

  // Preload all assets on first mount only
  useEffect(() => {
    if (assetsLoaded) return
    preloadAssets((pct) => setProgress(pct)).then(() => {
      assetsLoaded = true
      setLoaded(true)
    })
  }, [])

  // Entrance animation once loading is done
  useEffect(() => {
    if (!loaded) return
    const tl = gsap.timeline()
    tl.fromTo(logoRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
      0,
    )
    tl.fromTo(btnRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' },
      0.4,
    )
  }, [loaded])

  const handleStart = (): void => {
    sfxClick()
    const tl = gsap.timeline({ onComplete: startGame })
    tl.to(logoRef.current, { y: -160, opacity: 0, duration: 0.3,  ease: 'power3.in'  }, 0)
    tl.to(btnRef.current,  { scale: 0, opacity: 0, duration: 0.35, ease: 'back.in(2)' }, 0)
    tl.to(rootRef.current, { opacity: 0,           duration: 0.3,  ease: 'power2.in'  }, 0.28)
  }

  return (
    <div ref={rootRef} style={styles.root}>
      {!loaded ? (
        <div style={styles.loadingContent}>
          <div style={styles.loadingLabel}>LOADING</div>
          <div style={styles.loadingPct}>{progress}%</div>
          <div style={styles.track}>
            <div style={{ ...styles.fill, width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div style={styles.content}>
          <img ref={logoRef} src={`${import.meta.env.BASE_URL}logo.png`} width={'100%'} style={{ opacity: 0 }} />
          <button
            ref={btnRef}
            style={{
              ...styles.startBtn,
              opacity: 0,
              ...(hovered && !pressed ? styles.startBtnHover   : {}),
              ...(pressed             ? styles.startBtnPressed : {}),
            }}
            onClick={handleStart}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false) }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
          >
            START GAME
          </button>
        </div>
      )}
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

  loadingContent: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           20,
    width:         '100%',
    maxWidth:      420,
    padding:       '0 32px',
  } satisfies CSSProperties,

  loadingLabel: {
    fontSize:      13,
    letterSpacing: 5,
    color:         '#7a8a9a',
    fontFamily:    "'Nunito', sans-serif",
    fontWeight:    700,
  } satisfies CSSProperties,

  loadingPct: {
    fontSize:           64,
    color:              '#ffe040',
    lineHeight:         1,
    letterSpacing:      0,
    fontVariantNumeric: 'tabular-nums',
    textShadow:         '0 0 32px rgba(255,224,64,0.35)',
  } satisfies CSSProperties,

  track: {
    width:        '100%',
    height:       6,
    borderRadius: 3,
    background:   'rgba(255,255,255,0.08)',
    overflow:     'hidden',
  } satisfies CSSProperties,

  fill: {
    height:       '100%',
    borderRadius: 3,
    background:   'linear-gradient(to right, #f5a400, #ffe040)',
    transition:   'width 0.2s ease-out',
    boxShadow:    '0 0 10px rgba(255,224,64,0.5)',
  } satisfies CSSProperties,

  content: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           72,
    padding:       32,
    width:         '100%',
    maxWidth:      620,
    marginTop:     -200,
  } satisfies CSSProperties,

  startBtn: {
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

  startBtnHover: {
    transform:  'scale(1.07) translateY(-3px)',
    filter:     'brightness(1.12)',
    boxShadow:  '0 8px 28px rgba(245,164,0,0.45)',
  } satisfies CSSProperties,

  startBtnPressed: {
    transform:  'scale(0.96) translateY(2px)',
    filter:     'brightness(0.9)',
    boxShadow:  'none',
  } satisfies CSSProperties,
}
