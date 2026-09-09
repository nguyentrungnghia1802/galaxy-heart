import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { CameraSystem } from '../src/scene/CameraSystem.js';
import { QUALITY_PROFILES, QualityManager } from '../src/app/QualityManager.js';

describe('Responsive and Mobile Quality Tuning (B06)', () => {
  it('caps DPR according to quality profile to preserve mobile performance', () => {
    const qm = new QualityManager();

    // High profile caps at 1.75
    const highProfile = QUALITY_PROFILES.high;
    expect(Math.min(3.0, highProfile.dprCap)).toBe(1.75);

    // Medium profile caps at 1.5
    const medProfile = QUALITY_PROFILES.medium;
    expect(Math.min(3.0, medProfile.dprCap)).toBe(1.5);

    // Low profile caps at 1.1
    const lowProfile = QUALITY_PROFILES.low;
    expect(Math.min(3.0, lowProfile.dprCap)).toBe(1.1);
  });

  it('adapts camera distance for mobile portrait (390x844) to keep heart in safe view', () => {
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    const system = new CameraSystem(camera);

    // Desktop 16:9
    system.resize(1920, 1080);
    expect(system.basePosition.z).toBe(5.0);

    // Mobile portrait 390x844
    system.resize(390, 844);
    expect(camera.aspect).toBeCloseTo(390 / 844, 3);
    // Base distance pushed back on portrait so heart stays within 40-55% of screen height
    expect(system.basePosition.z).toBeGreaterThan(6.5);
    expect(system.basePosition.z).toBeLessThanOrEqual(7.5);

    // Mobile landscape 844x390
    system.resize(844, 390);
    expect(system.basePosition.z).toBe(5.0);
  });

  it('keeps bloom and flutter scaled appropriately for low-end devices', () => {
    const low = QUALITY_PROFILES.low;
    expect(low.bloomScale).toBe(0.5);
    expect(low.bloomIntensity).toBe(0.5);
    expect(low.flutterEnabled).toBe(false);
    expect(low.petalCount).toBeLessThan(QUALITY_PROFILES.high.petalCount);
  });
});
