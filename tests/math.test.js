import { describe, expect, it } from 'vitest';

import {
  clamp,
  clampDeltaTime,
  easeInCubic,
  easeOutCubic,
  lerp,
} from '../src/utils/math.js';

describe('clamp', () => {
  it('keeps a value inside the inclusive bounds', () => {
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('math interpolation utilities', () => {
  it('interpolates between numeric bounds', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('provides cubic acceleration and deceleration curves', () => {
    expect(easeInCubic(0)).toBe(0);
    expect(easeInCubic(0.5)).toBe(0.125);
    expect(easeInCubic(1)).toBe(1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(easeOutCubic(1)).toBe(1);
  });
});

describe('clampDeltaTime', () => {
  it('prevents negative and resume-sized frame deltas', () => {
    expect(clampDeltaTime(-0.1, 0.05)).toBe(0);
    expect(clampDeltaTime(0.016, 0.05)).toBe(0.016);
    expect(clampDeltaTime(4, 0.05)).toBe(0.05);
  });
});
