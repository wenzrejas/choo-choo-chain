/**
 * sfx.ts — Procedural sound effects via Web Audio API.
 *
 * Every function returns void and is safe to call from any context
 * (React event handler, useFrame, Zustand action). They create their
 * own nodes, schedule them, then let them be garbage-collected.
 *
 * All sounds route through AudioEngine.sfxBus.
 */

import { AudioEngine } from './AudioEngine'

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

/** Linear ramp shorthand. */
const ramp = (param: AudioParam, to: number, atTime: number) =>
  param.linearRampToValueAtTime(to, atTime)

const exp = (param: AudioParam, to: number, atTime: number) =>
  param.exponentialRampToValueAtTime(Math.max(to, 0.0001), atTime)

// ─── Train chug (looping, returned as a StopFn) ────────────────────────────────

export type StopFn = () => void

/**
 * Starts a rhythmic steam-train chug loop.
 * Returns a stop function — call it when the game ends or phase changes.
 * The chug rate increases with `boost`.
 */
export function sfxTrainChug(boost = false): StopFn {
  const ctx       = ac()
  const rate      = boost ? 5.5 : 3.2      // chugs per second
  const intervalMs = (1 / rate) * 1000
  let   active    = true

  function chug() {
    if (!active) return

    const now = ctx.currentTime

    // Low-frequency thump
    const [oLow, gLow] = osc('sine', 60, 0.0)
    oLow.frequency.setValueAtTime(80, now)
    oLow.frequency.exponentialRampToValueAtTime(40, now + 0.08)
    gLow.gain.setValueAtTime(0.55, now)
    gLow.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    oLow.start(now)
    oLow.stop(now + 0.2)

    // Hiss burst (noise + bandpass)
    const nSrc  = ctx.createBufferSource()
    nSrc.buffer = AudioEngine.noiseBuffer()
    nSrc.loop   = true
    const bp    = ctx.createBiquadFilter()
    bp.type     = 'bandpass'
    bp.frequency.value = 900
    bp.Q.value         = 0.8
    const gHiss = ctx.createGain()
    gHiss.gain.setValueAtTime(0.06, now)
    gHiss.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    nSrc.connect(bp)
    bp.connect(gHiss)
    gHiss.connect(bus())
    nSrc.start(now)
    nSrc.stop(now + 0.13)
  }

  // First chug immediately, then on interval
  chug()
  const id = setInterval(chug, intervalMs)

  return () => {
    active = false
    clearInterval(id)
  }
}

// ─── Wagon collect ────────────────────────────────────────────────────────────

const WAGON_NOTES: Record<string, number[]> = {
  copper: [330, 415, 523],          // E4 – Ab4 – C5  (earthy minor)
  silver: [440, 554, 659],          // A4 – C#5 – E5  (bright major)
  gold:   [523, 659, 784, 1047],    // C5 – E5 – G5 – C6 (full major + octave)
}

export function sfxWagonCollect(type: 'copper' | 'silver' | 'gold'): void {
  const ctx   = ac()
  const freqs = WAGON_NOTES[type] ?? WAGON_NOTES.copper
  const now   = ctx.currentTime

  freqs.forEach((freq, i) => {
    const t           = now + i * 0.07
    const [o, g]      = osc('triangle', freq, 0)
    o.frequency.setValueAtTime(freq * 1.02, t)      // slight pitch slide down
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.05)
    g.gain.setValueAtTime(0.0, t)
    g.gain.linearRampToValueAtTime(0.3, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    o.start(t)
    o.stop(t + 0.25)
  })

  // Sparkle shimmer on gold
  if (type === 'gold') {
    for (let i = 0; i < 6; i++) {
      const t      = now + i * 0.04
      const freq   = 1800 + Math.random() * 2200
      const [o, g] = osc('sine', freq, 0)
      g.gain.setValueAtTime(0.08, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      o.start(t)
      o.stop(t + 0.14)
    }
  }
}

// ─── Obstacle hit (shield destroy) ───────────────────────────────────────────

export function sfxObstacleHit(): void {
  const ctx = ac()
  const now = ctx.currentTime

  // Woody thud
  const [oThud, gThud] = osc('sine', 120, 0)
  oThud.frequency.setValueAtTime(200, now)
  oThud.frequency.exponentialRampToValueAtTime(50, now + 0.15)
  gThud.gain.setValueAtTime(0.7, now)
  gThud.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  oThud.start(now)
  oThud.stop(now + 0.22)

  // Wood crack noise burst
  const nSrc  = ctx.createBufferSource()
  nSrc.buffer = AudioEngine.noiseBuffer()
  nSrc.loop   = true
  const hp    = ctx.createBiquadFilter()
  hp.type     = 'highpass'
  hp.frequency.value = 300
  const gN    = ctx.createGain()
  gN.gain.setValueAtTime(0.25, now)
  gN.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  nSrc.connect(hp)
  hp.connect(gN)
  gN.connect(bus())
  nSrc.start(now)
  nSrc.stop(now + 0.09)
}

// ─── Game over crash ──────────────────────────────────────────────────────────

export function sfxGameOver(): void {
  const ctx = ac()
  const now = ctx.currentTime

  // Descending metallic crash
  const freqs = [220, 180, 140, 100, 70]
  freqs.forEach((f, i) => {
    const t        = now + i * 0.06
    const [o, g]   = osc('sawtooth', f, 0)
    g.gain.setValueAtTime(0.4, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    o.start(t)
    o.stop(t + 0.42)
  })

  // Rumble noise
  const nSrc  = ctx.createBufferSource()
  nSrc.buffer = AudioEngine.noiseBuffer()
  nSrc.loop   = true
  const lp    = ctx.createBiquadFilter()
  lp.type     = 'lowpass'
  lp.frequency.value = 200
  const gN    = ctx.createGain()
  gN.gain.setValueAtTime(0.5, now)
  gN.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
  nSrc.connect(lp)
  lp.connect(gN)
  gN.connect(bus())
  nSrc.start(now)
  nSrc.stop(now + 0.65)
}

// ─── Power-up pickup ──────────────────────────────────────────────────────────

export function sfxPowerup(type: 'energy' | 'clock' | 'shield'): void {
  const ctx = ac()
  const now = ctx.currentTime

  if (type === 'energy') {
    // Upward zap
    const [o, g] = osc('sawtooth', 150, 0)
    o.frequency.setValueAtTime(150, now)
    o.frequency.exponentialRampToValueAtTime(900, now + 0.18)
    g.gain.setValueAtTime(0.0, now)
    g.gain.linearRampToValueAtTime(0.3, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    o.start(now)
    o.stop(now + 0.25)
  }

  if (type === 'clock') {
    // Two bell tones
    [520, 780].forEach((freq, i) => {
      const t        = now + i * 0.12
      const [o, g]   = osc('sine', freq, 0)
      g.gain.setValueAtTime(0.4, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      o.start(t)
      o.stop(t + 0.55)
    })
  }

  if (type === 'shield') {
    // Rising resonant hum + shimmer
    const [o, g] = osc('triangle', 220, 0)
    o.frequency.setValueAtTime(220, now)
    o.frequency.linearRampToValueAtTime(440, now + 0.25)
    g.gain.setValueAtTime(0.0, now)
    g.gain.linearRampToValueAtTime(0.35, now + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    o.start(now)
    o.stop(now + 0.38)

    // Shimmer harmonics
    for (let i = 0; i < 4; i++) {
      const t      = now + i * 0.06
      const [o2, g2] = osc('sine', 880 + i * 220, 0)
      g2.gain.setValueAtTime(0.08, t)
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      o2.start(t)
      o2.stop(t + 0.18)
    }
  }
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
  const ctx = ac()
  const now = ctx.currentTime

  // Three stacked fifths expanding outward
  const chords = [[220, 330], [330, 495], [495, 742]]
  chords.forEach(([lo, hi], i) => {
    const t = now + i * 0.08

    const [oL, gL] = osc('sine', lo, 0)
    gL.gain.setValueAtTime(0.18, t)
    gL.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    oL.start(t); oL.stop(t + 0.42)

    const [oH, gH] = osc('triangle', hi, 0)
    gH.gain.setValueAtTime(0.12, t)
    gH.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    oH.start(t); oH.stop(t + 0.37)
  })

  // Metallic shimmer ring
  const [oR, gR] = osc('sine', 1760, 0)
  gR.gain.setValueAtTime(0.0, now)
  gR.gain.linearRampToValueAtTime(0.15, now + 0.03)
  gR.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
  oR.start(now)
  oR.stop(now + 0.65)
}

// ─── Clock bonus ──────────────────────────────────────────────────────────────

export function sfxClockBonus(): void {
  // Ascending arpeggio of 5 notes
  const ctx   = ac()
  const now   = ctx.currentTime
  const notes = [392, 494, 587, 740, 880]   // G4 B4 D5 F#5 A5

  notes.forEach((freq, i) => {
    const t      = now + i * 0.055
    const [o, g] = osc('triangle', freq, 0)
    g.gain.setValueAtTime(0.25, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    o.start(t)
    o.stop(t + 0.3)
  })
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
