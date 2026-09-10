/**
 * SoundSystem - Minimalist biological cardiac sound director.
 *
 * Focuses exclusively on natural acoustic heartbeat and soft climax release:
 * 1. Natural biological heartbeat (Lub-Dub) with rich tissue harmonics and zero electronic artifacts.
 * 2. Synchronized acceleration: slow -> faster -> rapid -> final strong beat.
 * 3. Final heartbeat impact right before explosion.
 * 4. Very soft, quiet low-frequency whoosh/breath on explosion (strictly non-bomb).
 *
 * Excludes all gem sounds, synthetic chimes, sparkles, pads, hums, and UI clicks for a pure, clean experience.
 */

export class SoundSystem {
  constructor(options = {}) {
    this.audioContextClass =
      options.AudioContext ??
      (typeof window !== 'undefined'
        ? window.AudioContext || window.webkitAudioContext || null
        : null);

    this.ctx = null;
    this.heartbeatGain = null;
    this.effectsGain = null;
    this.compressor = null;

    this.unlocked = false;
    this.muted = false;
    // Stronger cardiac signal with dedicated peak control; music/effects keep their levels.
    this.heartbeatVolume = options.volume ?? 1.6;

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

    if (options.autoInit && this.audioContextClass) {
      this.ensureContext();
    }
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    if (!this.audioContextClass) return null;

    try {
      this.ctx = new this.audioContextClass();

      // Preserve the old effect compressor exactly; only cardiac dynamics get stronger.
      this.effectsCompressor = this.ctx.createDynamicsCompressor();
      this.effectsCompressor.threshold.setValueAtTime(-2.5, this.ctx.currentTime);
      this.effectsCompressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.effectsCompressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.effectsCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.effectsCompressor.release.setValueAtTime(0.08, this.ctx.currentTime);
      this.effectsCompressor.connect(this.ctx.destination);

      // Cardiac-only limiter: quicker attack and lower threshold retain transient headroom.
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-8, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.08, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Heartbeat Gain Node with smooth transition
      this.heartbeatGain = this.ctx.createGain();
      this.heartbeatGain.gain.setValueAtTime(
        this.muted ? 0 : this.heartbeatVolume,
        this.ctx.currentTime,
      );
      this.heartbeatGain.connect(this.compressor);

      // Preserve the explosion level independently of the stronger heartbeat bus.
      this.effectsGain = this.ctx.createGain();
      this.effectsGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
      this.effectsGain.connect(this.effectsCompressor);

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

    // 1. Primary Beat (Lub - S1): Warm, deep, full myocardial contraction.
    // Settles naturally from 58Hz down to 44Hz with warm tissue harmonics (2nd & 3rd).
    this.lubBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.18,
      startFreq: 58,
      endFreq: 44,
      attackTime: 0.020,
      decayTau: 0.046,
      bodyRatio: 0.35,
      thirdHarmonicRatio: 0.15,
      amplitude: 0.95,
    });

    // 2. Secondary Beat (Dub - S2): Crisp, shorter aortic/pulmonary valve closure.
    // Settles naturally from 75Hz down to 60Hz.
    this.dubBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.14,
      startFreq: 75,
      endFreq: 60,
      attackTime: 0.016,
      decayTau: 0.034,
      bodyRatio: 0.28,
      thirdHarmonicRatio: 0.12,
      amplitude: 0.85,
    });

    // 3. Final Strong Beat: Deep, resonant diastolic surge right before explosion.
    this.finalBeatBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.24,
      startFreq: 54,
      endFreq: 38,
      attackTime: 0.024,
      decayTau: 0.062,
      bodyRatio: 0.42,
      thirdHarmonicRatio: 0.20,
      amplitude: 0.98,
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
    thirdHarmonicRatio = 0.12,
    amplitude,
  }) {
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phaseAcc = 0;
    const normFactor = 1.0 / (1.0 + bodyRatio + thirdHarmonicRatio);

    for (let i = 0; i < totalSamples; i += 1) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Natural acoustic pitch settle
      const freq = startFreq + (endFreq - startFreq) * Math.pow(progress, 0.7);
      phaseAcc += (2 * Math.PI * freq) / sampleRate;

      // Fundamental wave + warm myocardial tissue harmonics (2nd & 3rd)
      const fundamental = Math.sin(phaseAcc);
      const tissueHarmonic2 = Math.sin(phaseAcc * 2.0 + 0.25) * bodyRatio;
      const tissueHarmonic3 = Math.sin(phaseAcc * 3.0 + 0.50) * thirdHarmonicRatio;
      const rawWave = fundamental + tissueHarmonic2 + tissueHarmonic3;

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

      data[i] = rawWave * normFactor * env * amplitude;
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

      let sample = subWave * subEnv * 0.65 + pinkLast * airEnv * 0.22;

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
    if (this.ctx && this.heartbeatGain) {
      const now = this.ctx.currentTime;
      const targetGain = this.muted ? 0 : this.heartbeatVolume;
      this.heartbeatGain.gain.cancelScheduledValues(now);
      this.heartbeatGain.gain.linearRampToValueAtTime(targetGain, now + 0.04);
      this.effectsGain.gain.cancelScheduledValues(now);
      this.effectsGain.gain.linearRampToValueAtTime(this.muted ? 0 : 1, now + 0.04);
    }
  }

  playBuffer(buffer, volume = 1.0, output = this.heartbeatGain) {
    if (!this.ctx || !buffer || this.muted) return;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);

    source.connect(gain);
    gain.connect(output);

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
  // Biological Heartbeat Pulses (~5x louder, warm organic myocardial presence)
  // --------------------------------------------------------------------------
  playHeartbeat(intensity = 0.5, isRapid = false, isDub = false) {
    const buffer = isDub ? this.dubBuffer : this.lubBuffer;
    if (!buffer) return;

    // Rich presence scaling
    const baseVol = isDub ? 0.70 : 0.95;
    const volume = Math.min(1.10, baseVol + intensity * 0.15);
    this.playBuffer(buffer, volume);
  }

  playFinalBeat() {
    if (!this.finalBeatBuffer) return;
    this.playBuffer(this.finalBeatBuffer, 1.05);
  }

  playSoftExplosion() {
    if (!this.softBurstBuffer) return;
    this.playBuffer(this.softBurstBuffer, 0.60, this.effectsGain);
  }

  // --------------------------------------------------------------------------
  // Frame Update Loop - Sync directly with HeartSystem & Cinematic States
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

      // Lub triggers at the onset of primary contraction (~phase 0.06 - 0.20)
      if (!this.lubTriggered && phase >= 0.06 && phase <= 0.20) {
        this.playHeartbeat(intensity, isRapid, false);
        this.lubTriggered = true;
      }

      // Dub triggers at the onset of secondary closure (~phase 0.24 - 0.42)
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
      // In all other states (PETAL_FLIGHT, GEM_IDLE, GEM_ACTIVATION, MUSIC_REVEAL, FINAL, etc.), strictly silent
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


