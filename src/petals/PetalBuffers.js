export class PetalBuffers {
  constructor(count) {
    if (!Number.isInteger(count) || count < 0) {
      throw new TypeError('PetalBuffers count must be a non-negative integer.');
    }

    this.count = count;
    this.anchorPosition = new Float32Array(count * 3);
    this.anchorNormal = new Float32Array(count * 3);
    this.baseRotation = new Float32Array(count * 4);
    this.baseScale = new Float32Array(count);
    this.colorVariant = new Uint8Array(count);
    this.position = new Float32Array(count * 3);
    this.velocity = new Float32Array(count * 3);
    this.rotation = new Float32Array(count * 4);
    this.angularVelocity = new Float32Array(count * 3);
    this.noiseSeed = new Float32Array(count);
    this.active = new Uint8Array(count);
  }

  copyAnchors(anchors) {
    if (anchors.length !== this.count) {
      throw new RangeError(
        `PetalBuffers expected ${this.count} anchors, received ${anchors.length}.`,
      );
    }

    for (let index = 0; index < this.count; index += 1) {
      const vectorOffset = index * 3;
      const anchor = anchors[index];
      this.anchorPosition[vectorOffset] = anchor.position.x;
      this.anchorPosition[vectorOffset + 1] = anchor.position.y;
      this.anchorPosition[vectorOffset + 2] = anchor.position.z;
      this.anchorNormal[vectorOffset] = anchor.normal.x;
      this.anchorNormal[vectorOffset + 1] = anchor.normal.y;
      this.anchorNormal[vectorOffset + 2] = anchor.normal.z;
      this.baseScale[index] = anchor.baseScale;
      this.colorVariant[index] = anchor.colorVariant;
      this.noiseSeed[index] = anchor.noiseSeed;
    }
  }

  resetDynamics() {
    this.position.set(this.anchorPosition);
    this.velocity.fill(0);
    this.rotation.set(this.baseRotation);
    this.angularVelocity.fill(0);
    this.active.fill(1);
  }
}

