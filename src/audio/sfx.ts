import { AudioEngine } from './AudioEngine'

const WAGON_COLLECT_URL = `${import.meta.env.BASE_URL}sounds/wagon-collect-sfx.mp3`
const COLLIDE_URL       = `${import.meta.env.BASE_URL}sounds/collide-sfx.mp3`
const CRASH_URL         = `${import.meta.env.BASE_URL}sounds/crash-sfx.mp3`
const STEAM_ENGINE_URL  = `${import.meta.env.BASE_URL}sounds/steam-engine-sfx.mp3`
const TRAIN_WHISTLE_URL = `${import.meta.env.BASE_URL}sounds/train-whistle-sfx.mp3`
const POWER_UP_URL      = `${import.meta.env.BASE_URL}sounds/power-up-sfx.mp3`
const SHIELD_UP_URL     = `${import.meta.env.BASE_URL}sounds/shield-up-sfx.mp3`

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ac = () => AudioEngine.ctx
const bus = () => AudioEngine.sfxBus

/** Create an OscillatorNode, connect it to a gain, and return both. */
function osc(
  type: OscillatorType,
  freq: number,
  gainVal: number,
): [OscillatorNode, GainNode] {
  const ctx = ac()
  const o   = ctx.createOscillator()
  const g   = ctx.createGain()
  o.type     = type
  o.frequency.value = freq
  g.gain.value      = gainVal
  o.connect(g)
  g.connect(bus())
  return [o, g]
}

// ─── Train chug (looping, returned as a StopFn) ────────────────────────────────

export type StopFn = () => void

export function sfxTrainChug(boost = false): StopFn {
  const audio = new Audio(STEAM_ENGINE_URL)
  audio.loop         = true
  audio.volume       = 0.35
  audio.playbackRate = boost ? 1.4 : 1.0
  audio.play().catch(() => {})

  return () => {
    audio.pause()
    audio.currentTime = 0
  }
}

// Plays the whistle at a random interval between minMs and maxMs, loops until stopped.
export function sfxTrainWhistleLoop(minMs = 8000, maxMs = 20000): StopFn {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  function scheduleNext(): void {
    if (stopped) return
    const delay = minMs + Math.random() * (maxMs - minMs)
    timeoutId = setTimeout(() => {
      if (stopped) return
      new Audio(TRAIN_WHISTLE_URL).play().catch(() => {})
      scheduleNext()
    }, delay)
  }

  scheduleNext()

  return () => {
    stopped = true
    if (timeoutId !== null) clearTimeout(timeoutId)
  }
}

// ─── Wagon collect ────────────────────────────────────────────────────────────

export function sfxWagonCollect(_type: 'copper' | 'silver' | 'gold'): void {
  new Audio(WAGON_COLLECT_URL).play().catch(() => {})
}

// ─── Obstacle hit (shield destroy) ───────────────────────────────────────────

export function sfxObstacleHit(): void {
  new Audio(COLLIDE_URL).play().catch(() => {})
}

// ─── Game over crash ──────────────────────────────────────────────────────────

export function sfxGameOver(): void {
  new Audio(CRASH_URL).play().catch(() => {})
}

// ─── Power-up pickup ──────────────────────────────────────────────────────────

export function sfxPowerup(_type: 'energy' | 'clock' | 'shield'): void {
  new Audio(POWER_UP_URL).play().catch(() => {})
}

// ─── Speed boost (start) ──────────────────────────────────────────────────────

export function sfxBoostStart(): void {
  const ctx = ac()
  const now = ctx.currentTime

  // Whoosh sweep up
  const [o, g] = osc('sawtooth', 80, 0)
  o.frequency.setValueAtTime(80, now)
  o.frequency.exponentialRampToValueAtTime(600, now + 0.28)
  g.gain.setValueAtTime(0.0, now)
  g.gain.linearRampToValueAtTime(0.2, now + 0.04)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
  o.start(now)
  o.stop(now + 0.35)

  // High noise burst
  const nSrc  = ctx.createBufferSource()
  nSrc.buffer = AudioEngine.noiseBuffer()
  nSrc.loop   = true
  const bp    = ctx.createBiquadFilter()
  bp.type     = 'bandpass'
  bp.frequency.value = 3000
  bp.Q.value         = 2
  const gN    = ctx.createGain()
  gN.gain.setValueAtTime(0.12, now)
  gN.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  nSrc.connect(bp)
  bp.connect(gN)
  gN.connect(bus())
  nSrc.start(now)
  nSrc.stop(now + 0.28)
}

// ─── Shield activate ─────────────────────────────────────────────────────────

export function sfxShieldActivate(): void {
  new Audio(SHIELD_UP_URL).play().catch(() => {})
}

// ─── Clock bonus ──────────────────────────────────────────────────────────────

export function sfxClockBonus(): void {
  new Audio(POWER_UP_URL).play().catch(() => {})
}

// ─── UI click ────────────────────────────────────────────────────────────────

export function sfxClick(): void {
  const ctx = ac()
  const now = ctx.currentTime

  // Crisp tick
  const [o, g] = osc('square', 1200, 0)
  g.gain.setValueAtTime(0.12, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
  o.start(now)
  o.stop(now + 0.045)
}

// ─── UI hover (subtle) ────────────────────────────────────────────────────────

export function sfxHover(): void {
  const ctx = ac()
  const now = ctx.currentTime

  const [o, g] = osc('sine', 800, 0)
  g.gain.setValueAtTime(0.04, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
  o.start(now)
  o.stop(now + 0.035)
}
