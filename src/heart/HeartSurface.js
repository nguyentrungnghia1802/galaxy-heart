import { createSeededRandom } from '../utils/random.js';

const TAU = Math.PI * 2;
const OUTLINE_X_SCALE = 0.094;
const OUTLINE_Y_SCALE = 0.105;
const OUTLINE_Y_OFFSET = 0.25;
const SURFACE_CENTER_Y = 0.05;
const HEART_DEPTH = 0.78;
const ARC_TABLE_SIZE = 2_048;
const COLOR_VARIANT_COUNT = 6;

function sampleOutline(angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const sin2 = Math.sin(angle * 2);
  const sin3 = Math.sin(angle * 3);
  const sin4 = Math.sin(angle * 4);

  return {
    x: 16 * sin * sin * sin * OUTLINE_X_SCALE,
    y:
      (13 * cos -
        5 * Math.cos(angle * 2) -
        2 * Math.cos(angle * 3) -
        Math.cos(angle * 4)) *
        OUTLINE_Y_SCALE +
      OUTLINE_Y_OFFSET,
    dx: 48 * sin * sin * cos * OUTLINE_X_SCALE,
    dy:
      (-13 * sin + 10 * sin2 + 6 * sin3 + 4 * sin4) *
      OUTLINE_Y_SCALE,
  };
}

function createArcLengthTable() {
  const angles = new Float64Array(ARC_TABLE_SIZE + 1);
  const lengths = new Float64Array(ARC_TABLE_SIZE + 1);
  let previous = sampleOutline(0);
  let totalLength = 0;

  for (let index = 1; index <= ARC_TABLE_SIZE; index += 1) {
    const angle = (index / ARC_TABLE_SIZE) * TAU;
    const current = sampleOutline(angle);
    totalLength += Math.hypot(current.x - previous.x, current.y - previous.y);
    angles[index] = angle;
    lengths[index] = totalLength;
    previous = current;
  }

  return { angles, lengths, totalLength };
}

const ARC_LENGTH_TABLE = createArcLengthTable();

function angleAtArcFraction(fraction) {
  const target = fraction * ARC_LENGTH_TABLE.totalLength;
  let low = 0;
  let high = ARC_TABLE_SIZE;

  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (ARC_LENGTH_TABLE.lengths[middle] < target) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const startLength = ARC_LENGTH_TABLE.lengths[low];
  const endLength = ARC_LENGTH_TABLE.lengths[high];
  const segmentProgress =
    endLength === startLength
      ? 0
      : (target - startLength) / (endLength - startLength);

  return (
    ARC_LENGTH_TABLE.angles[low] +
    (ARC_LENGTH_TABLE.angles[high] - ARC_LENGTH_TABLE.angles[low]) *
      segmentProgress
  );
}

function createSurfaceSample(angle, latitudeSin, radiusFactor = 1.0) {
  const outline = sampleOutline(angle);
  const latitudeCos = Math.sqrt(Math.max(0, 1 - latitudeSin * latitudeSin));
  const centeredY = outline.y - SURFACE_CENTER_Y;

  const position = {
    x: outline.x * latitudeCos * radiusFactor,
    y: SURFACE_CENTER_Y + centeredY * latitudeCos * radiusFactor,
    z: HEART_DEPTH * latitudeSin * radiusFactor,
  };

  const duX = outline.dx * latitudeCos;
  const duY = outline.dy * latitudeCos;
  const dvX = -outline.x * latitudeSin;
  const dvY = -centeredY * latitudeSin;
  const dvZ = HEART_DEPTH * latitudeCos;

  let nx = -dvZ * duY;
  let ny = dvZ * duX;
  let nz = dvX * duY - dvY * duX;
  const normalLength = Math.hypot(nx, ny, nz);

  if (normalLength < 1e-9) {
    nx = 0;
    ny = 0;
    nz = latitudeSin < 0 ? -1 : 1;
  } else {
    nx /= normalLength;
    ny /= normalLength;
    nz /= normalLength;
  }

  return { position, normal: { x: nx, y: ny, z: nz } };
}

export function createHeartAnchors({ count, seed }) {
  const anchorCount = Math.max(0, Math.floor(count));
  if (anchorCount === 0) {
    return [];
  }

  const random = createSeededRandom(seed);
  const anchors = new Array(anchorCount);

  // Reserve ~8% for ambient floating petals when scene count is large (count >= 50)
  const isLargeScene = anchorCount >= 50;
  const ambientCount = isLargeScene ? Math.floor(anchorCount * 0.08) : 0;
  const heartCount = anchorCount - ambientCount;

  const shellCount = Math.floor(heartCount * 0.45);
  const canopyCount = Math.floor(heartCount * 0.4);
  const coreStart = shellCount + canopyCount;

  for (let index = 0; index < heartCount; index += 1) {
    let localIndex;
    let localCount;
    let layer;

    if (index < shellCount) {
      localIndex = index;
      localCount = shellCount;
      layer = 'shell';
    } else if (index < coreStart) {
      localIndex = index - shellCount;
      localCount = canopyCount;
      layer = 'canopy';
    } else {
      localIndex = index - coreStart;
      localCount = heartCount - coreStart;
      layer = 'core';
    }

    const longitudeStrata = Math.ceil(Math.sqrt(localCount * 2));
    const latitudeStrata = Math.ceil(localCount / longitudeStrata);
    const longitudeCell = localIndex % longitudeStrata;
    const latitudeCell = Math.floor(localIndex / longitudeStrata);
    const longitudeFraction =
      (longitudeCell + random()) / longitudeStrata;
    const latitudeFraction = (latitudeCell + random()) / latitudeStrata;
    const angle = angleAtArcFraction(longitudeFraction);
    let radiusFactor;
    let sample;

    if (layer === 'shell') {
      const latitudeSin = latitudeFraction * 2 - 1;
      radiusFactor = 0.95 + random() * 0.07;
      sample = createSurfaceSample(angle, latitudeSin, radiusFactor);
    } else {
      const maxRadius = layer === 'canopy' ? 0.94 : 0.78;
      const minRadius = layer === 'canopy' ? 0.08 : 0.04;
      radiusFactor =
        minRadius +
        Math.pow(latitudeFraction, 0.68) * (maxRadius - minRadius);
      const frontDepth = Math.sqrt(
        Math.max(0, 1 - radiusFactor * radiusFactor),
      );
      sample = createSurfaceSample(angle, frontDepth, 1);

      if (layer === 'canopy') {
        sample.position.z *= 0.76 + random() * 0.24;
      } else {
        const coreDepth = sample.position.z * (0.25 + random() * 0.5);
        sample.position.z = (random() * 2 - 1) * coreDepth;
      }
    }

    if (layer !== 'shell') {
      const outline = sampleOutline(angle);
      const centeredY = outline.y - SURFACE_CENTER_Y;
      sample.position.x = outline.x * radiusFactor;
      sample.position.y =
        SURFACE_CENTER_Y + centeredY * radiusFactor;
    }

    anchors[index] = {
      position: sample.position,
      normal: sample.normal,
      baseRotation: random() * TAU,
      baseScale: 0.75 + random() * 0.5,
      colorVariant: Math.floor(random() * COLOR_VARIANT_COUNT),
      noiseSeed: random(),
      isAmbient: false,
      radiusFactor,
      layer,
    };
  }

  // 3-Tier Art-Directed Ambient Floating Petals:
  // Tier A (Halo ~50%): drift closely around the heart silhouette
  // Tier B (Midground ~35%): spatial drift creating volume and atmosphere
  // Tier C (Foreground ~15%): large cinematic petals near camera lens
  for (let i = 0; i < ambientCount; i += 1) {
    const index = heartCount + i;
    const tierRoll = random();
    let ambientDist;
    let posZ;
    let isForeground = false;
    let ambientTier;
    let bokehScale = 1.0;

    if (tierRoll < 0.50) {
      // Tier A: Heart Halo
      ambientTier = 'halo';
      ambientDist = 1.05 + random() * 0.25;
      posZ = (random() - 0.5) * 0.8;
    } else if (tierRoll < 0.85) {
      // Tier B: Midground
      ambientTier = 'midground';
      ambientDist = 1.30 + random() * 0.90;
      posZ = (random() - 0.5) * 2.2;
    } else {
      // Tier C: Foreground Bokeh
      ambientTier = 'foreground';
      isForeground = true;
      ambientDist = 0.65 + random() * 1.55;
      posZ = 1.8 + random() * 1.8; // Z in [1.8, 3.6] towards camera at 5.0
      bokehScale = 1.6 + random() * 1.0;
    }

    const ambientAngle = random() * TAU;
    const ambientOutline = sampleOutline(ambientAngle);
    const posX = ambientOutline.x * ambientDist * (0.85 + random() * 0.3);
    const posY =
      (ambientOutline.y - SURFACE_CENTER_Y) * ambientDist +
      SURFACE_CENTER_Y +
      (random() - 0.5) * 0.35;

    const normLen = Math.hypot(posX, posY, posZ) || 1;
    anchors[index] = {
      position: { x: posX, y: posY, z: posZ },
      normal: { x: posX / normLen, y: posY / normLen, z: posZ / normLen },
      baseRotation: random() * TAU,
      baseScale: 0.75 + random() * 0.5,
      colorVariant: Math.floor(random() * COLOR_VARIANT_COUNT),
      noiseSeed: random(),
      isAmbient: true,
      ambientTier,
      ambientSpeed: 0.45 + random() * 0.75,
      ambientPhase: random() * TAU,
      ambientRadius: ambientTier === 'halo' ? 0.05 + random() * 0.08 : 0.08 + random() * 0.16,
      isForeground,
      bokehScale,
    };
  }

  return anchors;
}

export function createHeartDebugPositions(anchors) {
  const positions = new Float32Array(anchors.length * 3);

  for (let index = 0; index < anchors.length; index += 1) {
    const offset = index * 3;
    const position = anchors[index].position;
    positions[offset] = position.x;
    positions[offset + 1] = position.y;
    positions[offset + 2] = position.z;
  }

  return positions;
}
