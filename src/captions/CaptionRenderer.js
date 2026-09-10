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
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const sample = this.timeline.sample(i, active ? time : -1, this.sample);
      const opacity = sample.opacity.toFixed(4);
      if (opacity === '0.0000' && node.style.visibility === 'hidden') continue;
      node.style.opacity = opacity;
      node.style.transform = `translateY(${sample.y.toFixed(3)}px) scale(${sample.scale.toFixed(4)})`;
      node.style.filter = sample.blur > 0 ? `blur(${sample.blur.toFixed(3)}px)` : 'none';
      const hidden = sample.opacity <= 0;
      if ((node.style.visibility === 'hidden') !== hidden) {
        node.style.visibility = hidden ? 'hidden' : 'visible';
        node.setAttribute('aria-hidden', String(hidden));
      }
    }
    if (this.debugElement) {
      const word = active ? this.timeline.current(time) : null;
      const seconds = Number.isFinite(time) ? Math.max(0, time) : 0;
      const text = `Music: ${seconds.toFixed(3).padStart(6, '0')}s\nCurrent: ${word?.text ?? '—'}\nLine: ${word?.line ?? '—'}`;
      if (this.debugElement.textContent !== text) this.debugElement.textContent = text;
    }
  }

  dispose() {
    this.element?.remove();
    this.debugElement?.remove();
    this.nodes.length = 0;
  }
}
