// All caption times are absolute seconds in the music file (audio.currentTime).
// No music or captions are shipped until the real track and lyrics are supplied.
export const MUSIC_REVEAL_CONFIG = Object.freeze({
  music: Object.freeze({ src: '', startTime: 0, endTime: null, volume: 0.7 }),
  captions: Object.freeze([]),
  captionFade: 0.6,
  activation: Object.freeze({ duration: 1.2, pulseFraction: 0.22, pulseScale: 0.035 }),
  gemHint: Object.freeze({ delay: 3 }),
});
