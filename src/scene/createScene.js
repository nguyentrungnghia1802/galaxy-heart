import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080104);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 0.08, 5);

  const ambientLight = new THREE.AmbientLight(0x5d142c, 1.15);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xff315f, 3.2);
  keyLight.position.set(2.4, 3.2, 4.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xff6b92, 1.5);
  rimLight.position.set(-3, 1.5, -3);
  scene.add(rimLight);

  return { scene, camera, ambientLight, keyLight, rimLight };
}

