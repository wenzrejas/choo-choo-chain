import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { AudioEngine } from '../audio/AudioEngine'
import type { MouseNDC } from '../types'

/**
 * Tracks normalised device coordinates of the mouse pointer and exposes
 * a stable ref that the Train component reads inside `useFrame`.
 *
 * Also binds mousedown/mouseup to start/stop the energy boost.
 */
export function useMouseSteering(): React.MutableRefObject<MouseNDC> {
  const mouseRef  = useRef<MouseNDC>({ x: 0, y: 0 })
  const startBoost = useGameStore((s) => s.startBoost)
  const stopBoost  = useGameStore((s) => s.stopBoost)

  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      mouseRef.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    const onDown = (e: MouseEvent): void => { if (e.button === 0) { AudioEngine.resume(); startBoost() } }
    const onUp   = (e: MouseEvent): void => { if (e.button === 0) stopBoost()  }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup',   onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [startBoost, stopBoost])

  return mouseRef
}
