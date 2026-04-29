/**
 * bgm.ts — Procedural background music via Web Audio API.
 *
 * Two tracks, both looping:
 *
 *   IDLE    — Slow, atmospheric, D minor. Sparse arpeggios over a deep pad
 *             with a subtle feedback-delay reverb. 72 BPM.
 *
 *   PLAYING — Driving, rhythmic, energetic. Repeating 2-bar loop with bass
 *             ostinato, chord stabs, kick, snare, and hi-hat. 140 BPM.
 *
 * Both functions return a StopFn. Call it to fade out and clean up all nodes.
 * Safe to call from any React context (no hooks used).
 */

import { AudioEngine } from './AudioEngine'

export type StopFn = () => void

// ─── Timing helpers ───────────────────────────────────────────────────────────

const ac  = () => AudioEngine.ctx
const bus = () => AudioEngine.bgmBus

const beat = (bpm: number): number => 60 / bpm
const bar  = (bpm: number): number => beat(bpm) * 4

// ─── Low-level helpers ────────────────────────────────────────────────────────

function makeGain(value: number, dest: AudioNode): GainNode {
  const g = ac().createGain()
  g.gain.value = value
  g.connect(dest)
  return g
}

/**
 * Schedule an oscillator note with attack-sustain-release envelope.
 *
 * Fixed: guards `sustainEnd` so it's always strictly after the attack ends,
 * preventing Web Audio from receiving out-of-order automation events which
 * corrupt the gain curve and produce clicks or silence.
 */
function scheduleOsc(
  type:  OscillatorType,
  freq:  number,
  start: number,
  dur:   number,
  peak:  number,
  atk:   number,
  rel:   number,
  dest:  AudioNode,
): void {
  const ctx = ac()
  const o   = ctx.createOscillator()
  const g   = ctx.createGain()
  o.type            = type
  o.frequency.value = freq
  g.gain.value      = 0
  o.connect(g)
  g.connect(dest)

  // Clamp release so sustainEnd > attack end and >= start
  const safeAtk     = Math.min(atk, dur * 0.5)
  const safeRel     = Math.min(rel, dur - safeAtk - 0.001)
  const sustainEnd  = start + dur - Math.max(safeRel, 0)

  o.start(start)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(peak, start + safeAtk)
  g.gain.setValueAtTime(peak, sustainEnd)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.stop(start + dur + 0.05)
}

/** Schedule a filtered noise burst (hi-hat, snare). */
function scheduleNoise(
  start:      number,
  dur:        number,
  peak:       number,
  filterType: BiquadFilterType,
  filterFreq: number,
  dest:       AudioNode,
): void {
  const ctx  = ac()
  const src  = ctx.createBufferSource()
  src.buffer = AudioEngine.noiseBuffer()
  src.loop   = true

  const filt           = ctx.createBiquadFilter()
  filt.type            = filterType
  filt.frequency.value = filterFreq

  const g         = ctx.createGain()
  g.gain.value    = 0

  src.connect(filt)
  filt.connect(g)
  g.connect(dest)

  src.start(start)
  g.gain.setValueAtTime(peak, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.stop(start + dur + 0.01)
}

/**
 * Schedule a kick drum hit — pitched sine sweep from high to low.
 * Fixed: uses the shared `ctx` (not a redundant `ctx2` alias).
 */
function scheduleKick(start: number, dest: AudioNode): void {
  const ctx = ac()
  const o   = ctx.createOscillator()
  const g   = ctx.createGain()
  o.type    = 'sine'

  o.frequency.setValueAtTime(160, start)
  o.frequency.exponentialRampToValueAtTime(40, start + 0.08)
  g.gain.setValueAtTime(0.55, start)
  g.gain.exponentialRampToValueAtTime(0.001, start + 0.18)

  o.connect(g)
  g.connect(dest)
  o.start(start)
  o.stop(start + 0.2)
}

// ─── IDLE BGM ─────────────────────────────────────────────────────────────────
// D minor ambient: Dm – Bb – F – C (i – VI – III – VII)
// 72 BPM.  Sparse arpeggio over a sustained pad + feedback delay reverb.

const IDLE_BPM = 72
const IDLE_KEY: number[] = [
  146.83, // D3
  174.61, // F3
  196.00, // G3
  220.00, // A3
  261.63, // C4
  293.66, // D4
  349.23, // F4
  440.00, // A4
]

const IDLE_CHORDS = [
  [146.83, 174.61, 220.00],  // Dm
  [116.54, 146.83, 174.61],  // Bb
  [174.61, 220.00, 261.63],  // F
  [130.81, 164.81, 196.00],  // C
]

export function startIdleBgm(): StopFn {
  const ctx  = ac()
  const b    = beat(IDLE_BPM)
  const B    = bar(IDLE_BPM)

  // Compressor prevents the layered pads + arpeggio from clipping
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.knee.value      = 12
  comp.ratio.value     = 4
  comp.attack.value    = 0.01
  comp.release.value   = 0.25
  comp.connect(bus())

  const dest = makeGain(1.0, comp)

  // ── Deep bass drone ──────────────────────────────────────────────────────
  const drone  = ctx.createOscillator()
  const droneG = makeGain(0.07, dest)
  drone.type            = 'sine'
  drone.frequency.value = 73.42   // D2
  drone.connect(droneG)
  drone.start()

  // ── Gentle pad (two detuned oscillators for shimmer) ─────────────────────
  const pad1  = ctx.createOscillator()
  const pad2  = ctx.createOscillator()
  const padG  = makeGain(0.045, dest)
  pad1.type            = 'triangle'
  pad2.type            = 'triangle'
  pad1.frequency.value = 146.83
  pad2.frequency.value = 148.20   // slight detune
  pad1.connect(padG)
  pad2.connect(padG)
  pad1.start()
  pad2.start()

  // ── Feedback delay reverb ─────────────────────────────────────────────────
  // Fixed: use a separate sendGain so we can fade & disconnect the delay
  // network independently from dest, preventing the feedback loop from
  // continuing to ring into bus() after stop() is called.
  const sendGain              = ctx.createGain()
  const delay                 = ctx.createDelay(2.0)
  const feedbackGain          = ctx.createGain()
  const wetGain               = makeGain(0.3, comp)   // wet goes to comp, not dest
  delay.delayTime.value       = 0.38
  feedbackGain.gain.value     = 0.28
  sendGain.gain.value         = 0.4

  dest.connect(sendGain)
  sendGain.connect(delay)
  delay.connect(feedbackGain)
  feedbackGain.connect(delay)     // feedback loop (stable: gain 0.28 < 1)
  feedbackGain.connect(wetGain)   // wet output

  // ── Scheduler ─────────────────────────────────────────────────────────────
  let stopped = false
  let barIdx  = 0

  function scheduleBar(barStart: number): void {
    if (stopped) return

    // 8-note arpeggio (half-beat each = 1 full bar)
    const pattern = [0, 2, 4, 6, 4, 2, 1, 3]
    pattern.forEach((noteIdx, step) => {
      const t    = barStart + step * (b / 2)
      const freq = IDLE_KEY[noteIdx % IDLE_KEY.length]
      scheduleOsc('triangle', freq, t, b * 0.65, 0.06, 0.015, b * 0.4, dest)
    })

    // Chord stab every 2 bars
    if (barIdx % 2 === 0) {
      const chord = IDLE_CHORDS[(barIdx / 2) % IDLE_CHORDS.length]
      chord.forEach((freq) =>
        scheduleOsc('sine', freq, barStart, B * 0.88, 0.04, 0.06, B * 0.35, dest)
      )
    }

    barIdx++
    const nextBarStart = barStart + B

    // Read ctx.currentTime inside the timeout callback (not here) so the
    // delay calculation stays accurate even when JavaScript is throttled.
    if (!stopped) {
      const fireAt = (nextBarStart - b - ctx.currentTime) * 1000
      setTimeout(() => {
        if (!stopped) scheduleBar(nextBarStart)
      }, Math.max(0, fireAt))
    }
  }

  scheduleBar(ctx.currentTime + 0.1)

  // ── Stop / cleanup ─────────────────────────────────────────────────────────
  return () => {
    stopped = true
    const t  = ctx.currentTime

    // Fade main output and send
    dest.gain.setTargetAtTime(0, t, 0.3)
    sendGain.gain.setTargetAtTime(0, t, 0.1)   // cut delay input quickly
    wetGain.gain.setTargetAtTime(0, t, 0.1)    // cut wet output — kills feedback ring
    droneG.gain.setTargetAtTime(0, t, 0.35)
    padG.gain.setTargetAtTime(0, t, 0.35)

    // Stop continuous oscillators after the fade
    setTimeout(() => {
      try { drone.stop() } catch { /* already stopped */ }
      try { pad1.stop()  } catch { /* already stopped */ }
      try { pad2.stop()  } catch { /* already stopped */ }
      // Disconnect feedback loop so the GC can collect the nodes
      feedbackGain.disconnect()
      delay.disconnect()
      sendGain.disconnect()
    }, 1800)
  }
}

// ─── PLAYING BGM ──────────────────────────────────────────────────────────────
// D minor driving loop. 140 BPM. 2-bar repeating pattern.
// Bass ostinato + chord stabs + kick + snare + hi-hat.

const PLAY_BPM = 140

// 16-step bass line (D minor, one note per 8th note, 0 = rest)
const BASS_PATTERN: number[] = [
  146.83, 0, 146.83, 0, 110.00, 0, 130.81, 0,
  146.83, 0, 174.61, 0, 155.56, 0, 130.81, 0,
]

// Chord stabs on beats 2 & 4 of each bar (4 stab points per 2-bar loop)
const STAB_BEATS  = [1, 3, 5, 7] as const
const STAB_CHORDS = [
  [220.00, 261.63, 329.63],  // Am
  [196.00, 233.08, 293.66],  // Gm
  [220.00, 261.63, 329.63],  // Am
  [174.61, 220.00, 261.63],  // F
]

export function startPlayingBgm(): StopFn {
  const ctx    = ac()
  const b      = beat(PLAY_BPM)
  const eighth = b / 2
  const B      = bar(PLAY_BPM)

  // Compressor essential here — kick + bass + stabs + hats all hit at once
  // without it, simultaneous onsets clip hard on the BGM bus.
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.knee.value      = 10
  comp.ratio.value     = 6
  comp.attack.value    = 0.003
  comp.release.value   = 0.2
  comp.connect(bus())

  const dest    = makeGain(1.0, comp)
  let   stopped = false

  function scheduleLoop(loopStart: number): void {
    if (stopped) return

    // ── Bass ostinato ────────────────────────────────────────────────────
    BASS_PATTERN.forEach((freq, step) => {
      if (freq === 0) return
      const t = loopStart + step * eighth
      scheduleOsc('sawtooth', freq, t, eighth * 0.72, 0.13, 0.005, eighth * 0.45, dest)
    })

    // ── Chord stabs ───────────────────────────────────────────────────────
    STAB_BEATS.forEach((beatOff, i) => {
      const t     = loopStart + beatOff * b
      const chord = STAB_CHORDS[i % STAB_CHORDS.length]
      chord.forEach((freq) =>
        scheduleOsc('square', freq, t, b * 0.22, 0.045, 0.005, b * 0.18, dest)
      )
    })

    // ── Kick drum (beats 1 & 3 of each bar → steps 0, 4, 8, 12) ─────────
    ;[0, 4, 8, 12].forEach((step) => scheduleKick(loopStart + step * eighth, dest))

    // ── Snare (beats 2 & 4 → steps 2, 6, 10, 14) ─────────────────────────
    ;[2, 6, 10, 14].forEach((step) => {
      const t = loopStart + step * eighth
      scheduleNoise(t, eighth * 0.18, 0.16, 'bandpass', 1400, dest)
      // Snare transient click
      scheduleNoise(t, 0.015, 0.08, 'highpass', 4000, dest)
    })

    // ── Closed hi-hat (every 8th note, accented on beat) ─────────────────
    for (let step = 0; step < 16; step++) {
      const t   = loopStart + step * eighth
      const vol = step % 2 === 0 ? 0.035 : 0.018
      scheduleNoise(t, eighth * 0.28, vol, 'highpass', 9000, dest)
    }

    // ── Open hi-hat on the "and" of beat 4 each bar ───────────────────────
    ;[7, 15].forEach((step) => {
      const t = loopStart + step * eighth
      scheduleNoise(t, b * 0.38, 0.05, 'highpass', 7000, dest)
    })

    // ── Schedule next loop ────────────────────────────────────────────────
    const twoBarDur = B * 2
    const nextStart = loopStart + twoBarDur

    if (!stopped) {
      // Fire 1 beat early; read currentTime inside callback to stay accurate
      const fireAt = (nextStart - b - ctx.currentTime) * 1000
      setTimeout(() => {
        if (!stopped) scheduleLoop(nextStart)
      }, Math.max(0, fireAt))
    }
  }

  scheduleLoop(ctx.currentTime + 0.05)

  return () => {
    stopped = true
    dest.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
  }
}
