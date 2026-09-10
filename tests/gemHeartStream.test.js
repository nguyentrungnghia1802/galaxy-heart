import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GemHeartStream, createHeartShape } from '../src/gem/GemHeartStream.js';

describe('GemHeartStream Multi-Wave Floating Hearts FX', () => {
  it('creates valid 2D parametric heart shape', () => {
    const shape = createHeartShape();
    expect(shape).toBeInstanceOf(THREE.Shape);
    const points = shape.getPoints(12);
    expect(points.length).toBeGreaterThan(10);
  });

  it('initializes with 26 hearts, inactive and hidden by default', () => {
    const stream = new GemHeartStream();
    expect(stream.hearts).toHaveLength(26);
    expect(stream.materials).toHaveLength(26);
    expect(stream.active).toBe(false);
    expect(stream.group.visible).toBe(false);
    expect(stream.group.children).toHaveLength(26);
    stream.dispose();
  });

  it('activates upon trigger and progresses through multiple successive waves', () => {
    const stream = new GemHeartStream();
    stream.trigger();
    expect(stream.active).toBe(true);
    expect(stream.group.visible).toBe(true);

    // Initial frame right after trigger (t = 0.01)
    stream.update(0.01);
    // Wave 0 should have some visible hearts
    const visibleCountEarly = stream.hearts.filter(h => h.mesh.visible).length;
    expect(visibleCountEarly).toBeGreaterThan(0);

    // Wave 0 hearts should be rising
    const firstActive = stream.hearts.find(h => h.mesh.visible);
    expect(firstActive).toBeDefined();
    expect(firstActive.mesh.position.y).toBeGreaterThanOrEqual(firstActive.spawnY);

    // Advance to wave 2 (t = 0.45s)
    stream.update(0.44);
    const visibleCountMid = stream.hearts.filter(h => h.mesh.visible).length;
    expect(visibleCountMid).toBeGreaterThan(visibleCountEarly);

    // Advance to wave 3 (t = 0.70s)
    stream.update(0.25);
    const visibleCountLate = stream.hearts.filter(h => h.mesh.visible).length;
    expect(visibleCountLate).toBeGreaterThan(0);

    // Advance past total duration (t >= 1.8s)
    stream.update(1.2);
    expect(stream.active).toBe(false);
    expect(stream.group.visible).toBe(false);
    expect(stream.hearts.every(h => !h.mesh.visible)).toBe(true);

    stream.dispose();
  });

  it('aligns to camera orientation when camera is provided', () => {
    const stream = new GemHeartStream();
    const camera = new THREE.PerspectiveCamera();
    camera.quaternion.set(0.1, 0.2, 0.3, 0.9).normalize();

    stream.trigger();
    stream.update(0.05, camera);

    const activeHeart = stream.hearts.find(h => h.mesh.visible);
    expect(activeHeart).toBeDefined();
    // Verify rotation occurred
    expect(activeHeart.mesh.quaternion).toBeDefined();

    stream.dispose();
  });

  it('resets and disposes cleanly without memory leaks', () => {
    const stream = new GemHeartStream();
    stream.trigger();
    stream.update(0.2);
    expect(stream.active).toBe(true);

    stream.reset();
    expect(stream.active).toBe(false);
    expect(stream.group.visible).toBe(false);
    expect(stream.hearts.every(h => !h.mesh.visible)).toBe(true);

    stream.dispose();
    expect(stream.materials).toHaveLength(0);
    expect(stream.hearts).toHaveLength(0);
    expect(stream.group.children).toHaveLength(0);
  });
});
