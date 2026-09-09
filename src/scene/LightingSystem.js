import * as THREE from 'three';

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;

    // Subdued deep wine ambient light
    this.ambientLight = new THREE.AmbientLight(0x2a040f, 0.95);
    scene.add(this.ambientLight);

    // Key front-right directional light for petal highlights and depth
    this.keyLight = new THREE.DirectionalLight(0xff3d68, 2.8);
    this.keyLight.position.set(2.4, 3.2, 4.2);
    scene.add(this.keyLight);

    // Rim/back directional light to silhouette the heart lobes and edges against the dark background
    this.rimLight = new THREE.DirectionalLight(0xff5580, 2.2);
    this.rimLight.position.set(-2.8, 1.8, -3.0);
    scene.add(this.rimLight);

    // Fill light from lower-left to soften deep shadows
    this.fillLight = new THREE.DirectionalLight(0x880b2a, 1.1);
    this.fillLight.position.set(-2.2, -0.8, 2.5);
    scene.add(this.fillLight);

    // Inner glowing core point light at heart center (pulsates from inside)
    this.innerLight = new THREE.PointLight(0xff1244, 2.8, 4.2, 2.0);
    this.innerLight.position.set(0, 0.05, 0);
    scene.add(this.innerLight);

    // Ground pool light casting crimson reflection under the heart tip
    this.groundLight = new THREE.PointLight(0xd81442, 2.2, 3.5, 2.0);
    this.groundLight.position.set(0, -0.6, 0.3);
    scene.add(this.groundLight);

    this.baseKeyIntensity = 2.8;
    this.baseInnerIntensity = 2.8;
    this.baseGroundIntensity = 2.2;
    this.baseRimIntensity = 2.2;
  }

  update(dt, stateSnapshot) {
    const state = stateSnapshot?.state ?? 'BOOT';
    const intensity = Math.min(2.5, stateSnapshot?.heartbeatIntensity ?? 0);
    const progress = stateSnapshot?.progress ?? 0;

    // Heartbeat glow modulation
    const pulseFactor = intensity * 1.2;
    this.innerLight.intensity = this.baseInnerIntensity + pulseFactor * 2.0;
    this.keyLight.intensity = this.baseKeyIntensity + pulseFactor * 0.6;
    this.groundLight.intensity = this.baseGroundIntensity + pulseFactor * 1.2;

    if (state === 'TENSION') {
      // Light draws inward slightly before the release
      const tensionPull = 1 - progress * 0.2;
      this.innerLight.intensity *= tensionPull;
    } else if (state === 'EXPLOSION') {
      // Crisp initial impact flash decaying over 0.4s
      const flash = Math.max(0, 1 - progress * 2.5);
      this.innerLight.intensity += flash * 4.0;
      this.keyLight.intensity += flash * 1.5;
      this.rimLight.intensity = this.baseRimIntensity + flash * 2.0;
    } else if (state === 'PETAL_FLIGHT') {
      // Dispersed romantic ambient illumination for flying cloud
      this.ambientLight.intensity = 1.2;
      this.keyLight.intensity = this.baseKeyIntensity * 1.1;
      this.innerLight.intensity = Math.max(0.5, this.baseInnerIntensity * (1 - progress * 0.6));
    }
  }

  reset() {
    this.ambientLight.intensity = 0.95;
    this.keyLight.intensity = this.baseKeyIntensity;
    this.innerLight.intensity = this.baseInnerIntensity;
    this.rimLight.intensity = this.baseRimIntensity;
    this.groundLight.intensity = this.baseGroundIntensity;
  }

  dispose() {
    this.ambientLight.removeFromParent();
    this.keyLight.removeFromParent();
    this.rimLight.removeFromParent();
    this.fillLight.removeFromParent();
    this.innerLight.removeFromParent();
    this.groundLight.removeFromParent();
  }
}
