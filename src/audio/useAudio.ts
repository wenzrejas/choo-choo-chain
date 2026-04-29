/**
 * useAudio.ts
 *
 * Central React hook for all audio control.
 *
 * Responsibilities:
 *   1. Resume the AudioContext on first interaction (browser autoplay policy)
 *   2. Manage BGM lifecycle — start/stop correct track when phase changes
 *   3. Expose stable sfx helpers to components
 *
 * Usage:
 *   const { sfx } = useAudio()
 *   sfx.click()
 *   sfx.wagonCollect('gold')
 */

import { useEffect, useRef, useCallback } from 'react'
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
  type StopFn as SfxStopFn,
} from './sfx'
import { startIdleBgm, startPlayingBgm, type StopFn as BgmStopFn } from './bgm'
import type { WagonType, PowerUpType } from '../types'

// ─── Sfx API exposed to consumers ────────────────────────────────────────────

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

// ─── Module-level BGM state ──────────────────────────────────────────────────
// Kept outside the hook so multiple hook instances don't fight.

let activeBgmStop: BgmStopFn | null = null
let activeChugStop: SfxStopFn | null = null
let currentBgmPhase: string | null = null

function stopBgm(): void {
  activeBgmStop?.()
  activeBgmStop  = null
  currentBgmPhase = null
}

function stopChug(): void {
  activeChugStop?.()
  activeChugStop = null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudio(): { sfx: SfxApi } {
  const phase      = useGameStore((s) => s.phase)
  const isBoosting = useGameStore((s) => s.isBoosting)

  // ── Resume AudioContext on first gesture ──────────────────────────────────
  useEffect(() => {
    const resume = () => AudioEngine.resume()
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown',     resume, { once: true })
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown',     resume)
    }
  }, [])

  // ── BGM: switch track when phase changes ──────────────────────────────────
  useEffect(() => {
    if (currentBgmPhase === phase) return

    stopBgm()

    if (phase === 'idle') {
      activeBgmStop    = startIdleBgm()
      currentBgmPhase  = 'idle'
    } else if (phase === 'playing') {
      activeBgmStop    = startPlayingBgm()
      currentBgmPhase  = 'playing'
    }
    // 'end' phase: silence — BGM already stopped above

    return () => { /* cleanup handled by stopBgm() on next phase change */ }
  }, [phase])

  // ── Train chug: start on playing, stop otherwise ──────────────────────────
  useEffect(() => {
    if (phase === 'playing') {
      stopChug()
      activeChugStop = sfxTrainChug(false)
    } else {
      stopChug()
    }
    return stopChug
  }, [phase])

  // ── Boost chug: restart at faster rate when boost state changes ───────────
  const prevBoostingRef = useRef(false)
  useEffect(() => {
    if (phase !== 'playing') return
    if (prevBoostingRef.current === isBoosting) return
    prevBoostingRef.current = isBoosting

    stopChug()
    activeChugStop = sfxTrainChug(isBoosting)
  }, [isBoosting, phase])

  // ── Stable sfx callbacks ──────────────────────────────────────────────────
  const sfx: SfxApi = {
    click:          useCallback(() => { AudioEngine.resume(); sfxClick() }, []),
    hover:          useCallback(() => { AudioEngine.resume(); sfxHover() }, []),
    wagonCollect:   useCallback((t: WagonType)    => sfxWagonCollect(t), []),
    obstacleHit:    useCallback(() => sfxObstacleHit(), []),
    gameOver:       useCallback(() => { stopBgm(); stopChug(); sfxGameOver() }, []),
    powerup:        useCallback((t: PowerUpType) => {
      if (t === 'shield') sfxShieldActivate()
      else if (t === 'clock') sfxClockBonus()
      else sfxPowerup(t)
    }, []),
    boostStart:     useCallback(() => sfxBoostStart(), []),
    shieldActivate: useCallback(() => sfxShieldActivate(), []),
    clockBonus:     useCallback(() => sfxClockBonus(), []),
  }

  return { sfx }
}
