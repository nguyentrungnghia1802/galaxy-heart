// Centralized Phrase-Level Music Captions Timeline
// Audio starts at 0.00s. All times are absolute audio.currentTime seconds.
// You can freely edit `time` or `hold` values below to fine-tune vocal synchronization.

export const CAPTION_TIMELINE = [
  // ==========================================
  // SECTION 1 (0.00s – 5.14s)
  // ==========================================
  { time: 0.00, text: 'My baby', section: 1 },
  { time: 1.20, text: 'I love you so much', section: 1 },
  { time: 3.10, text: 'Forever', section: 1, hold: 0.70 },
  { time: 4.20, text: 'you and I', section: 1 },

  // ==========================================
  // SECTION 2 (~5.14s – 11.94s)
  // ==========================================
  { time: 5.14, text: 'I love you', section: 2 },
  { time: 6.20, text: 'oh~', section: 2, hold: 0.85 },
  { time: 7.50, text: 'I love you so much', section: 2 },
  { time: 9.90, text: 'Forever', section: 2, hold: 0.85 },
  { time: 11.20, text: 'you and I', section: 2 },

  // ==========================================
  // SECTION 3 (~11.94s – 17.10s)
  // ==========================================
  { time: 11.94, text: 'My baby', section: 3 },
  { time: 13.05, text: 'I love you so much', section: 3 },
  { time: 15.00, text: 'Forever', section: 3, hold: 0.75 },
  { time: 16.15, text: 'you and I', section: 3 },

  // ==========================================
  // SECTION 4 (~17.10s – 24.13s)
  // ==========================================
  { time: 17.10, text: 'I love you', section: 4 },
  { time: 18.15, text: 'oh~', section: 4, hold: 0.85 },
  { time: 19.35, text: 'I love you so much', section: 4 },
  { time: 21.05, text: 'Forever', section: 4, hold: 0.85 },
  { time: 22.30, text: 'you and I', section: 4, hold: 1.05 },
];

export const CAPTION_ANIMATION = Object.freeze({
  fadeIn: 0.22,
  fadeOut: 0.28,
  defaultHold: 0.90,
  enterScale: 0.92,
  exitScale: 0.97,
  enterY: 12,
  exitY: -8,
  enterZ: -24,
  exitZ: -12,
  enterRotX: 8,
  exitRotX: -4,
  exitBlur: 1.5,
});

// Backwards compatibility aliases
export const WORD_TIMELINE = CAPTION_TIMELINE;
export const WORD_ANIMATION = CAPTION_ANIMATION;
