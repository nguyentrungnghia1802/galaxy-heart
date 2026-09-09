import * as THREE from 'three';

import { PetalBuffers } from './PetalBuffers.js';
import { createPetalGeometry } from './PetalGeometry.js';

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

export class PetalSystem {
  constructor({ count, geometry, material, palette = DEFAULT_PALETTE }) {
    this.count = count;
    this.palette = palette;
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
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.updateAttachedTransforms(1);
  }

  updateAttachedTransforms(globalScale) {
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

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
