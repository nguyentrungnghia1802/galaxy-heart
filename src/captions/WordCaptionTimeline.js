import { WORD_ANIMATION } from '../config/musicCaptions.js';

const smooth = value => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};

// Stateless samples: skipped frames, pauses and backward seeks use the same media clock.
export class WordCaptionTimeline {
  constructor(words = [], animation = WORD_ANIMATION) {
    this.animation = { ...WORD_ANIMATION, ...animation };
    const a = this.animation;
    for (const key of ['fadeIn', 'fadeOut', 'lineFadeOut']) {
      if (!Number.isFinite(a[key]) || a[key] <= 0) throw new Error(`${key} must be positive.`);
    }
    if (!Number.isFinite(a.holdDuration) || a.holdDuration < 0 ||
        !Number.isFinite(a.enterScale) || a.enterScale <= 0 || a.enterScale > 1 ||
        !Number.isFinite(a.exitY) || !Number.isFinite(a.exitBlur) || a.exitBlur < 0) {
      throw new Error('Invalid word animation settings.');
    }
    this.lines = [];
    let previousTime = -1;
    const seen = new Set();
    let group;
    this.words = words.map(word => {
      if (!Number.isFinite(word.time) || word.time < 0 || word.time < previousTime ||
          !Number.isInteger(word.line) || word.line <= 0 || typeof word.text !== 'string' || !word.text.trim() ||
          (word.hold !== undefined && (!Number.isFinite(word.hold) || word.hold < 0))) {
        throw new Error('Words need ordered times, positive line numbers, text and a non-negative hold.');
      }
      previousTime = word.time;
      if (group?.line !== word.line) {
        if (seen.has(word.line)) throw new Error('Keep each line together in WORD_TIMELINE.');
        if (group) group.end = word.time;
        group = { line: word.line, end: Infinity };
        seen.add(word.line);
        this.lines.push(group);
      }
      return { ...word, group };
    });
  }

  // Renderer supplies a reusable target to avoid per-word object allocations in RAF.
  sample(index, time, target = {}) {
    const word = this.words[index];
    const a = this.animation;
    target.opacity = 0;
    target.scale = a.enterScale;
    target.y = 0;
    target.blur = 0;
    if (!word || !Number.isFinite(time) || time < word.time) return target;
    const exitStart = word.time + a.fadeIn + (word.hold ?? a.holdDuration);
    const end = Math.min(exitStart + a.fadeOut, word.group.end);
    if (time >= end) return target;

    const enter = smooth((time - word.time) / a.fadeIn);
    const exit = Math.max(
      smooth((time - exitStart) / a.fadeOut),
      smooth((time - (word.group.end - a.lineFadeOut)) / a.lineFadeOut),
    );
    target.opacity = enter * (1 - exit);
    target.scale = a.enterScale + (1 - a.enterScale) * enter;
    target.y = a.exitY * exit;
    target.blur = a.exitBlur * exit;
    return target;
  }

  current(time) {
    // Latest word that has begun and is still alive; no old word lingers through gaps.
    for (let i = this.words.length - 1; i >= 0; i--) {
      const word = this.words[i];
      if (time >= word.time && time < Math.min(
        word.time + this.animation.fadeIn + (word.hold ?? this.animation.holdDuration) + this.animation.fadeOut,
        word.group.end,
      )) return word;
    }
    return null;
  }
}
