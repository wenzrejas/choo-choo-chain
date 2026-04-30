/**
 * AudioEngine — singleton Web Audio API context.
 *
 * All sound in the game flows through two buses:
 *   sfxBus  → master
 *   bgmBus  → master
 *
 * The context is suspended until the first user gesture (browser autoplay policy).
 * Call AudioEngine.resume() on any click/keydown to unlock it.
 */

class AudioEngineClass {
  private _ctx:        AudioContext | null = null
  private _master:     GainNode    | null = null
  private _sfxBus:     GainNode    | null = null
  private _bgmBus:     GainNode    | null = null
  private _resumed     = false

  // ── Lazy init ──────────────────────────────────────────────────────────────

  get ctx(): AudioContext {
    if (!this._ctx) {
      this._ctx = new AudioContext()
      this._master  = this._ctx.createGain()
      this._sfxBus  = this._ctx.createGain()
      this._bgmBus  = this._ctx.createGain()
      this._master.gain.value  = 0.5
      this._sfxBus.gain.value  = 0.7
      this._bgmBus.gain.value  = 0.25
      this._sfxBus.connect(this._master)
      this._bgmBus.connect(this._master)
      this._master.connect(this._ctx.destination)
    }
    return this._ctx
  }

  get sfxBus(): GainNode  { this.ctx; return this._sfxBus! }
  get bgmBus():  GainNode  { this.ctx; return this._bgmBus! }

  // ── Resume on first gesture ───────────────────────────────────────────────

  resume(): void {
    if (this._resumed) return
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {/* noop */})
    }
    this._resumed = true
  }

  // ── Volume helpers ────────────────────────────────────────────────────────

  setSfxVolume(v: number): void {
    this.ctx
    if (this._sfxBus) this._sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  setBgmVolume(v: number): void {
    this.ctx
    if (this._bgmBus) this._bgmBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.15)
  }

  setMasterVolume(v: number): void {
    this.ctx
    if (this._master) this._master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  // ── Utility: create a GainNode connected to sfxBus ───────────────────────

  sfxGain(initialGain = 1): GainNode {
    const g = this.ctx.createGain()
    g.gain.value = initialGain
    g.connect(this.sfxBus)
    return g
  }

  // ── Utility: white noise buffer (1 s, cached) ─────────────────────────────

  private _noiseBuffer: AudioBuffer | null = null

  noiseBuffer(): AudioBuffer {
    if (!this._noiseBuffer) {
      const ctx  = this.ctx
      const len  = ctx.sampleRate
      const buf  = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      this._noiseBuffer = buf
    }
    return this._noiseBuffer!
  }
}

export const AudioEngine = new AudioEngineClass()
