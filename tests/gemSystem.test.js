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

    gem.update(3.5, { state: 'GEM_IDLE' });
    expect(gem.rippleMesh.visible).toBe(true);

    gem.triggerBurst();
    expect(gem.burstFlash).toBe(1.0);
    expect(gem.gemBurst.active).toBe(true);

    gem.update(0.1, { state: 'GEM_ACTIVATION' });
    expect(gem.burstFlash).toBeLessThan(1.0);

    gem.reset();
    expect(gem.burstFlash).toBe(0);
    expect(gem.hoverFactor).toBe(0);

    gem.dispose();
  });

  it('waits three idle seconds before exposing the interaction hint', () => {
    const gem = new GemSystem({ hintDelay: 3 });

    gem.update(2.999, { state: 'GEM_IDLE' });
    expect(gem.interactionHintVisible).toBe(false);
    expect(gem.rippleMesh.visible).toBe(false);

    gem.update(0.001, { state: 'GEM_IDLE' });
    expect(gem.interactionHintVisible).toBe(true);
    expect(gem.rippleMesh.visible).toBe(true);

    gem.update(0.016, { state: 'GEM_ACTIVATION', progress: 0.01 });
    expect(gem.interactionHintVisible).toBe(false);
    expect(gem.rippleMesh.visible).toBe(false);

    gem.reset();
    expect(gem.interactionHintVisible).toBe(false);
    expect(gem.rippleMesh.visible).toBe(false);
    gem.dispose();
  });

  it('disappears after activation and remains invisible in MUSIC_REVEAL and FINAL', () => {
    const gem = new GemSystem();

    // In GEM_IDLE, gem is visible
    gem.update(0.016, { state: 'GEM_IDLE', progress: 0.5 });
    expect(gem.outerMesh.visible).toBe(true);
    expect(gem.innerMesh.visible).toBe(true);

    // During late GEM_ACTIVATION, gem meshes dissolve and become invisible
    gem.update(0.016, { state: 'GEM_ACTIVATION', progress: 0.9 });
    expect(gem.outerMat.opacity).toBeLessThan(0.05);
    expect(gem.innerMat.opacity).toBeLessThan(0.05);
    expect(gem.hitMesh.visible).toBe(false);

    // During MUSIC_REVEAL and FINAL, gem remains completely disappeared
    gem.update(0.016, { state: 'MUSIC_REVEAL', progress: 0.5 });
    expect(gem.outerMesh.visible).toBe(false);
    expect(gem.innerMesh.visible).toBe(false);
    expect(gem.gemLight.intensity).toBe(0);

    gem.update(0.016, { state: 'FINAL', progress: 1.0 });
    expect(gem.outerMesh.visible).toBe(false);
    expect(gem.innerMesh.visible).toBe(false);

    // After reset, gem visibility is restored
    gem.reset();
    expect(gem.outerMesh.visible).toBe(true);
    expect(gem.innerMesh.visible).toBe(true);
    expect(gem.gemLight.intensity).toBeGreaterThan(0);

    gem.dispose();
  });

  it('remains concealed inside the heart while heart is intact', () => {
    const gem = new GemSystem();

    gem.update(0.016, { state: 'HEART_IDLE', progress: 0.5 });
    expect(gem.outerMesh.visible).toBe(false);
    expect(gem.innerMesh.visible).toBe(false);
    expect(gem.gemLight.intensity).toBe(0);

    gem.update(0.016, { state: 'HEARTBEAT', progress: 0.5 });
    expect(gem.outerMesh.visible).toBe(false);

    gem.update(0.016, { state: 'TENSION', progress: 0.5 });
    expect(gem.outerMesh.visible).toBe(false);

    // Reveals upon explosion and flight
    gem.update(0.016, { state: 'PETAL_FLIGHT', progress: 0.5 });
    expect(gem.outerMesh.visible).toBe(true);

    gem.dispose();
  });
});
