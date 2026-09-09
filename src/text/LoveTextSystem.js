import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontData from '../assets/fonts/optimer_regular.typeface.json';
import { clamp, easeOutCubic, lerp } from '../utils/math.js';

export class LoveTextSystem {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.camera = options.camera ?? null;
    this.basePosition = new THREE.Vector3(0, 0.08, 0.20);
    this.group.position.copy(this.basePosition);
    this.time = 0;
    this.revealProgress = 0;
    this.isRevealed = false;

    // Parse font synchronously from bundled JSON data
    const loader = new FontLoader();
    this.font = loader.parse(fontData);

    // 1. Text Geometry with crisp bevel contours
    const textGeo = new TextGeometry('I love you!', {
      font: this.font,
      size: 0.36,
      depth: 0.058,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.007,
      bevelOffset: 0,
      bevelSegments: 4,
    });
    textGeo.computeBoundingBox();
    textGeo.center();

    // 2. Dual-Tone Romantic Materials (face = warm satin ivory-blush, sides = deep crimson-wine velvet depth)
    // Non-emissive physical materials eliminate neon glow and bloom washout for crisp 3D letterforms
    this.faceMat = new THREE.MeshPhysicalMaterial({
      color: 0xfcf3f5,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.24,
      metalness: 0.04,
      clearcoat: 0.8,
      clearcoatRoughness: 0.08,
      side: THREE.FrontSide,
    });

    this.sideMat = new THREE.MeshPhysicalMaterial({
      color: 0x820e2a,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.42,
      metalness: 0.08,
      clearcoat: 0.3,
      side: THREE.FrontSide,
    });

    this.textMesh = new THREE.Mesh(textGeo, [this.faceMat, this.sideMat]);
    this.group.add(this.textMesh);

    // 3. Diffused Front Illumination (gentle warm spotlight from slightly forward distance)
    this.textLight = new THREE.PointLight(0xffe4ec, 0, 3.5, 2.0);
    this.textLight.position.set(0, 0.1, 0.75);
    this.group.add(this.textLight);

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

    // 1. Reveal Animation (scale up + smooth emergence into center focus)
    const t = easeOutCubic(this.revealProgress);
    // Emerge smoothly from slightly below center to resting center level (y: 0.08)
    const currentY = lerp(-0.06, this.basePosition.y, t);
    const scaleFactor =
      this.revealProgress < 1.0
        ? lerp(0.1, 1.02, Math.sin(t * Math.PI * 0.5))
        : 1.0;

    // 2. Continuous Living Floating Micro-Motion in End State
    const floatBob = Math.sin(this.time * 1.5) * 0.018;
    const swayY = Math.sin(this.time * 0.9) * 0.022;
    const tiltX = -0.04 + Math.cos(this.time * 1.2) * 0.014;

    this.group.position.y = currentY + floatBob;
    this.group.position.z = this.basePosition.z;
    this.textMesh.rotation.y = swayY;
    this.textMesh.rotation.x = tiltX;

    // 3. Scale, Responsive Mobile Fit & Shimmer
    const aspect =
      this.camera?.aspect ??
      (typeof window !== 'undefined' && window.innerHeight
        ? window.innerWidth / window.innerHeight
        : 1);
    const responsiveScale = aspect < 1.0 ? clamp(aspect * 1.35, 0.62, 1.0) : 1.0;
    const breath = 1.0 + Math.sin(this.time * 2.0) * 0.015;
    const s = scaleFactor * breath * responsiveScale;
    this.group.scale.set(s, s, s);

    // 4. Clean, elegant illumination without bloom blowout or neon emissive
    this.faceMat.emissiveIntensity = 0;
    this.sideMat.emissiveIntensity = 0;
    this.textLight.intensity = 1.05 * t;
  }

  reset() {
    this.time = 0;
    this.revealProgress = 0;
    this.isRevealed = false;
    this.group.visible = false;
    this.group.scale.set(0.001, 0.001, 0.001);
    this.group.position.copy(this.basePosition);
    this.textLight.intensity = 0;
  }

  dispose() {
    this.reset();
    this.textMesh.geometry.dispose();
    this.faceMat.dispose();
    this.sideMat.dispose();
    this.textLight.dispose();
    this.group.removeFromParent();
  }
}
