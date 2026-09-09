import * as THREE from 'three';

import { createGroundPlane } from './createGroundPlane.js';
import { LightingSystem } from './LightingSystem.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060103);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0.08, 5.0);

  const lightingSystem = new LightingSystem(scene);
  const groundPlane = createGroundPlane(scene);

  return {
    scene,
    camera,
    lightingSystem,
    groundPlane,
    keyLight: lightingSystem.keyLight,
    ambientLight: lightingSystem.ambientLight,
    rimLight: lightingSystem.rimLight,
    innerLight: lightingSystem.innerLight,
    groundLight: lightingSystem.groundLight,
  };
}

