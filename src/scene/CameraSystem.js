import * as THREE from 'three';

export class CameraSystem {
  constructor(camera, options = {}) {
    this.camera = camera;
    this.windowTarget = options.windowTarget ?? globalThis.window;

    this.baseFov = options.fov ?? 46;
    this.basePosition =
      camera.position.lengthSq() > 0
        ? camera.position.clone()
        : new THREE.Vector3(0, 0.08, 5.0);
    this.camera.position.copy(this.basePosition);
    this.targetLookAt = new THREE.Vector3(0, 0.05, 0);

    this.currentPosition = this.basePosition.clone();
    this.targetPosition = this.basePosition.clone();

    this.pointerNormalized = new THREE.Vector2(0, 0);
    this.parallaxOffset = new THREE.Vector3(0, 0, 0);
    this.maxParallaxX = 0.35;
    this.maxParallaxY = 0.22;

    this.dollyOffsetZ = 0;
    this.shakeOffset = new THREE.Vector3(0, 0, 0);
    this.shakeIntensity = 0;
    this.shakeTime = 0;

    this.aspect = 1;
    this.reducedMotion = false;
    this.checkReducedMotion();
  }

  checkReducedMotion() {
    try {
      const query = this.windowTarget?.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      );
      this.reducedMotion = Boolean(query?.matches);
    } catch {
      this.reducedMotion = false;
    }
  }

  onPointer(normalizedX, normalizedY) {
    this.pointerNormalized.set(
      Math.max(-1, Math.min(1, normalizedX)),
      Math.max(-1, Math.min(1, normalizedY)),
    );
  }

  update(dt, stateSnapshot) {
    const state = stateSnapshot?.state ?? 'BOOT';
    const progress = stateSnapshot?.progress ?? 0;

    // 1. Parallax calculation
    const motionScale = this.reducedMotion ? 0.15 : 1.0;
    const targetParallaxX =
      this.pointerNormalized.x * this.maxParallaxX * motionScale;
    const targetParallaxY =
      -this.pointerNormalized.y * this.maxParallaxY * motionScale;

    this.parallaxOffset.x += (targetParallaxX - this.parallaxOffset.x) * 0.06;
    this.parallaxOffset.y += (targetParallaxY - this.parallaxOffset.y) * 0.06;

    // 2. Cinematic tension dolly
    if (state === 'TENSION') {
      const dollyAmount = this.reducedMotion ? 0.05 : 0.16;
      this.dollyOffsetZ = -progress * dollyAmount;
    } else if (state === 'EXPLOSION') {
      const dollyAmount = this.reducedMotion ? 0.05 : 0.16;
      this.dollyOffsetZ = -(1 - progress) * dollyAmount;

      // Trigger shake on explosion entry
      if (progress < 0.05 && this.shakeIntensity === 0 && !this.reducedMotion) {
        this.shakeIntensity = 0.08;
        this.shakeTime = 0;
      }
    } else {
      this.dollyOffsetZ = 0;
    }

    // 3. Camera shake decay
    if (this.shakeIntensity > 0.001) {
      this.shakeTime += dt;
      const decay = Math.exp(-this.shakeTime * 7.0);
      const currentAmp = this.shakeIntensity * decay;
      this.shakeOffset.set(
        Math.sin(this.shakeTime * 48.0) * currentAmp,
        Math.cos(this.shakeTime * 36.0) * currentAmp,
        0,
      );
      if (decay < 0.01) {
        this.shakeIntensity = 0;
        this.shakeOffset.set(0, 0, 0);
      }
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    // Compose target position
    this.targetPosition.copy(this.basePosition);
    this.targetPosition.x += this.parallaxOffset.x + this.shakeOffset.x;
    this.targetPosition.y += this.parallaxOffset.y + this.shakeOffset.y;
    this.targetPosition.z += this.dollyOffsetZ;

    // Smooth position interpolation
    this.currentPosition.lerp(this.targetPosition, 0.08);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.targetLookAt);
  }

  resize(width, height) {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.aspect = safeWidth / safeHeight;
    this.camera.aspect = this.aspect;

    // Responsive framing: push camera back on mobile portrait to keep heart in safe view
    if (this.aspect < 1.0) {
      const portraitMultiplier = Math.min(1.45, 1.0 / (this.aspect * 0.95));
      this.basePosition.z = 5.0 * portraitMultiplier;
    } else {
      this.basePosition.z = 5.0;
    }

    this.camera.updateProjectionMatrix();
  }

  reset() {
    this.pointerNormalized.set(0, 0);
    this.parallaxOffset.set(0, 0, 0);
    this.dollyOffsetZ = 0;
    this.shakeIntensity = 0;
    this.shakeTime = 0;
    this.shakeOffset.set(0, 0, 0);
    this.currentPosition.copy(this.basePosition);
    this.targetPosition.copy(this.basePosition);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.targetLookAt);
  }
}
