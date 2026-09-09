import * as THREE from 'three';
import { clamp, lerp } from '../utils/math.js';
import { createSeededRandom } from '../utils/random.js';

const SPARKLE_COUNT = 24;
const MINI_PETAL_COUNT = 12;

export class GemBurst {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.active = false;
    this.elapsed = 0;
    this.duration = options.duration ?? 0.9;
    const seed = options.seed ?? 0x47454d42; // "GEMB"
    const random = createSeededRandom(seed);

    // 1. Shockwave Ring (Subtle delicate radial energy ripple)
    const ringGeo = new THREE.RingGeometry(0.04, 0.12, 36);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4875,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.shockwave = new THREE.Mesh(ringGeo, this.ringMat);
    this.shockwave.rotation.x = Math.PI * 0.5;
    this.shockwave.visible = false;
    this.group.add(this.shockwave);

    // Second shockwave kept hidden to prevent multi-planar glare
    this.shockwaveV = new THREE.Mesh(ringGeo.clone(), this.ringMat);
    this.shockwaveV.visible = false;
    this.group.add(this.shockwaveV);

    // 2. Sparkle Starburst (Gentle fairy dust specks)
    this.sparklePositions = new Float32Array(SPARKLE_COUNT * 3);
    this.sparkleVelocities = new Float32Array(SPARKLE_COUNT * 3);
    this.sparkleScales = new Float32Array(SPARKLE_COUNT);
    this.sparklePhases = new Float32Array(SPARKLE_COUNT);

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 2 - 1);
      const speed = 0.8 + random() * 1.4;

      this.sparkleVelocities[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
      this.sparkleVelocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      this.sparkleVelocities[i * 3 + 2] = Math.cos(phi) * speed;

      this.sparkleScales[i] = 0.5 + random() * 0.5;
      this.sparklePhases[i] = random() * Math.PI * 2;
    }

    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.sparklePositions, 3),
    );

    this.sparkleMat = new THREE.PointsMaterial({
      color: 0xffeef5,
      size: 0.05,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.sparkles = new THREE.Points(sparkleGeo, this.sparkleMat);
    this.sparkles.visible = false;
    this.group.add(this.sparkles);

    // 3. Mini Petal Burst (InstancedMesh - small drifting rose flakes)
    const miniPetalShape = new THREE.Shape();
    miniPetalShape.moveTo(0, 0);
    miniPetalShape.bezierCurveTo(0.018, 0.025, 0.022, 0.05, 0, 0.07);
    miniPetalShape.bezierCurveTo(-0.022, 0.05, -0.018, 0.025, 0, 0);
    const miniPetalGeo = new THREE.ShapeGeometry(miniPetalShape);

    this.miniPetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xb5183e,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.45,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.miniPetals = new THREE.InstancedMesh(
      miniPetalGeo,
      this.miniPetalMat,
      MINI_PETAL_COUNT,
    );
    this.miniPetals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.miniPetals.visible = false;

    this.petalPos = new Float32Array(MINI_PETAL_COUNT * 3);
    this.petalVel = new Float32Array(MINI_PETAL_COUNT * 3);
    this.petalRot = new Float32Array(MINI_PETAL_COUNT * 3);
    this.petalRotSpeed = new Float32Array(MINI_PETAL_COUNT * 3);

    for (let i = 0; i < MINI_PETAL_COUNT; i++) {
      const angle = (i / MINI_PETAL_COUNT) * Math.PI * 2 + (random() - 0.5) * 0.3;
      const elevation = (random() - 0.5) * 0.6;
      const speed = 0.6 + random() * 1.0;

      this.petalVel[i * 3 + 0] = Math.cos(angle) * speed;
      this.petalVel[i * 3 + 1] = elevation * speed + 0.2;
      this.petalVel[i * 3 + 2] = Math.sin(angle) * speed;

      this.petalRot[i * 3 + 0] = random() * Math.PI * 2;
      this.petalRot[i * 3 + 1] = random() * Math.PI * 2;
      this.petalRot[i * 3 + 2] = random() * Math.PI * 2;

      this.petalRotSpeed[i * 3 + 0] = (random() - 0.5) * 4;
      this.petalRotSpeed[i * 3 + 1] = (random() - 0.5) * 4;
      this.petalRotSpeed[i * 3 + 2] = (random() - 0.5) * 4;
    }

    this.dummyMatrix = new THREE.Matrix4();
    this.dummyPos = new THREE.Vector3();
    this.dummyQuat = new THREE.Quaternion();
    this.dummyScale = new THREE.Vector3();
    this.dummyEuler = new THREE.Euler();

    this.group.add(this.miniPetals);
  }

  trigger() {
    this.active = true;
    this.elapsed = 0;

    // Reset shockwaves with refined soft initial opacity
    this.shockwave.visible = true;
    this.shockwave.scale.set(0.1, 0.1, 0.1);
    this.shockwaveV.visible = false;
    this.ringMat.opacity = 0.22;

    // Reset sparkles with delicate twinkle
    this.sparkles.visible = true;
    this.sparkleMat.opacity = 0.45;
    this.sparklePositions.fill(0);
    this.sparkles.geometry.attributes.position.needsUpdate = true;

    // Reset mini petals
    this.miniPetals.visible = true;
    this.miniPetalMat.opacity = 0.65;
    this.petalPos.fill(0);

    for (let i = 0; i < MINI_PETAL_COUNT; i++) {
      this.dummyPos.set(0, 0, 0);
      this.dummyEuler.set(this.petalRot[i * 3], this.petalRot[i * 3 + 1], this.petalRot[i * 3 + 2]);
      this.dummyQuat.setFromEuler(this.dummyEuler);
      this.dummyScale.set(1, 1, 1);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.miniPetals.setMatrixAt(i, this.dummyMatrix);
    }
    this.miniPetals.instanceMatrix.needsUpdate = true;
  }

  update(dt = 0.016) {
    if (!this.active) return;

    this.elapsed += dt;
    const progress = clamp(this.elapsed / this.duration, 0, 1);

    // 1. Shockwaves expansion & fade (subtle, non-blinding)
    const shockScale = lerp(0.1, 1.8, Math.pow(progress, 0.45));
    this.shockwave.scale.set(shockScale, shockScale, shockScale);
    this.ringMat.opacity = Math.max(0, 0.22 * Math.pow(1 - progress, 2.0));

    // 2. Sparkles propagation
    const sparkleDecay = Math.max(0, 0.45 * (1 - progress));
    this.sparkleMat.opacity = sparkleDecay;
    const drag = Math.pow(0.85, dt * 60);

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const idx = i * 3;
      this.sparkleVelocities[idx + 0] *= drag;
      this.sparkleVelocities[idx + 1] *= drag;
      this.sparkleVelocities[idx + 2] *= drag;

      this.sparklePositions[idx + 0] += this.sparkleVelocities[idx + 0] * dt;
      this.sparklePositions[idx + 1] += this.sparkleVelocities[idx + 1] * dt;
      this.sparklePositions[idx + 2] += this.sparkleVelocities[idx + 2] * dt;
    }
    this.sparkles.geometry.attributes.position.needsUpdate = true;

    // 3. Mini petals propagation & rotation
    const petalOpacity = Math.max(0, 0.65 * (1 - progress));
    this.miniPetalMat.opacity = petalOpacity;

    for (let i = 0; i < MINI_PETAL_COUNT; i++) {
      const idx = i * 3;
      this.petalVel[idx + 0] *= drag;
      this.petalVel[idx + 1] = (this.petalVel[idx + 1] - 0.2 * dt) * drag; // slight gravity
      this.petalVel[idx + 2] *= drag;

      this.petalPos[idx + 0] += this.petalVel[idx + 0] * dt;
      this.petalPos[idx + 1] += this.petalVel[idx + 1] * dt;
      this.petalPos[idx + 2] += this.petalVel[idx + 2] * dt;

      this.petalRot[idx + 0] += this.petalRotSpeed[idx + 0] * dt;
      this.petalRot[idx + 1] += this.petalRotSpeed[idx + 1] * dt;
      this.petalRot[idx + 2] += this.petalRotSpeed[idx + 2] * dt;

      this.dummyPos.set(this.petalPos[idx + 0], this.petalPos[idx + 1], this.petalPos[idx + 2]);
      this.dummyEuler.set(this.petalRot[idx + 0], this.petalRot[idx + 1], this.petalRot[idx + 2]);
      this.dummyQuat.setFromEuler(this.dummyEuler);
      const s = Math.max(0.01, 1.0 - progress * 0.5);
      this.dummyScale.set(s, s, s);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.miniPetals.setMatrixAt(i, this.dummyMatrix);
    }
    this.miniPetals.instanceMatrix.needsUpdate = true;

    if (progress >= 1) {
      this.active = false;
      this.shockwave.visible = false;
      this.shockwaveV.visible = false;
      this.sparkles.visible = false;
      this.miniPetals.visible = false;
    }
  }

  reset() {
    this.active = false;
    this.elapsed = 0;
    this.shockwave.visible = false;
    this.shockwaveV.visible = false;
    this.sparkles.visible = false;
    this.miniPetals.visible = false;
    this.ringMat.opacity = 0;
    this.sparkleMat.opacity = 0;
    this.miniPetalMat.opacity = 0;
  }

  dispose() {
    this.reset();
    this.shockwave.geometry.dispose();
    this.shockwaveV.geometry.dispose();
    this.ringMat.dispose();
    this.sparkles.geometry.dispose();
    this.sparkleMat.dispose();
    this.miniPetals.geometry.dispose();
    this.miniPetalMat.dispose();
    this.group.removeFromParent();
  }
}
