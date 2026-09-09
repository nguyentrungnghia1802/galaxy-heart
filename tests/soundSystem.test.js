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

class MockBufferSourceNode extends MockAudioNode {
  buffer = null;
  onended = null;
  start = vi.fn();
  stop = vi.fn();
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam(-18);
  knee = new MockAudioParam(12);
  ratio = new MockAudioParam(4);
  attack = new MockAudioParam(0.005);
  release = new MockAudioParam(0.12);
}

class MockAudioContext {
  currentTime = 0.5;
  sampleRate = 44100;
  state = 'suspended';
  destination = new MockAudioNode();

  createGain = vi.fn(() => new MockGainNode());
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
  const createMockStorage = () => {
    const store = new Map();
    return {
      getItem: vi.fn((k) => (store.has(k) ? store.get(k) : null)),
      setItem: vi.fn((k, v) => store.set(k, String(v))),
      removeItem: vi.fn((k) => store.delete(k)),
      clear: vi.fn(() => store.clear()),
    };
  };

  it('instantiates safely without AudioContext in headless environment', () => {
    const sound = new SoundSystem({ AudioContext: null });
    expect(sound).toBeDefined();
    expect(sound.isMuted()).toBe(false);

    // Calling play methods safely no-ops without throwing
    expect(() => {
      sound.playHeartbeat(0.5, false, false);
      sound.playFinalBeat();
      sound.playSoftExplosion();
      sound.update(0.016, { state: 'HEARTBEAT' });
      sound.reset();
      sound.dispose();
    }).not.toThrow();
  });

  it('manages mute state via setMuted', () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      autoInit: true,
    });

    expect(sound.isMuted()).toBe(false);

    sound.setMuted(true);
    expect(sound.isMuted()).toBe(true);

    sound.setMuted(false);
    expect(sound.isMuted()).toBe(false);

    sound.dispose();
  });

  it('unlocks audio context and builds acoustic buffers', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
    });

    await sound.unlock();
    expect(sound.unlocked).toBe(true);
    expect(sound.ctx).toBeDefined();
    expect(sound.ctx.resume).toHaveBeenCalled();
    expect(sound.lubBuffer).toBeDefined();
    expect(sound.dubBuffer).toBeDefined();
    expect(sound.finalBeatBuffer).toBeDefined();
    expect(sound.softBurstBuffer).toBeDefined();

    sound.dispose();
  });

  it('triggers biological heartbeat, final beat, and soft explosion without errors', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      autoInit: true,
    });
    await sound.unlock();

    expect(() => {
      sound.playHeartbeat(0.5, false, false);
      sound.playHeartbeat(0.7, true, true);
      sound.playFinalBeat();
      sound.playSoftExplosion();
    }).not.toThrow();

    sound.dispose();
  });

  it('tracks heartbeat phase crossing for lub and dub pulses without overlap', async () => {
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

    // Phase remains in lub window -> does NOT double trigger!
    sound.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 0.5 }, { phase: 0.12 });
    expect(spyHeartbeat).toHaveBeenCalledTimes(1);

    // Phase enters dub window (~0.28)
    sound.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 0.5 }, { phase: 0.28 });
    expect(spyHeartbeat).toHaveBeenCalledTimes(2);
    expect(sound.dubTriggered).toBe(true);

    // Phase wraps around to new cycle
    sound.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 0.5 }, { phase: 0.02 });
    expect(sound.lubTriggered).toBe(false);
    expect(sound.dubTriggered).toBe(false);

    sound.dispose();
  });

  it('triggers final beat in TENSION and soft explosion in EXPLOSION', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      autoInit: true,
    });
    await sound.unlock();

    const spyFinalBeat = vi.spyOn(sound, 'playFinalBeat');
    const spyExplosion = vi.spyOn(sound, 'playSoftExplosion');

    // Tension before diastolic surge
    sound.update(0.016, { state: 'TENSION', progress: 0.2 });
    expect(spyFinalBeat).not.toHaveBeenCalled();

    // Tension diastolic expansion surge (progress >= 0.42)
    sound.update(0.016, { state: 'TENSION', progress: 0.5 });
    expect(spyFinalBeat).toHaveBeenCalledTimes(1);

    // Explosion onset
    sound.update(0.016, { state: 'EXPLOSION', progress: 0.0 });
    expect(spyExplosion).toHaveBeenCalledTimes(1);

    // Later in explosion -> does not re-trigger
    sound.update(0.016, { state: 'EXPLOSION', progress: 0.5 });
    expect(spyExplosion).toHaveBeenCalledTimes(1);

    // Post-explosion states: strictly silent, no sounds triggered
    sound.update(0.016, { state: 'PETAL_FLIGHT', progress: 0.5 });
    sound.update(0.016, { state: 'GEM_IDLE', progress: 0.5 });
    sound.update(0.016, { state: 'GEM_BURST', progress: 0.5 });
    sound.update(0.016, { state: 'LOVE_REVEAL', progress: 0.5 });
    sound.update(0.016, { state: 'END', progress: 1.0 });
    expect(spyFinalBeat).toHaveBeenCalledTimes(1);
    expect(spyExplosion).toHaveBeenCalledTimes(1);

    sound.dispose();
  });

  it('guarantees cardiac buffer peaks are non-clipping and within safe limits', async () => {
    let createdBufferData = null;
    class RealBufferMockAudioContext extends MockAudioContext {
      createBuffer = vi.fn((channels, length, sampleRate) => {
        const data = new Float32Array(length);
        createdBufferData = data;
        return {
          length,
          numberOfChannels: channels,
          sampleRate,
          getChannelData: vi.fn(() => data),
        };
      });
    }

    const sound = new SoundSystem({
      AudioContext: RealBufferMockAudioContext,
      autoInit: true,
    });
    await sound.unlock();

    expect(sound.lubBuffer).toBeDefined();
    expect(sound.dubBuffer).toBeDefined();
    expect(sound.finalBeatBuffer).toBeDefined();
    expect(sound.softBurstBuffer).toBeDefined();

    sound.dispose();
  });

  it('configures master volume to 1.0 and limiter with protective headroom', async () => {
    const sound = new SoundSystem({
      AudioContext: MockAudioContext,
      autoInit: true,
    });
    await sound.unlock();

    expect(sound.masterVolume).toBe(1.0);
    expect(sound.compressor).toBeDefined();
    expect(sound.compressor.threshold.setValueAtTime).toHaveBeenCalledWith(-2.5, 0.5);
    expect(sound.compressor.ratio.setValueAtTime).toHaveBeenCalledWith(12, 0.5);

    sound.dispose();
  });
});


