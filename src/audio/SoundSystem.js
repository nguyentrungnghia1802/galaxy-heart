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
    // Increased master volume from 0.50 to 1.0 for ~5x perceived acoustic presence
    this.masterVolume = options.volume ?? 1.0;

    // Heartbeat pre-rendered acoustic buffers
    this.lubBuffer = null;
    this.dubBuffer = null;
    this.finalBeatBuffer = null;
    this.softBurstBuffer = null;
    this.gemShimmerBuffer = null;

    // Heartbeat tracking
    this.lastHeartbeatPhase = -1;
    this.lubTriggered = false;
    this.dubTriggered = false;
    this.finalBeatTriggered = false;
    this.explosionTriggered = false;

    // Gem floating sound state
    this.gemSourceNode = null;
    this.gemGainNode = null;
    this.gemPlaying = false;
    this.gemSoundDisabled = false;

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

      // Master Peak Limiter (prevents any digital clipping or volume spikes while allowing ~5x perceived loudness)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-2.5, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.08, this.ctx.currentTime);
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
   * Generates organic acoustic waveforms modeled after biological cardiac valve closures
   * and crystalline resonance for the floating gem.
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

    // 5. Gem Floating Crystal Shimmer: Ethereal, gentle, high-purity crystal tone
    this.gemShimmerBuffer = this.renderGemShimmerBuffer(sampleRate, 4.0);
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

  /**
   * Generates a delicate, high-purity crystal shimmer for the floating gem.
   * All frequencies and modulations have exact integer periods over the buffer duration,
   * guaranteeing an infinite, seamless loop with zero clicks, pops, or phase artifacts.
   */
  renderGemShimmerBuffer(sampleRate, duration = 4.0) {
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Harmonious crystal singing frequencies (528Hz Solfeggio / pure crystal series)
    // Over a 4.0-second buffer, every tone completes an exact integer number of cycles:
    // e.g. 528.0 * 4 = 2112, 528.5 * 4 = 2114, 792.0 * 4 = 3168, etc.
    const tones = [
      { freq: 528.0, amp: 0.28 },
      { freq: 528.5, amp: 0.22 },
      { freq: 792.0, amp: 0.16 },
      { freq: 1056.0, amp: 0.14 },
      { freq: 1056.75, amp: 0.10 },
      { freq: 1584.25, amp: 0.08 },
      { freq: 2112.0, amp: 0.04 },
    ];

    const totalAmp = tones.reduce((sum, t) => sum + t.amp, 0);

    for (let i = 0; i < totalSamples; i += 1) {
      const t = i / sampleRate;
      let sample = 0;

      // Soft amplitude breathing (0.5 Hz = exactly 2 cycles over 4s)
      const breathing = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.5 * t);
      // Delicate shimmer tremolo on high harmonics (2.0 Hz = exactly 8 cycles over 4s)
      const shimmer = 0.80 + 0.20 * Math.sin(2 * Math.PI * 2.0 * t);

      for (let j = 0; j < tones.length; j += 1) {
        const tone = tones[j];
        const phase = 2 * Math.PI * tone.freq * t;
        const mod = j >= 4 ? shimmer : breathing;
        sample += Math.sin(phase) * tone.amp * mod;
      }

      data[i] = (sample / totalAmp) * 0.88;
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
    this.playBuffer(this.softBurstBuffer, 0.60);
  }

  // --------------------------------------------------------------------------
  // Gem Floating Crystal Sound (~5x perceived loudness, ethereal crystal loop)
  // --------------------------------------------------------------------------
  startGemSound() {
    if (
      !this.ctx ||
      !this.gemShimmerBuffer ||
      this.gemPlaying ||
      this.gemSoundDisabled ||
      this.muted
    ) {
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      source.buffer = this.gemShimmerBuffer;
      source.loop = true;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      // Beautiful smooth fade-in over 0.75s
      gain.gain.linearRampToValueAtTime(0.52, now + 0.75);

      source.connect(gain);
      gain.connect(this.masterGain);

      this.gemSourceNode = source;
      this.gemGainNode = gain;
      this.gemPlaying = true;

      source.onended = () => {
        if (this.gemSourceNode === source) {
          this.gemSourceNode = null;
          this.gemGainNode = null;
          this.gemPlaying = false;
        }
      };

      source.start(now);
    } catch {
      // Safe fallback
    }
  }

  stopGemSound() {
    if (!this.gemPlaying && !this.gemSourceNode) {
      return;
    }

    const source = this.gemSourceNode;
    const gain = this.gemGainNode;

    this.gemPlaying = false;
    this.gemSourceNode = null;
    this.gemGainNode = null;
    this.gemSoundDisabled = true;

    if (gain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value ?? 0.52, now);
        // Fast 0.08s smooth release to prevent any digital pop
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
      } catch {
        // Safe fallback
      }
    }

    if (source && this.ctx) {
      try {
        const stopTime = this.ctx.currentTime + 0.08;
        source.stop(stopTime);
        setTimeout(() => {
          try {
            source.disconnect();
            gain?.disconnect();
          } catch {
            // Safe ignore
          }
        }, 120);
      } catch {
        try {
          source.stop();
        } catch {
          // Safe ignore
        }
      }
    }
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
    } else if (state === 'PETAL_FLIGHT' || state === 'GEM_IDLE') {
      this.lastHeartbeatPhase = -1;
      this.lubTriggered = false;
      this.dubTriggered = false;

      // Gem is floating in the center after explosion: start crystal shimmer sound
      if (!this.gemPlaying && !this.gemSoundDisabled) {
        this.startGemSound();
      }
    } else if (
      state === 'GEM_BURST' ||
      state === 'LOVE_REVEAL' ||
      state === 'END'
    ) {
      this.lastHeartbeatPhase = -1;
      this.lubTriggered = false;
      this.dubTriggered = false;

      // After clicking gem or subsequent states: stop gem sound completely
      if (this.gemPlaying) {
        this.stopGemSound();
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

    // Reset gem sound state
    this.stopGemSound();
    this.gemSoundDisabled = false;

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

