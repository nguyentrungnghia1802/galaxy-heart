import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundSystem } from '../src/audio/SoundSystem.js';

class MockAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
  }
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1);
}

class MockOscillatorNode extends MockAudioNode {
  frequency = new MockAudioParam(440);
  detune = new MockAudioParam(0);
  type = 'sine';
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode extends MockAudioNode {
  frequency = new MockAudioParam(350);
  Q = new MockAudioParam(1);
  type = 'lowpass';
}

class MockBufferSourceNode extends MockAudioNode {
  buffer = null;
  start = vi.fn();
  stop = vi.fn();
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam(-18);
  knee = new MockAudioParam(12);
  ratio = new MockAudioParam(4);
  attack = new MockAudioParam(0.005);
  release = new MockAudioParam(0.15);
}

class MockAudioContext {
  currentTime = 0.5;
  sampleRate = 44100;
  state = 'suspended';
  destination = new MockAudioNode();

  createGain = vi.fn(() => new MockGainNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
  createBufferSource = vi.fn(() => new MockBufferSourceNode());
  createDynamicsCompressor = vi.fn(() => new MockDynamicsCompressorNode());
  createBuffer = vi.fn((channels, length, sampleRate) => ({
    length,
    numberOfChannels: channels,
    sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
  }));
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

describe('SoundSystem', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('instantiates safely without AudioContext in headless environment', () => {
    const sound = new SoundSystem({ AudioContext: null });
    expect(sound).toBeDefined();
    expect(sound.isMuted()).toBe(false);

    // Calling play methods safely no-ops without throwing
    expect(() => {
      sound.playIntroClick();
      sound.playCurtainWhoosh();
      sound.playHeartbeat(0.5, false);
      sound.playExplosion();
      sound.playGemSparkle();
      sound.playCrystalChime();
      sound.playLoveReveal();
      sound.update(0.016, { state: 'HEARTBEAT' });
      sound.reset();
      sound.dispose();
    }).not.toThrow();
  });

  const createMockStorage = () => {
    const store = new Map();
    return {
      getItem: vi.fn((k) => (store.has(k) ? store.get(k) : null)),
      setItem: vi.fn((k, v) => store.set(k, String(v))),
      removeItem: vi.fn((k) => store.delete(k)),
      clear: vi.fn(() => store.clear()),
    };
  };

  it('manages mute state and persists to storage', () => {
    const storage = createMockStorage();
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      storage,
      autoInit: true,
    });

    expect(sound.isMuted()).toBe(false);

    sound.setMuted(true);
    expect(sound.isMuted()).toBe(true);
    expect(storage.getItem('galaxy_heart_muted')).toBe('true');

    const toggled = sound.toggleMute();
    expect(toggled).toBe(false);
    expect(sound.isMuted()).toBe(false);
    expect(storage.getItem('galaxy_heart_muted')).toBe('false');

    sound.dispose();
  });

  it('unlocks audio context and starts ambient background', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
    });

    await sound.unlock();
    expect(sound.unlocked).toBe(true);
    expect(sound.ctx).toBeDefined();
    expect(sound.ctx.resume).toHaveBeenCalled();
    expect(sound.ambienceOscs.length).toBe(3);

    sound.dispose();
  });

  it('triggers intro click, curtain whoosh, explosion, and crystal chime without errors', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      autoInit: true,
    });
    await sound.unlock();

    expect(() => {
      sound.playIntroClick();
      sound.playCurtainWhoosh();
      sound.playExplosion();
      sound.playGemSparkle();
      sound.playCrystalChime();
      sound.playLoveReveal();
    }).not.toThrow();

    sound.dispose();
  });

  it('tracks heartbeat phase crossing for lub and dub pulses', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      autoInit: true,
    });
    await sound.unlock();

    const spyHeartbeat = vi.spyOn(sound, 'playHeartbeat');

    // Phase before lub
    sound.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 0.5 }, { phase: 0.04 });
    expect(spyHeartbeat).not.toHaveBeenCalled();

    // Phase enters lub window (~0.08)
    sound.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 0.5 }, { phase: 0.09 });
    expect(spyHeartbeat).toHaveBeenCalledTimes(1);
    expect(sound.lubTriggered).toBe(true);

    // Phase enters dub window (~0.28)
    sound.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 0.5 }, { phase: 0.28 });
    expect(spyHeartbeat).toHaveBeenCalledTimes(2);
    expect(sound.dubTriggered).toBe(true);

    // Phase wraps around
    sound.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 0.5 }, { phase: 0.02 });
    expect(sound.lubTriggered).toBe(false);
    expect(sound.dubTriggered).toBe(false);

    sound.dispose();
  });

  it('handles tension beats and gem sparkle timer during update', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      autoInit: true,
    });
    await sound.unlock();

    const spyHeartbeat = vi.spyOn(sound, 'playHeartbeat');
    const spySparkle = vi.spyOn(sound, 'playGemSparkle');

    // Tension update
    sound.update(0.5, { state: 'TENSION', progress: 0.8 });
    expect(spyHeartbeat).toHaveBeenCalled();

    // Gem idle update over sparkle duration
    sound.update(3.5, { state: 'GEM_IDLE' });
    expect(spySparkle).toHaveBeenCalled();

    sound.dispose();
  });
});
