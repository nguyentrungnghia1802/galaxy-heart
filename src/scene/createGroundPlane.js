import * as THREE from 'three';

export function createGroundPlane(scene) {
  const geometry = new THREE.PlaneGeometry(16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0x080104,
    roughness: 0.38,
    metalness: 0.65,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'GroundReflectivePlane';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1.55;

  scene.add(mesh);
  return mesh;
}
