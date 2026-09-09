import * as THREE from 'three';
import { clamp, lerp } from '../utils/math.js';
import { GemBurst } from './GemBurst.js';

const ORBIT_SPARKLE_COUNT = 18;

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

    // 1. Inner Glowing Crystal Core (Octahedron)
    const innerGeo = new THREE.OctahedronGeometry(0.14, 0);
    this.innerMat = new THREE.MeshBasicMaterial({
      color: 0xffe6f0,
      wireframe: false,
    });
    this.innerMesh = new THREE.Mesh(innerGeo, this.innerMat);
    this.group.add(this.innerMesh);

    // 2. Outer Faceted Crystal Diamond
    // Custom faceted bipyramid diamond geometry for sparkling facets
    const outerGeo = new THREE.OctahedronGeometry(0.26, 0);
    outerGeo.scale(0.85, 1.35, 0.85);

    this.outerMat = new THREE.MeshPhysicalMaterial({
      color: 0xff386c,
      emissive: 0x8a0628,
      emissiveIntensity: 0.7,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transmission: 0.55,
      ior: 1.65,
      flatShading: true,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    this.outerMesh = new THREE.Mesh(outerGeo, this.outerMat);
    this.group.add(this.outerMesh);

    // 3. Ethereal Radiant Halo (soft glowing billboard aura)
    const haloGeo = new THREE.RingGeometry(0.04, 0.42, 36);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0xff3568,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
    this.group.add(this.haloMesh);

    // 4. Beckoning Ripple Ring (Periodic inviting touch wave in GEM_IDLE)
    const rippleGeo = new THREE.RingGeometry(0.18, 0.22, 36);
    this.rippleMat = new THREE.MeshBasicMaterial({
      color: 0xff7099,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.rippleMesh = new THREE.Mesh(rippleGeo, this.rippleMat);
    this.group.add(this.rippleMesh);

    // 5. Orbiting Firefly Sparkle Particles
    this.sparkleAngles = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparkleRadii = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparkleSpeeds = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparkleHeights = new Float32Array(ORBIT_SPARKLE_COUNT);
    this.sparklePositions = new Float32Array(ORBIT_SPARKLE_COUNT * 3);

    for (let i = 0; i < ORBIT_SPARKLE_COUNT; i++) {
      this.sparkleAngles[i] = (i / ORBIT_SPARKLE_COUNT) * Math.PI * 2;
      this.sparkleRadii[i] = 0.35 + (i % 3) * 0.12;
      this.sparkleSpeeds[i] = 0.6 + (i % 4) * 0.25;
      this.sparkleHeights[i] = ((i % 5) - 2) * 0.08;
    }

    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.sparklePositions, 3),
    );
    this.orbitMat = new THREE.PointsMaterial({
      color: 0xfff2f8,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.orbitPoints = new THREE.Points(orbitGeo, this.orbitMat);
    this.group.add(this.orbitPoints);

    // 6. Gem Internal Point Light
    this.gemLight = new THREE.PointLight(0xff2d62, 3.2, 5.0, 2.0);
    this.group.add(this.gemLight);

    // 7. Interactive Invisible Hit Mesh (Generous radius for mobile touch & desktop hover)
    const hitGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
    });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.hitMesh.name = 'GemHitTarget';
    this.group.add(this.hitMesh);

    // 8. Integrated Burst FX
    this.gemBurst = new GemBurst({ seed: options.seed });
    this.group.add(this.gemBurst.group);

    // Visibility toggle (always visible, floats at center)
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

    // 1. Smooth hover transition (fast in, smooth out)
    const targetHover = this.isHovered ? 1.0 : 0.0;
    this.hoverFactor += (targetHover - this.hoverFactor) * Math.min(1, dt * 10);

    // 2. Levitation & Floating Rotation
    const floatSpeed = isExploded ? 1.6 : 1.0;
    const floatAmp = isExploded ? 0.038 : 0.012;
    this.group.position.y =
      this.basePosition.y + Math.sin(this.time * floatSpeed) * floatAmp;

    // Dual-axis smooth rotation (facets glint in light)
    const rotSpeedY = 0.45 + this.hoverFactor * 0.4;
    this.outerMesh.rotation.y += dt * rotSpeedY;
    this.innerMesh.rotation.y = this.outerMesh.rotation.y * 1.5;
    this.outerMesh.rotation.x = Math.sin(this.time * 0.8) * 0.08;
    this.outerMesh.rotation.z = Math.cos(this.time * 0.7) * 0.06;

    // 3. Gem Scale Envelope
    // Breathing pulse + hover lift + burst flash expansion
    const breathing = Math.sin(this.time * 2.2) * 0.035;
    const hoverScale = this.hoverFactor * 0.12;
    const burstScale = Math.sin(this.burstFlash * Math.PI) * 0.25;
    const totalScale = 1.0 + breathing + hoverScale + burstScale;
    this.outerMesh.scale.set(0.85 * totalScale, 1.35 * totalScale, 0.85 * totalScale);
    this.innerMesh.scale.set(totalScale, totalScale, totalScale);

    // 4. Material Glow & Bloom Response
    // Decay burst flash exponentially
    if (this.burstFlash > 0.001) {
      this.burstFlash = Math.max(0, this.burstFlash - dt * 2.5);
    }
    const baseEmissive = isExploded ? 0.75 : 0.55;
    const activeEmissive =
      baseEmissive + this.hoverFactor * 0.7 + this.burstFlash * 3.5;
    this.outerMat.emissiveIntensity = activeEmissive;

    // Gem light intensity tracks emissive
    this.gemLight.intensity =
      2.8 + this.hoverFactor * 1.6 + this.burstFlash * 6.0;

    // Halo pulse & hover expansion
    const haloScale =
      (1.0 + Math.sin(this.time * 2.0) * 0.06 + this.hoverFactor * 0.35) *
      (1.0 + this.burstFlash * 1.2);
    this.haloMesh.scale.set(haloScale, haloScale, haloScale);
    this.haloMat.opacity = clamp(
      0.35 + this.hoverFactor * 0.3 + this.burstFlash * 0.5,
      0,
      1,
    );

    // 5. Beckoning Ripple Cue (Only during GEM_IDLE when user needs to tap)
    if (state === 'GEM_IDLE') {
      this.idleTime += dt;
      const ripplePeriod = 2.4;
      const ripplePhase = (this.idleTime % ripplePeriod) / ripplePeriod;
      const rippleScale = lerp(0.8, 2.6, Math.pow(ripplePhase, 0.5));
      this.rippleMesh.scale.set(rippleScale, rippleScale, rippleScale);
      this.rippleMat.opacity = Math.sin(ripplePhase * Math.PI) * 0.55;
      this.rippleMesh.visible = true;
    } else {
      this.rippleMesh.visible = false;
    }

    // 6. Orbiting Firefly Sparkles
    const sparkleSpeedMult = 1.0 + this.hoverFactor * 1.2;
    for (let i = 0; i < ORBIT_SPARKLE_COUNT; i++) {
      this.sparkleAngles[i] += dt * this.sparkleSpeeds[i] * sparkleSpeedMult;
      const angle = this.sparkleAngles[i];
      const radius = this.sparkleRadii[i] * (1.0 + this.hoverFactor * 0.15);
      const height =
        this.sparkleHeights[i] + Math.sin(angle * 2.0 + i) * 0.04;

      this.sparklePositions[i * 3 + 0] = Math.cos(angle) * radius;
      this.sparklePositions[i * 3 + 1] = height;
      this.sparklePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    this.orbitPoints.geometry.attributes.position.needsUpdate = true;
    this.orbitMat.opacity = clamp(0.75 + this.hoverFactor * 0.25, 0, 1);

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
    this.hitMesh.geometry.dispose();
    this.hitMesh.material.dispose();
    this.gemLight.dispose();
    this.gemBurst.dispose();
    this.group.removeFromParent();
  }
}
