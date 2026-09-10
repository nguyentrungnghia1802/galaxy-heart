import { PhraseCaptionTimeline } from './PhraseCaptionTimeline.js';
import { CAPTION_TIMELINE, CAPTION_ANIMATION } from '../config/musicCaptions.js';

export class CaptionRenderer {
  constructor(
    container,
    {
      captions = CAPTION_TIMELINE,
      words,
      captionAnimation = CAPTION_ANIMATION,
      wordAnimation,
      debug = false,
    } = {},
    documentTarget = globalThis.document,
  ) {
    const timelineData = captions && captions.length > 0 ? captions : (words ?? CAPTION_TIMELINE);
    const animationData = captionAnimation ?? wordAnimation ?? CAPTION_ANIMATION;

    this.timeline = new PhraseCaptionTimeline(timelineData, animationData);
    this.nodes = [];
    this.sample = {};

    if (!documentTarget?.createElement || !container?.append) return;

    this.element = documentTarget.createElement('div');
    this.element.className = 'music-captions';
    this.element.setAttribute('aria-live', 'off');

    // Create a dedicated phrase container for each lyrical phrase
    for (let i = 0; i < this.timeline.captions.length; i++) {
      const phrase = this.timeline.captions[i];
      const node = documentTarget.createElement('p');
      node.className = 'music-caption music-caption--phrase';
      node.textContent = phrase.text;
      node.dataset.section = String(phrase.section ?? 1);
      node.dataset.index = String(i);
      node.style.opacity = '0';
      node.style.visibility = 'hidden';
      node.setAttribute('aria-hidden', 'true');
      this.element.append(node);
      this.nodes.push(node);
    }

    // Deterministic micro-variations so each phrase has subtle unique organic presence
    this.phraseVariations = this.timeline.captions.map((phrase, idx) => {
      const hash = ((idx * 2654435761) ^ (phrase.text.charCodeAt(0) * 1597334677)) >>> 0;
      const norm1 = (hash & 0xffff) / 0xffff;
      const norm2 = ((hash >>> 16) & 0xffff) / 0xffff;
      return {
        baseRotZ: (norm1 - 0.5) * 1.0, // subtle tilt ±0.5°
        baseRotY: (norm2 - 0.5) * 1.5, // subtle Y angle ±0.75°
        floatSpeed: 1.2 + norm1 * 0.4,
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

      const v = this.phraseVariations[i] || {
        baseRotZ: 0,
        baseRotY: 0,
        floatSpeed: 1.3,
        floatPhase: 0,
      };

      // 3D Cinematic Motion & Breathing
      const lifeWeight = sample.opacity;
      const floatY = Math.sin(t * v.floatSpeed + v.floatPhase) * 0.55 * lifeWeight;
      const floatZ = Math.cos(t * (v.floatSpeed * 0.8) + v.floatPhase) * 0.75 * lifeWeight;

      const posY = (sample.y + floatY).toFixed(2);
      const posZ = (sample.z + floatZ).toFixed(2);
      const rotX = sample.rotX.toFixed(2);
      const rotY = (v.baseRotY * lifeWeight).toFixed(2);
      const rotZ = (v.baseRotZ * lifeWeight).toFixed(2);
      const scale = sample.scale.toFixed(4);

      node.style.opacity = opacity;
      node.style.transform = `translate3d(0px, ${posY}px, ${posZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`;
      node.style.filter = sample.blur > 0 ? `blur(${sample.blur.toFixed(2)}px)` : 'none';

      const hidden = sample.opacity <= 0;
      if ((node.style.visibility === 'hidden') !== hidden) {
        node.style.visibility = hidden ? 'hidden' : 'visible';
        node.setAttribute('aria-hidden', String(hidden));
      }
    }

    if (this.debugElement) {
      const phrase = active ? this.timeline.current(time) : null;
      const text = `Music: ${t.toFixed(3).padStart(6, '0')}s\nCurrent: ${phrase?.text ?? '—'}\nSection: ${phrase?.section ?? '—'}`;
      if (this.debugElement.textContent !== text) this.debugElement.textContent = text;
    }
  }

  dispose() {
    this.element?.remove();
    this.debugElement?.remove();
    this.nodes.length = 0;
  }
}
