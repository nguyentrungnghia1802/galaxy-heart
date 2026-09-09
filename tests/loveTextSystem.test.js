import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { LoveTextSystem } from '../src/text/LoveTextSystem.js';

describe('LoveTextSystem', () => {
  it('loads bundled font synchronously and creates 3D text geometry', () => {
    const textSystem = new LoveTextSystem();

    expect(textSystem.group).toBeInstanceOf(THREE.Group);
    expect(textSystem.textMesh).toBeInstanceOf(THREE.Mesh);
    expect(textSystem.textMesh.geometry).toBeDefined();
    expect(Array.isArray(textSystem.textMesh.material)).toBe(true);
    expect(textSystem.textMesh.material.length).toBe(2);
    expect(textSystem.textMesh.material[0]).toBe(textSystem.faceMat);
    expect(textSystem.textMesh.material[1]).toBe(textSystem.sideMat);

    textSystem.dispose();
  });

  it('starts hidden and smoothly scales up during LOVE_REVEAL into END', () => {
    const textSystem = new LoveTextSystem();
    expect(textSystem.group.visible).toBe(false);

    // Prior to reveal
    textSystem.update(0.016, { state: 'GEM_IDLE', progress: 0.5 });
    expect(textSystem.group.visible).toBe(false);

    // During reveal
    textSystem.update(0.016, { state: 'LOVE_REVEAL', progress: 0.5 });
    expect(textSystem.group.visible).toBe(true);
    expect(textSystem.group.scale.x).toBeGreaterThan(0.5);

    // In final end state
    textSystem.update(0.016, { state: 'END', progress: 1.0 });
    expect(textSystem.group.visible).toBe(true);
    expect(textSystem.group.scale.x).toBeCloseTo(1.0, 1);
    expect(textSystem.textLight.intensity).toBeGreaterThan(1.0);

    textSystem.reset();
    expect(textSystem.group.visible).toBe(false);
    expect(textSystem.group.scale.x).toBeCloseTo(0.001);

    textSystem.dispose();
  });
});
