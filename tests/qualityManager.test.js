import { describe, expect, it } from 'vitest';

import {
  QUALITY_PROFILES,
  QualityManager,
  readBrowserCapabilities,
} from '../src/app/QualityManager.js';

describe('QualityManager', () => {
  it('selects low for a constrained mobile capability fixture', () => {
    const manager = new QualityManager();

    const profile = manager.detect({
      viewportWidth: 390,
      viewportHeight: 844,
      dpr: 3,
      hardwareConcurrency: 4,
      deviceMemory: 2,
      isMobile: true,
    });

    expect(profile.name).toBe('low');
    expect(profile.petalCount).toBeGreaterThanOrEqual(1_200);
    expect(profile.petalCount).toBeLessThanOrEqual(2_500);
    expect(manager.getCappedDpr(4)).toBe(profile.dprCap);
  });

  it('selects high for a capable desktop fixture', () => {
    const manager = new QualityManager();

    const profile = manager.detect({
      viewportWidth: 1_920,
      viewportHeight: 1_080,
      dpr: 1.5,
      hardwareConcurrency: 16,
      deviceMemory: 16,
      isMobile: false,
    });

    expect(profile.name).toBe('high');
    expect(profile.petalCount).toBeGreaterThanOrEqual(4_500);
    expect(profile.petalCount).toBeLessThanOrEqual(7_000);
  });

  it('uses medium when optional browser capability APIs are absent', () => {
    const manager = new QualityManager();

    const profile = manager.detect({
      viewportWidth: 1_024,
      viewportHeight: 768,
      dpr: 1,
    });

    expect(profile.name).toBe('medium');
    expect(profile.petalCount).toBeGreaterThanOrEqual(2_500);
    expect(profile.petalCount).toBeLessThanOrEqual(4_000);
  });

  it('freezes the selected profile and does not change it mid-cinematic', () => {
    const manager = new QualityManager();
    const selected = manager.detect({
      viewportWidth: 390,
      viewportHeight: 844,
      hardwareConcurrency: 2,
      deviceMemory: 2,
      isMobile: true,
    });

    const secondDetection = manager.detect({
      viewportWidth: 3_840,
      viewportHeight: 2_160,
      hardwareConcurrency: 32,
      deviceMemory: 32,
      isMobile: false,
    });

    expect(secondDetection).toBe(selected);
    expect(Object.isFrozen(selected)).toBe(true);
    expect(() => {
      selected.petalCount = 99;
    }).toThrow(TypeError);
  });
});

describe('quality profile contract', () => {
  it.each(['high', 'medium', 'low'])(
    '%s exposes all core and visual tuning fields',
    (name) => {
      expect(QUALITY_PROFILES[name]).toMatchObject({
        name,
        petalCount: expect.any(Number),
        dprCap: expect.any(Number),
        bloomScale: expect.any(Number),
        bloomIntensity: expect.any(Number),
        foregroundRatio: expect.any(Number),
        flutterEnabled: expect.any(Boolean),
      });
    },
  );
});

describe('readBrowserCapabilities', () => {
  it('normalizes optional window and navigator fields without assuming support', () => {
    const capabilities = readBrowserCapabilities(
      { innerWidth: 800, innerHeight: 600, devicePixelRatio: 2 },
      { userAgent: 'Desktop Browser' },
    );

    expect(capabilities).toEqual({
      viewportWidth: 800,
      viewportHeight: 600,
      dpr: 2,
      hardwareConcurrency: undefined,
      deviceMemory: undefined,
      isMobile: false,
    });
  });
});
