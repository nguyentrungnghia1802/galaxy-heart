import * as THREE from 'three';

export function createPetalGeometry() {
  const geometry = new THREE.BufferGeometry();

  // 12 vertices forming an organic, cupped 3D English rose petal with dual-lobed crest
  const positions = [
    0, 0, 0, // 0: base stem
    -0.16, 0.18, 0.03, // 1: lower left wing
    0, 0.2, 0.065, // 2: lower center ridge
    0.16, 0.18, 0.03, // 3: lower right wing
    -0.26, 0.44, 0.015, // 4: mid left flare
    0, 0.46, 0.095, // 5: mid center crown
    0.26, 0.44, 0.015, // 6: mid right flare
    -0.22, 0.66, 0.025, // 7: upper left shoulder
    -0.08, 0.72, 0.06, // 8: left upper lobe crest
    0, 0.68, 0.05, // 9: central notched crest
    0.08, 0.72, 0.06, // 10: right upper lobe crest
    0.22, 0.66, 0.025, // 11: upper right shoulder
  ];

  // Normalized UV coordinates mapping to petal texture
  const uvs = [
    0.5, 0.0,
    0.2, 0.25,
    0.5, 0.28,
    0.8, 0.25,
    0.02, 0.6,
    0.5, 0.64,
    0.98, 0.6,
    0.12, 0.88,
    0.35, 0.98,
    0.5, 0.92,
    0.65, 0.98,
    0.88, 0.88,
  ];

  const indices = [
    0, 3, 2,  0, 2, 1,
    1, 2, 5,  1, 5, 4,
    2, 3, 6,  2, 6, 5,
    4, 5, 8,  4, 8, 7,
    5, 9, 8,  5, 10, 9,
    5, 6, 11, 5, 11, 10,
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


