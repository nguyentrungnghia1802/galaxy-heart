import * as THREE from 'three';
import { clamp, lerp } from '../utils/math.js';
import { GemBurst } from './GemBurst.js';

const ORBIT_SPARKLE_COUNT = 6;

function createSparkleTexture() {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.3, 'rgba(255, 220, 235, 0.5)');
  grad.addColorStop(0.7, 'rgba(255, 80, 130, 0.12)');
  grad.addColorStop(1, 'rgba(255, 30, 80, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class GemSystem {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.basePosition = new THREE.Vector3(0, 0.05, 0);
    this.group.position.copy(this.basePosition);

    this.hoverFactor = 0;
    this.isHovered = false;
    this.time = 0;
    this.idleTime = 0;
    this.burstFlash = 0;

    // 1. Inner Crystal Core (Deep ruby octahedron, non-glowing interior depth)
    const innerGeo = new THREE.OctahedronGeometry(0.084, 0);
    this.innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x7a0a20,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.32,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    this.innerMesh = new THREE.Mesh(innerGeo, this.innerMat);
    this.group.add(this.innerMesh);

    // 2. Outer Faceted Crystal Diamond (Faceted bipyramid diamond catching lights cleanly)
    const outerGeo = new THREE.OctahedronGeometry(0.156, 0);
    outerGeo.scale(0.85, 1.35, 0.85);

    this.outerMat = new THREE.MeshPhysicalMaterial({
      color: 0xbf1944,
      emissive: 0x160206,
      emissiveIntensity: 0.06,
      roughness: 0.10,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transmission: 0.58,
      ior: 1.72,
      flatShading: true,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });
    this.outerMesh = new THREE.Mesh(outerGeo, this.outerMat);
    this.group.add(this.outerMesh);

    // 3. Halo completely disabled to avoid hazy bloom ring
    const haloGeo = new THREE.RingGeometry(0.024, 0.18, 36);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0xde285e,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
    this.haloMesh.visible = false;
    this.group.add(this.haloMesh);

    // 4. Subtle beckoning ripple cue in GEM_IDLE
    const rippleGeo = new THREE.RingGeometry(0.10, 0.125, 36);
    this.rippleMat = new THREE.MeshBasicMaterial({
      color: 0xff5a86,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.rippleMesh = new THREE.Mesh(rippleGeo, this.rippleMat);
    this.rippleMesh.visible = false;
    this.group.add(this.rippleMesh);

    // 5. Just a few subtle stardust sparkles orbiting gently
    this.sparkleAngles = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparkleRadii = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparkleSpeeds = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparkleHeights = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparklePositions = new Float32Array(ORBIT_SPARKLE_COUNT * 3);

    for (let i = 0; i < ORBIT_SPARKLE_COUNT; i++) {
      this.sparkleAngles[i] = (i / ORBIT_SPARKLE_COUNT) * Math.PI * 2;
      this.sparkleRadii[i] = 0.19 + (i % 2) * 0.05;
      this.sparkleSpeeds[i] = 0.5 + (i % 3) * 0.2;
      this.sparkleHeights[i] = ((i % 3) - 1) * 0.03;
    }

    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.sparklePositions, 3),
    );
    this.sparkleTex = createSparkleTexture();
    const orbitMatConfig = {
      color: 0xffe2ec,
      size: 0.05,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    };
    if (this.sparkleTex) {
      orbitMatConfig.map = this.sparkleTex;
    }
    this.orbitMat = new THREE.PointsMaterial(orbitMatConfig);
    this.orbitPoints = new THREE.Points(orbitGeo, this.orbitMat);
    this.group.add(this.orbitPoints);

    // 6. Delicate interior glint light (subtle, non-blinding)
    this.gemLight = new THREE.PointLight(0xff2d62, 0.25, 2.0, 2.0);
    this.group.add(this.gemLight);

    // 7. Interactive Invisible Hit Mesh (Generous radius for easy mobile touch & desktop click)
    const hitGeo = new THREE.SphereGeometry(0.48, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
    });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.hitMesh.name = 'GemHitTarget';
    this.group.add(this.hitMesh);

    // 8. Integrated Burst FX
    this.gemBurst = new GemBurst({ seed: options.seed });
    this.group.add(this.gemBurst.group);

    // Initial state
    this.group.visible = true;
  }

  setHovered(hovered) {
    this.isHovered = Boolean(hovered);
  }

  triggerBurst() {
    this.burstFlash = 1.0;
    this.gemBurst.trigger();
  }

  update(dt = 0.016, stateSnapshot = {}) {
    this.time += dt;
    const state = stateSnapshot?.state ?? 'BOOT';
    const progress = clamp(stateSnapshot?.progress ?? 0, 0, 1);
    const isExploded =
      state === 'PETAL_FLIGHT' ||
      state === 'GEM_IDLE' ||
      state === 'GEM_BURST' ||
      state === 'LOVE_REVEAL' ||
      state === 'END';

    // Disappearance logic: after gem activation, gem dissolves and vanishes completely
    if (state === 'LOVE_REVEAL' || state === 'END') {
      this.innerMesh.visible = false;
      this.outerMesh.visible = false;
      this.haloMesh.visible = false;
      this.rippleMesh.visible = false;
      this.orbitPoints.visible = false;
      this.hitMesh.visible = false;
      this.gemLight.intensity = 0;
      this.gemBurst.update(dt);
      return;
    }

    let disappearScale = 1.0;
    let disappearAlpha = 1.0;

    if (state === 'GEM_BURST') {
      // Gentle activation pulse, then smooth prompt shrink and fade to zero
      const dissolveProgress = clamp((progress - 0.05) / 0.45, 0, 1);
      disappearScale = Math.max(0, 1 - Math.pow(dissolveProgress, 1.4));
      disappearAlpha = Math.max(0, 1 - Math.pow(dissolveProgress, 1.1));

      if (progress >= 0.55) {
        this.innerMesh.visible = false;
        this.outerMesh.visible = false;
        this.haloMesh.visible = false;
        this.rippleMesh.visible = false;
        this.orbitPoints.visible = false;
        this.hitMesh.visible = false;
        this.gemLight.intensity = 0;
        this.gemBurst.update(dt);
        return;
      }
    }

    // Ensure elements are visible during pre-dissolve states
    this.innerMesh.visible = true;
    this.outerMesh.visible = true;
    this.haloMesh.visible = false;
    this.orbitPoints.visible = true;
    this.hitMesh.visible = true;

    // 1. Smooth hover transition (fast in, smooth out)
    const targetHover = this.isHovered ? 1.0 : 0.0;
    this.hoverFactor += (targetHover - this.hoverFactor) * Math.min(1, dt * 10);

    // 2. Levitation & Floating Rotation
    const floatSpeed = isExploded ? 1.6 : 1.0;
    const floatAmp = isExploded ? 0.030 : 0.008;
    this.group.position.y =
      this.basePosition.y + Math.sin(this.time * floatSpeed) * floatAmp;

    // Dual-axis smooth rotation (facets glint in scene key/rim light)
    const rotSpeedY = 0.42 + this.hoverFactor * 0.35;
    this.outerMesh.rotation.y += dt * rotSpeedY;
    this.innerMesh.rotation.y = this.outerMesh.rotation.y * 1.5;
    this.outerMesh.rotation.x = Math.sin(this.time * 0.8) * 0.08;
    this.outerMesh.rotation.z = Math.cos(this.time * 0.7) * 0.06;

    // 3. Gem Scale Envelope
    const breathing = Math.sin(this.time * 2.2) * 0.025;
    const hoverScale = this.hoverFactor * 0.08;
    const burstScale = Math.sin(this.burstFlash * Math.PI) * 0.10;
    const totalScale = (1.0 + breathing + hoverScale + burstScale) * disappearScale;
    this.outerMesh.scale.set(0.85 * totalScale, 1.35 * totalScale, 0.85 * totalScale);
    this.innerMesh.scale.set(totalScale, totalScale, totalScale);

    // 4. Clean Crystal Shading (Low emissive to avoid neon wash, relying on physical facet reflections)
    if (this.burstFlash > 0.001) {
      this.burstFlash = Math.max(0, this.burstFlash - dt * 3.5);
    }
    const baseEmissive = 0.06;
    const activeEmissive =
      baseEmissive + this.hoverFactor * 0.08 + this.burstFlash * 0.35;
    this.outerMat.emissiveIntensity = activeEmissive;
    this.outerMat.opacity = 0.94 * disappearAlpha;
    this.innerMat.opacity = 0.82 * disappearAlpha;

    // Delicate point light strictly for internal refraction
    this.gemLight.intensity =
      (0.25 + this.hoverFactor * 0.15 + this.burstFlash * 0.6) * disappearAlpha;

    // Halo kept inactive
    this.haloMesh.visible = false;
    this.haloMat.opacity = 0;

    // 5. Beckoning Ripple Cue (Only during GEM_IDLE when user needs to tap, subtle and soft)
    if (state === 'GEM_IDLE') {
      this.idleTime += dt;
      const ripplePeriod = 2.4;
      const ripplePhase = (this.idleTime % ripplePeriod) / ripplePeriod;
      const rippleScale = lerp(0.8, 1.8, Math.pow(ripplePhase, 0.5));
      this.rippleMesh.scale.set(rippleScale, rippleScale, rippleScale);
      this.rippleMat.opacity = Math.sin(ripplePhase * Math.PI) * 0.12;
      this.rippleMesh.visible = true;
    } else {
      this.rippleMesh.visible = false;
    }

    // 6. Orbiting Firefly Sparkles (6 tiny particles)
    const sparkleSpeedMult = 1.0 + this.hoverFactor * 1.2;
    for (let i = 0; i < ORBIT_SPARKLE_COUNT; i++) {
      this.sparkleAngles[i] += dt * this.sparkleSpeeds[i] * sparkleSpeedMult;
      const angle = this.sparkleAngles[i];
      const radius = this.sparkleRadii[i] * (1.0 + this.hoverFactor * 0.10) * disappearScale;
      const height =
        this.sparkleHeights[i] * disappearScale + Math.sin(angle * 2.0 + i) * 0.02;

      this.sparklePositions[i * 3 + 0] = Math.cos(angle) * radius;
      this.sparklePositions[i * 3 + 1] = height;
      this.sparklePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    this.orbitPoints.geometry.attributes.position.needsUpdate = true;
    this.orbitMat.opacity = clamp(
      (0.26 + this.hoverFactor * 0.12) * disappearAlpha,
      0,
      1,
    );

    // 7. Update Burst FX
    this.gemBurst.update(dt);
  }

  reset() {
    this.hoverFactor = 0;
    this.isHovered = false;
    this.time = 0;
    this.idleTime = 0;
    this.burstFlash = 0;
    this.group.position.copy(this.basePosition);
    this.outerMesh.rotation.set(0, 0, 0);
    this.innerMesh.rotation.set(0, 0, 0);
    this.outerMesh.scale.set(0.85, 1.35, 0.85);
    this.innerMesh.scale.set(1, 1, 1);
    this.outerMat.opacity = 0.94;
    this.innerMat.opacity = 0.82;
    this.innerMesh.visible = true;
    this.outerMesh.visible = true;
    this.haloMesh.visible = false;
    this.haloMat.opacity = 0;
    this.rippleMesh.visible = false;
    this.orbitPoints.visible = true;
    this.hitMesh.visible = true;
    this.gemLight.intensity = 0.25;
    this.gemBurst.reset();
  }

  dispose() {
    this.reset();
    this.innerMesh.geometry.dispose();
    this.innerMat.dispose();
    this.outerMesh.geometry.dispose();
    this.outerMat.dispose();
    this.haloMesh.geometry.dispose();
    this.haloMat.dispose();
    this.rippleMesh.geometry.dispose();
    this.rippleMat.dispose();
    this.orbitPoints.geometry.dispose();
    this.orbitMat.dispose();
    this.sparkleTex?.dispose();
    this.hitMesh.geometry.dispose();
    this.hitMesh.material.dispose();
    this.gemLight.dispose();
    this.gemBurst.dispose();
    this.group.removeFromParent();
  }
}
