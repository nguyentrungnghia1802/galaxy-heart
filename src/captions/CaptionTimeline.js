export class CaptionTimeline {
  constructor(lines = [], fade = 0.6) {
    if (!Number.isFinite(fade) || fade <= 0) throw new Error('Caption fade must be positive.');
    let lastEnd = 0;
    this.lines = lines.map(line => {
      if (!Number.isFinite(line.start) || !Number.isFinite(line.end) || line.start < lastEnd || line.end <= line.start || typeof line.text !== 'string') {
        throw new Error('Captions need ordered, non-overlapping positive intervals and text.');
      }
      lastEnd = line.end;
      return Object.freeze({ ...line });
    });
    this.fade = fade;
  }

  opacity(index, time) {
    const line = this.lines[index];
    if (!line || !Number.isFinite(time) || time <= line.start || time >= line.end) return 0;
    const fade = Math.min(this.fade, (line.end - line.start) / 2);
    const p = Math.min(1, (time - line.start) / fade, (line.end - time) / fade);
    return p * p * (3 - 2 * p);
  }
}
