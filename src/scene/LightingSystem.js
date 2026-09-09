import * as THREE from 'three';

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;

    // Subdued deep wine ambient light to keep shadowed crevices from clipping pure black
    this.ambientLight = new THREE.AmbientLight(0x3a0615, 1.25);
    scene.add(this.ambientLight);

    // Frontal key light for radiant petal highlights, surface textures and pink accents
    this.keyLight = new THREE.DirectionalLight(0xff4068, 3.8);
    this.keyLight.position.set(1.6, 2.0, 4.4);
    scene.add(this.keyLight);

    // Left-upper rim light to silhouette the left lobe against the dark backdrop
    this.rimLight = new THREE.DirectionalLight(0xff6a94, 3.2);
    this.rimLight.position.set(-2.2, 2.6, -2.8);
    scene.add(this.rimLight);

    // Right-upper rim light to sculpt the right lobe with matching luminous rim
    this.rimLightRight = new THREE.DirectionalLight(0xff5880, 2.8);
    this.rimLightRight.position.set(2.2, 2.6, -2.8);
    scene.add(this.rimLightRight);

    // Warm fill light from lower-left to soften deep shadows and illuminate interior petals
    this.fillLight = new THREE.DirectionalLight(0xc01844, 2.2);
    this.fillLight.position.set(-2.0, -0.6, 3.0);
    scene.add(this.fillLight);

    // Inner glowing core point light at heart center (pulsates warmly from inside crevices)
    this.innerLight = new THREE.PointLight(0xff1240, 4.8, 5.2, 2.0);
    this.innerLight.position.set(0, -0.1, 0.05);
    scene.add(this.innerLight);

    // Ground pool light casting radiant crimson illumination directly under the heart tip
    this.groundLight = new THREE.PointLight(0xff1646, 3.2, 3.8, 2.0);
    this.groundLight.position.set(0, -1.15, 0.35);
    scene.add(this.groundLight);

    // Top lobe light to illuminate the upper crown and highlight individual lobe petals
    this.lobeLight = new THREE.DirectionalLight(0xff5580, 2.5);
    this.lobeLight.position.set(0, 3.8, 3.2);
    scene.add(this.lobeLight);

    this.baseAmbientIntensity = 1.25;
    this.baseKeyIntensity = 3.8;
    this.baseInnerIntensity = 4.8;
    this.baseGroundIntensity = 3.2;
    this.baseRimIntensity = 3.2;
    this.baseRimRightIntensity = 2.8;
    this.baseLobeIntensity = 2.5;
  }

  update(dt, stateSnapshot) {
    const state = stateSnapshot?.state ?? 'BOOT';
    const intensity = Math.min(2.5, stateSnapshot?.heartbeatIntensity ?? 0);
    const progress = stateSnapshot?.progress ?? 0;

    // Heartbeat glow modulation
    const pulseFactor = intensity * 1.25;
    this.innerLight.intensity = this.baseInnerIntensity + pulseFactor * 2.6;
    this.keyLight.intensity = this.baseKeyIntensity + pulseFactor * 0.8;
    this.groundLight.intensity = this.baseGroundIntensity + pulseFactor * 1.4;
    this.rimLight.intensity = this.baseRimIntensity + pulseFactor * 0.5;
    this.rimLightRight.intensity = this.baseRimRightIntensity + pulseFactor * 0.5;
    this.lobeLight.intensity = this.baseLobeIntensity + pulseFactor * 0.6;

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
      this.rimLightRight.intensity = this.baseRimRightIntensity + flash * 2.2;
      this.lobeLight.intensity = this.baseLobeIntensity + flash * 2.0;
    } else if (state === 'PETAL_FLIGHT') {
      // Dispersed romantic ambient illumination for flying cloud
      this.ambientLight.intensity = 1.45;
      this.keyLight.intensity = this.baseKeyIntensity * 1.15;
      this.innerLight.intensity = Math.max(0.6, this.baseInnerIntensity * (1 - progress * 0.6));
    }
  }

  reset() {
    this.ambientLight.intensity = this.baseAmbientIntensity;
    this.keyLight.intensity = this.baseKeyIntensity;
    this.innerLight.intensity = this.baseInnerIntensity;
    this.rimLight.intensity = this.baseRimIntensity;
    this.rimLightRight.intensity = this.baseRimRightIntensity;
    this.lobeLight.intensity = this.baseLobeIntensity;
    this.groundLight.intensity = this.baseGroundIntensity;
  }

  dispose() {
    this.ambientLight.removeFromParent();
    this.keyLight.removeFromParent();
    this.rimLight.removeFromParent();
    this.rimLightRight.removeFromParent();
    this.fillLight.removeFromParent();
    this.lobeLight.removeFromParent();
    this.innerLight.removeFromParent();
    this.groundLight.removeFromParent();
  }
}

