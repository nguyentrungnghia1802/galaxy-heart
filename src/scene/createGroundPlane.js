import * as THREE from 'three';

function createGroundAlphaMap() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  const gradient = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  );
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.65)');
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.20)');
  gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.02)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createGroundCrimsonPoolTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  const gradient = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  );
  gradient.addColorStop(0.0, 'rgba(255, 45, 85, 0.90)');
  gradient.addColorStop(0.12, 'rgba(235, 20, 65, 0.70)');
  gradient.addColorStop(0.30, 'rgba(180, 10, 45, 0.35)');
  gradient.addColorStop(0.55, 'rgba(110, 5, 25, 0.12)');
  gradient.addColorStop(0.80, 'rgba(40, 2, 10, 0.03)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createGroundPlane(scene) {
  const group = new THREE.Group();
  group.name = 'GroundReflectivePlane';

  const hasDoc =
    typeof document !== 'undefined' && typeof document.createElement === 'function';

  // Luminous concentrated crimson pool directly under the heart tip (matches reference image exactly)
  // Radius 2.8 with soft quadratic radial falloff smoothly fading to 0 opacity
  const glowGeometry = new THREE.CircleGeometry(2.8, 64);
  const glowMaterial = new THREE.MeshBasicMaterial({
    map: hasDoc ? createGroundCrimsonPoolTexture() : null,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.rotation.x = -Math.PI / 2;
  glowMesh.position.set(0, -1.58, 0.2);
  group.add(glowMesh);

  scene.add(group);
  return group;
}



