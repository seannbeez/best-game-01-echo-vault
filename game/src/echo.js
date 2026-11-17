// ECHO VAULT — Time Echo recording and replay. One clear job: an Echo is a
import { ECHO_COLORS, MAX_ECHOES } from './config.js';

export class EchoRecorder {
  constructor() {
    this.samples = []; // {t, x, y, vx, vy, dash, shield, hack}
    this.recording = false;
  }

  begin() {
    this.samples = [];
    this.recording = true;
  }

  sample(t, p) {
    if (!this.recording) return;
    this.samples.push({
      t, x: p.x, y: p.y, vx: p.vx, vy: p.vy,
      dash: p.dashT > 0, shield: p.shieldT > 0, hack: p.hacking,
    });
  }

  // Close the loop: return the recording (or null if too short to matter).
  finish(duration) {
    this.recording = false;
    if (this.samples.length < 10) return null;
    return { duration, samples: this.samples };
  }
}

// A replaying Echo. sampleAt(t) interpolates between recorded frames.
export class Echo {
  constructor(idx, recording) {
    this.idx = idx;
    this.color = ECHO_COLORS[idx % ECHO_COLORS.length];
    this.recording = recording;
    this.x = recording.samples[0].x;
    this.y = recording.samples[0].y;
    this.vx = 0;
    this.vy = 0;
    this.dash = false;
    this.shield = false;
    this.hack = false;
    this.trail = [];
    this.trailT = 0;
  }

  sampleAt(t) {
    const s = this.recording.samples;
    if (t <= s[0].t) return s[0];
    if (t >= s[s.length - 1].t) return s[s.length - 1];
    // Binary search for the surrounding pair.
    let lo = 0, hi = s.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (s[mid].t <= t) lo = mid; else hi = mid;
    }
    const a = s[lo], b = s[hi];
    const f = (t - a.t) / Math.max(0.0001, b.t - a.t);
    return {
      t,
      x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f,
      vx: a.vx + (b.vx - a.vx) * f, vy: a.vy + (b.vy - a.vy) * f,
      dash: a.dash || b.dash, shield: a.shield || b.shield, hack: a.hack || b.hack,
    };
  }

  update(t, dt) {
    const s = this.sampleAt(t);
    this.x = s.x; this.y = s.y; this.vx = s.vx; this.vy = s.vy;
    this.dash = s.dash; this.shield = s.shield; this.hack = s.hack;
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trail.push({ x: this.x, y: this.y, life: 0.5 });
      this.trailT = 0.03;
    }
    for (const p of this.trail) p.life -= dt;
    this.trail = this.trail.filter((p) => p.life > 0);
  }

  // Where this Echo is about to go: a dotted predictive path from its
  futurePath(t, horizon = 1.2, step = 0.12) {
    const pts = [];
    for (let f = 0; f <= horizon; f += step) {
      const s = this.sampleAt(Math.min(t + f, this.recording.duration));
      pts.push({ x: s.x, y: s.y });
    }
    return pts;
  }
}

export function makeEchoes(recordings) {
  return recordings.slice(0, MAX_ECHOES).map((r, i) => new Echo(i, r));
}
