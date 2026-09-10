import fs from 'node:fs';
import path from 'node:path';

function createWavBuffer(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
    buffer.writeInt16LE(intVal, 44 + i * bytesPerSample);
  }

  return buffer;
}

function synthesizeHeartbeat({
  sampleRate = 44100,
  duration = 0.22,
  startFreq = 102,
  endFreq = 56,
  attackTime = 0.018,
  decayTau = 0.082,
  bodyRatio = 0.52,
  thirdHarmonicRatio = 0.22,
  subBassRatio = 0.35,
  peakTarget = 0.933, // -0.6 dBFS
}) {
  const totalSamples = Math.floor(sampleRate * duration);
  const raw = new Float32Array(totalSamples);
  let phaseAcc = 0;

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const progress = t / duration;

    // Physiological pitch glide
    const freq = startFreq + (endFreq - startFreq) * Math.pow(progress, 0.65);
    phaseAcc += (2 * Math.PI * freq) / sampleRate;

    // Natural multi-harmonic thoracic acoustics
    const fundamental = Math.sin(phaseAcc);
    const harmonic2 = Math.sin(phaseAcc * 2.0 + 0.25) * bodyRatio;
    const harmonic3 = Math.sin(phaseAcc * 3.0 + 0.50) * thirdHarmonicRatio;
    const subBass = Math.sin(phaseAcc * 0.5 + 0.1) * subBassRatio * (1 - progress);

    const wave = fundamental + harmonic2 + harmonic3 + subBass;

    // Smooth envelope: sinusoidal attack + biological exponential decay
    let env = 0;
    if (t < attackTime) {
      env = Math.sin((Math.PI * 0.5) * (t / attackTime));
    } else {
      env = Math.exp(-(t - attackTime) / decayTau);
    }

    // Cosine taper at the tail (zero DC offset, zero clicks)
    const tailSamples = Math.floor(sampleRate * 0.025);
    if (i > totalSamples - tailSamples) {
      const tailP = (totalSamples - i) / tailSamples;
      env *= 0.5 * (1 - Math.cos(Math.PI * tailP));
    }

    raw[i] = wave * env;
  }

  // Master and normalize to target peak
  let maxAbs = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const a = Math.abs(raw[i]);
    if (a > maxAbs) maxAbs = a;
  }

  const normalized = new Float32Array(totalSamples);
  let sumSq = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    normalized[i] = (raw[i] / maxAbs) * peakTarget;
    sumSq += normalized[i] * normalized[i];
  }

  const rms = Math.sqrt(sumSq / totalSamples);
  return { samples: normalized, duration, peak: peakTarget, rms };
}

const outDir = path.resolve('public/assets/audio');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Primary Heartbeat (Lub - S1)
const lubData = synthesizeHeartbeat({
  duration: 0.22,
  startFreq: 102,
  endFreq: 56,
  attackTime: 0.018,
  decayTau: 0.082,
  bodyRatio: 0.52,
  thirdHarmonicRatio: 0.22,
  subBassRatio: 0.35,
  peakTarget: 0.933,
});
fs.writeFileSync(path.join(outDir, 'heartbeat-lub.wav'), createWavBuffer(lubData.samples));
console.log('Generated heartbeat-lub.wav:', { duration: lubData.duration, peak: lubData.peak, rms: lubData.rms.toFixed(4) });

// 2. Secondary Heartbeat (Dub - S2)
const dubData = synthesizeHeartbeat({
  duration: 0.23,
  startFreq: 128,
  endFreq: 72,
  attackTime: 0.015,
  decayTau: 0.062,
  bodyRatio: 0.45,
  thirdHarmonicRatio: 0.18,
  subBassRatio: 0.25,
  peakTarget: 0.933,
});
fs.writeFileSync(path.join(outDir, 'heartbeat-dub.wav'), createWavBuffer(dubData.samples));
console.log('Generated heartbeat-dub.wav:', { duration: dubData.duration, peak: dubData.peak, rms: dubData.rms.toFixed(4) });

// 3. Final Strong Heartbeat (Diastolic climax right before explosion)
const finalData = synthesizeHeartbeat({
  duration: 0.32,
  startFreq: 94,
  endFreq: 48,
  attackTime: 0.022,
  decayTau: 0.105,
  bodyRatio: 0.58,
  thirdHarmonicRatio: 0.26,
  subBassRatio: 0.40,
  peakTarget: 0.933,
});
fs.writeFileSync(path.join(outDir, 'heartbeat-final.wav'), createWavBuffer(finalData.samples));
console.log('Generated heartbeat-final.wav:', { duration: finalData.duration, peak: finalData.peak, rms: finalData.rms.toFixed(4) });
