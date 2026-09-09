const high = Object.freeze({
  name: 'high',
  petalCount: 6_000,
  dprCap: 1.75,
  bloomScale: 1,
  bloomIntensity: 1,
  foregroundRatio: 0.1,
  flutterEnabled: true,
});

const medium = Object.freeze({
  name: 'medium',
  petalCount: 3_200,
  dprCap: 1.5,
  bloomScale: 0.75,
  bloomIntensity: 0.78,
  foregroundRatio: 0.08,
  flutterEnabled: true,
});

const low = Object.freeze({
  name: 'low',
  petalCount: 1_800,
  dprCap: 1.1,
  bloomScale: 0.5,
  bloomIntensity: 0.5,
  foregroundRatio: 0.05,
  flutterEnabled: false,
});

export const QUALITY_PROFILES = Object.freeze({ high, medium, low });

export function readBrowserCapabilities(windowTarget, navigatorTarget) {
  const userAgent = navigatorTarget?.userAgent ?? '';
  return {
    viewportWidth: windowTarget?.innerWidth ?? 1_024,
    viewportHeight: windowTarget?.innerHeight ?? 768,
    dpr: windowTarget?.devicePixelRatio ?? 1,
    hardwareConcurrency: navigatorTarget?.hardwareConcurrency,
    deviceMemory: navigatorTarget?.deviceMemory,
    isMobile: /Android|iPhone|iPad|Mobile/i.test(userAgent),
  };
}

export class QualityManager {
  #profile = null;

  get profile() {
    return this.#profile;
  }

  detect(capabilities = {}) {
    if (this.#profile) {
      return this.#profile;
    }

    const width = capabilities.viewportWidth ?? 1_024;
    const height = capabilities.viewportHeight ?? 768;
    const dpr = capabilities.dpr ?? 1;
    const hardwareConcurrency = capabilities.hardwareConcurrency;
    const deviceMemory = capabilities.deviceMemory;
    let score = 0;

    if (Math.min(width, height) <= 600) {
      score -= 2;
    } else if (width * height >= 1_920 * 900) {
      score += 1;
    }

    if (typeof hardwareConcurrency === 'number') {
      if (hardwareConcurrency <= 4) score -= 1;
      if (hardwareConcurrency >= 8) score += 1;
    }

    if (typeof deviceMemory === 'number') {
      if (deviceMemory <= 4) score -= 1;
      if (deviceMemory >= 8) score += 1;
    }

    if (dpr >= 3) {
      score -= 1;
    }
    if (capabilities.isMobile === true) {
      score -= 1;
    }

    this.#profile =
      score <= -2
        ? QUALITY_PROFILES.low
        : score >= 2
          ? QUALITY_PROFILES.high
          : QUALITY_PROFILES.medium;
    return this.#profile;
  }

  getCappedDpr(devicePixelRatio) {
    const profile = this.#profile ?? QUALITY_PROFILES.medium;
    return Math.min(Math.max(1, devicePixelRatio || 1), profile.dprCap);
  }
}

