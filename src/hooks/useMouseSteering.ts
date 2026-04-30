import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { AudioEngine } from '../audio/AudioEngine'
import type { MouseNDC } from '../types'

const isTouch = window.matchMedia('(pointer: coarse)').matches

export function useMouseSteering(): React.MutableRefObject<MouseNDC> {
  const mouseRef   = useRef<MouseNDC>({ x: 0, y: 0 })
  const startBoost = useGameStore((s) => s.startBoost)
  const stopBoost  = useGameStore((s) => s.stopBoost)

  useEffect(() => {
    if (isTouch) {
      let startX = 0

      const onTouchStart = (e: TouchEvent): void => {
        AudioEngine.resume()
        if (e.touches.length === 1) {
          // First finger down — begin steering, no boost yet
          startX = e.touches[0].clientX
        } else if (e.touches.length === 2) {
          // Second finger added — activate boost
          startBoost()
        }
      }

      const onTouchMove = (e: TouchEvent): void => {
        e.preventDefault()
        // Always steer with the first touch point
        const dx = e.touches[0].clientX - startX
        // Inverted drag: right → steer left, left → steer right
        mouseRef.current.x = Math.max(-1, Math.min(1, -(dx / window.innerWidth) * 2))
        mouseRef.current.y = 0
      }

      const onTouchEnd = (e: TouchEvent): void => {
        if (e.touches.length < 2) {
          // Second finger lifted — stop boost
          stopBoost()
        }
        if (e.touches.length === 0) {
          // All fingers lifted — reset steering
          mouseRef.current.x = 0
          mouseRef.current.y = 0
        } else {
          // Primary finger changed — re-anchor startX to avoid steering jump
          startX = e.touches[0].clientX
        }
      }

      window.addEventListener('touchstart',  onTouchStart, { passive: true })
      window.addEventListener('touchmove',   onTouchMove,  { passive: false })
      window.addEventListener('touchend',    onTouchEnd)
      window.addEventListener('touchcancel', onTouchEnd)

      return () => {
        window.removeEventListener('touchstart',  onTouchStart)
        window.removeEventListener('touchmove',   onTouchMove)
        window.removeEventListener('touchend',    onTouchEnd)
        window.removeEventListener('touchcancel', onTouchEnd)
      }
    }

    // ── Mouse controls ──────────────────────────────────────────────────────
    const onMove = (e: MouseEvent): void => {
      mouseRef.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    const onDown = (e: MouseEvent): void => {
      if (e.button === 0) { AudioEngine.resume(); startBoost() }
    }
    const onUp = (e: MouseEvent): void => {
      if (e.button === 0) stopBoost()
    }

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
