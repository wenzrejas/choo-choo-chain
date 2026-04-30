import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { AudioEngine } from '../audio/AudioEngine'
import type { MouseNDC } from '../types'

/**
 * Tracks normalised device coordinates via pointer events (mouse, touch, stylus)
 * and exposes a stable ref that the Train component reads inside `useFrame`.
 *
 * Also binds pointerdown/pointerup to start/stop the energy boost.
 */
export function useMouseSteering(): React.MutableRefObject<MouseNDC> {
  const mouseRef   = useRef<MouseNDC>({ x: 0, y: 0 })
  const startBoost = useGameStore((s) => s.startBoost)
  const stopBoost  = useGameStore((s) => s.stopBoost)

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      mouseRef.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    const onDown = (e: PointerEvent): void => { if (e.isPrimary) { AudioEngine.resume(); startBoost() } }
    const onUp   = (e: PointerEvent): void => { if (e.isPrimary) stopBoost() }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup',   onUp)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [startBoost, stopBoost])

  return mouseRef
}
