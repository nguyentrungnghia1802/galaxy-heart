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
const TAU = Math.PI * 2;
const DEFAULT_PALETTE = Object.freeze([
  0x6e051c, // deep velvet crevice burgundy
  0x870725, // rich dark wine
  0xa5082e, // deep ruby red
  0xc60c38, // radiant crimson rose
  0xdf1346, // vivid scarlet rose
  0xef1c52, // bright rose petal
  0xfb2b67, // vibrant hot pink
  0xff487e, // glowing rose highlight
  0xff6d98, // luminous soft blush
  0xff9cb8, // delicate light petal edge
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
    texture = null,
    palette = DEFAULT_PALETTE,
    seed = 0x50455441,
    flutterEnabled = true,
  }) {
    this.count = count;
    this.palette = palette;
    this.seed = seed;
    this.flutterEnabled = flutterEnabled;
    this.buffers = new PetalBuffers(count);
    this.geometry = geometry ?? createPetalGeometry();
    this.material =
      material ??
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.58,
        metalness: 0,
        sheen: 0.85,
        sheenColor: 0xff8eaa,
        sheenRoughness: 0.68,
        clearcoat: 0.04,
        clearcoatRoughness: 0.9,
        side: THREE.DoubleSide,
        vertexColors: true,
      });
    if (texture) {
      this.setTexture(texture);
    }
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
    this.tempEuler = new THREE.Euler();
    this.tempScale = new THREE.Vector3();
    this.tempMatrix = new THREE.Matrix4();
    this.tempColor = new THREE.Color();
    this.anchors = null;
    this.attached = false;
    this.disposed = false;
    this.mode = 'attached';
    this.previousState = null;
    this.explosionCount = 0;
    this.flightTime = 0;
    this.attachedTime = 0;
    this.currentGlobalScale = 1;
    this.flightScale = 1;
  }

  attachToHeart(anchorData) {
    if (anchorData.length !== this.count) {
      throw new RangeError(
        `PetalSystem requires exactly ${this.count} anchors, received ${anchorData.length}.`,
      );
    }

    this.anchors = anchorData;
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

      // Sample deterministically across full rich palette using colorVariant and noiseSeed
      const variant = this.buffers.colorVariant[index];
      const paletteOffset = Math.floor(
        (anchorData[index].noiseSeed ?? 0) * this.palette.length,
      );
      const paletteIndex = (variant + paletteOffset) % this.palette.length;
      const color = this.palette[paletteIndex];
      this.tempColor.setHex(color);
      this.mesh.setColorAt(index, this.tempColor);
    }

    this.buffers.resetDynamics();
    this.attached = true;
    this.mode = 'attached';
    this.previousState = null;
    this.explosionCount = 0;
    this.flightTime = 0;
    this.attachedTime = 0;
    this.currentGlobalScale = 1;
    this.flightScale = 1;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.updateAttachedTransforms(1);
  }

  updateAttachedTransforms(globalScale, stateSnapshot) {
    this.currentGlobalScale = globalScale;
    const time = this.attachedTime;
    const intensity = Math.min(2.5, stateSnapshot?.heartbeatIntensity ?? 0);

    for (let index = 0; index < this.count; index += 1) {
      const vectorOffset = index * 3;
      const rotationOffset = index * 4;
      const anchor = this.anchors ? this.anchors[index] : null;
      const isAmbient = Boolean(anchor?.isAmbient);

      if (!isAmbient) {
        // Core attached heart petals: keep anchor position exact for test invariants
        const x = this.buffers.anchorPosition[vectorOffset] * globalScale;
        const y = this.buffers.anchorPosition[vectorOffset + 1] * globalScale;
        const z = this.buffers.anchorPosition[vectorOffset + 2] * globalScale;

        this.buffers.position[vectorOffset] = x;
        this.buffers.position[vectorOffset + 1] = y;
        this.buffers.position[vectorOffset + 2] = z;
        this.tempPosition.set(x, y, z);
        this.tempQuaternion.fromArray(this.buffers.rotation, rotationOffset);

        // Organic micro-motion: subtle leaf flutter around normal synchronized to heart rhythm
        if (this.flutterEnabled && time > 0) {
          const noiseSeed = this.buffers.noiseSeed[index];
          const flutterSpeed = 2.8 + noiseSeed * 1.6;
          const flutterAmp = 0.032 + intensity * 0.045;
          const flutterAngle =
            Math.sin(time * flutterSpeed + noiseSeed * TAU) * flutterAmp;
          this.tempNormal.set(
            this.buffers.anchorNormal[vectorOffset],
            this.buffers.anchorNormal[vectorOffset + 1],
            this.buffers.anchorNormal[vectorOffset + 2],
          );
          this.tempTwistQuaternion.setFromAxisAngle(
            this.tempNormal,
            flutterAngle,
          );
          this.tempQuaternion.multiply(this.tempTwistQuaternion);
        }

        const scale =
          this.buffers.baseScale[index] * PETAL_UNIT_SCALE * globalScale;
        this.tempScale.setScalar(scale);
      } else {
        // Ambient floating petals: gentle 3D harmonic drift around heart
        const seed = this.buffers.noiseSeed[index];
        const speed = anchor.ambientSpeed ?? 0.8;
        const phase = anchor.ambientPhase ?? 0;
        const radius = anchor.ambientRadius ?? 0.12;

        const driftX = Math.sin(time * speed + phase) * radius;
        const driftY =
          Math.cos(time * speed * 0.8 + phase * 1.3) * radius +
          Math.sin(time * 0.4 + phase) * 0.04;
        const driftZ =
          Math.sin(time * speed * 0.6 + phase * 0.7) * (radius * 0.8);

        const ax =
          this.buffers.anchorPosition[vectorOffset] * globalScale + driftX;
        const ay =
          this.buffers.anchorPosition[vectorOffset + 1] * globalScale + driftY;
        const az =
          this.buffers.anchorPosition[vectorOffset + 2] * globalScale + driftZ;

        this.buffers.position[vectorOffset] = ax;
        this.buffers.position[vectorOffset + 1] = ay;
        this.buffers.position[vectorOffset + 2] = az;
        this.tempPosition.set(ax, ay, az);
        this.tempQuaternion.fromArray(this.buffers.rotation, rotationOffset);

        // Slow gentle tumbling in space
        const tumbleSpeed = 0.4 + seed * 0.5;
        const tumbleX = Math.sin(time * tumbleSpeed + phase) * 0.22;
        const tumbleY = Math.cos(time * tumbleSpeed * 0.7 + phase) * 0.22;
        const tumbleZ = Math.sin(time * tumbleSpeed * 0.4 + phase) * 0.22;
        this.tempEuler.set(tumbleX, tumbleY, tumbleZ);
        this.tempTwistQuaternion.setFromEuler(this.tempEuler);
        this.tempQuaternion.multiply(this.tempTwistQuaternion);

        // Foreground bokeh petals scaled slightly larger for depth
        const scaleMult = anchor.isForeground ? 1.45 : 1.0;
        const scale =
          this.buffers.baseScale[index] *
          PETAL_UNIT_SCALE *
          globalScale *
          scaleMult;
        this.tempScale.setScalar(scale);
      }

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
      this.attachedTime += dt;
      this.updateAttachedTransforms(
        stateSnapshot?.heartScale ?? 1,
        stateSnapshot,
      );
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

  setTexture(texture) {
    if (!this.material || !texture) {
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    this.material.map = texture;
    this.material.roughnessMap = null;
    this.material.alphaTest = 0;
    this.material.transparent = false;
    this.material.depthWrite = true;
    this.material.needsUpdate = true;
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
    this.attachedTime = 0;
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
