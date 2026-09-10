import { describe, expect, it } from 'vitest';
import { CaptionRenderer } from '../src/captions/CaptionRenderer.js';

function createMockElement(tagName) {
  const children = [];
  const attributes = {};
  return {
    tagName,
    className: '',
    textContent: '',
    dataset: {},
    style: {},
    children,
    append(...nodes) {
      children.push(...nodes);
    },
    remove() {
      this.removed = true;
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return attributes[name];
    },
  };
}

function createMockDocument() {
  return {
    createElement(tag) {
      return createMockElement(tag);
    },
  };
}

describe('CaptionRenderer Phrase-Level 3D Visual & Dynamics', () => {
  const captions = [
    { time: 0.0, text: 'My baby', section: 1 },
    { time: 1.2, text: 'I love you so much', section: 1 },
    { time: 3.1, text: 'Forever', section: 1, hold: 0.7 },
  ];

  it('mounts phrase elements with 3D structure and initial hidden styles', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { captions, debug: true }, doc);

    expect(renderer.nodes).toHaveLength(3);
    expect(renderer.element.className).toBe('music-captions');
    expect(renderer.nodes[0].className).toBe('music-caption music-caption--phrase');
    expect(renderer.nodes[0].textContent).toBe('My baby');
    expect(renderer.nodes[0].dataset.section).toBe('1');
    expect(renderer.nodes[0].style.opacity).toBe('0');
    expect(renderer.nodes[0].style.visibility).toBe('hidden');
    expect(renderer.debugElement).toBeDefined();

    renderer.dispose();
    expect(renderer.element.removed).toBe(true);
    expect(renderer.debugElement.removed).toBe(true);
  });

  it('applies 3D transforms (translate3d, rotateX, rotateY, rotateZ, scale) during phrase enter phase', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { captions }, doc);

    // Midway through enter of first phrase (t = 0.10s)
    renderer.update(0.10, true);
    const node = renderer.nodes[0];
    expect(node.style.visibility).toBe('visible');
    expect(Number.parseFloat(node.style.opacity)).toBeGreaterThan(0);
    expect(Number.parseFloat(node.style.opacity)).toBeLessThan(1);

    // Verify 3D transform syntax
    const transform = node.style.transform;
    expect(transform).toMatch(/translate3d\(0px,\s*[\d.-]+px,\s*[\d.-]+px\)/);
    expect(transform).toMatch(/rotateX\([\d.-]+deg\)/);
    expect(transform).toMatch(/rotateY\([\d.-]+deg\)/);
    expect(transform).toMatch(/rotateZ\([\d.-]+deg\)/);
    expect(transform).toMatch(/scale\([\d.]+\)/);

    renderer.dispose();
  });

  it('keeps phrase in hold with micro-floating and fully opaque, then smoothly crossfades into next phrase', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { captions }, doc);

    // Hold phase: t = 0.5s (phrase 0 has entered, vocal hold is active)
    renderer.update(0.5, true);
    const node0 = renderer.nodes[0];
    expect(node0.style.visibility).toBe('visible');
    expect(Number.parseFloat(node0.style.opacity)).toBeCloseTo(1.0, 1);
    expect(node0.style.filter).toBe('none');

    // Next phrase enters at t = 1.20s: at t = 1.35s, phrase 1 is strongly visible
    renderer.update(1.35, true);
    const node1 = renderer.nodes[1];
    expect(node1.style.visibility).toBe('visible');
    expect(Number.parseFloat(node1.style.opacity)).toBeGreaterThan(0.5);

    renderer.dispose();
  });

  it('formats debug HUD output with current phrase and section', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { captions, debug: true }, doc);

    renderer.update(0.5, true);
    expect(renderer.debugElement.textContent).toContain('Music: 00.500s');
    expect(renderer.debugElement.textContent).toContain('Current: My baby');
    expect(renderer.debugElement.textContent).toContain('Section: 1');

    renderer.dispose();
  });
});
