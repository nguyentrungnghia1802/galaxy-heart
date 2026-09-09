import * as THREE from 'three';

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;

    // Subdued deep wine ambient light
    this.ambientLight = new THREE.AmbientLight(0x320512, 1.1);
    scene.add(this.ambientLight);

    // Key front-right directional light for petal highlights and depth
    this.keyLight = new THREE.DirectionalLight(0xff4572, 3.5);
    this.keyLight.position.set(2.6, 3.2, 4.0);
    scene.add(this.keyLight);

    // Rim/back directional light to silhouette the heart lobes and edges against the dark background
    this.rimLight = new THREE.DirectionalLight(0xff6a98, 3.0);
    this.rimLight.position.set(-2.8, 2.2, -3.2);
    scene.add(this.rimLight);

    // Fill light from lower-left to soften deep shadows and illuminate interior petals
    this.fillLight = new THREE.DirectionalLight(0xa01038, 1.6);
    this.fillLight.position.set(-2.4, -0.8, 2.6);
    scene.add(this.fillLight);

    // Inner glowing core point light at heart center (pulsates warmly from inside)
    this.innerLight = new THREE.PointLight(0xff1a4e, 4.2, 4.8, 2.0);
    this.innerLight.position.set(0, 0.05, 0);
    scene.add(this.innerLight);

    // Ground pool light casting crimson reflection under the heart tip
    this.groundLight = new THREE.PointLight(0xeb1852, 2.8, 3.8, 2.0);
    this.groundLight.position.set(0, -0.65, 0.35);
    scene.add(this.groundLight);

    this.baseAmbientIntensity = 1.1;
    this.baseKeyIntensity = 3.5;
    this.baseInnerIntensity = 4.2;
    this.baseGroundIntensity = 2.8;
    this.baseRimIntensity = 3.0;
  }

  update(dt, stateSnapshot) {
    const state = stateSnapshot?.state ?? 'BOOT';
    const intensity = Math.min(2.5, stateSnapshot?.heartbeatIntensity ?? 0);
    const progress = stateSnapshot?.progress ?? 0;

    // Heartbeat glow modulation
    const pulseFactor = intensity * 1.25;
    this.innerLight.intensity = this.baseInnerIntensity + pulseFactor * 2.4;
    this.keyLight.intensity = this.baseKeyIntensity + pulseFactor * 0.75;
    this.groundLight.intensity = this.baseGroundIntensity + pulseFactor * 1.3;
    this.rimLight.intensity = this.baseRimIntensity + pulseFactor * 0.5;

    if (state === 'TENSION') {
      // Light draws inward slightly before the release
      const tensionPull = 1 - progress * 0.2;
      this.innerLight.intensity *= tensionPull;
    } else if (state === 'EXPLOSION') {
      // Crisp initial impact flash decaying over 0.4s
      const flash = Math.max(0, 1 - progress * 2.5);
      this.innerLight.intensity += flash * 4.5;
      this.keyLight.intensity += flash * 1.8;
      this.rimLight.intensity = this.baseRimIntensity + flash * 2.2;
    } else if (state === 'PETAL_FLIGHT') {
      // Dispersed romantic ambient illumination for flying cloud
      this.ambientLight.intensity = 1.35;
      this.keyLight.intensity = this.baseKeyIntensity * 1.15;
      this.innerLight.intensity = Math.max(0.6, this.baseInnerIntensity * (1 - progress * 0.6));
    }
  }

  reset() {
    this.ambientLight.intensity = this.baseAmbientIntensity;
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
