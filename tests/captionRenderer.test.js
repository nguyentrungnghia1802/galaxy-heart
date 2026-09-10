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

describe('CaptionRenderer 3D Visual & Dynamics', () => {
  const words = [
    { time: 2.0, text: 'My', line: 1 },
    { time: 2.5, text: 'baby', line: 1, hold: 1.0 },
    { time: 4.0, text: 'I', line: 2 },
  ];

  it('mounts word spans with 3D structure and initial hidden styles', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { words, debug: true }, doc);

    expect(renderer.nodes).toHaveLength(3);
    expect(renderer.element.className).toBe('music-captions');
    expect(renderer.nodes[0].className).toBe('music-caption__word');
    expect(renderer.nodes[0].textContent).toBe('My');
    expect(renderer.nodes[0].style.opacity).toBe('0');
    expect(renderer.nodes[0].style.visibility).toBe('hidden');
    expect(renderer.debugElement).toBeDefined();

    renderer.dispose();
    expect(renderer.element.removed).toBe(true);
    expect(renderer.debugElement.removed).toBe(true);
  });

  it('applies 3D transforms (translate3d, rotateX, rotateY, rotateZ, scale) during enter phase', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { words }, doc);

    // Before word time: hidden
    renderer.update(1.99, true);
    expect(renderer.nodes[0].style.visibility).toBe('hidden');

    // Midway through enter (e.g. t = 2.09, fadeIn is ~0.18s)
    renderer.update(2.09, true);
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

  it('keeps words in hold with micro-floating and fully opaque, then applies exit upward drift and blur', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { words }, doc);

    // Hold phase: t = 2.4s (word 0 has entered, hold is active)
    renderer.update(2.4, true);
    const node0 = renderer.nodes[0];
    expect(node0.style.visibility).toBe('visible');
    expect(Number.parseFloat(node0.style.opacity)).toBeCloseTo(1.0, 1);
    expect(node0.style.filter).toBe('none');

    // Exit phase: t = 3.6s (word 0 is exiting, fadeOut is active)
    renderer.update(3.6, true);
    expect(Number.parseFloat(node0.style.opacity)).toBeLessThan(1.0);
    expect(node0.style.filter).toContain('blur');

    // Fully expired: t = 3.9s
    renderer.update(3.9, true);
    expect(node0.style.visibility).toBe('hidden');
    expect(node0.style.opacity).toBe('0.0000');

    renderer.dispose();
  });

  it('formats debug HUD output correctly', () => {
    const container = createMockElement('div');
    const doc = createMockDocument();
    const renderer = new CaptionRenderer(container, { words, debug: true }, doc);

    renderer.update(2.1, true);
    expect(renderer.debugElement.textContent).toContain('Music: 02.100s');
    expect(renderer.debugElement.textContent).toContain('Current: My');
    expect(renderer.debugElement.textContent).toContain('Line: 1');

    renderer.dispose();
  });
});
