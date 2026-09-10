import { WordCaptionTimeline } from './WordCaptionTimeline.js';

export class CaptionRenderer {
  constructor(container, { words = [], wordAnimation, debug = false } = {}, documentTarget = globalThis.document) {
    this.timeline = new WordCaptionTimeline(words, wordAnimation);
    this.nodes = [];
    this.sample = {};
    if (!documentTarget?.createElement || !container?.append) return;
    this.element = documentTarget.createElement('div');
    this.element.className = 'music-captions';
    this.element.setAttribute('aria-live', 'off');
    // Reserve each word's place up front: fading words never reflow their neighbours.
    let line;
    let group;
    for (const word of this.timeline.words) {
      if (word.line !== line) {
        line = word.line;
        group = documentTarget.createElement('p');
        group.className = 'music-caption music-caption--words';
        group.dataset.line = String(line);
        this.element.append(group);
      }
      const node = documentTarget.createElement('span');
      node.className = 'music-caption__word';
      node.textContent = word.text;
      node.style.opacity = '0';
      node.style.visibility = 'hidden';
      node.setAttribute('aria-hidden', 'true');
      group.append(node);
      this.nodes.push(node);
    }
    // Deterministic micro-variations so each word has subtle unique depth and rhythm
    this.wordVariations = this.timeline.words.map((word, idx) => {
      const hash = ((idx * 2654435761) ^ (word.text.charCodeAt(0) * 1597334677)) >>> 0;
      const norm1 = (hash & 0xffff) / 0xffff;
      const norm2 = ((hash >>> 16) & 0xffff) / 0xffff;
      return {
        baseY: (norm1 - 0.5) * 1.6,
        baseZ: (norm2 - 0.5) * 3.5,
        baseRotZ: (norm1 - 0.5) * 1.1,
        baseRotY: (norm2 - 0.5) * 1.8,
        floatSpeed: 1.3 + norm1 * 0.5,
        floatPhase: norm2 * Math.PI * 2,
      };
    });

    container.append(this.element);
    if (debug) {
      this.debugElement = documentTarget.createElement('pre');
      this.debugElement.className = 'caption-debug';
      this.debugElement.setAttribute('aria-live', 'off');
      container.append(this.debugElement);
      this.update(0, false);
    }
  }

  update(time, active = true) {
    const t = Number.isFinite(time) ? Math.max(0, time) : 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const sample = this.timeline.sample(i, active ? time : -1, this.sample);
      const opacity = sample.opacity.toFixed(4);
      if (opacity === '0.0000' && node.style.visibility === 'hidden') continue;

      const v = this.wordVariations[i] || {
        baseY: 0, baseZ: 0, baseRotZ: 0, baseRotY: 0, floatSpeed: 1.5, floatPhase: 0,
      };

      // 3D Cinematic Motion:
      // 1. Enter: rises from +10px, advances +24px towards camera, tilts 10deg -> 0deg, scales 0.88 -> 1.0
      const enterRemaining = 1 - (sample.enter ?? 1);
      const enterY = enterRemaining * 10;
      const enterZ = enterRemaining * -24;
      const enterRotX = enterRemaining * 10;
      const enterScale = sample.scale ?? 1;

      // 2. Hold: micro-floating breath
      const lifeWeight = (sample.enter ?? 1) * (1 - (sample.exit ?? 0));
      const floatY = Math.sin(t * v.floatSpeed + v.floatPhase) * 0.75 * lifeWeight;
      const floatZ = Math.cos(t * (v.floatSpeed * 0.85) + v.floatPhase) * 0.85 * lifeWeight;

      // 3. Exit: gently drifts upward (-8px), recedes -10px, scales down to ~0.97
      const exitProgress = sample.exit ?? 0;
      const exitY = sample.y ?? 0;
      const exitZ = exitProgress * -10;
      const exitRotX = exitProgress * -5;
      const exitScale = 1 - exitProgress * 0.03;

      const posY = (enterY + exitY + v.baseY * lifeWeight + floatY).toFixed(2);
      const posZ = (enterZ + exitZ + v.baseZ * lifeWeight + floatZ).toFixed(2);
      const rotX = (enterRotX + exitRotX).toFixed(2);
      const rotY = (v.baseRotY * lifeWeight).toFixed(2);
      const rotZ = (v.baseRotZ * lifeWeight).toFixed(2);
      const finalScale = (enterScale * exitScale).toFixed(4);

      node.style.opacity = opacity;
      node.style.transform = `translate3d(0px, ${posY}px, ${posZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${finalScale})`;
      node.style.filter = sample.blur > 0 ? `blur(${sample.blur.toFixed(3)}px)` : 'none';

      const hidden = sample.opacity <= 0;
      if ((node.style.visibility === 'hidden') !== hidden) {
        node.style.visibility = hidden ? 'hidden' : 'visible';
        node.setAttribute('aria-hidden', String(hidden));
      }
    }
    if (this.debugElement) {
      const word = active ? this.timeline.current(time) : null;
      const text = `Music: ${t.toFixed(3).padStart(6, '0')}s\nCurrent: ${word?.text ?? '—'}\nLine: ${word?.line ?? '—'}`;
      if (this.debugElement.textContent !== text) this.debugElement.textContent = text;
    }
  }

  dispose() {
    this.element?.remove();
    this.debugElement?.remove();
    this.nodes.length = 0;
  }
}
