// Simple HTML5 Audio background music player.
// Uses bgm.mp3 from the public/sounds directory.

let audio: HTMLAudioElement | null = null
let fadeTimer: ReturnType<typeof setInterval> | null = null

const BGM_URL = `${import.meta.env.BASE_URL}sounds/bgm.mp3`
const TARGET_VOLUME = 0.5
const FADE_IN_MS    = 2000
const FADE_OUT_MS   = 800

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(BGM_URL)
    audio.loop   = true
    audio.volume = 0
  }
  return audio
}

function clearFade(): void {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer)
    fadeTimer = null
  }
}

export function startBgm(): void {
  const a = getAudio()
  clearFade()
  a.volume = 0
  a.play().catch(() => {})

  const steps    = 40
  const stepMs   = FADE_IN_MS / steps
  const stepSize = TARGET_VOLUME / steps
  let   step     = 0

  fadeTimer = setInterval(() => {
    step++
    a.volume = Math.min(TARGET_VOLUME, step * stepSize)
    if (step >= steps) clearFade()
  }, stepMs)
}

export function stopBgm(): void {
  const a = getAudio()
  clearFade()

  const startVol = a.volume
  const steps    = 20
  const stepMs   = FADE_OUT_MS / steps
  const stepSize = startVol / steps
  let   step     = 0

  fadeTimer = setInterval(() => {
    step++
    a.volume = Math.max(0, startVol - step * stepSize)
    if (step >= steps) {
      clearFade()
      a.pause()
      a.currentTime = 0
    }
  }, stepMs)
}
