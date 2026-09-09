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
});
