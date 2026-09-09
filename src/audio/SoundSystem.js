/**
 * SoundSystem - Minimalist, organic, cinematic biological sound director.
 *
 * Focuses exclusively on natural acoustic heartbeat and soft climax release:
 * 1. Natural organic heartbeat (Lub-Dub) with authentic tissue resonance and zero electronic/synth artifacts.
 * 2. Synchronized acceleration: slow -> faster -> rapid -> final strong beat.
 * 3. Final heartbeat impact right before explosion.
 * 4. Very soft, quiet low-frequency whoosh/breath on explosion (strictly non-bomb).
 *
 * Excludes all synthetic chimes, sparkles, pads, hums, and UI clicks for a clean, mature experience.
 */

const STORAGE_MUTE_KEY = 'galaxy_heart_muted';

export class SoundSystem {
  constructor(options = {}) {
    this.audioContextClass =
      options.AudioContext ??
      (typeof window !== 'undefined'
        ? window.AudioContext || window.webkitAudioContext || null
        : null);

    this.storage =
      options.storage ??
      (typeof globalThis !== 'undefined' && globalThis.localStorage
        ? globalThis.localStorage
        : typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : null);

    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;

    this.unlocked = false;
    this.muted = false;
    this.masterVolume = options.volume ?? 0.50;

    // Heartbeat pre-rendered acoustic buffers
    this.lubBuffer = null;
    this.dubBuffer = null;
    this.finalBeatBuffer = null;
    this.softBurstBuffer = null;

    // Heartbeat tracking
    this.lastHeartbeatPhase = -1;
    this.lubTriggered = false;
    this.dubTriggered = false;
    this.finalBeatTriggered = false;
    this.explosionTriggered = false;

    // Active nodes tracking to prevent overlap
    this.activeSources = new Set();

    // Load mute preference
    if (this.storage) {
      try {
        this.muted = this.storage.getItem(STORAGE_MUTE_KEY) === 'true';
      } catch {
        this.muted = false;
      }
    }

    if (options.autoInit && this.audioContextClass) {
      this.ensureContext();
    }
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    if (!this.audioContextClass) return null;

    try {
      this.ctx = new this.audioContextClass();

      // Master Compressor to prevent any clipping or volume spikes
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Master Gain Node with smooth transition
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
      );
      this.masterGain.connect(this.compressor);

      // Pre-render acoustic buffers
      this.buildAcousticBuffers();

      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Generates organic acoustic waveforms modeled after biological cardiac valve closures.
   * Uses smooth windowing to guarantee 0 clicks, 0 pops, and 0 electronic harshness.
   */
  buildAcousticBuffers() {
    if (!this.ctx || typeof this.ctx.createBuffer !== 'function') return;

    const sampleRate = this.ctx.sampleRate || 44100;

    // 1. Primary Beat (Lub - S1): Muffled, deep, warm myocardial closure
    // Settles naturally from ~48Hz to ~40Hz with soft tissue resonance
    this.lubBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.16,
      startFreq: 48,
      endFreq: 40,
      attackTime: 0.022,
      decayTau: 0.038,
      bodyRatio: 0.18,
      amplitude: 0.85,
    });

    // 2. Secondary Beat (Dub - S2): Slightly shorter, slightly higher valve snap
    // Settles naturally from ~62Hz to ~54Hz
    this.dubBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.12,
      startFreq: 62,
      endFreq: 54,
      attackTime: 0.018,
      decayTau: 0.028,
      bodyRatio: 0.14,
      amplitude: 0.58,
    });

    // 3. Final Strong Beat: Deep, full, resonant diastolic surge before explosion
    this.finalBeatBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.22,
      startFreq: 45,
      endFreq: 36,
      attackTime: 0.026,
      decayTau: 0.052,
      bodyRatio: 0.24,
      amplitude: 1.05,
    });

    // 4. Soft Explosion Release: Very brief, quiet sub-bass exhale + whisper of air (non-bomb)
    this.softBurstBuffer = this.renderSoftBurstBuffer(sampleRate, 0.55);
  }

  renderCardiacBuffer({
    sampleRate,
    duration,
    startFreq,
    endFreq,
    attackTime,
    decayTau,
    bodyRatio,
    amplitude,
  }) {
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phaseAcc = 0;
    for (let i = 0; i < totalSamples; i += 1) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Natural acoustic pitch settle
      const freq = startFreq + (endFreq - startFreq) * Math.pow(progress, 0.7);
      phaseAcc += (2 * Math.PI * freq) / sampleRate;

      // Fundamental wave + gentle second harmonic tissue body
      const fundamental = Math.sin(phaseAcc);
      const tissueHarmonic = Math.sin(phaseAcc * 2.0 + 0.25) * bodyRatio;
      const rawWave = fundamental + tissueHarmonic;

      // Soft rounded attack (sinusoidal) and exponential biological decay
      let env = 0;
      if (t < attackTime) {
        env = Math.sin((Math.PI * 0.5) * (t / attackTime));
      } else {
        env = Math.exp(-(t - attackTime) / decayTau);
      }

      // Smooth taper at tail to guarantee zero DC offset or click
      const tailSamples = Math.floor(sampleRate * 0.015);
      if (i > totalSamples - tailSamples) {
        const tailP = (totalSamples - i) / tailSamples;
        env *= tailP;
      }

      data[i] = rawWave * env * amplitude;
    }

    return buffer;
  }

  renderSoftBurstBuffer(sampleRate, duration) {
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phaseAcc = 0;
    let pinkLast = 0.0;

    for (let i = 0; i < totalSamples; i += 1) {
      const t = i / sampleRate;
      const progress = t / duration;

      // 1. Soft warm sub exhale (52Hz down to 26Hz)
      const freq = 52 - 26 * progress;
      phaseAcc += (2 * Math.PI * freq) / sampleRate;
      const subWave = Math.sin(phaseAcc);
      const subEnv = t < 0.03
        ? Math.sin((Math.PI * 0.5) * (t / 0.03))
        : Math.exp(-(t - 0.03) / 0.14);

      // 2. Gentle airy breath (soft pink noise filtered)
      const white = Math.random() * 2 - 1;
      pinkLast = (pinkLast + 0.025 * white) / 1.025;
      const airEnv = t < 0.04
        ? Math.sin((Math.PI * 0.5) * (t / 0.04))
        : Math.exp(-(t - 0.04) / 0.18);

      let sample = subWave * subEnv * 0.55 + pinkLast * airEnv * 0.20;

      // Tail taper
      const tailSamples = Math.floor(sampleRate * 0.02);
      if (i > totalSamples - tailSamples) {
        const tailP = (totalSamples - i) / tailSamples;
        sample *= tailP;
      }

      data[i] = sample;
    }

    return buffer;
  }

  async unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Safe fallback
      }
    }
    this.unlocked = true;
  }

  isMuted() {
    return this.muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_MUTE_KEY, String(this.muted));
      } catch {
        // Safe fallback
      }
    }

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      const targetGain = this.muted ? 0 : this.masterVolume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.04);
    }
  }

  toggleMute() {
    this.ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.unlock();
    }
    this.setMuted(!this.muted);
    return this.muted;
  }

  playBuffer(buffer, volume = 1.0) {
    if (!this.ctx || !buffer || this.muted) return;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);

    source.connect(gain);
    gain.connect(this.masterGain);

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        // Safe cleanup
      }
    };

    source.start(now);
  }

  // --------------------------------------------------------------------------
  // Biological Heartbeat Pulses (No electronic sound)
  // --------------------------------------------------------------------------
  playHeartbeat(intensity = 0.5, isRapid = false, isDub = false) {
    const buffer = isDub ? this.dubBuffer : this.lubBuffer;
    if (!buffer) return;

    // Subtle natural volume scaling with heartbeat intensity
    const baseVol = isDub ? 0.40 : 0.55;
    const volume = Math.min(0.75, baseVol + intensity * 0.12);
    this.playBuffer(buffer, volume);
  }

  playFinalBeat() {
    if (!this.finalBeatBuffer) return;
    this.playBuffer(this.finalBeatBuffer, 0.85);
  }

  playSoftExplosion() {
    if (!this.softBurstBuffer) return;
    this.playBuffer(this.softBurstBuffer, 0.45);
  }

  // --------------------------------------------------------------------------
  // Frame Update Loop - Sync directly with HeartSystem
  // --------------------------------------------------------------------------
  update(dt = 0.016, stateSnapshot = {}, heartSystem = null) {
    if (!this.ctx || !this.unlocked) return;

    const state = stateSnapshot?.state ?? 'BOOT';
    const progress = stateSnapshot?.progress ?? 0;

    // 1. Normal & Rapid Heartbeat
    if (state === 'HEARTBEAT' || state === 'RAPID_HEARTBEAT') {
      const isRapid = state === 'RAPID_HEARTBEAT';
      const phase = heartSystem?.phase ?? 0;
      const intensity = stateSnapshot?.heartbeatIntensity ?? 0.5;

      // When phase wraps around from end to beginning
      if (phase < this.lastHeartbeatPhase) {
        this.lubTriggered = false;
        this.dubTriggered = false;
      }

      // Lub triggers at the onset of primary contraction (~phase 0.06 - 0.14)
      if (!this.lubTriggered && phase >= 0.06 && phase <= 0.20) {
        this.playHeartbeat(intensity, isRapid, false);
        this.lubTriggered = true;
      }

      // Dub triggers at the onset of secondary closure (~phase 0.24 - 0.36)
      if (!this.dubTriggered && phase >= 0.24 && phase <= 0.42) {
        this.playHeartbeat(intensity, isRapid, true);
        this.dubTriggered = true;
      }

      this.lastHeartbeatPhase = phase;
      this.finalBeatTriggered = false;
      this.explosionTriggered = false;
    } else if (state === 'TENSION') {
      this.lastHeartbeatPhase = -1;
      this.lubTriggered = false;
      this.dubTriggered = false;

      // Final Strong Beat: triggers during diastolic expansion surge (progress >= 0.42)
      if (!this.finalBeatTriggered && progress >= 0.42) {
        this.playFinalBeat();
        this.finalBeatTriggered = true;
      }
    } else if (state === 'EXPLOSION') {
      this.lastHeartbeatPhase = -1;
      this.lubTriggered = false;
      this.dubTriggered = false;

      // Soft release breath: triggers at the exact start of explosion
      if (!this.explosionTriggered) {
        this.playSoftExplosion();
        this.explosionTriggered = true;
      }
    } else {
      this.lastHeartbeatPhase = -1;
      this.lubTriggered = false;
      this.dubTriggered = false;
      this.finalBeatTriggered = false;
      this.explosionTriggered = false;
    }
  }

  reset() {
    this.lastHeartbeatPhase = -1;
    this.lubTriggered = false;
    this.dubTriggered = false;
    this.finalBeatTriggered = false;
    this.explosionTriggered = false;

    // Stop active sources on reset
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Safe ignore
      }
    });
    this.activeSources.clear();
  }

  dispose() {
    this.reset();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Safe ignore
      }
      this.ctx = null;
    }
  }
}
