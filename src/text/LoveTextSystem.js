import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontData from '../assets/fonts/optimer_regular.typeface.json';
import { clamp, easeOutCubic, lerp } from '../utils/math.js';

export class LoveTextSystem {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.basePosition = new THREE.Vector3(0, 0.68, 0.2);
    this.group.position.copy(this.basePosition);
    this.time = 0;
    this.revealProgress = 0;
    this.isRevealed = false;

    // Parse font synchronously from bundled JSON data
    const loader = new FontLoader();
    this.font = loader.parse(fontData);

    // 1. Text Geometry
    const textGeo = new TextGeometry('I love you!', {
      font: this.font,
      size: 0.38,
      depth: 0.065,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.008,
      bevelOffset: 0,
      bevelSegments: 4,
    });
    textGeo.computeBoundingBox();
    textGeo.center();

    // 2. Dual-Tone Romantic Materials (face = radiant blush-white, sides = glowing ruby-rose)
    this.faceMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff2f6,
      emissive: 0x5a0a22,
      emissiveIntensity: 0.45,
      roughness: 0.22,
      metalness: 0.12,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      side: THREE.FrontSide,
    });

    this.sideMat = new THREE.MeshPhysicalMaterial({
      color: 0xe81850,
      emissive: 0x8a0525,
      emissiveIntensity: 0.75,
      roughness: 0.32,
      metalness: 0.2,
      clearcoat: 0.5,
      side: THREE.FrontSide,
    });

    this.textMesh = new THREE.Mesh(textGeo, [this.faceMat, this.sideMat]);
    this.group.add(this.textMesh);

    // 3. Ambient Text Backlight / Soft Aura
    this.textLight = new THREE.PointLight(0xff4070, 0, 4.0, 2.0);
    this.textLight.position.set(0, 0, 0.3);
    this.group.add(this.textLight);

    // 4. Subtle Ambient Halo behind text
    const haloGeo = new THREE.PlaneGeometry(2.6, 0.9);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0xff1848,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
    this.haloMesh.position.set(0, 0, -0.05);
    this.group.add(this.haloMesh);

    // Initial hidden state
    this.group.visible = false;
    this.group.scale.set(0.001, 0.001, 0.001);
  }

  reveal() {
    this.isRevealed = true;
    this.group.visible = true;
  }

  update(dt = 0.016, stateSnapshot = {}) {
    this.time += dt;
    const state = stateSnapshot?.state ?? 'BOOT';
    const progress = clamp(stateSnapshot?.progress ?? 0, 0, 1);

    if (state === 'LOVE_REVEAL') {
      this.isRevealed = true;
      this.group.visible = true;
      this.revealProgress = progress;
    } else if (state === 'END') {
      this.isRevealed = true;
      this.group.visible = true;
      this.revealProgress = 1.0;
    } else if (!this.isRevealed) {
      this.group.visible = false;
      return;
    }

    // 1. Reveal Animation (scale up + vertical float + bloom surge)
    const t = easeOutCubic(this.revealProgress);
    // Emerge from gem level (y: 0.2) to resting level (y: 0.68)
    const currentY = lerp(0.25, this.basePosition.y, t);
    // Slight overshooting scale for cinematic presence (up to 1.05 then settle to 1.0)
    const scaleFactor =
      this.revealProgress < 1.0
        ? lerp(0.05, 1.05, Math.sin(t * Math.PI * 0.5))
        : 1.0;

    // 2. Continuous Living Floating Micro-Motion in End State
    const floatBob = Math.sin(this.time * 1.5) * 0.022;
    const swayY = Math.sin(this.time * 0.9) * 0.028;
    const tiltX = -0.05 + Math.cos(this.time * 1.2) * 0.018;

    this.group.position.y = currentY + floatBob;
    this.group.position.z = this.basePosition.z;
    this.textMesh.rotation.y = swayY;
    this.textMesh.rotation.x = tiltX;

    // 3. Scale & Shimmer
    const breath = 1.0 + Math.sin(this.time * 2.0) * 0.018;
    const s = scaleFactor * breath;
    this.group.scale.set(s, s, s);

    // 4. Lighting & Emissive Flare during reveal, settling into warm glow
    const flashBoost =
      state === 'LOVE_REVEAL' ? Math.sin(progress * Math.PI) * 1.8 : 0;
    this.faceMat.emissiveIntensity = 0.45 + flashBoost * 0.6;
    this.sideMat.emissiveIntensity = 0.75 + flashBoost * 1.2;
    this.textLight.intensity = (1.8 + flashBoost * 3.0) * t;
    this.haloMat.opacity = clamp((0.25 + flashBoost * 0.35) * t, 0, 1);
  }

  reset() {
    this.time = 0;
    this.revealProgress = 0;
    this.isRevealed = false;
    this.group.visible = false;
    this.group.scale.set(0.001, 0.001, 0.001);
    this.group.position.copy(this.basePosition);
    this.textLight.intensity = 0;
    this.haloMat.opacity = 0;
  }

  dispose() {
    this.reset();
    this.textMesh.geometry.dispose();
    this.faceMat.dispose();
    this.sideMat.dispose();
    this.haloMesh.geometry.dispose();
    this.haloMat.dispose();
    this.textLight.dispose();
    this.group.removeFromParent();
  }
}
