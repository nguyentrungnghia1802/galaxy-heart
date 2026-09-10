// Edit this file to align the lyrics. All times are absolute audio.currentTime seconds.
// This is a ROUGH first alignment, not a transcription of the recording.
// Keep words in chronological order, with each line grouped together.
// Optional per-word `hold` overrides holdDuration, e.g. { time: 5.35, text: 'forever', line: 2, hold: 1.8 }.
export const WORD_TIMELINE = [
  { time: 2.00, text: 'My', line: 1 },
  { time: 2.45, text: 'baby', line: 1 },

  { time: 3.00, text: 'I', line: 2 },
  { time: 3.15, text: 'love', line: 2 },
  { time: 3.30, text: 'you', line: 2 },
  { time: 4.00, text: 'so', line: 2 },
  { time: 4.65, text: 'much', line: 2 },
  { time: 5.05, text: 'forever', line: 2 },
  { time: 5.80, text: 'you', line: 2 },
  { time: 6.10, text: 'and', line: 2 },
  { time: 6.45, text: 'I', line: 2 },

  { time: 7.15, text: 'I', line: 3 },
  { time: 7.45, text: 'love', line: 3 },
  { time: 7.80, text: 'you', line: 3 },
  { time: 8.15, text: 'oh', line: 3 },

  { time: 8.90, text: 'I', line: 4 },
  { time: 9.20, text: 'love', line: 4 },
  { time: 9.55, text: 'you', line: 4 },
  { time: 9.85, text: 'so', line: 4 },
  { time: 10.15, text: 'much', line: 4 },
  { time: 10.50, text: 'forever', line: 4 },
  { time: 11.20, text: 'you', line: 4 },
  { time: 11.55, text: 'and', line: 4 },
  { time: 11.90, text: 'I', line: 4 },

  { time: 13.10, text: 'My', line: 5 },
  { time: 13.55, text: 'baby', line: 5 },

  { time: 14.30, text: 'I', line: 6 },
  { time: 14.65, text: 'love', line: 6 },
  { time: 15.00, text: 'you', line: 6 },
  { time: 15.35, text: 'so', line: 6 },
  { time: 15.70, text: 'much', line: 6 },
  { time: 16.05, text: 'forever', line: 6 },
  { time: 16.80, text: 'you', line: 6 },
  { time: 17.15, text: 'and', line: 6 },
  { time: 17.50, text: 'I', line: 6 },

  { time: 18.25, text: 'I', line: 7 },
  { time: 18.55, text: 'love', line: 7 },
  { time: 18.90, text: 'you', line: 7 },
  { time: 19.25, text: 'oh', line: 7 },

  { time: 20.00, text: 'I', line: 8 },
  { time: 20.35, text: 'love', line: 8 },
  { time: 20.70, text: 'you', line: 8 },
  { time: 21.05, text: 'so', line: 8 },
  { time: 21.40, text: 'much', line: 8 },
  { time: 21.80, text: 'forever', line: 8 },
  { time: 22.55, text: 'you', line: 8 },
  { time: 22.95, text: 'and', line: 8 },
  { time: 23.40, text: 'I', line: 8 },
];

// Durations in seconds. A word's default life is 0.15 + 1.15 + 0.45 = 1.75 s.
// Outgoing words fade away by the next line's first timestamp to avoid overlapping lines.
export const WORD_ANIMATION = Object.freeze({
  fadeIn: 0.18,
  holdDuration: 1.15,
  fadeOut: 0.45,
  lineFadeOut: 0.22,
  enterScale: 0.88,
  exitScale: 0.97,
  exitY: -8,
  exitBlur: 1.5,
});
