import { useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { AudioEngine } from './AudioEngine'
import {
  sfxClick,
  sfxHover,
  sfxWagonCollect,
  sfxObstacleHit,
  sfxGameOver,
  sfxPowerup,
  sfxBoostStart,
  sfxShieldActivate,
  sfxClockBonus,
  sfxTrainChug,
  sfxTrainWhistleLoop,
  type StopFn,
} from './sfx'
import { startBgm, stopBgm } from './bgm'
import type { WagonType, PowerUpType } from '../types'

export interface SfxApi {
  click:          () => void
  hover:          () => void
  wagonCollect:   (type: WagonType) => void
  obstacleHit:    () => void
  gameOver:       () => void
  powerup:        (type: PowerUpType) => void
  boostStart:     () => void
  shieldActivate: () => void
  clockBonus:     () => void
}

let activeChugStop:   StopFn | null = null
let activeWhistleStop: StopFn | null = null

function stopChug(): void {
  activeChugStop?.()
  activeChugStop = null
}

function stopWhistle(): void {
  activeWhistleStop?.()
  activeWhistleStop = null
}

export function useAudio(): { sfx: SfxApi } {
  const phase      = useGameStore((s) => s.phase)
  const isBoosting = useGameStore((s) => s.isBoosting)

  // Resume Web Audio context (needed for SFX) on first gesture
  useEffect(() => {
    const resume = () => AudioEngine.resume()
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown',     resume, { once: true })
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown',     resume)
    }
  }, [])

  // BGM: fade in bgm.mp3 when playing, stop otherwise
  useEffect(() => {
    if (phase === 'playing') {
      startBgm()
    } else {
      stopBgm()
    }
  }, [phase])

  // Train chug + whistle: start/stop with playing phase
  useEffect(() => {
    if (phase === 'playing') {
      stopChug()
      stopWhistle()
      activeChugStop   = sfxTrainChug(false)
      activeWhistleStop = sfxTrainWhistleLoop()
    } else {
      stopChug()
      stopWhistle()
    }
    return () => { stopChug(); stopWhistle() }
  }, [phase])

  // Boost: restart chug at faster rate
  useEffect(() => {
    if (phase !== 'playing') return
    stopChug()
    activeChugStop = sfxTrainChug(isBoosting)
  }, [isBoosting, phase])

  const sfx: SfxApi = {
    click:          useCallback(() => { AudioEngine.resume(); sfxClick() }, []),
    hover:          useCallback(() => { AudioEngine.resume(); sfxHover() }, []),
    wagonCollect:   useCallback((t: WagonType)   => sfxWagonCollect(t), []),
    obstacleHit:    useCallback(() => sfxObstacleHit(), []),
    gameOver:       useCallback(() => { stopBgm(); stopChug(); sfxGameOver() }, []),
    powerup:        useCallback((t: PowerUpType) => {
      if (t === 'shield')      sfxShieldActivate()
      else if (t === 'clock')  sfxClockBonus()
      else                     sfxPowerup(t)
    }, []),
    boostStart:     useCallback(() => sfxBoostStart(), []),
    shieldActivate: useCallback(() => sfxShieldActivate(), []),
    clockBonus:     useCallback(() => sfxClockBonus(), []),
  }

  return { sfx }
}
