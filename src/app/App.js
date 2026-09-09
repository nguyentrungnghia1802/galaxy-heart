import * as THREE from 'three';

import {
  createHeartAnchors,
  createHeartDebugPositions,
} from '../heart/HeartSurface.js';
import { PetalSystem } from '../petals/PetalSystem.js';
import { clamp } from '../utils/math.js';

export class App {
  constructor(container) {
    if (!container) {
      throw new Error('App requires a mount container.');
    }

    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080104);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.domElement.setAttribute(
      'aria-label',
      'A minimal three-dimensional scene for the Petal Heart experience.',
    );
    this.container.append(this.renderer.domElement);

    this.petalSystem = null;
    this.placeholder = this.createPlaceholder();
    this.scene.add(this.placeholder);
    this.scene.add(new THREE.AmbientLight(0xff8da8, 1.2));

    const keyLight = new THREE.DirectionalLight(0xff335f, 4);
    keyLight.position.set(2, 3, 4);
    this.scene.add(keyLight);

    this.frameId = null;
    this.previousTime = 0;
    this.captureDebugMetrics = import.meta.env.DEV;
    this.resize = this.resize.bind(this);
    this.renderFrame = this.renderFrame.bind(this);
  }

  createPlaceholder() {
    if (new URLSearchParams(window.location.search).has('debugAnchors')) {
      const geometry = new THREE.BufferGeometry();
      const anchors = createHeartAnchors({ count: 3_000, seed: 1234 });
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(createHeartDebugPositions(anchors), 3),
      );
      const material = new THREE.PointsMaterial({ color: 0xff315f, size: 0.028 });
      return new THREE.Points(geometry, material);
    }

    const requestedCount = Number(
      new URLSearchParams(window.location.search).get('petals'),
    );
    const count = Number.isFinite(requestedCount) && requestedCount > 0
      ? Math.round(clamp(requestedCount, 1_500, 6_000))
      : 3_000;
    const anchors = createHeartAnchors({ count, seed: 1234 });
    this.petalSystem = new PetalSystem({ count });
    this.petalSystem.attachToHeart(anchors);
    return this.petalSystem.mesh;
  }

  start() {
    this.resize();
    window.addEventListener('resize', this.resize);
    this.frameId = requestAnimationFrame(this.renderFrame);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  renderFrame(time) {
    const dt = Math.min((time - this.previousTime) / 1000, 0.05);
    this.previousTime = time;
    this.placeholder.rotation.y += dt * 0.35;
    this.placeholder.rotation.x += dt * 0.12;
    this.renderer.render(this.scene, this.camera);
    if (this.captureDebugMetrics) {
      this.renderer.domElement.dataset.drawCalls = String(
        this.renderer.info.render.calls,
      );
      this.renderer.domElement.dataset.instanceCount = String(
        this.petalSystem?.mesh.count ?? 0,
      );
      this.renderer.domElement.dataset.renderMode = this.petalSystem
        ? 'instanced'
        : 'points-debug';
      this.captureDebugMetrics = false;
    }
    this.frameId = requestAnimationFrame(this.renderFrame);
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.petalSystem) {
      this.petalSystem.dispose();
    } else {
      this.placeholder.geometry.dispose();
      this.placeholder.material.dispose();
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
