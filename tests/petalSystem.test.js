import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { createHeartAnchors } from '../src/heart/HeartSurface.js';
import { PetalBuffers } from '../src/petals/PetalBuffers.js';
import { createPetalGeometry } from '../src/petals/PetalGeometry.js';
import { PetalSystem } from '../src/petals/PetalSystem.js';

describe('PetalBuffers', () => {
  it('uses fixed-size typed arrays for every instance property', () => {
    const buffers = new PetalBuffers(10);

    expect(buffers.anchorPosition).toBeInstanceOf(Float32Array);
    expect(buffers.anchorPosition).toHaveLength(30);
    expect(buffers.anchorNormal).toHaveLength(30);
    expect(buffers.baseRotation).toHaveLength(40);
    expect(buffers.baseScale).toHaveLength(10);
    expect(buffers.colorVariant).toBeInstanceOf(Uint8Array);
    expect(buffers.position).toHaveLength(30);
    expect(buffers.velocity).toHaveLength(30);
    expect(buffers.rotation).toHaveLength(40);
    expect(buffers.angularVelocity).toHaveLength(30);
    expect(buffers.noiseSeed).toHaveLength(10);
    expect(buffers.active).toBeInstanceOf(Uint8Array);
  });

  it('resets dynamic state in place without replacing arrays', () => {
    const anchors = createHeartAnchors({ count: 4, seed: 12 });
    const buffers = new PetalBuffers(4);
    const positionReference = buffers.position;
    const velocityReference = buffers.velocity;

    buffers.copyAnchors(anchors);
    buffers.baseRotation.fill(0.5);
    buffers.velocity.fill(8);
    buffers.angularVelocity.fill(4);
    buffers.resetDynamics();

    expect(buffers.position).toBe(positionReference);
    expect(buffers.velocity).toBe(velocityReference);
    expect([...buffers.position]).toEqual([...buffers.anchorPosition]);
    expect([...buffers.velocity]).toEqual(new Array(12).fill(0));
    expect([...buffers.angularVelocity]).toEqual(new Array(12).fill(0));
    expect([...buffers.rotation]).toEqual([...buffers.baseRotation]);
    expect([...buffers.active]).toEqual(new Array(4).fill(1));
  });
});

describe('createPetalGeometry', () => {
  it('creates a low-poly indexed placeholder petal', () => {
    const geometry = createPetalGeometry();

    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.getAttribute('position').count).toBeLessThanOrEqual(20);
    expect(geometry.index.count / 3).toBeLessThanOrEqual(12);
    geometry.dispose();
  });
});

describe('PetalSystem', () => {
  it('maps anchors into one InstancedMesh and preserves mesh identity', () => {
    const anchors = createHeartAnchors({ count: 24, seed: 1234 });
    const system = new PetalSystem({ count: anchors.length });
    const mesh = system.mesh;
    const versionBefore = mesh.instanceMatrix.version;

    system.attachToHeart(anchors);

    expect(system.mesh).toBe(mesh);
    expect(system.mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(system.mesh.count).toBe(24);
    expect(system.mesh.children).toHaveLength(0);
    expect(system.mesh.instanceMatrix.version - versionBefore).toBe(1);
    expect(system.mesh.instanceColor).not.toBeNull();
    expect([...system.buffers.anchorPosition.slice(0, 3)]).toEqual([
      expect.closeTo(anchors[0].position.x, 5),
      expect.closeTo(anchors[0].position.y, 5),
      expect.closeTo(anchors[0].position.z, 5),
    ]);

    const firstMatrix = new THREE.Matrix4();
    const firstPosition = new THREE.Vector3();
    mesh.getMatrixAt(0, firstMatrix);
    firstPosition.setFromMatrixPosition(firstMatrix);
    expect(firstPosition.x).toBeCloseTo(anchors[0].position.x, 5);
    expect(firstPosition.y).toBeCloseTo(anchors[0].position.y, 5);
    expect(firstPosition.z).toBeCloseTo(anchors[0].position.z, 5);

    system.updateAttachedTransforms(1.1);
    expect(system.mesh).toBe(mesh);
    expect(mesh.instanceMatrix.version - versionBefore).toBe(2);
    system.dispose();
  });

  it('rejects anchor sets that would change the instance count mid-scene', () => {
    const system = new PetalSystem({ count: 5 });
    const anchors = createHeartAnchors({ count: 4, seed: 1 });

    expect(() => system.attachToHeart(anchors)).toThrow(/5 anchors/);
    system.dispose();
  });

  it('keeps attached petals bound to scaled heart anchors', () => {
    const anchors = createHeartAnchors({ count: 12, seed: 2 });
    const system = new PetalSystem({ count: anchors.length });
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    system.attachToHeart(anchors);

    system.update(0.016, { state: 'HEARTBEAT', heartScale: 1.1 });
    system.mesh.getMatrixAt(0, matrix);
    position.setFromMatrixPosition(matrix);

    expect(position.x).toBeCloseTo(anchors[0].position.x * 1.1, 5);
    expect(position.y).toBeCloseTo(anchors[0].position.y * 1.1, 5);
    expect(position.z).toBeCloseTo(anchors[0].position.z * 1.1, 5);
    system.dispose();
  });

  it('triggers one explosion impulse when EXPLOSION spans multiple updates', () => {
    const anchors = createHeartAnchors({ count: 32, seed: 4 });
    const system = new PetalSystem({ count: anchors.length, seed: 99 });
    const mesh = system.mesh;
    system.attachToHeart(anchors);

    system.update(0.016, { state: 'EXPLOSION' });
    system.update(0.016, { state: 'EXPLOSION' });

    expect(system.explosionCount).toBe(1);
    expect(system.mesh).toBe(mesh);
    expect(system.mode).toBe('flight');
    system.dispose();
  });

  it('moves the same instances from heart anchors into petal flight', () => {
    const anchors = createHeartAnchors({ count: 24, seed: 8 });
    const system = new PetalSystem({ count: anchors.length, seed: 101 });
    const mesh = system.mesh;
    system.attachToHeart(anchors);
    const attachedPosition = system.buffers.position.slice(0, 3);

    system.update(0, { state: 'EXPLOSION' });
    system.update(0.05, { state: 'PETAL_FLIGHT' });

    expect(system.mesh).toBe(mesh);
    expect([...system.buffers.position.slice(0, 3)]).not.toEqual([
      ...attachedPosition,
    ]);
    expect(system.flightTime).toBeCloseTo(0.05, 6);
    system.dispose();
  });

  it('replays ten times without replacing GPU resources or typed arrays', () => {
    const anchors = createHeartAnchors({ count: 16, seed: 9 });
    const system = new PetalSystem({ count: anchors.length });
    const mesh = system.mesh;
    const geometry = system.geometry;
    const material = system.material;
    const positionBuffer = system.buffers.position;
    const scene = new THREE.Scene();
    scene.add(system.mesh);
    system.attachToHeart(anchors);

    for (let replay = 0; replay < 10; replay += 1) {
      system.update(0.016, { state: 'EXPLOSION' });
      expect(system.explosionCount).toBe(1);
      system.reset();
      expect(system.explosionCount).toBe(0);
      expect(system.mode).toBe('attached');
    }

    expect(system.mesh).toBe(mesh);
    expect(system.geometry).toBe(geometry);
    expect(system.material).toBe(material);
    expect(system.buffers.position).toBe(positionBuffer);
    expect(system.mesh.count).toBe(16);
    expect(scene.children).toEqual([mesh]);
    system.dispose();
  });

  it('marks out-of-bounds instances inactive without spawning replacements', () => {
    const anchors = createHeartAnchors({ count: 4, seed: 10 });
    const system = new PetalSystem({ count: anchors.length });
    const mesh = system.mesh;
    system.attachToHeart(anchors);
    system.update(0, { state: 'EXPLOSION' });

    system.update(0.05, {
      state: 'PETAL_FLIGHT',
      flightParams: { maxDistance: 0.01, windStrength: 0 },
    });

    expect(system.buffers.active.every((value) => value === 0)).toBe(true);
    expect(system.mesh).toBe(mesh);
    system.dispose();
  });

  it('removes its mesh from the scene only during teardown', () => {
    const system = new PetalSystem({ count: 1 });
    const scene = new THREE.Scene();
    scene.add(system.mesh);

    system.dispose();

    expect(system.mesh.parent).toBeNull();
  });
});
