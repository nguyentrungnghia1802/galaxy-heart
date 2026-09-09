/**
 * SoundSystem - Romantic, cinematic Web Audio synthesizer & sound director.
 *
 * Implements 100% procedural synthesis with zero external asset dependencies:
 * - Celestial ambient pad
 * - Intro click chime
 * - 2.0s horizontal curtain split whoosh
 * - Synchronized cardiac heartbeat (lub-dub) tracking HeartSystem phase & acceleration
 * - Soft cinematic bass impact & petal burst whoosh (non-bomb)
 * - Gem idle starlight micro-sparkles
 * - Crystal/quartz chime upon gem click
 * - Emotional major-9th chord swell for "I love you!" reveal
 * - Master dynamic compression & smooth mute/unmute fading with localStorage persistence
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
    this.ambienceGain = null;
    this.ambienceOscs = [];
    this.ambienceFilter = null;

    this.unlocked = false;
    this.muted = false;
    this.masterVolume = options.volume ?? 0.55;

    // Heartbeat synchronization state
    this.lastHeartbeatPhase = -1;
    this.lubTriggered = false;
    this.dubTriggered = false;
    this.tensionBeatCount = 0;
    this.lastTensionTime = 0;

    // Sparkle timer for GEM_IDLE
    this.sparkleTimer = 0;
    this.nextSparkleDelay = 1.6;

    // State tracking
    this.currentState = 'BOOT';

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

      // Master Dynamics Compressor: prevents any clipping or overlap distortion
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
      );
      this.masterGain.connect(this.compressor);

      return this.ctx;
    } catch {
      return null;
    }
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
    this.startAmbience();
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
      this.masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.06);
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

  // --------------------------------------------------------------------------
  // 1. Ambient Background Pad (Warm, Ethereal, Romantic)
  // --------------------------------------------------------------------------
  startAmbience() {
    if (!this.ctx || this.ambienceOscs.length > 0) return;

    const now = this.ctx.currentTime;
    this.ambienceFilter = this.ctx.createBiquadFilter();
    this.ambienceFilter.type = 'lowpass';
    this.ambienceFilter.frequency.setValueAtTime(380, now);
    this.ambienceFilter.Q.setValueAtTime(1.5, now);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.setValueAtTime(0.001, now);
    this.ambienceGain.gain.linearRampToValueAtTime(0.09, now + 2.5);

    this.ambienceFilter.connect(this.ambienceGain);
    this.ambienceGain.connect(this.masterGain);

    // Warm celestial triad: A2 (110Hz), E3 (164.8Hz), C#4 (277.2Hz)
    const freqs = [110.0, 164.81, 277.18];
    this.ambienceOscs = freqs.map((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      // Subtle detune for shimmer
      osc.detune.setValueAtTime((idx - 1) * 4, now);
      osc.connect(this.ambienceFilter);
      osc.start(now);
      return osc;
    });
  }

  setAmbienceVolume(targetGain, rampDuration = 1.0) {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    this.ambienceGain.gain.cancelScheduledValues(now);
    this.ambienceGain.gain.linearRampToValueAtTime(
      Math.max(0.001, targetGain),
      now + rampDuration,
    );
  }

  // --------------------------------------------------------------------------
  // 2. Intro Click Chime (Celesta / Music Box)
  // --------------------------------------------------------------------------
  playIntroClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sweet sparkling double chime: E6 (1318.5Hz) & B6 (1975.5Hz)
    const tones = [1318.51, 1975.53];
    tones.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.0001, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.05 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.85);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.9);
    });
  }

  // --------------------------------------------------------------------------
  // 3. Transition Whoosh (~2s horizontal curtain split)
  // --------------------------------------------------------------------------
  playCurtainWhoosh() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const duration = 2.0;

    // Create 2-second stereo noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    // Soft pink noise algorithm
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(1850, now + 0.85);
    filter.frequency.exponentialRampToValueAtTime(450, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.05);
  }

  // --------------------------------------------------------------------------
  // 4. Synchronized Cardiac Heartbeat (Lub-Dub)
  // --------------------------------------------------------------------------
  playHeartbeat(intensity = 0.5, isRapid = false, isDub = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isRapid ? 120 : 95, now);

    // Primary pulse (Lub): 50Hz -> 38Hz; Secondary pulse (Dub): 60Hz -> 42Hz
    const baseFreq = isDub ? (isRapid ? 66 : 58) : isRapid ? 56 : 48;
    const endFreq = isDub ? 42 : 36;
    const duration = isDub ? 0.11 : 0.15;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    // Volume shaped by heartbeat intensity
    const peakVolume = Math.min(0.38, 0.14 + intensity * 0.12) * (isDub ? 0.72 : 1.0);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakVolume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // --------------------------------------------------------------------------
  // 5. Soft Cinematic Explosion (Warm sub-bass drop + Petal shimmer)
  // --------------------------------------------------------------------------
  playExplosion() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Warm Sub Bass Drop (No harsh clipping, smooth rounded cinematic thump)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    const subFilter = this.ctx.createBiquadFilter();

    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(110, now);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.65);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.35, now + 0.035);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 1.0);

    // 2. Petal Shimmer / Whispering Outward Burst (Silky filtered noise)
    const shimmerDuration = 2.4;
    const bufferSize = Math.floor(this.ctx.sampleRate * shimmerDuration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const shimmerSource = this.ctx.createBufferSource();
    shimmerSource.buffer = buffer;

    const shimmerFilter = this.ctx.createBiquadFilter();
    shimmerFilter.type = 'bandpass';
    shimmerFilter.Q.setValueAtTime(2.2, now);
    shimmerFilter.frequency.setValueAtTime(1200, now);
    shimmerFilter.frequency.exponentialRampToValueAtTime(3200, now + 0.5);
    shimmerFilter.frequency.exponentialRampToValueAtTime(600, now + shimmerDuration);

    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.001, now);
    shimmerGain.gain.linearRampToValueAtTime(0.18, now + 0.12);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + shimmerDuration);

    shimmerSource.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);

    shimmerSource.start(now);
    shimmerSource.stop(now + shimmerDuration + 0.05);

    // Hush the ambience down to create serene quiet vacuum
    this.setAmbienceVolume(0.018, 0.4);
  }

  // --------------------------------------------------------------------------
  // 6. Gem Idle Micro-Sparkles (Delicate starlight glints)
  // --------------------------------------------------------------------------
  playGemSparkle() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Pentatonic crystal tones: D6, F#6, A6, C#7
    const crystalPitches = [1174.66, 1479.98, 1760.0, 2217.46];
    const pitch = crystalPitches[Math.floor(Math.random() * crystalPitches.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.42);
  }

  // --------------------------------------------------------------------------
  // 7. Crystal Gem Click Chime (Resonant Quartz Bell)
  // --------------------------------------------------------------------------
  playCrystalChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Quartz crystal harmonics: Fundamental (1760Hz - A6) + 2.76x (4857Hz) + 5.4x (9504Hz)
    const fundamental = 1760.0;
    const partials = [
      { ratio: 1.0, gain: 0.22, decay: 0.95 },
      { ratio: 2.76, gain: 0.08, decay: 0.65 },
      { ratio: 5.4, gain: 0.03, decay: 0.45 },
    ];

    partials.forEach((part) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * part.ratio, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(part.gain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + part.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + part.decay + 0.05);
    });
  }

  // --------------------------------------------------------------------------
  // 8. "I Love You!" Romantic Major 9th Chord Reveal
  // --------------------------------------------------------------------------
  playLoveReveal() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Romantic Fmaj9 lush chord: F3 (174.6Hz), C4 (261.6Hz), A4 (440Hz), E5 (659.2Hz), G5 (784Hz)
    const chord = [
      { freq: 174.61, type: 'triangle', gain: 0.14, delay: 0.0 },
      { freq: 261.63, type: 'sine', gain: 0.12, delay: 0.06 },
      { freq: 440.0, type: 'sine', gain: 0.11, delay: 0.12 },
      { freq: 659.25, type: 'sine', gain: 0.09, delay: 0.18 },
      { freq: 783.99, type: 'sine', gain: 0.07, delay: 0.24 },
    ];

    chord.forEach((note) => {
      const noteTime = now + note.delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(note.gain, noteTime + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 3.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 3.3);
    });

    // Bloom ambience back up to warm, comforting afterglow
    this.setAmbienceVolume(0.12, 2.0);
  }

  // --------------------------------------------------------------------------
  // Timeline Frame Update
  // --------------------------------------------------------------------------
  update(dt = 0.016, stateSnapshot = {}, heartSystem = null) {
    if (!this.ctx || !this.unlocked) return;

    const state = stateSnapshot?.state ?? 'BOOT';
    const progress = stateSnapshot?.progress ?? 0;
    this.currentState = state;

    // 1. Heartbeat Synchronization
    if (state === 'HEARTBEAT' || state === 'RAPID_HEARTBEAT') {
      const isRapid = state === 'RAPID_HEARTBEAT';
      const phase = heartSystem?.phase ?? 0;
      const intensity = stateSnapshot?.heartbeatIntensity ?? 0.5;

      // Detect phase crossing for Lub (~0.08) and Dub (~0.26)
      if (phase < this.lastHeartbeatPhase) {
        // Wrapped around to new beat cycle
        this.lubTriggered = false;
        this.dubTriggered = false;
      }

      if (!this.lubTriggered && phase >= 0.07 && phase <= 0.22) {
        this.playHeartbeat(intensity, isRapid, false);
        this.lubTriggered = true;
      }

      if (!this.dubTriggered && phase >= 0.25 && phase <= 0.45) {
        this.playHeartbeat(intensity, isRapid, true);
        this.dubTriggered = true;
      }

      this.lastHeartbeatPhase = phase;
    } else if (state === 'TENSION') {
      // Rapid suspenseful tension crescendo
      this.lastHeartbeatPhase = -1;
      this.lastTensionTime += dt;
      const beatInterval = Math.max(0.16, 0.42 - progress * 0.25);

      if (this.lastTensionTime >= beatInterval) {
        this.lastTensionTime = 0;
        this.tensionBeatCount += 1;
        const tensionIntensity = 1.0 + progress * 0.8;
        this.playHeartbeat(tensionIntensity, true, this.tensionBeatCount % 2 === 0);
      }
    } else {
      this.lastHeartbeatPhase = -1;
      this.lubTriggered = false;
      this.dubTriggered = false;
      this.lastTensionTime = 0;
    }

    // 2. Gem Idle Micro-Sparkles
    if (state === 'GEM_IDLE') {
      this.sparkleTimer += dt;
      if (this.sparkleTimer >= this.nextSparkleDelay) {
        this.sparkleTimer = 0;
        this.nextSparkleDelay = 1.6 + Math.random() * 1.5;
        this.playGemSparkle();
      }
    } else {
      this.sparkleTimer = 0;
    }
  }

  reset() {
    this.lastHeartbeatPhase = -1;
    this.lubTriggered = false;
    this.dubTriggered = false;
    this.tensionBeatCount = 0;
    this.lastTensionTime = 0;
    this.sparkleTimer = 0;
    this.setAmbienceVolume(0.09, 1.0);
  }

  dispose() {
    if (this.ambienceOscs.length > 0) {
      this.ambienceOscs.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignore
        }
      });
      this.ambienceOscs = [];
    }

    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Ignore
      }
      this.ctx = null;
    }
  }
}
