import { CaptionTimeline } from './CaptionTimeline.js';

export class CaptionRenderer {
  constructor(container, { captions = [], captionFade = 0.6 } = {}, documentTarget = globalThis.document) {
    this.timeline = new CaptionTimeline(captions, captionFade);
    this.nodes = [];
    if (!documentTarget?.createElement || !container?.append) return;
    this.element = documentTarget.createElement('div');
    this.element.className = 'music-captions';
    this.element.setAttribute('aria-live', 'off');
    // Allocate/layout text before interaction, never replace text nodes mid-frame.
    for (const line of this.timeline.lines) {
      const node = documentTarget.createElement('p');
      node.className = 'music-caption';
      node.textContent = line.text;
      node.style.opacity = '0';
      node.setAttribute('aria-hidden', 'true');
      this.element.append(node);
      this.nodes.push(node);
    }
    container.append(this.element);
  }

  update(time, active = true) {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const opacity = active ? this.timeline.opacity(i, time) : 0;
      const value = String(opacity);
      if (node.style.opacity !== value) {
        node.style.opacity = value;
        node.setAttribute('aria-hidden', opacity === 0 ? 'true' : 'false');
      }
    }
  }

  dispose() { this.element?.remove(); this.nodes.length = 0; }
}
