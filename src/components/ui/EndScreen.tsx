import { useEffect, useRef, useState, type JSX } from 'react'
import gsap from 'gsap'
import { useGameStore } from '../../store/gameStore'
import { WAGON_POINTS } from '../../utils/constants'
import { sfxClick } from '../../audio/sfx'
import './EndScreen.scss'

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

  const rootRef      = useRef<HTMLDivElement>(null)
  const titleRef     = useRef<HTMLDivElement>(null)
  const scoreSectRef = useRef<HTMLDivElement>(null)
  const scoreValRef  = useRef<HTMLSpanElement>(null)
  const rowsRef      = useRef<HTMLDivElement>(null)
  const btnsRef      = useRef<HTMLDivElement>(null)

  const [displayScore, setDisplayScore] = useState(0)

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
    <div ref={rootRef} className="end-screen">
      <div className="end-screen__content">

        <div ref={titleRef} className="end-screen__title">GAME OVER</div>

        <div ref={scoreSectRef} className="end-screen__score-section">
          <span className="end-screen__score-label">FINAL SCORE</span>
          <span ref={scoreValRef} className="end-screen__score-value">{displayScore}</span>
        </div>

        <div ref={rowsRef} className="end-screen__breakdown">
          {(['copper', 'silver', 'gold'] as const).map((type) => (
            <div key={type} className="end-screen__row">
              <div className="end-screen__row-left">
                <OctahedronIcon color={WAGON_COLORS[type]} />
                <span className="end-screen__type-name" data-type={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
                <span className="end-screen__type-count">× {wagonsCollected[type]}</span>
              </div>
              <span className="end-screen__row-pts">
                {wagonsCollected[type] * WAGON_POINTS[type]} pts
              </span>
            </div>
          ))}
        </div>

        <div ref={btnsRef} className="end-screen__btn-group">
          <button
            className="end-screen__btn-primary"
            onClick={() => { sfxClick(); exitThen(startGame) }}
          >
            PLAY AGAIN
          </button>
          <button
            className="end-screen__btn-secondary"
            onClick={() => exitThen(goToIdle)}
          >
            MAIN MENU
          </button>
        </div>

      </div>
    </div>
  )
}
