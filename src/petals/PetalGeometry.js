import * as THREE from 'three';

export function createPetalGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -0.13, 0, 0,
        0.13, 0, 0,
        -0.1, 0.24, 0.025,
        0.1, 0.24, 0.025,
        0, 0.5, -0.02,
      ],
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

