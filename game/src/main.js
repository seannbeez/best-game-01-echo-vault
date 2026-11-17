// ECHO VAULT — Break Time. Steal Everything. — game core. One clear job:
// own the state machine (title / play / draft / victory / defeat), the
// 8-second loop and its rewind, the echo lifecycle, scoring, the draft,
// the staged screenshot scenes, and the window.__game test handle.
import {
  W, H, ARENA, LOOP_BASE, MAX_ECHOES, ECHO_COLORS, MODS, WARDEN_HP,
  clamp, dist,
} from './config.js';
import { makeRng } from './random.js';
import { AudioSys } from './audio.js';
import { buildStage, STAGE_NAMES, STAGE_INTROS } from './levels.js';
import { EchoRecorder, makeEchoes } from './echo.js';
import { Input } from './input.js';
import { iso } from './iso.js';
import {
  createPlayer, updatePlayer, updateTurret, updateWarden, updateMines,
  updateSweepers, damagePlayer, drawThief, drawTurret,
} from './entities.js';
import * as R from './render.js';

const urlParams = new URLSearchParams(window.location.search);
const SHOT = urlParams.get('shot');

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = new AudioSys();
    this.input = new Input(canvas);
    this.time = 0;
    this.frames = 0;
    this.fps = 60;
    this.timeScale = 1;
    this.testTarget = null;
    this.clickDash = false;
    this.paused = false;
    this.particles = [];
    this.callouts = [];
    this.state = this.freshState();
    this.rng = makeRng(1337);
    this.setupInput();
    this.startStage(1);
    if (SHOT) this.setupStagedScene(SHOT);
  }

  freshState() {
    return {
      screen: 'title', stage: 1, score: 0, coresGot: 0, coresTotal: 3,
      loopsUsed: 0, loopsSaved: 0, combo: 1, maxSync: 1, syncCount: 0,
      mods: [], draft: [], grade: 'S', hpLeft: 3, maxHp: 3, timeBonus: 0,
      scoreByStage: [0, 0, 0, 0, 0, 0, 0], stageScore: 0, loopsThisStage: 0,
    };
  }

  get loopDuration() {
    return LOOP_BASE + (this.hasMod('overclock') ? 2 : 0);
  }

  hasMod(id) { return this.state.mods.some((m) => m.id === id); }

  setupInput() {
    const input = this.input;
    input.onKey = (code) => {
      if (code === 'KeyM') {
        this.audio.ensure();
        this.audio.toggleMute();
      }
      if (code === 'KeyP' && this.state.screen === 'play') {
        this.paused = !this.paused;
      }
      // R (rewind) is handled in updatePlay via wasPressed, so dock clicks
      // and keyboard presses take the same single path.
      if (code === 'Space' || code === 'Enter' || code === 'KeyR') {
        const s = this.state.screen;
        if (s === 'title' || s === 'victory' || s === 'defeat') {
          this.startRun();
          // A restart must not leak the same keypress into the fresh run:
          // without this, the KeyR that restarted from defeat also fires a
          // rewind (and Space would fire a dash) on the very next frame.
          // (Only on a restart — consuming during play would eat dashes.)
          this.input.consume();
        }
      }
    };
    input.onPointerDown = (x, y, isTouch) => {
      this.audio.ensure();
      if (this.state.screen === 'title') {
        if (x >= 510 && x <= 770 && y >= 566 && y <= 622) this.startRun();
        return;
      }
      if (this.state.screen === 'draft') {
        this.state.draft.forEach((m, i) => {
          const cx = 640 - 3 * 140 + i * 290 + 15;
          if (x >= cx && x <= cx + 260 && y >= 168 && y <= 498) this.pickMod(m);
        });
        return;
      }
      if (this.state.screen === 'victory') {
        if (x >= 530 && x <= 750 && y >= 558 && y <= 606) this.startRun();
        return;
      }
      if (this.state.screen === 'defeat') {
        if (x >= 530 && x <= 750 && y >= 380 && y <= 432) this.startRun();
        return;
      }
      if (this.state.screen !== 'play' || this.paused) return;
      // Mute / pause pills (top-right).
      if (y >= 12 && y <= 38) {
        if (x >= 1180 && x <= 1224) { this.audio.toggleMute(); return; }
        if (x >= 1228 && x <= 1268) { this.paused = !this.paused; return; }
      }
      // Bottom dock cards are clickable abilities.
      const dockW = 5 * 84 + 4 * 8;
      const dockX = 640 - dockW / 2;
      for (let i = 0; i < 5; i++) {
        const dx = dockX + i * 92;
        if (x >= dx && x <= dx + 84 && y >= 648 && y <= 706) {
          this.pressAbility(i);
          return;
        }
      }
      // Otherwise: a click dashes toward the pointer (touch: right half only,
      // the left half is the virtual joystick).
      if (!(isTouch && x < 560)) {
        this.input.pointer.x = x;
        this.input.pointer.y = y;
        this.clickDash = true;
      }
    };
  }

  pressAbility(i) {
    // Route a dock click through the same keys the keyboard uses.
    const code = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyR'][i];
    this.input.pressed.add(code);
  }

  startRun() {
    this.state = this.freshState();
    this.state.screen = 'play';
    // Never inherit stale steering: the test-drive target AND the virtual
    // joystick it writes into (a leftover active joystick walks the thief
    // into the first laser of the new run).
    this.testTarget = null;
    this.input.joy.active = false;
    this.input.joy.dx = 0;
    this.input.joy.dy = 0;
    this.audio.ensure();
    this.audio.startMusic();
    this.audio.sfx('click');
    this.startStage(1);
  }

  startStage(n) {
    const st = this.state;
    st.stage = n;
    st.stageScore = 0;
    st.loopsThisStage = 0;
    this.stage = buildStage(n, makeRng(1337 + n * 77));
    this.player = createPlayer(this.stage.spawn);
    this.player.maxHp = st.maxHp;
    this.player.hp = Math.min(st.hpLeft, st.maxHp);
    this.recordings = [];
    this.echoes = [];
    this.recorder = new EchoRecorder();
    this.recorder.begin();
    this.loopT = this.loopDuration;
    this.loopElapsed = 0;
    st.coresTotal = 3;
    st.coresGot = 0;
    if (n === 7) this.stage.omega = null;
    this.callouts = [];
    this.particles = [];
  }

  // --- Loop & rewind ---------------------------------------------------------
  rewind(manual = false) {
    const rec = this.recorder.finish(this.loopDuration);
    if (rec) {
      if (this.recordings.length >= MAX_ECHOES) this.recordings.shift();
      this.recordings.push(rec);
      this.echoes = makeEchoes(this.recordings);
      this.addCallout(this.player.x, this.player.y - 34, `REWIND! ECHO #${this.recordings.length}`, '#22d3ee');
    }
    this.state.loopsUsed++;
    this.state.loopsThisStage++;
    // Reset the thief to the loop start; the world keeps what was stolen.
    const s = this.stage.spawn;
    const p = this.player;
    p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0;
    p.dashT = 0; p.shieldT = 0; p.hacking = false; p.chanTarget = null;
    this.loopElapsed = 0;
    this.loopT = this.loopDuration;
    this.recorder.begin();
    this.audio.sfx('rewind');
    // Echoes that were anchored stay anchored only for their own loop; a
    // rewind clears anchors so the next loop starts clean.
    for (const e of this.echoes) { e.anchored = false; }
  }

  // --- Scoring & sync ----------------------------------------------------------
  addScore(n, label) {
    const mult = this.state.combo * (this.hasMod('greedy') ? 1.5 : 1);
    const gain = Math.round(n * mult);
    this.state.score += gain;
    this.state.stageScore += gain;
    return gain;
  }

  syncEvent(kind) {
    const st = this.state;
    st.syncCount++;
    st.combo = Math.min(1 + st.syncCount * 0.5, 4.5);
    st.maxSync = Math.max(st.maxSync, st.combo);
    this.addCallout(this.player.x, this.player.y - 52, `CHRONO-SYNC! x${st.combo.toFixed(2)} COMBO`, '#fbbf24');
    this.audio.sfx('sync');
  }

  actorsActing() {
    // How many actors are doing something useful right now?
    let n = 0;
    const p = this.player;
    if (p.chanTarget || p.hacking || p.shieldT > 0 || p.dashT > 0) n++;
    for (const e of this.echoes) {
      if (e.hack || e.shield || e.dash) n++;
      for (const pl of this.stage.plates) {
        if (pl.heldBy === e.idx) { n++; break; }
      }
    }
    return n;
  }

  extractCore(c, who) {
    if (c.taken) return;
    c.taken = true;
    this.state.coresGot++;
    this.addScore(500, 'CORE');
    this.addCallout(c.x, c.y - 34, 'CORE EXTRACTED!', '#22d3ee');
    this.addParticles(c.x, c.y, 24, '#22d3ee');
    this.audio.sfx('grab');
    if (this.actorsActing() >= 2) this.syncEvent('core');
    if (this.state.stage === 7) {
      // All three power cells channeled: the Warden's shield drops for good.
      if (this.stage.cores.every((x) => x.taken)) {
        const w = this.stage.warden;
        w.shield = false;
        w.shieldDown = true;
        this.addCallout(w.x, w.y - 100, 'WARDEN SHIELD BROKEN!', '#fbbf24');
        this.addScore(400, 'SHIELD BROKEN');
        this.audio.sfx('sync');
      }
    } else if (this.state.coresGot >= this.state.coresTotal) {
      this.stage.exit.open = true;
      this.addCallout(this.stage.exit.x, this.stage.exit.y - 40, 'EXIT OPEN!', '#34d399');
    }
  }

  damageWarden(amount, sx, sy) {
    const w = this.stage.warden;
    if (!w || w.hp <= 0 || w.shield) return;
    w.hp -= amount;
    w.flash = 0.15;
    this.addScore(100, 'WARDEN HIT');
    this.addCallout(w.x + (Math.random() * 60 - 30), w.y - 80, `SHATTER -${amount}!`, '#fbbf24');
    this.addParticles(sx, sy, 12, '#fbbf24');
    this.audio.sfx('hit');
    if (w.hp <= 0) {
      w.hp = 0;
      this.stage.omega = { x: w.x, y: w.y, chan: 0 };
      this.addCallout(w.x, w.y - 110, 'WARDEN DOWN! GRAB THE OMEGA CORE!', '#fbbf24');
      this.addParticles(w.x, w.y, 40, '#fbbf24');
      this.addScore(1000, 'WARDEN DOWN');
      this.audio.sfx('win');
    }
  }

  fireEMP() {
    const p = this.player;
    this.audio.sfx('emp');
    this.addParticles(p.x, p.y, 26, '#60a5fa');
    for (const t of this.stage.turrets) {
      if (t.dead) continue;
      if (dist(p.x, p.y, t.x, t.y) < EMP_RADIUS) t.disabledT = this.hasMod('emp') ? 3 : 1.5;
    }
    for (const m of this.stage.mines) {
      if (!m.gone && dist(p.x, p.y, m.x, m.y) < EMP_RADIUS) {
        m.gone = true;
        this.addParticles(m.x, m.y, 10, '#60a5fa');
      }
    }
    const w = this.stage.warden;
    if (w && w.hp > 0 && !w.shield && dist(p.x, p.y, w.x, w.y) < EMP_RADIUS + 60) {
      this.damageWarden(60, p.x, p.y);
    }
    this.addCallout(p.x, p.y - 34, 'EMP PULSE!', '#60a5fa');
  }

  inJammer(x, y) {
    return this.stage.jammers.some((j) => dist(x, y, j.x, j.y) < j.r);
  }

  threatList() {
    const S = this.stage;
    const list = [];
    const liveTurrets = S.turrets.filter((t) => !t.dead);
    if (liveTurrets.length) {
      list.push({ name: `Sentry Turret ×${liveTurrets.length}`, note: 'rotating', frac: liveTurrets[0].hp / 3, color: '#ef4444' });
    }
    const liveLasers = S.lasers.filter((l) => l.on).length;
    if (liveLasers) list.push({ name: `Laser Grid ×${liveLasers}`, note: 'live beams', frac: null });
    const liveMines = S.mines.filter((m) => !m.gone).length;
    if (liveMines) list.push({ name: `Chrono-Mine ×${liveMines}`, note: 'proximity', frac: null });
    if (S.sweepers.length) list.push({ name: `Laser Sweeper ×${S.sweepers.length}`, note: 'patrolling', frac: null });
    if (S.warden && S.warden.hp > 0) {
      list.push({ name: 'Warden Shield Nodes', note: S.warden.shield ? 'shielded' : 'BROKEN', frac: S.warden.hp / S.warden.maxHp, color: '#fbbf24' });
    }
    return list;
  }

  // --- Stage flow ---------------------------------------------------------------
  stageClear() {
    const st = this.state;
    const saved = Math.max(0, 3 - st.loopsThisStage);
    st.loopsSaved += saved;
    const bonus = saved * 150;
    st.timeBonus += bonus;
    this.addScore(1000 + bonus, 'STAGE CLEAR');
    st.scoreByStage[st.stage - 1] = st.stageScore;
    st.hpLeft = Math.min(st.maxHp, this.player.hp + 1);
    this.audio.sfx('win');
    if (st.stage >= 7) { this.victory(); return; }
    // Draft: 3 mods the player does not hold yet (pool is 8, cap 5 held).
    const pool = MODS.filter((m) => !this.hasMod(m.id));
    const picks = [];
    const bag = pool.slice();
    while (picks.length < 3 && bag.length) {
      picks.push(bag.splice(Math.floor(this.rng.next() * bag.length), 1)[0]);
    }
    while (picks.length < 3) picks.push(MODS[Math.floor(this.rng.next() * MODS.length)]);
    st.draft = picks;
    st.screen = 'draft';
  }

  pickMod(m) {
    const st = this.state;
    if (st.mods.length < 5 && !this.hasMod(m.id)) st.mods.push(m);
    if (m.id === 'plated') { st.maxHp += 1; st.hpLeft = Math.min(st.maxHp, st.hpLeft + 1); }
    this.audio.sfx('grab');
    const next = st.stage + 1;
    this.startStage(next);
    st.screen = 'play';
  }

  victory() {
    const st = this.state;
    st.scoreByStage[6] = st.stageScore;
    st.hpLeft = this.player.hp;
    st.grade = st.score >= 12000 ? 'S' : st.score >= 9000 ? 'A' : st.score >= 6000 ? 'B' : 'C';
    st.screen = 'victory';
    this.audio.sfx('win');
    this.audio.stopMusic();
  }

  defeat() {
    const st = this.state;
    st.hpLeft = 0;
    st.screen = 'defeat';
    this.audio.sfx('lose');
    this.audio.stopMusic();
  }

  // --- Particles & callouts ------------------------------------------------------
  addParticles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 160;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3,
      });
    }
  }

  addCallout(x, y, text, color) {
    this.callouts.push({ x, y, text, color, life: 1.6, max: 1.6 });
    if (this.callouts.length > 4) this.callouts.shift();
  }

  // --- Frame update -------------------------------------------------------------
  update(dtRaw) {
    const dt = Math.min(0.05, dtRaw) * this.timeScale;
    this.time += dt;
    const st = this.state;
    if (st.screen === 'title') {
      this.updateAttract(dt);
    } else if (st.screen === 'play' && !this.paused) {
      this.updatePlay(dt);
    }
    // Particles and callouts decay on every screen.
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const c of this.callouts) if (!c.frozen) c.life -= dt;
    this.callouts = this.callouts.filter((c) => c.life > 0);
    this.input.consume();
    this.frames++;
  }

  updateAttract(dt) {
    // Title background: the demo echoes replay their heist on stage 1.
    this.loopElapsed = (this.loopElapsed + dt) % this.loopDuration;
    for (const e of this.echoes) e.update(this.loopElapsed, dt);
    for (const t of this.stage.turrets) t.angle += dt * 0.3;
  }

  updatePlay(dt) {
    const st = this.state;
    const S = this.stage;
    this.loopElapsed += dt;
    this.loopT -= dt;
    if (this.loopT <= 0) { this.rewind(); return; }
    if (this.input.wasPressed('KeyR')) { this.rewind(true); return; }

    // Test-drive steering: move the thief toward a target point.
    if (this.testTarget) {
      const p = this.player;
      const d = dist(p.x, p.y, this.testTarget.x, this.testTarget.y);
      if (d < 14) {
        this.testTarget = null;
        this.input.joy.active = false;
        this.input.joy.dx = 0; this.input.joy.dy = 0;
      } else {
        const a = Math.atan2(this.testTarget.y - p.y, this.testTarget.x - p.x);
        this.input.joy.active = true;
        this.input.joy.dx = Math.cos(a);
        this.input.joy.dy = Math.sin(a);
      }
    }
    // (Touch joystick state is left alone when no test target is set.)

    updatePlayer(this, dt);
    for (const e of this.echoes) e.update(this.loopElapsed, dt);
    this.recorder.sample(this.loopElapsed, this.player);

    // Plates: held by the thief or by whichever echo stands on them.
    for (const pl of S.plates) {
      pl.heldBy = null;
      if (dist(this.player.x, this.player.y, pl.x, pl.y) < pl.r + 12) pl.heldBy = 'you';
      else {
        for (const e of this.echoes) {
          if (dist(e.x, e.y, pl.x, pl.y) < pl.r + 12) { pl.heldBy = e.idx; break; }
        }
      }
    }
    // Doors open when their plates are held ('V' needs A and B together).
    for (const d of S.doors) {
      if (d.needTwo) {
        d.open = S.plates.some((p) => p.link === 'A' && p.heldBy) &&
                 S.plates.some((p) => p.link === 'B' && p.heldBy);
      } else {
        d.open = S.plates.some((p) => p.link === d.link && p.heldBy);
      }
    }
    // Laser grids switch off while their plate is held.
    for (const l of S.lasers) {
      l.on = l.link ? !S.plates.some((p) => p.link === l.link && p.heldBy) : true;
    }
    // Laser contact damage (dash and shield both protect).
    const p = this.player;
    for (const l of S.lasers) {
      if (!l.on) continue;
      if (this.segDist(p.x, p.y, l.x1, l.y1, l.x2, l.y2) < p.r + 2) {
        damagePlayer(this, 1, (l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2);
      }
    }
    // Terminal hack timers.
    for (const t of S.terminals) t.hackedT = Math.max(0, t.hackedT - dt);
    // Turrets, mines, sweepers, Warden.
    for (const t of S.turrets) if (!t.dead) updateTurret(this, t, dt);
    S.turrets = S.turrets.filter((t) => !t.dead);
    updateMines(this, dt);
    updateSweepers(this, dt);
    if (S.warden) updateWarden(this, dt);
    // Echoes channel cores by standing at the pods (co-op extraction).
    for (const e of this.echoes) {
      for (const c of S.cores) {
        if (c.taken) continue;
        if (dist(e.x, e.y, c.x, c.y) < 48) {
          c.chan += dt / 1.1;
          if (c.chan >= 1) this.extractCore(c, 'echo' + e.idx);
        }
      }
    }
    // Phase Dash trails damage turrets and the Warden (mod).
    if (this.hasMod('phase')) {
      for (const e of this.echoes) {
        if (!e.dash) continue;
        for (const t of S.turrets) {
          if (!t.dead && dist(e.x, e.y, t.x, t.y) < 46) { t.hp -= 1; this.addParticles(t.x, t.y, 6, '#a78bfa'); }
        }
      }
    }
    // Exit gate (stages 1–6).
    if (S.exit && S.exit.open && dist(p.x, p.y, S.exit.x, S.exit.y) < 36) {
      this.stageClear();
      return;
    }
    // Omega Core (stage 7).
    if (S.omega) {
      const o = S.omega;
      if (dist(p.x, p.y, o.x, o.y) < 52) {
        o.chan += dt / 1.1;
        if (o.chan >= 1) this.victory();
      }
    }
  }

  segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  }

  // --- Rendering ---------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const st = this.state;
    ctx.clearRect(0, 0, W, H);
    R.drawFloor(ctx, this, this.time);
    R.drawProps(ctx, this, this.time);
    if (st.screen !== 'title') R.drawEntities(ctx, this, this.time);
    else this.drawAttract(ctx);
    if (st.screen === 'play' || st.screen === 'draft') R.drawHUD(ctx, this, this.time);
    if (st.screen === 'title') R.drawTitle(ctx, this, this.time);
    else if (st.screen === 'draft') R.drawDraft(ctx, this);
    else if (st.screen === 'victory') R.drawVictory(ctx, this);
    else if (st.screen === 'defeat') R.drawDefeat(ctx, this);
    if (this.paused && st.screen === 'play') R.drawPause(ctx);
    // Touch joystick.
    if (this.input.joy.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(232,236,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.input.joy.ox, this.input.joy.oy, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(232,236,255,0.6)';
      ctx.beginPath();
      ctx.arc(this.input.joy.ox + this.input.joy.dx * 56, this.input.joy.oy + this.input.joy.dy * 56, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawAttract(ctx) {
    // The title centerpiece (glass column, partitions, furniture) sits
    // under the demo echoes, so it never covers them or their paths.
    R.drawTitleCenterpiece(ctx);
    // The demo echoes replay on the title screen, with their dotted paths.
    for (const e of this.echoes) {
      const pts = e.futurePath(this.loopElapsed, 1.2, 0.12);
      ctx.save();
      ctx.strokeStyle = e.color;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const pp = iso(p.x, p.y);
        if (i === 0) ctx.moveTo(pp.x, pp.y); else ctx.lineTo(pp.x, pp.y);
      });
      ctx.stroke();
      ctx.restore();
    }
    for (const t of this.stage.turrets) if (!t.dead) drawTurret(ctx, t, this.time);
    for (const e of this.echoes) {
      drawThief(ctx, e.x, e.y, e.color, {
        face: Math.atan2(e.vy, e.vx), alpha: 0.92, tag: 'ECHO ' + (e.idx + 1),
        time: this.time, shield: e.shield,
      });
    }
  }

  // --- Staged screenshot scenes --------------------------------------------------
  setupStagedScene(name) {
    if (name === 'title') {
      this.state.screen = 'title';
      this.echoes = this.makeDemoEchoes();
      this.loopElapsed = 2.2;
      this.loopT = 5.8;
    } else if (name === 'boss') {
      this.startStage(7);
      const st = this.state;
      st.screen = 'play';
      st.score = 14937;
      st.combo = 4.5;
      st.maxSync = 4.5;
      st.syncCount = 7;
      st.grade = 'S';
      st.coresGot = 3;
      st.mods = [MODS[4], MODS[1], MODS[2], MODS[6]];
      // All three power cells extracted: the shield is down for good.
      for (const c of this.stage.cores) { c.taken = true; c.chan = 1; }
      const w = this.stage.warden;
      w.shield = false;
      w.shieldDown = true;
      w.hp = 180;
      w.state = 'sweep';
      w.sweepT = 0.8;
      w.armAngle = 0.5;
      // Four staged echoes: three pinning the node plates, one deflecting.
      this.echoes = this.makeStagedBossEchoes();
      this.recordings = this.echoes.map((e) => e.recording);
      this.loopElapsed = 2.8;
      this.loopT = 5.2;
      this.player.x = 560;
      this.player.y = 440;
      this.player.face = 0.6;
      this.player.dashT = 0.1;
      this.callouts = [];
      this.addCallout(430, 210, 'WARDEN SHIELD BROKEN!', '#fbbf24');
      this.addCallout(560, 470, 'CHRONO-SYNC! x4.50 COMBO', '#fbbf24');
      this.addCallout(830, 300, 'ECHO SYNC! +500', '#22d3ee');
      this.addCallout(700, 150, 'LASER REFLECTED!', '#f472b6');
      for (const c of this.callouts) { c.frozen = true; c.life = c.max; }
      this.stage.turrets[0].state = 'fire';
      this.stage.turrets[0].angle = 0.4;
    } else if (name === 'draft') {
      this.state.screen = 'draft';
      this.player.x = 400;
      this.player.y = 600;
      this.state.stage = 3;
      this.state.score = 8600;
      this.state.mods = [MODS[4], MODS[5], MODS[7], MODS[3]];
      this.state.draft = [MODS[0], MODS[1], MODS[2]];
      this.state.grade = 'A';
    } else if (name === 'victory') {
      const st = this.state;
      st.screen = 'victory';
      st.stage = 7;
      st.score = 24860;
      st.coresGot = 21;
      st.coresTotal = 21;
      st.loopsUsed = 14;
      st.loopsSaved = 7;
      st.maxSync = 4.5;
      st.combo = 4.5;
      st.timeBonus = 1050;
      st.hpLeft = 2;
      st.maxHp = 3;
      st.grade = 'S';
      st.scoreByStage = [1200, 2400, 3100, 3800, 4600, 5200, 6560];
    }
  }

  // Synthetic recordings for the title attract: waypoint loops at constant
  // speed, with action flags at the marked waypoints.
  makeDemoRecording(waypoints, duration, speed) {
    const samples = [];
    let t = 0;
    let prev = waypoints[0];
    let px = prev.x, py = prev.y;
    samples.push({ t: 0, x: px, y: py, vx: 0, vy: 0, dash: false, shield: false, hack: false });
    for (let i = 1; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const d = dist(px, py, wp.x, wp.y);
      const seg = d / speed;
      const steps = Math.max(2, Math.ceil(seg / 0.05));
      for (let s = 1; s <= steps; s++) {
        const f = s / steps;
        const tt = t + seg * f;
        if (tt > duration) break;
        samples.push({
          t: tt, x: px + (wp.x - px) * f, y: py + (wp.y - py) * f,
          vx: (wp.x - px) / seg, vy: (wp.y - py) / seg,
          dash: wp.act === 'dash' && f > 0.7, shield: wp.act === 'shield', hack: wp.act === 'hack',
        });
      }
      t += seg;
      px = wp.x; py = wp.y;
      if (t >= duration) break;
    }
    return { duration, samples };
  }

  makeDemoEchoes() {
    const recs = [
      this.makeDemoRecording([
        { x: 250, y: 355 }, { x: 470, y: 341, act: 'hack' }, { x: 640, y: 200 },
        { x: 920, y: 150, act: 'dash' }, { x: 700, y: 520 }, { x: 300, y: 150 },
      ], LOOP_BASE, 240),
      this.makeDemoRecording([
        { x: 900, y: 500 }, { x: 640, y: 520, act: 'shield' }, { x: 470, y: 341 },
        { x: 300, y: 560, act: 'dash' }, { x: 700, y: 300 }, { x: 1000, y: 560 },
      ], LOOP_BASE, 220),
      this.makeDemoRecording([
        { x: 640, y: 355 }, { x: 300, y: 150, act: 'hack' }, { x: 920, y: 560 },
        { x: 470, y: 341, act: 'shield' }, { x: 640, y: 200, act: 'dash' },
      ], LOOP_BASE, 260),
    ];
    return makeEchoes(recs);
  }

  makeStagedBossEchoes() {
    // Static-position recordings: each echo holds its post for the loop.
    const at = (x, y, flags = {}) => {
      const samples = [];
      for (let t = 0; t <= LOOP_BASE; t += 0.05) {
        samples.push({ t, x, y, vx: 0, vy: 0, dash: false, shield: !!flags.shield, hack: !!flags.hack });
      }
      return { duration: LOOP_BASE, samples };
    };
    return makeEchoes([
      at(400, 180, { hack: true }),
      at(880, 180, { hack: true }),
      at(640, 570, { hack: true }),
      at(520, 300, { shield: true }),
    ]);
  }

  shotReady() {
    return this.frames >= 2;
  }

  // --- Test handle ----------------------------------------------------------------
  warp(n) {
    this.startStage(n);
    this.state.screen = 'play';
  }

  restart() { this.startRun(); }

  setMove(x, y) { this.testTarget = { x, y }; }
  clearMove() { this.testTarget = null; }

  setSpeed(s) { this.timeScale = s; }
}

// --- Boot --------------------------------------------------------------------------
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = {
  get state() {
    return {
      screen: game.state.screen,
      stage: game.state.stage,
      score: game.state.score,
      coresGot: game.state.coresGot,
      coresTotal: game.state.coresTotal,
      loopsUsed: game.state.loopsUsed,
      combo: game.state.combo,
      grade: game.state.grade,
      hp: game.player.hp,
      maxHp: game.player.maxHp,
      loopT: game.loopT,
      loopElapsed: game.loopElapsed,
      echoes: game.echoes.length,
      mods: game.state.mods.map((m) => m.id),
      fps: Math.round(game.fps),
      paused: game.paused,
    };
  },
  get _g() { return game; },
  shotReady: () => game.shotReady(),
  restart: () => game.restart(),
  warp: (n) => game.warp(n),
  setMove: (x, y) => game.setMove(x, y),
  clearMove: () => game.clearMove(),
  dash: () => { game.clickDash = true; },
  ability: (i) => game.pressAbility(i),
  setSpeed: (s) => game.setSpeed(s),
};

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 0) game.fps = game.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
