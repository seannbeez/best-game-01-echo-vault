// ECHO VAULT — procedural Web Audio: a low-key heist groove (bass pulse,
const MUSIC_BPM = 118;
const BASS_LINE = [0, 0, 7, 0, 5, 0, 3, 10]; // semitone steps over A minor
const ARP_NOTES = [12, 15, 19, 24, 19, 15, 12, 7];

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = false;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(m ? 0 : 0.5, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startMusic() {
    if (this.musicOn || !this.ensure()) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.scheduleMusic(), 90);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  scheduleMusic() {
    if (!this.ctx || !this.musicOn) return;
    const spb = 60 / MUSIC_BPM / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const t = this.nextTime;
      const s = this.step % 16;
      if (s % 2 === 0) this.blip(55 * Math.pow(2, BASS_LINE[(s / 2) | 0] / 12), t, 0.22, 'triangle', 0.5);
      if (s % 4 === 2) this.blip(440 * Math.pow(2, ARP_NOTES[(s / 4) | 0] / 12), t, 0.1, 'sine', 0.12);
      if (s % 2 === 1) this.hat(t);
      this.nextTime += spb;
      this.step++;
    }
  }

  blip(freq, when, dur, type, vol) {
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      o.connect(g); g.connect(this.master);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* silent */ }
  }

  hat(when) {
    try {
      const len = 0.03;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * len), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.06;
      src.connect(g); g.connect(this.master);
      src.start(when);
    } catch { /* silent */ }
  }

  // One-shot effects. `now()` is the play clock: effects duck under music.
  sfx(name) {
    if (!this.ensure() || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      switch (name) {
        case 'dash': this.blip(620, t, 0.12, 'sawtooth', 0.16); this.blip(930, t + 0.05, 0.1, 'sine', 0.14); break;
        case 'grab': this.blip(523, t, 0.1, 'sine', 0.2); this.blip(784, t + 0.07, 0.16, 'sine', 0.2); break;
        case 'hack': this.blip(880, t, 0.07, 'square', 0.1); this.blip(1174, t + 0.06, 0.07, 'square', 0.1); break;
        case 'deflect': this.blip(300, t, 0.18, 'sawtooth', 0.18); this.blip(1200, t + 0.04, 0.14, 'sine', 0.16); break;
        case 'emp': this.blip(180, t, 0.3, 'sawtooth', 0.22); this.blip(90, t + 0.1, 0.3, 'triangle', 0.2); break;
        case 'rewind': this.blip(1400, t, 0.35, 'sine', 0.16); this.blip(700, t + 0.12, 0.3, 'sine', 0.14); break;
        case 'hit': this.blip(140, t, 0.2, 'sawtooth', 0.24); break;
        case 'alarm': this.blip(660, t, 0.12, 'square', 0.12); this.blip(520, t + 0.14, 0.12, 'square', 0.12); break;
        case 'click': this.blip(980, t, 0.05, 'sine', 0.12); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => this.blip(f, t + i * 0.12, 0.22, 'sine', 0.2)); break;
        case 'lose': [392, 330, 262, 196].forEach((f, i) => this.blip(f, t + i * 0.16, 0.28, 'triangle', 0.18)); break;
        case 'sync': this.blip(1046, t, 0.1, 'sine', 0.18); this.blip(1568, t + 0.06, 0.18, 'sine', 0.18); break;
        default: break;
      }
    } catch { /* silent */ }
  }
}
