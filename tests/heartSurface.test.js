import { describe, expect, it } from 'vitest';

import {
  createHeartAnchors,
  createHeartDebugPositions,
} from '../src/heart/HeartSurface.js';

describe('createHeartAnchors', () => {
  it('returns exactly the requested number of anchors', () => {
    expect(createHeartAnchors({ count: 0, seed: 1234 })).toHaveLength(0);
    expect(createHeartAnchors({ count: 1_500, seed: 1234 })).toHaveLength(
      1_500,
    );
  });

  it('is deterministic for the same seed and varies for a different seed', () => {
    const first = createHeartAnchors({ count: 32, seed: 1234 });
    const second = createHeartAnchors({ count: 32, seed: 1234 });
    const different = createHeartAnchors({ count: 32, seed: 1235 });

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
  });

  it('produces finite positions, normalized normals, and bounded variation', () => {
    const anchors = createHeartAnchors({ count: 3_000, seed: 1234 });

    for (const anchor of anchors) {
      const values = [
        anchor.position.x,
        anchor.position.y,
        anchor.position.z,
        anchor.normal.x,
        anchor.normal.y,
        anchor.normal.z,
        anchor.baseRotation,
        anchor.baseScale,
        anchor.colorVariant,
        anchor.noiseSeed,
      ];
      expect(values.every(Number.isFinite)).toBe(true);
      expect(
        Math.hypot(anchor.normal.x, anchor.normal.y, anchor.normal.z),
      ).toBeCloseTo(1, 5);
      expect(anchor.baseScale).toBeGreaterThanOrEqual(0.75);
      expect(anchor.baseScale).toBeLessThanOrEqual(1.25);
      expect(anchor.colorVariant).toBeGreaterThanOrEqual(0);
      expect(anchor.colorVariant).toBeLessThan(6);
    }
  });

  it('covers a heart-sized silhouette with real front-to-back depth', () => {
    const anchors = createHeartAnchors({ count: 6_000, seed: 1234 });
    const xs = anchors.map((anchor) => anchor.position.x);
    const ys = anchors.map((anchor) => anchor.position.y);
    const zs = anchors.map((anchor) => anchor.position.z);

    expect(Math.min(...xs)).toBeLessThan(-1.2);
    expect(Math.max(...xs)).toBeGreaterThan(1.2);
    expect(Math.min(...ys)).toBeLessThan(-1.2);
    expect(Math.max(...ys)).toBeGreaterThan(0.8);
    expect(Math.min(...zs)).toBeLessThan(-0.65);
    expect(Math.max(...zs)).toBeGreaterThan(0.65);
  });

  it('packs enough bound petals onto the camera-facing body to avoid a hollow-looking center', () => {
    const anchors = createHeartAnchors({ count: 6_000, seed: 1234 }).filter(
      (anchor) => !anchor.isAmbient,
    );
    const frontFacing = anchors.filter((anchor) => anchor.position.z >= 0.15);
    const centralFront = frontFacing.filter(
      (anchor) =>
        Math.abs(anchor.position.x) <= 0.45 &&
        anchor.position.y >= -0.35 &&
        anchor.position.y <= 0.65,
    );

    expect(frontFacing.length / anchors.length).toBeGreaterThan(0.45);
    expect(centralFront.length).toBeGreaterThan(420);
  });

  it('keeps the bound heart silhouette full rather than wide and flattened', () => {
    const anchors = createHeartAnchors({ count: 6_000, seed: 1234 }).filter(
      (anchor) => !anchor.isAmbient,
    );
    const xs = anchors.map((anchor) => anchor.position.x);
    const ys = anchors.map((anchor) => anchor.position.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);

    expect(width / height).toBeGreaterThan(0.95);
    expect(width / height).toBeLessThan(1.1);
  });
});

describe('createHeartDebugPositions', () => {
  it('packs anchor positions for a temporary THREE.Points debug view', () => {
    const anchors = createHeartAnchors({ count: 20, seed: 7 });
    const positions = createHeartDebugPositions(anchors);

    expect(positions).toBeInstanceOf(Float32Array);
    expect(positions).toHaveLength(60);
    expect(positions[0]).toBeCloseTo(anchors[0].position.x, 5);
    expect(positions[1]).toBeCloseTo(anchors[0].position.y, 5);
    expect(positions[2]).toBeCloseTo(anchors[0].position.z, 5);
  });
});
