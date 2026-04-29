/**
 * AudioManager
 *
 * Mounts once at the top of the React tree (inside App.tsx).
 * Calls useAudio() so BGM and chug lifecycle is managed globally,
 * regardless of which phase is currently rendered.
 *
 * Renders nothing — purely a side-effect component.
 */

import { useAudio } from './useAudio'

export default function AudioManager(): null {
  useAudio()
  return null
}
