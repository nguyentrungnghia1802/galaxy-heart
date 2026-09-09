import { describe, expect, it } from 'vitest';

import { HeartSystem } from '../src/heart/HeartSystem.js';
import {
  getHeartbeatIntensity,
  getHeartbeatInterval,
  sampleHeartbeatEnvelope,
} from '../src/heart/heartbeatEnvelope.js';

describe('sampleHeartbeatEnvelope', () => {
  it.each([
    [0, 1],
    [0.1, 1.075],
    [0.18, 1.015],
    [0.28, 1.045],
    [0.38, 1],
    [1, 1],
  ])('matches the lub-dub keyframe at phase %s', (phase, scale) => {
    expect(sampleHeartbeatEnvelope(phase)).toBeCloseTo(scale, 6);
  });

  it('contains two separate peaks with a valley between them', () => {
    const lub = sampleHeartbeatEnvelope(0.1);
    const valley = sampleHeartbeatEnvelope(0.18);
    const dub = sampleHeartbeatEnvelope(0.28);

    expect(lub).toBeGreaterThan(valley);
    expect(dub).toBeGreaterThan(valley);
    expect(lub).toBeGreaterThan(dub);
  });
});

describe('getHeartbeatInterval', () => {
  it('accelerates non-linearly from 0.90 seconds to 0.28 seconds', () => {
    expect(getHeartbeatInterval(0)).toBeCloseTo(0.9, 6);
    expect(getHeartbeatInterval(0.5)).toBeCloseTo(0.8225, 6);
    expect(getHeartbeatInterval(1)).toBeCloseTo(0.28, 6);
  });
});

describe('heartbeat glow signal', () => {
  it('can intensify rapidly without increasing the scale envelope', () => {
    const intensity = getHeartbeatIntensity({
      state: 'RAPID_HEARTBEAT',
      progress: 1,
      pulse: 1,
    });

    expect(intensity).toBeGreaterThan(1.5);
    expect(sampleHeartbeatEnvelope(0.1)).toBeLessThanOrEqual(1.12);
  });
});

describe('HeartSystem', () => {
  it('keeps heartbeat scale below 1.12 and preserves phase into rapid mode', () => {
    const heart = new HeartSystem();
    heart.update(0.09, { state: 'HEARTBEAT', progress: 0.2 });
    const normalPhase = heart.phase;

    expect(heart.getGlobalScale()).toBeLessThanOrEqual(1.12);
    heart.update(0.01, { state: 'RAPID_HEARTBEAT', progress: 0.5 });

    expect(heart.phase).toBeGreaterThan(normalPhase);
    expect(heart.getGlobalScale()).toBeLessThanOrEqual(1.12);
    expect(heart.getIntensity()).not.toBe(heart.getGlobalScale());
  });

  it('progresses through tension compression and surges into a final strong beat before explosion', () => {
    const heart = new HeartSystem();
    // Early tension: compression & coiling
    heart.update(0.01, { state: 'TENSION', progress: 0.35 });
    const compressionScale = heart.getGlobalScale();
    expect(compressionScale).toBeLessThan(1.08);

    // Late tension: final massive strong diastolic beat
    heart.update(0.01, { state: 'TENSION', progress: 0.95 });
    const finalBeatScale = heart.getGlobalScale();
    expect(finalBeatScale).toBeGreaterThan(1.2);
    expect(heart.getIntensity()).toBeGreaterThan(3.0);
  });

  it('reset clears phase, scale, intensity, and previous state', () => {
    const heart = new HeartSystem();
    heart.update(0.1, { state: 'RAPID_HEARTBEAT', progress: 0.8 });
    heart.reset();

    expect(heart.phase).toBe(0);
    expect(heart.getGlobalScale()).toBe(1);
    expect(heart.getIntensity()).toBe(0);
    expect(heart.previousState).toBe(null);
  });
});

