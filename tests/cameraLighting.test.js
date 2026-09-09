import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { CameraSystem } from '../src/scene/CameraSystem.js';
import { LightingSystem } from '../src/scene/LightingSystem.js';

describe('CameraSystem', () => {
  it('initializes at base position and updates pointer parallax smoothly', () => {
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    const system = new CameraSystem(camera);

    expect(camera.position.z).toBeCloseTo(5.0);
    expect(system.aspect).toBe(1);

    system.onPointer(0.5, -0.5);
    system.update(0.016, { state: 'HEARTBEAT' });

    // After pointer moved right and up, camera smoothly lerps toward parallax target
    expect(camera.position.x).toBeGreaterThan(0);
    expect(camera.position.y).toBeGreaterThan(system.basePosition.y);

    system.reset();
    expect(camera.position.x).toBeCloseTo(system.basePosition.x);
    expect(camera.position.y).toBeCloseTo(system.basePosition.y);
    expect(camera.position.z).toBeCloseTo(system.basePosition.z);
  });

  it('adjusts base distance on portrait resize to keep heart in safe view', () => {
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    const system = new CameraSystem(camera);

    system.resize(400, 800); // aspect 0.5 (portrait)
    expect(camera.aspect).toBe(0.5);
    expect(system.basePosition.z).toBeGreaterThan(5.0);

    system.resize(1920, 1080); // aspect > 1.0 (landscape)
    expect(camera.aspect).toBeCloseTo(1920 / 1080);
    expect(system.basePosition.z).toBe(5.0);
  });

  it('dollies in during TENSION state', () => {
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    const system = new CameraSystem(camera);

    system.update(0.016, { state: 'TENSION', progress: 0.8 });
    expect(system.dollyOffsetZ).toBeLessThan(0);
  });
});

describe('LightingSystem', () => {
  it('creates lights and modulates inner core glow with heartbeat intensity', () => {
    const scene = new THREE.Scene();
    const system = new LightingSystem(scene);

    expect(system.innerLight).toBeInstanceOf(THREE.PointLight);
    expect(system.keyLight).toBeInstanceOf(THREE.DirectionalLight);
    expect(system.groundLight).toBeInstanceOf(THREE.PointLight);

    const initialInnerIntensity = system.innerLight.intensity;
    system.update(0.016, { state: 'HEARTBEAT', heartbeatIntensity: 1.5 });
    expect(system.innerLight.intensity).toBeGreaterThan(initialInnerIntensity);

    system.reset();
    expect(system.innerLight.intensity).toBeCloseTo(system.baseInnerIntensity);
    system.dispose();
  });

  it('creates a flash spike on explosion entry', () => {
    const scene = new THREE.Scene();
    const system = new LightingSystem(scene);

    system.update(0.016, { state: 'EXPLOSION', progress: 0.05 });
    expect(system.innerLight.intensity).toBeGreaterThan(system.baseInnerIntensity * 1.5);
    system.dispose();
  });
});
