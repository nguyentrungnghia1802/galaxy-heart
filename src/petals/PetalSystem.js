import * as THREE from 'three';

import { createSeededRandom } from '../utils/random.js';
import { PetalBuffers } from './PetalBuffers.js';
import { createPetalGeometry } from './PetalGeometry.js';
import {
  initializeExplosion,
  integratePetalFlight,
} from './explosionPhysics.js';

const LOCAL_PETAL_NORMAL = new THREE.Vector3(0, 0, 1);
const PETAL_UNIT_SCALE = 0.2;
const DEFAULT_PALETTE = Object.freeze([
  0x9e0b32,
  0xc41245,
  0xe31b50,
  0xff315f,
  0xd91668,
  0xff6688,
]);
const ATTACHED_STATES = new Set([
  'BOOT',
  'PRELOAD',
  'INTRO',
  'HEART_IDLE',
  'HEARTBEAT',
  'RAPID_HEARTBEAT',
  'TENSION',
]);

export class PetalSystem {
  constructor({
    count,
    geometry,
    material,
    palette = DEFAULT_PALETTE,
    seed = 0x50455441,
  }) {
    this.count = count;
    this.palette = palette;
    this.seed = seed;
    this.buffers = new PetalBuffers(count);
    this.geometry = geometry ?? createPetalGeometry();
    this.material =
      material ??
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide,
        vertexColors: true,
      });
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.count,
    );
    this.mesh.name = 'PetalHeartInstances';
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.tempPosition = new THREE.Vector3();
    this.tempNormal = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    this.tempTwistQuaternion = new THREE.Quaternion();
    this.tempScale = new THREE.Vector3();
    this.tempMatrix = new THREE.Matrix4();
    this.tempColor = new THREE.Color();
    this.attached = false;
    this.disposed = false;
    this.mode = 'attached';
    this.previousState = null;
    this.explosionCount = 0;
    this.flightTime = 0;
    this.currentGlobalScale = 1;
    this.flightScale = 1;
  }

  attachToHeart(anchorData) {
    if (anchorData.length !== this.count) {
      throw new RangeError(
        `PetalSystem requires exactly ${this.count} anchors, received ${anchorData.length}.`,
      );
    }

    this.buffers.copyAnchors(anchorData);

    for (let index = 0; index < this.count; index += 1) {
      const vectorOffset = index * 3;
      const rotationOffset = index * 4;
      this.tempNormal
        .set(
          this.buffers.anchorNormal[vectorOffset],
          this.buffers.anchorNormal[vectorOffset + 1],
          this.buffers.anchorNormal[vectorOffset + 2],
        )
        .normalize();
      this.tempQuaternion.setFromUnitVectors(
        LOCAL_PETAL_NORMAL,
        this.tempNormal,
      );
      this.tempTwistQuaternion.setFromAxisAngle(
        this.tempNormal,
        anchorData[index].baseRotation,
      );
      this.tempQuaternion.premultiply(this.tempTwistQuaternion);

      this.buffers.baseRotation[rotationOffset] = this.tempQuaternion.x;
      this.buffers.baseRotation[rotationOffset + 1] = this.tempQuaternion.y;
      this.buffers.baseRotation[rotationOffset + 2] = this.tempQuaternion.z;
      this.buffers.baseRotation[rotationOffset + 3] = this.tempQuaternion.w;

      const color = this.palette[
        this.buffers.colorVariant[index] % this.palette.length
      ];
      this.tempColor.setHex(color);
      this.mesh.setColorAt(index, this.tempColor);
    }

    this.buffers.resetDynamics();
    this.attached = true;
    this.mode = 'attached';
    this.previousState = null;
    this.explosionCount = 0;
    this.flightTime = 0;
    this.currentGlobalScale = 1;
    this.flightScale = 1;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.updateAttachedTransforms(1);
  }

  updateAttachedTransforms(globalScale) {
    this.currentGlobalScale = globalScale;
    for (let index = 0; index < this.count; index += 1) {
      const vectorOffset = index * 3;
      const rotationOffset = index * 4;
      const x = this.buffers.anchorPosition[vectorOffset] * globalScale;
      const y = this.buffers.anchorPosition[vectorOffset + 1] * globalScale;
      const z = this.buffers.anchorPosition[vectorOffset + 2] * globalScale;

      this.buffers.position[vectorOffset] = x;
      this.buffers.position[vectorOffset + 1] = y;
      this.buffers.position[vectorOffset + 2] = z;
      this.tempPosition.set(x, y, z);
      this.tempQuaternion.fromArray(this.buffers.rotation, rotationOffset);

      const scale =
        this.buffers.baseScale[index] * PETAL_UNIT_SCALE * globalScale;
      this.tempScale.setScalar(scale);
      this.tempMatrix.compose(
        this.tempPosition,
        this.tempQuaternion,
        this.tempScale,
      );
      this.mesh.setMatrixAt(index, this.tempMatrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  triggerExplosion(explosionParams = {}) {
    if (!this.attached) {
      throw new Error('PetalSystem must attach anchors before exploding.');
    }
    if (this.explosionCount > 0) {
      return false;
    }

    this.flightScale = this.currentGlobalScale;
    const random = createSeededRandom(explosionParams.seed ?? this.seed);
    initializeExplosion(this.buffers, random, explosionParams);
    this.mode = 'flight';
    this.explosionCount += 1;
    return true;
  }

  update(dt, stateSnapshot) {
    const state = stateSnapshot?.state ?? 'BOOT';

    if (ATTACHED_STATES.has(state)) {
      this.updateAttachedTransforms(stateSnapshot?.heartScale ?? 1);
    } else if (state === 'EXPLOSION' || state === 'PETAL_FLIGHT') {
      if (this.explosionCount === 0) {
        this.triggerExplosion(stateSnapshot?.explosionParams);
      }
      const integratedDt = integratePetalFlight(
        this.buffers,
        dt,
        this.flightTime,
        stateSnapshot?.flightParams,
      );
      this.flightTime += integratedDt;
      this.updateFlightTransforms();
    }

    this.previousState = state;
  }

  updateFlightTransforms() {
    for (let index = 0; index < this.count; index += 1) {
      const vectorOffset = index * 3;
      const rotationOffset = index * 4;
      this.tempPosition.fromArray(this.buffers.position, vectorOffset);
      this.tempQuaternion.fromArray(this.buffers.rotation, rotationOffset);
      const scale =
        this.buffers.active[index] === 1
          ? this.buffers.baseScale[index] * PETAL_UNIT_SCALE * this.flightScale
          : 0;
      this.tempScale.setScalar(scale);
      this.tempMatrix.compose(
        this.tempPosition,
        this.tempQuaternion,
        this.tempScale,
      );
      this.mesh.setMatrixAt(index, this.tempMatrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  reset() {
    if (!this.attached) {
      return;
    }

    this.buffers.resetDynamics();
    this.mode = 'attached';
    this.previousState = null;
    this.explosionCount = 0;
    this.flightTime = 0;
    this.currentGlobalScale = 1;
    this.flightScale = 1;
    this.updateAttachedTransforms(1);
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.disposed = true;
  }
}
