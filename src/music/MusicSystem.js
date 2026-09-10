const clampVolume = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** One streaming media element, one existing AudioContext, independent gain.
 * Status: ready/priming/starting/playing/paused/blocked/finished/error/disposed.
 * No synthetic clock: currentTime always comes directly from the media element.
 */
export class MusicSystem {
  constructor(config = {}, { createAudio = () => new Audio(), getContext = () => null } = {}) {
    this.config = { src: '', startTime: 0, endTime: null, volume: 0.7, ...config };
    const { startTime, endTime } = this.config;
    if (!Number.isFinite(startTime) || startTime < 0 || (endTime !== null && (!Number.isFinite(endTime) || endTime <= startTime))) {
      throw new Error('Music requires 0 <= startTime < endTime (or endTime: null).');
    }
    this.volume = clampVolume(this.config.volume);
    this.getContext = getContext;
    this.status = 'ready';
    this.begun = false;
    this.hasStarted = false;
    this.epoch = 0;
    this.priming = null;
    this.audio = null;
    this.onEnded = () => this.stop();
    this.onError = () => this.fail(this.audio?.error ?? new Error('Music could not be loaded.'));
    this.onMetadata = () => { if (!this.hasStarted) this.seekStart(); };
    this.onTimeUpdate = () => this.update();
    if (this.config.src) {
      this.audio = createAudio();
      this.audio.preload = 'auto';
      this.audio.loop = false;
      this.audio.crossOrigin = 'anonymous';
      this.audio.addEventListener('loadedmetadata', this.onMetadata);
      this.audio.addEventListener('ended', this.onEnded);
      this.audio.addEventListener('error', this.onError);
      this.audio.addEventListener('timeupdate', this.onTimeUpdate);
      this.audio.src = this.config.src;
      this.audio.load();
    }
  }

  get currentTime() { return this.audio?.currentTime ?? 0; }
  get finished() { return ['finished', 'error', 'disposed'].includes(this.status); }

  connect() {
    if (this.musicGain) return true;
    this.ctx = this.getContext();
    if (!this.ctx) { this.fail(new Error('Music audio context unavailable.')); return false; }
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.source = this.ctx.createMediaElementSource(this.audio);
    this.source.connect(this.musicGain);
    this.musicGain.connect(this.ctx.destination);
    return true;
  }

  seekStart() {
    if (!this.audio || this.audio.readyState < 1 || this.finished) return;
    if (Number.isFinite(this.audio.duration) && this.config.startTime >= this.audio.duration) {
      this.fail(new Error('Music startTime is outside the file.'));
      return;
    }
    try { this.audio.currentTime = this.config.startTime; }
    catch (error) { this.fail(error); }
  }

  // Call synchronously inside a user gesture; playback is routed through zero gain.
  arm() {
    if (!this.audio || this.begun || this.finished || this.priming) return this.priming;
    try {
      if (!this.connect()) return;
      this.status = 'priming';
      const epoch = this.epoch;
      this.priming = Promise.resolve(this.audio.play()).then(() => {
        this.audio.pause();
        if (epoch !== this.epoch || this.finished) return;
        this.seekStart();
        if (!this.finished) this.status = 'ready';
      }).catch(error => {
        if (epoch === this.epoch && !this.finished) this.playError(error);
      });
      return this.priming;
    } catch (error) { this.fail(error); }
  }

  begin() {
    if (this.begun || this.finished) return;
    this.begun = true;
    if (!this.audio) { this.stop(); return; }
    if (this.priming) {
      const epoch = this.epoch;
      return this.priming.then(() => {
        if (!this.finished && epoch === this.epoch && this.status !== 'paused') return this.play();
      });
    }
    this.seekStart();
    return this.play();
  }

  async play() {
    if (!this.audio || this.finished || ['playing', 'starting'].includes(this.status)) return;
    const epoch = ++this.epoch;
    try {
      this.status = 'starting';
      if (this.priming) await this.priming;
      if (epoch !== this.epoch || this.finished) return;
      if (!this.hasStarted) this.seekStart();
      if (this.finished || !this.connect()) return;
      // Gain automation does not touch the heartbeat bus.
      this.setVolume(this.volume);
      await this.audio.play();
      if (epoch !== this.epoch || this.finished) {
        if (this.finished || this.status === 'paused') this.audio.pause();
        return;
      }
      this.hasStarted = true;
      this.status = 'playing';
      this.update();
    } catch (error) {
      if (epoch === this.epoch && !this.finished) this.playError(error);
    }
  }

  playError(error) {
    if (error?.name === 'NotAllowedError') { this.status = 'blocked'; this.audio.pause(); }
    else this.fail(error);
  }

  pause() {
    if (this.finished) return;
    ++this.epoch;
    this.audio?.pause();
    this.status = 'paused';
  }

  setVolume(volume) {
    this.volume = clampVolume(volume);
    this.fadeTo(this.volume, 0);
  }

  fadeTo(volume, seconds = 0.4) {
    if (!this.musicGain) return;
    const gain = this.musicGain.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(clampVolume(volume), now + Math.max(0, seconds));
  }

  update() {
    if (!this.audio || this.finished || !this.begun || this.status === 'priming') return;
    if (this.audio.ended || (this.config.endTime !== null && this.currentTime >= this.config.endTime)) this.stop();
  }

  stop() {
    if (this.finished) return;
    ++this.epoch;
    this.audio?.pause();
    this.fadeTo(0, 0);
    this.status = 'finished';
  }

  fail(error) {
    this.stop();
    this.error = error;
    this.status = 'error';
  }

  dispose() {
    if (this.status === 'disposed') return;
    this.stop();
    if (this.audio) {
      this.audio.removeEventListener('loadedmetadata', this.onMetadata);
      this.audio.removeEventListener('ended', this.onEnded);
      this.audio.removeEventListener('error', this.onError);
      this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.source?.disconnect();
    this.musicGain?.disconnect();
    this.status = 'disposed';
  }
}
