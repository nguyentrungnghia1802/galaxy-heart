import { createSeededRandom } from '../utils/random.js';

const TAU = Math.PI * 2;
const OUTLINE_SCALE = 0.1;
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
    x: 16 * sin * sin * sin * OUTLINE_SCALE,
    y:
      (13 * cos -
        5 * Math.cos(angle * 2) -
        2 * Math.cos(angle * 3) -
        Math.cos(angle * 4)) *
        OUTLINE_SCALE +
      OUTLINE_Y_OFFSET,
    dx: 48 * sin * sin * cos * OUTLINE_SCALE,
    dy: (-13 * sin + 10 * sin2 + 6 * sin3 + 4 * sin4) * OUTLINE_SCALE,
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

  // Reserve ~6.5% for ambient floating petals only when scene count is large (count >= 50)
  const isLargeScene = anchorCount >= 50;
  const ambientCount = isLargeScene ? Math.floor(anchorCount * 0.065) : 0;
  const heartCount = anchorCount - ambientCount;

  const longitudeStrata = Math.ceil(Math.sqrt(heartCount * 2));
  const latitudeStrata = Math.ceil(heartCount / longitudeStrata);

  for (let index = 0; index < heartCount; index += 1) {
    const longitudeCell = index % longitudeStrata;
    const latitudeCell = Math.floor(index / longitudeStrata);
    const longitudeFraction =
      (longitudeCell + random()) / longitudeStrata;
    const latitudeFraction = (latitudeCell + random()) / latitudeStrata;
    const angle = angleAtArcFraction(longitudeFraction);
    const latitudeSin = latitudeFraction * 2 - 1;

    // Volumetric layering:
    // ~55% outer shell (radius 0.92..1.02) to form crisp, dense heart silhouette
    // ~30% middle mantle (radius 0.65..0.92) for plush overlapping floral body
    // ~15% inner core (radius 0.28..0.65) to eliminate any hollow interior void
    const layerRoll = random();
    let radiusFactor = 1.0;
    if (layerRoll < 0.15) {
      radiusFactor = 0.28 + random() * 0.35;
    } else if (layerRoll < 0.45) {
      radiusFactor = 0.65 + random() * 0.27;
    } else {
      radiusFactor = 0.92 + random() * 0.10;
    }

    const sample = createSurfaceSample(angle, latitudeSin, radiusFactor);

    anchors[index] = {
      position: sample.position,
      normal: sample.normal,
      baseRotation: random() * TAU,
      baseScale: 0.75 + random() * 0.5,
      colorVariant: Math.floor(random() * COLOR_VARIANT_COUNT),
      noiseSeed: random(),
      isAmbient: false,
      radiusFactor,
    };
  }

  // Ambient floating petals distributed around the heart and in foreground
  for (let i = 0; i < ambientCount; i += 1) {
    const index = heartCount + i;
    const ambientAngle = random() * TAU;
    const ambientOutline = sampleOutline(ambientAngle);
    const ambientDist = 1.25 + random() * 0.95;
    const isForeground = random() < 0.22;

    const posX = ambientOutline.x * ambientDist * (0.85 + random() * 0.3);
    const posY =
      (ambientOutline.y - SURFACE_CENTER_Y) * ambientDist +
      SURFACE_CENTER_Y +
      (random() - 0.5) * 0.4;
    const posZ = isForeground
      ? 1.2 + random() * 1.8 // foreground petals close to lens
      : (random() - 0.5) * 1.6; // mid-depth floating petals

    const normLen = Math.hypot(posX, posY, posZ) || 1;
    anchors[index] = {
      position: { x: posX, y: posY, z: posZ },
      normal: { x: posX / normLen, y: posY / normLen, z: posZ / normLen },
      baseRotation: random() * TAU,
      baseScale: 0.75 + random() * 0.5,
      colorVariant: Math.floor(random() * COLOR_VARIANT_COUNT),
      noiseSeed: random(),
      isAmbient: true,
      ambientSpeed: 0.6 + random() * 0.8,
      ambientPhase: random() * TAU,
      ambientRadius: 0.08 + random() * 0.15,
      isForeground,
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

