import { describe, expect, it } from 'vitest';

import { createHeartAnchors } from '../src/heart/HeartSurface.js';
import { PetalBuffers } from '../src/petals/PetalBuffers.js';
import {
  createExplosionVelocity,
  initializeExplosion,
  integratePetalFlight,
} from '../src/petals/explosionPhysics.js';
import { createSeededRandom } from '../src/utils/random.js';

function makeAttachedBuffers(count, seed = 1234) {
  const buffers = new PetalBuffers(count);
  buffers.copyAnchors(createHeartAnchors({ count, seed }));
  buffers.resetDynamics();
  return buffers;
}

describe('createExplosionVelocity', () => {
  it('writes a bounded outward velocity with a non-radial tangent component', () => {
    const output = new Float32Array(3);
    const foreground = new Uint8Array(1);
    createExplosionVelocity(
      { x: 1, y: 0.3, z: 0.2 },
      { x: 0.9, y: 0.2, z: 0.3 },
      createSeededRandom(1234),
      {
        speedMin: 2.5,
        speedMax: 5.5,
        foregroundRatio: 0,
        foregroundFlags: foreground,
        instanceIndex: 0,
      },
      output,
    );

    const speed = Math.hypot(...output);
    const radialDot = output[0] * 1 + output[1] * 0.3 + output[2] * 0.2;
    const crossMagnitude = Math.hypot(
      0.3 * output[2] - 0.2 * output[1],
      0.2 * output[0] - output[2],
      output[1] - 0.3 * output[0],
    );

    expect(speed).toBeGreaterThanOrEqual(2.5);
    expect(speed).toBeLessThanOrEqual(5.5);
    expect(radialDot).toBeGreaterThan(0);
    expect(crossMagnitude).toBeGreaterThan(0.1);
    expect(foreground[0]).toBe(0);
  });
});

describe('initializeExplosion', () => {
  it('is deterministic for a fixed seed and varies angular velocity', () => {
    const first = makeAttachedBuffers(128);
    const second = makeAttachedBuffers(128);

    initializeExplosion(first, createSeededRandom(88));
    initializeExplosion(second, createSeededRandom(88));

    expect([...first.velocity]).toEqual([...second.velocity]);
    expect([...first.angularVelocity]).toEqual([...second.angularVelocity]);
    expect(new Set(first.angularVelocity).size).toBeGreaterThan(20);
  });

  it('biases only the configured minority of petals toward the camera', () => {
    const buffers = makeAttachedBuffers(2_000);
    initializeExplosion(buffers, createSeededRandom(77));
    const foregroundCount = buffers.foreground.reduce(
      (sum, value) => sum + value,
      0,
    );

    expect(foregroundCount / buffers.count).toBeGreaterThanOrEqual(0.05);
    expect(foregroundCount / buffers.count).toBeLessThanOrEqual(0.12);
  });

  it('keeps every initial speed inside configured limits', () => {
    const buffers = makeAttachedBuffers(1_000);
    initializeExplosion(buffers, createSeededRandom(12), {
      speedMin: 2.2,
      speedMax: 6.4,
    });

    for (let index = 0; index < buffers.count; index += 1) {
      const offset = index * 3;
      const speed = Math.hypot(
        buffers.velocity[offset],
        buffers.velocity[offset + 1],
        buffers.velocity[offset + 2],
      );
      expect(speed).toBeGreaterThanOrEqual(2.2 - 1e-5);
      expect(speed).toBeLessThanOrEqual(6.4 + 1e-5);
    }
  });
});

describe('integratePetalFlight', () => {
  it('applies gravity, exponential drag, and clamps an oversized dt', () => {
    const buffers = new PetalBuffers(1);
    buffers.position.fill(0);
    buffers.velocity.set([10, 0, 0]);
    buffers.rotation.set([0, 0, 0, 1]);
    buffers.active[0] = 1;

    const integratedDt = integratePetalFlight(buffers, 5, 0, {
      maxDt: 0.05,
      gravity: -1,
      drag: 1,
      windStrength: 0,
    });

    expect(integratedDt).toBe(0.05);
    expect(buffers.velocity[0]).toBeLessThan(10);
    expect(buffers.velocity[1]).toBeLessThan(0);
    expect(buffers.position[0]).toBeGreaterThan(0);
    expect(buffers.position[0]).toBeLessThan(0.5);
    expect(buffers.position[1]).toBeLessThan(0);
  });

  it('adds deterministic wind drift and keeps rotations normalized', () => {
    const first = makeAttachedBuffers(64, 3);
    const second = makeAttachedBuffers(64, 3);
    initializeExplosion(first, createSeededRandom(9));
    initializeExplosion(second, createSeededRandom(9));

    integratePetalFlight(first, 0.016, 1.25);
    integratePetalFlight(second, 0.016, 1.25);

    expect([...first.position]).toEqual([...second.position]);
    expect([...first.velocity]).toEqual([...second.velocity]);
    for (let index = 0; index < first.count; index += 1) {
      const offset = index * 4;
      expect(
        Math.hypot(
          first.rotation[offset],
          first.rotation[offset + 1],
          first.rotation[offset + 2],
          first.rotation[offset + 3],
        ),
      ).toBeCloseTo(1, 5);
    }
  });
});
