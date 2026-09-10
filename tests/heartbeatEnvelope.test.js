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
  it('keeps every heartbeat cycle at the original 0.90 second interval', () => {
    expect(getHeartbeatInterval(0)).toBeCloseTo(0.9, 6);
    expect(getHeartbeatInterval(0.5)).toBeCloseTo(0.9, 6);
    expect(getHeartbeatInterval(1)).toBeCloseTo(0.9, 6);
  });
});

describe('heartbeat glow signal', () => {
  it('does not add a rapid-mode intensity ramp', () => {
    const intensity = getHeartbeatIntensity({
      state: 'RAPID_HEARTBEAT',
      progress: 1,
      pulse: 1,
    });

    expect(intensity).toBe(1);
    expect(sampleHeartbeatEnvelope(0.1)).toBeLessThanOrEqual(1.12);
  });
});

describe('HeartSystem', () => {
  it('keeps the legacy rapid state at the same interval and amplitude', () => {
    const normalHeart = new HeartSystem();
    const rapidHeart = new HeartSystem();
    normalHeart.update(0.09, { state: 'HEARTBEAT', progress: 0.2 });
    rapidHeart.update(0.09, { state: 'RAPID_HEARTBEAT', progress: 1 });

    expect(rapidHeart.phase).toBeCloseTo(normalHeart.phase, 6);
    expect(rapidHeart.getGlobalScale()).toBeCloseTo(
      normalHeart.getGlobalScale(),
      6,
    );
    expect(rapidHeart.getGlobalScale()).toBeLessThanOrEqual(1.12);
    expect(rapidHeart.getIntensity()).not.toBe(rapidHeart.getGlobalScale());
  });

  it('plays the final lub-dub on the same phase rate with a slightly stronger response', () => {
    const dubPhase = 0.28;
    const finalDubEndPhase = 0.24 + 0.23 / 0.9;
    const normalHeart = new HeartSystem();
    const finalHeart = new HeartSystem();

    normalHeart.update(dubPhase * 0.9, { state: 'HEARTBEAT', progress: 0.1 });
    finalHeart.update(0, {
      state: 'TENSION',
      progress: dubPhase / finalDubEndPhase,
    });

    expect(finalHeart.phase).toBeCloseTo(dubPhase, 6);
    expect(finalHeart.getGlobalScale()).toBeGreaterThan(normalHeart.getGlobalScale());
    expect(finalHeart.getIntensity()).toBeGreaterThan(normalHeart.getIntensity());

    finalHeart.update(0, { state: 'TENSION', progress: 1 });
    expect(finalHeart.phase).toBeCloseTo(finalDubEndPhase, 6);
    expect(finalHeart.getGlobalScale()).toBeGreaterThan(1);
    expect(finalHeart.getIntensity()).toBeGreaterThan(0);
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
