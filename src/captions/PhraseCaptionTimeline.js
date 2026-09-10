import { CAPTION_ANIMATION } from '../config/musicCaptions.js';

const smooth = value => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};

export class PhraseCaptionTimeline {
  constructor(captions = [], animation = CAPTION_ANIMATION) {
    this.animation = { ...CAPTION_ANIMATION, ...animation };
    const a = this.animation;
    for (const key of ['fadeIn', 'fadeOut']) {
      if (!Number.isFinite(a[key]) || a[key] <= 0) throw new Error(`${key} must be positive.`);
    }

    let previousTime = -1;
    this.captions = captions.map((phrase, i) => {
      const time = phrase.time ?? phrase.start;
      if (!Number.isFinite(time) || time < 0 || time < previousTime ||
          typeof phrase.text !== 'string' || !phrase.text.trim()) {
        throw new Error('Captions need ordered times and non-empty text.');
      }
      previousTime = time;

      const next = captions[i + 1];
      const nextTime = next ? (next.time ?? next.start) : null;
      const start = time;

      // Calculate smooth transition boundaries
      const hold = phrase.hold ?? a.defaultHold;
      const crossfade = a.fadeOut;
      let exitStart;
      let end;

      if (nextTime !== null) {
        // Crossfade into next phrase or hold until natural exit
        const maxEnd = nextTime;
        exitStart = Math.min(start + a.fadeIn + hold, Math.max(start + a.fadeIn, maxEnd - crossfade));
        end = Math.min(exitStart + crossfade, maxEnd + 0.05);
      } else {
        exitStart = start + a.fadeIn + hold;
        end = exitStart + crossfade;
      }

      return {
        ...phrase,
        time,
        start,
        exitStart,
        end,
        section: phrase.section ?? 1,
      };
    });
  }

  sample(index, time, target = {}) {
    const phrase = this.captions[index];
    const a = this.animation;

    target.opacity = 0;
    target.scale = a.enterScale;
    target.y = a.enterY;
    target.z = a.enterZ;
    target.rotX = a.enterRotX;
    target.blur = 0;
    target.enter = 0;
    target.exit = 0;

    if (!phrase || !Number.isFinite(time) || time < phrase.start || time >= phrase.end) {
      return target;
    }

    const enter = smooth((time - phrase.start) / a.fadeIn);
    const exit = time >= phrase.exitStart ? smooth((time - phrase.exitStart) / a.fadeOut) : 0;

    target.opacity = enter * (1 - exit);
    target.enter = enter;
    target.exit = exit;

    const scaleEnter = a.enterScale + (1 - a.enterScale) * enter;
    const scaleExit = 1 - exit * 0.03;
    target.scale = scaleEnter * scaleExit;

    target.y = (1 - enter) * a.enterY + exit * a.exitY;
    target.z = (1 - enter) * a.enterZ + exit * a.exitZ;
    target.rotX = (1 - enter) * a.enterRotX + exit * a.exitRotX;
    target.blur = exit * a.exitBlur;

    return target;
  }

  current(time) {
    if (!Number.isFinite(time)) return null;
    for (let i = this.captions.length - 1; i >= 0; i--) {
      const phrase = this.captions[i];
      if (time >= phrase.start && time < phrase.end) {
        return phrase;
      }
    }
    return null;
  }
}
