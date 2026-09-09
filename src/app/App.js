import * as THREE from 'three';

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

    const geometry = new THREE.OctahedronGeometry(1, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xc41245,
      roughness: 0.42,
      metalness: 0.08,
    });

    this.placeholder = new THREE.Mesh(geometry, material);
    this.scene.add(this.placeholder);
    this.scene.add(new THREE.AmbientLight(0xff8da8, 1.2));

    const keyLight = new THREE.DirectionalLight(0xff335f, 4);
    keyLight.position.set(2, 3, 4);
    this.scene.add(keyLight);

    this.frameId = null;
    this.previousTime = 0;
    this.resize = this.resize.bind(this);
    this.renderFrame = this.renderFrame.bind(this);
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
    this.frameId = requestAnimationFrame(this.renderFrame);
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    this.placeholder.geometry.dispose();
    this.placeholder.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

