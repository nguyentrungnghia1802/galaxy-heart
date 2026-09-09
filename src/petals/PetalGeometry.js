import * as THREE from 'three';

export function createPetalGeometry() {
  const geometry = new THREE.BufferGeometry();

  // 10 vertices forming an organic, cupped 3D rose petal
  // Base at (0, 0, 0), widening outward with gentle z-curvature
  const positions = [
    0, 0, 0, // 0: base stem
    -0.14, 0.18, 0.025, // 1: lower left
    0, 0.2, 0.05, // 2: lower center ridge
    0.14, 0.18, 0.025, // 3: lower right
    -0.22, 0.42, 0.015, // 4: mid left wing
    0, 0.45, 0.07, // 5: mid center crown
    0.22, 0.42, 0.015, // 6: mid right wing
    -0.14, 0.62, 0.02, // 7: upper left rim
    0, 0.66, 0.045, // 8: upper top tip
    0.14, 0.62, 0.02, // 9: upper right rim
  ];

  // Normalized UV coordinates mapping neatly to petal texture
  const uvs = [
    0.5, 0.0,
    0.2, 0.27,
    0.5, 0.3,
    0.8, 0.27,
    0.02, 0.64,
    0.5, 0.68,
    0.98, 0.64,
    0.2, 0.94,
    0.5, 1.0,
    0.8, 0.94,
  ];

  const indices = [
    0, 3, 2,  0, 2, 1,
    1, 2, 5,  1, 5, 4,
    2, 3, 6,  2, 6, 5,
    4, 5, 8,  4, 8, 7,
    5, 6, 9,  5, 9, 8,
  ];

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

