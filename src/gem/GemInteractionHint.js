import * as THREE from 'three';

export const DEFAULT_GEM_HINT_DELAY = 3;

export function shouldShowGemHint(
  state,
  idleTime,
  delay = DEFAULT_GEM_HINT_DELAY,
) {
  return state === 'GEM_IDLE' &&
    Number.isFinite(idleTime) &&
    Number.isFinite(delay) &&
    delay > 0 &&
    idleTime >= delay;
}

export class GemInteractionHint {
  constructor(
    container,
    options = {},
    documentTarget = globalThis.document,
  ) {
    this.container = container;
    this.delay = options.delay ?? DEFAULT_GEM_HINT_DELAY;
    if (!Number.isFinite(this.delay) || this.delay <= 0) {
      throw new Error('Gem hint delay must be positive.');
    }

    this.projectedPosition = new THREE.Vector3();
    this.element = null;
    this.visible = false;

    if (!documentTarget?.createElement || !container?.append) {
      return;
    }

    this.element = documentTarget.createElement('div');
    this.element.className = 'gem-interaction-hint';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <span class="gem-interaction-hint__ripple" aria-hidden="true"></span>
      <svg class="gem-interaction-hint__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 13.2V5.7a1.45 1.45 0 0 1 2.9 0v4.1V4.9a1.45 1.45 0 0 1 2.9 0v4.9V5.8a1.45 1.45 0 0 1 2.9 0v6.1l.55-.55a1.45 1.45 0 0 1 2.05 2.05l-4.2 4.2a3.4 3.4 0 0 1-2.4 1H9.8a3.4 3.4 0 0 1-2.4-1l-2.55-2.55a1.45 1.45 0 0 1 2.05-2.05l1.6 1.6v-1.4Z" />
      </svg>
    `;
    container.append(this.element);
  }

  update(stateSnapshot, gemSystem, camera) {
    const state = stateSnapshot?.state ?? 'BOOT';
    const idleTime = gemSystem?.idleTime ?? 0;
    const shouldShow = shouldShowGemHint(state, idleTime, this.delay);

    if (!shouldShow) {
      this.hide();
      return;
    }

    this.setVisible(true);
    if (!this.element || !gemSystem?.group || !camera) {
      return;
    }

    this.projectedPosition.copy(gemSystem.group.position).project(camera);
    if (
      !Number.isFinite(this.projectedPosition.x) ||
      !Number.isFinite(this.projectedPosition.y)
    ) {
      this.hide();
      return;
    }

    const width = this.container?.clientWidth || 1;
    const height = this.container?.clientHeight || 1;
    this.element.style.setProperty(
      '--gem-hint-x',
      `${((this.projectedPosition.x + 1) * width) / 2}px`,
    );
    this.element.style.setProperty(
      '--gem-hint-y',
      `${((1 - this.projectedPosition.y) * height) / 2}px`,
    );
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    if (!this.element) return;

    if (this.visible) {
      this.element.classList.remove('is-dismissed');
      this.element.classList.add('is-visible');
      this.element.setAttribute('aria-hidden', 'false');
    } else {
      this.element.classList.remove('is-visible');
      this.element.classList.add('is-dismissed');
      this.element.setAttribute('aria-hidden', 'true');
    }
  }

  hide() {
    this.setVisible(false);
  }

  dispose() {
    this.hide();
    this.element?.remove();
    this.element = null;
  }
}
