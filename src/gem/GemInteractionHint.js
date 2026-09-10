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
      <div class="gem-interaction-hint__gesture" aria-hidden="true">
        <div class="gem-interaction-hint__ripple-anchor" aria-hidden="true">
          <span class="gem-interaction-hint__ripple gem-interaction-hint__ripple--1" aria-hidden="true"></span>
          <span class="gem-interaction-hint__ripple gem-interaction-hint__ripple--2" aria-hidden="true"></span>
        </div>
        <div class="gem-interaction-hint__icon-wrap" aria-hidden="true">
          <svg class="gem-interaction-hint__icon" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M10.2 4C10.2 2.45 11.45 1.2 13 1.2C14.55 1.2 15.8 2.45 15.8 4V15.2C16.6 14.4 17.7 14 18.8 14.2C20.2 14.5 21.1 15.7 21.1 17.1V18.2C21.8 18 22.7 18.3 23.3 18.9C24.1 19.7 24.3 20.9 23.9 22L23.1 24.2C23.8 25.1 23.9 26.3 23.4 27.3C22.7 28.7 21.5 29.8 20 30.3L19.1 30.6C17.1 31.3 14.9 31.5 12.8 31.1C10.3 30.6 8.1 29.2 6.7 27.1L4.8 24.2C4 23 4.2 21.4 5.3 20.3C6.4 19.3 8.1 19.3 9.1 20.3L10.2 21.6V4Z"
              fill="url(#gem-hint-hand-grad)" stroke="rgba(255, 255, 255, 0.85)" stroke-width="0.8" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="gem-hint-hand-grad" x1="13" y1="1" x2="13" y2="32" gradientUnits="userSpaceOnUse">
                <stop stop-color="#ffffff"/>
                <stop offset="0.75" stop-color="#fdf1f5"/>
                <stop offset="1" stop-color="#f6dfe6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <span class="gem-interaction-hint__label" aria-hidden="true">Chạm vào viên ngọc</span>
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
