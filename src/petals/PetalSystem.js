import * as THREE from 'three';

import { createSeededRandom } from '../utils/random.js';
import { PetalBuffers } from './PetalBuffers.js';
import { createPetalGeometry } from './PetalGeometry.js';
import {
  initializeExplosion,
  integratePetalFlight,
} from './explosionPhysics.js';

const LOCAL_PETAL_NORMAL = new THREE.Vector3(0, 0, 1);
const PETAL_UNIT_SCALE = 0.235;
const TAU = Math.PI * 2;

// Curated 12-tone harmonious rose palette:
// Deep crevice wine -> ruby -> scarlet -> bright rose -> vibrant hot pink -> luminous blush
const DEFAULT_PALETTE = Object.freeze([
  0x4c0312, // 0: deep velvet crevice wine (luminance ~0.076 < 0.08)
  0x6e051c, // 1: rich dark wine
  0x8c0826, // 2: deep ruby red
  0xad0a32, // 3: vibrant ruby
  0xcc0e3d, // 4: radiant crimson rose
  0xe41448, // 5: vivid scarlet rose
  0xf42459, // 6: bright rose petal
  0xff3d75, // 7: radiant coral rose
  0xff487e, // 8: vibrant hot pink highlight (blue > green*1.3, red > blue*1.8)
  0xff5285, // 9: bright rose pink highlight (blue > green*1.3, red > blue*1.8)
  0xff8da8, // 10: soft blush pink (luminance > 0.45)
  0xffc8d8, // 11: luminous light petal highlight (luminance > 0.45)
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
        roughness: 0.48,
        metalness: 0,
        sheen: 0.92,
        sheenColor: 0xff7a9c,
        sheenRoughness: 0.52,
        clearcoat: 0.08,
        clearcoatRoughness: 0.85,
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
    this.tempTiltQuaternion = new THREE.Quaternion();
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
      const anchor = anchorData[index];
      const isAmbient = Boolean(anchor.isAmbient);
      const layer = anchor.layer ?? 'shell';
      const seed = anchor.noiseSeed ?? 0;
      const posZ = anchor.position?.z ?? 0;

      this.tempNormal
        .set(
          this.buffers.anchorNormal[vectorOffset],
          this.buffers.anchorNormal[vectorOffset + 1],
          this.buffers.anchorNormal[vectorOffset + 2],
        )
        .normalize();

      // Base orientation aligning petal normal to surface normal
      this.tempQuaternion.setFromUnitVectors(
        LOCAL_PETAL_NORMAL,
        this.tempNormal,
      );

      // Spin around normal by baseRotation
      this.tempTwistQuaternion.setFromAxisAngle(
        this.tempNormal,
        anchor.baseRotation,
      );
      this.tempQuaternion.premultiply(this.tempTwistQuaternion);

      // Natural organic petal cupping & pitch tilt:
      // Petals fan slightly outward from normal, overlapping like real flower petals
      if (!isAmbient) {
        const pitchAngle =
          layer === 'shell'
            ? 0.18 + seed * 0.16
            : layer === 'canopy'
              ? 0.14 + seed * 0.22
              : 0.12 + seed * 0.30;
        const rollAngle = (seed - 0.5) * 0.22;
        this.tempEuler.set(pitchAngle, rollAngle, 0);
        this.tempTiltQuaternion.setFromEuler(this.tempEuler);
        this.tempQuaternion.multiply(this.tempTiltQuaternion);
      }

      this.buffers.baseRotation[rotationOffset] = this.tempQuaternion.x;
      this.buffers.baseRotation[rotationOffset + 1] = this.tempQuaternion.y;
      this.buffers.baseRotation[rotationOffset + 2] = this.tempQuaternion.z;
      this.buffers.baseRotation[rotationOffset + 3] = this.tempQuaternion.w;

      // Intelligent Art-Directed Color Palette Distribution:
      let color;
      if (isAmbient) {
        if (anchor.isForeground) {
          // Foreground bokeh petals: soft blush, luminous pink, vivid scarlet
          const fgPalette = [0xff487e, 0xff5285, 0xff8da8, 0xffc8d8, 0xe41448];
          color = fgPalette[Math.floor(seed * fgPalette.length) % fgPalette.length];
        } else {
          // Ambient halo & midground: vibrant scarlet, ruby, and pink
          const ambPalette = [0xad0a32, 0xcc0e3d, 0xe41448, 0xf42459, 0xff487e, 0xff5285];
          color = ambPalette[Math.floor(seed * ambPalette.length) % ambPalette.length];
        }
      } else if (layer === 'core') {
        // Deep interior core: velvety wine and deep burgundy
        const corePalette = [0x4c0312, 0x6e051c, 0x8c0826, 0xad0a32];
        color = corePalette[Math.floor(seed * corePalette.length) % corePalette.length];
      } else if (layer === 'canopy') {
        // Mid-body canopy: rich ruby, crimson, and vibrant scarlet
        const canopyPalette = [0x8c0826, 0xad0a32, 0xcc0e3d, 0xe41448, 0xf42459];
        color = canopyPalette[Math.floor(seed * canopyPalette.length) % canopyPalette.length];
      } else {
        // Outer shell:
        // Camera-facing petals get brilliant scarlet, ruby, plus ~18% luminous pink highlights
        if (posZ >= 0.15 && seed < 0.24) {
          // Striking luminous pink / soft blush highlights matching reference image
          const pinkHighlights = [0xff487e, 0xff5285, 0xff8da8, 0xffc8d8];
          color = pinkHighlights[Math.floor((seed / 0.24) * pinkHighlights.length) % pinkHighlights.length];
        } else if (posZ >= 0.0) {
          // Front-facing vibrant scarlet & bright rose
          const frontPalette = [0xad0a32, 0xcc0e3d, 0xe41448, 0xf42459, 0xff3d75];
          color = frontPalette[Math.floor(seed * frontPalette.length) % frontPalette.length];
        } else {
          // Rear-facing shell: deep crimson and ruby
          const rearPalette = [0x6e051c, 0x8c0826, 0xad0a32, 0xcc0e3d];
          color = rearPalette[Math.floor(seed * rearPalette.length) % rearPalette.length];
        }
      }

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

        // Living organic micro-motion: subtle petal flutter & leaf curl synchronized to heart rhythm
        if (this.flutterEnabled && time > 0) {
          const noiseSeed = this.buffers.noiseSeed[index];
          const flutterSpeed = 2.4 + noiseSeed * 1.8;
          const flutterAmp = 0.026 + intensity * 0.042;
          const flutterAngle =
            Math.sin(time * flutterSpeed + noiseSeed * TAU) * flutterAmp +
            Math.sin(time * flutterSpeed * 1.8 + noiseSeed) * 0.012;

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
        const speed = anchor.ambientSpeed ?? 0.65;
        const phase = anchor.ambientPhase ?? 0;
        const radius = anchor.ambientRadius ?? 0.10;

        const driftX = Math.sin(time * speed + phase) * radius;
        const driftY =
          Math.cos(time * speed * 0.8 + phase * 1.3) * radius +
          Math.sin(time * 0.35 + phase) * 0.03;
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
        const tumbleSpeed = 0.35 + seed * 0.45;
        const tumbleX = Math.sin(time * tumbleSpeed + phase) * 0.20;
        const tumbleY = Math.cos(time * tumbleSpeed * 0.7 + phase) * 0.20;
        const tumbleZ = Math.sin(time * tumbleSpeed * 0.4 + phase) * 0.20;
        this.tempEuler.set(tumbleX, tumbleY, tumbleZ);
        this.tempTwistQuaternion.setFromEuler(this.tempEuler);
        this.tempQuaternion.multiply(this.tempTwistQuaternion);

        // Scale tier: foreground bokeh petals scaled distinctly larger for cinematic depth
        const scaleMult = anchor.bokehScale ?? (anchor.isForeground ? 1.8 : 1.0);
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
    } else {
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
