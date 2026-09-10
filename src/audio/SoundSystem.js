/**
 * SoundSystem - Minimalist biological cardiac sound director.
 *
 * Focuses exclusively on natural acoustic heartbeat and soft climax release:
 * 1. Natural biological heartbeat (Lub-Dub) with rich thoracic resonance and zero electronic artifacts.
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
    this.effectsCompressor = null;

    this.unlocked = false;
    this.muted = false;
    // Dedicated cardiac bus volume; music and caption audio remain completely unaffected.
    this.heartbeatVolume = options.volume ?? 1.25;

    // Heartbeat acoustic buffers
    this.lubBuffer = null;
    this.dubBuffer = null;
    this.finalBeatBuffer = null;
    this.softBurstBuffer = null;
    this.assetsLoadingPromise = null;

    // Heartbeat tracking
    this.lastHeartbeatPhase = -1;
    this.lubTriggered = false;
    this.dubTriggered = false;
    this.finalBeatTriggered = false;
    this.explosionTriggered = false;

    // Active voice tracking to prevent muddy overlap
    this.activeSources = new Set();
    this.currentCardiacSource = null;
    this.currentCardiacGain = null;

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

      // Dedicated cardiac limiter: retains full transient punch without distortion or clipping.
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-8, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.08, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Heartbeat Gain Node (independent dedicated path)
      this.heartbeatGain = this.ctx.createGain();
      this.heartbeatGain.gain.setValueAtTime(
        this.muted ? 0 : this.heartbeatVolume,
        this.ctx.currentTime,
      );
      this.heartbeatGain.connect(this.compressor);

      // Preserve explosion level independently
      this.effectsGain = this.ctx.createGain();
      this.effectsGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
      this.effectsGain.connect(this.effectsCompressor);

      // Pre-render acoustic buffers for immediate offline/test availability
      this.buildAcousticBuffers();

      // Asynchronously load studio-mastered audio assets if in browser environment
      this.assetsLoadingPromise = this.loadHeartbeatAssets();

      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Loads studio-mastered WAV assets from public/assets/audio/
   * Falls back gracefully to the procedural acoustic buffers if offline or unsupported.
   */
  async loadHeartbeatAssets() {
    if (
      !this.ctx ||
      typeof fetch !== 'function' ||
      typeof this.ctx.decodeAudioData !== 'function'
    ) {
      return;
    }

    const baseUrl =
      typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
        ? import.meta.env.BASE_URL
        : '/';

    const assets = [
      { key: 'lubBuffer', url: `${baseUrl}assets/audio/heartbeat-lub.wav` },
      { key: 'dubBuffer', url: `${baseUrl}assets/audio/heartbeat-dub.wav` },
      { key: 'finalBeatBuffer', url: `${baseUrl}assets/audio/heartbeat-final.wav` },
    ];

    await Promise.all(
      assets.map(async ({ key, url }) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arrayBuffer = await res.arrayBuffer();
          const decoded = await this.ctx.decodeAudioData(arrayBuffer);
          if (decoded) {
            this[key] = decoded;
          }
        } catch {
          // Graceful fallback: retain procedural buffer
        }
      }),
    );
  }

  /**
   * Generates organic acoustic waveforms modeled after biological cardiac valve closures.
   * Features natural thoracic resonance (56-130Hz) and zero electronic artifacts.
   */
  buildAcousticBuffers() {
    if (!this.ctx || typeof this.ctx.createBuffer !== 'function') return;

    const sampleRate = this.ctx.sampleRate || 44100;

    // 1. Primary Beat (Lub - S1): Warm, deep, full myocardial contraction.
    // Settles naturally from 102Hz down to 56Hz with warm tissue harmonics.
    this.lubBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.22,
      startFreq: 102,
      endFreq: 56,
      attackTime: 0.018,
      decayTau: 0.082,
      bodyRatio: 0.52,
      thirdHarmonicRatio: 0.22,
      subBassRatio: 0.35,
      amplitude: 0.933,
    });

    // 2. Secondary Beat (Dub - S2): Crisp, shorter aortic/pulmonary valve closure.
    // Settles naturally from 128Hz down to 72Hz.
    this.dubBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.17,
      startFreq: 128,
      endFreq: 72,
      attackTime: 0.015,
      decayTau: 0.062,
      bodyRatio: 0.45,
      thirdHarmonicRatio: 0.18,
      subBassRatio: 0.25,
      amplitude: 0.933,
    });

    // 3. Final Strong Beat: Deep, resonant diastolic surge right before explosion.
    this.finalBeatBuffer = this.renderCardiacBuffer({
      sampleRate,
      duration: 0.32,
      startFreq: 94,
      endFreq: 48,
      attackTime: 0.022,
      decayTau: 0.105,
      bodyRatio: 0.58,
      thirdHarmonicRatio: 0.26,
      subBassRatio: 0.40,
      amplitude: 0.933,
    });

    // 4. Soft Explosion Release: Quiet sub-bass exhale + gentle whisper of air (non-bomb)
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
    thirdHarmonicRatio = 0.22,
    subBassRatio = 0.35,
    amplitude = 0.933,
  }) {
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phaseAcc = 0;
    let maxAbs = 0;

    for (let i = 0; i < totalSamples; i += 1) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Natural acoustic pitch glide
      const freq = startFreq + (endFreq - startFreq) * Math.pow(progress, 0.65);
      phaseAcc += (2 * Math.PI * freq) / sampleRate;

      // Multi-harmonic myocardial acoustics
      const fundamental = Math.sin(phaseAcc);
      const tissueHarmonic2 = Math.sin(phaseAcc * 2.0 + 0.25) * bodyRatio;
      const tissueHarmonic3 = Math.sin(phaseAcc * 3.0 + 0.50) * thirdHarmonicRatio;
      const subBass = Math.sin(phaseAcc * 0.5 + 0.1) * subBassRatio * (1 - progress);
      const rawWave = fundamental + tissueHarmonic2 + tissueHarmonic3 + subBass;

      // Smooth sinusoidal attack and exponential biological decay
      let env = 0;
      if (t < attackTime) {
        env = Math.sin((Math.PI * 0.5) * (t / attackTime));
      } else {
        env = Math.exp(-(t - attackTime) / decayTau);
      }

      // Cosine taper at the tail (zero DC offset, zero clicks)
      const tailSamples = Math.floor(sampleRate * 0.025);
      if (i > totalSamples - tailSamples) {
        const tailP = (totalSamples - i) / tailSamples;
        env *= 0.5 * (1 - Math.cos(Math.PI * tailP));
      }

      const sampleVal = rawWave * env;
      data[i] = sampleVal;
      const absVal = Math.abs(sampleVal);
      if (absVal > maxAbs) {
        maxAbs = absVal;
      }
    }

    if (maxAbs > 0.0001) {
      for (let i = 0; i < totalSamples; i += 1) {
        data[i] = (data[i] / maxAbs) * amplitude;
      }
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

    if (!this.assetsLoadingPromise) {
      this.assetsLoadingPromise = this.loadHeartbeatAssets();
    }
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

    // Smooth voice limiting for cardiac sounds to prevent low-frequency overlap and mud
    if (output === this.heartbeatGain && this.currentCardiacGain && this.currentCardiacSource) {
      try {
        const prevGain = this.currentCardiacGain;
        const prevSource = this.currentCardiacSource;
        prevGain.gain.cancelScheduledValues(now);
        prevGain.gain.setValueAtTime(prevGain.gain.value, now);
        prevGain.gain.linearRampToValueAtTime(0.001, now + 0.035);
        prevSource.stop(now + 0.04);
      } catch {
        // Safe ignore
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);

    source.connect(gain);
    gain.connect(output);

    if (output === this.heartbeatGain) {
      this.currentCardiacGain = gain;
      this.currentCardiacSource = source;
    }

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.currentCardiacSource === source) {
        this.currentCardiacSource = null;
        this.currentCardiacGain = null;
      }
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
  // Biological Heartbeat Pulses (natural acoustic presence, warm chest resonance)
  // --------------------------------------------------------------------------
  playHeartbeat(intensity = 0.5, isRapid = false, isDub = false) {
    const buffer = isDub ? this.dubBuffer : this.lubBuffer;
    if (!buffer) return;

    // Natural dynamics: Lub is slightly rounder, Dub is crisper
    const baseVol = isDub ? 0.88 : 1.0;
    const volume = Math.min(1.15, baseVol + intensity * 0.1);
    this.playBuffer(buffer, volume);
  }

  playFinalBeat() {
    if (!this.finalBeatBuffer) return;
    // Stronger impact right before explosion without abrupt volume jump
    this.playBuffer(this.finalBeatBuffer, 1.15);
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
    this.currentCardiacGain = null;
    this.currentCardiacSource = null;

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
