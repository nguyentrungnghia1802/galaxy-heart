import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { GemSystem } from '../src/gem/GemSystem.js';
import { GemBurst } from '../src/gem/GemBurst.js';

describe('GemBurst', () => {
  it('initializes burst meshes, triggers and updates without allocation errors', () => {
    const burst = new GemBurst();
    expect(burst.group).toBeInstanceOf(THREE.Group);
    expect(burst.active).toBe(false);

    burst.trigger();
    expect(burst.active).toBe(true);
    expect(burst.shockwave.visible).toBe(true);
    expect(burst.sparkles.visible).toBe(true);
    expect(burst.miniPetals.visible).toBe(true);

    // Update through half duration
    burst.update(0.7);
    expect(burst.active).toBe(true);
    expect(burst.shockwave.scale.x).toBeGreaterThan(0.2);

    // Update past duration
    burst.update(1.0);
    expect(burst.active).toBe(false);
    expect(burst.shockwave.visible).toBe(false);

    burst.dispose();
  });
});

describe('GemSystem', () => {
  it('creates crystal hierarchy, hit target, and internal point light', () => {
    const gem = new GemSystem();

    expect(gem.group).toBeInstanceOf(THREE.Group);
    expect(gem.group.position.x).toBe(0);
    expect(gem.group.position.y).toBeCloseTo(0.05);
    expect(gem.hitMesh.name).toBe('GemHitTarget');
    expect(gem.gemLight).toBeInstanceOf(THREE.PointLight);
    expect(gem.outerMesh.material.flatShading).toBe(true);

    gem.dispose();
  });

  it('modulates hover factor and enhances emissive intensity on hover', () => {
    const gem = new GemSystem();
    const initialEmissive = gem.outerMat.emissiveIntensity;

    gem.setHovered(true);
    gem.update(0.1, { state: 'GEM_IDLE' });

    expect(gem.hoverFactor).toBeGreaterThan(0);
    expect(gem.outerMat.emissiveIntensity).toBeGreaterThan(initialEmissive);

    gem.setHovered(false);
    gem.update(0.5, { state: 'GEM_IDLE' });
    expect(gem.hoverFactor).toBeLessThan(0.1);

    gem.dispose();
  });

  it('triggers burst flash and beckoning ripple during GEM_IDLE', () => {
    const gem = new GemSystem();

    gem.update(0.5, { state: 'GEM_IDLE' });
    expect(gem.rippleMesh.visible).toBe(true);

    gem.triggerBurst();
    expect(gem.burstFlash).toBe(1.0);
    expect(gem.gemBurst.active).toBe(true);

    gem.update(0.1, { state: 'GEM_BURST' });
    expect(gem.burstFlash).toBeLessThan(1.0);

    gem.reset();
    expect(gem.burstFlash).toBe(0);
    expect(gem.hoverFactor).toBe(0);

    gem.dispose();
  });
});
