import {
  CAPTION_TIMELINE,
  CAPTION_ANIMATION,
  WORD_TIMELINE,
  WORD_ANIMATION,
} from './musicCaptions.js';

const MUSIC_SRC = `${import.meta.env.BASE_URL}assets/audio/heart.mp3`;

export const MUSIC_REVEAL_CONFIG = Object.freeze({
  music: Object.freeze({ src: MUSIC_SRC, startTime: 0, endTime: 24.25, volume: 0.49 }),
  captions: CAPTION_TIMELINE,
  captionAnimation: CAPTION_ANIMATION,
  words: WORD_TIMELINE,
  wordAnimation: WORD_ANIMATION,
  activation: Object.freeze({ duration: 0.8, pulseFraction: 0.22, pulseScale: 0.035 }),
  gemHint: Object.freeze({ delay: 3 }),
  ending: Object.freeze({
    fadeDuration: 3.65,
    captionEnd: 23.95,
    musicEnd: 24.25,
  }),
});
