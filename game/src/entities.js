// ECHO VAULT — entity updates and character art. One clear job: move, collide,
import {
  ARENA, PLAYER_SPEED, PLAYER_RADIUS, DASH_SPEED, DASH_TIME, DASH_COOLDOWN,
  SHIELD_TIME, SHIELD_COOLDOWN, EMP_COOLDOWN, EMP_RADIUS, ANCHOR_COOLDOWN,
  CORE_CHANNEL_TIME, WARDEN_VULN_TIME, clamp, dist,
} from './config.js';
import { iso, isoShadow, screenToWorld, extrudeBox, groundEllipse } from './iso.js';
import { glowSprite, drawGlow } from './glow.js';

// Lighten a hex color toward white (for glowing echo bodies): f scales
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f + 40);
  const g = Math.min(255, ((n >> 8) & 255) * f + 40);
  const b = Math.min(255, (n & 255) * f + 40);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y, vx: 0, vy: 0, r: PLAYER_RADIUS,
    hp: 3, maxHp: 3, dir: 0, dashT: 0, dashCd: 0, shieldT: 0, shieldCd: 0,
    empCd: 0, anchorCd: 0, invulnT: 0, hacking: false, chanTarget: null,
    trail: [], trailT: 0, face: 0,
  };
}

export function circleRectResolve(p, r, rect) {
  const cx = clamp(p.x, rect.x, rect.x + rect.w);
  const cy = clamp(p.y, rect.y, rect.y + rect.h);
  const dx = p.x - cx, dy = p.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= r || d === 0) return;
  const push = r - d;
  p.x += (dx / d) * push;
  p.y += (dy / d) * push;
}

export function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

export function damagePlayer(G, amount, sx, sy) {
  const p = G.player;
  if (p.invulnT > 0 || p.dashT > 0) return false;
  p.hp -= amount;
  p.invulnT = 1.0;
  const a = Math.atan2(p.y - sy, p.x - sx);
  p.vx = Math.cos(a) * 320; p.vy = Math.sin(a) * 320;
  G.audio.sfx('hit');
  G.addCallout(p.x, p.y - 30, 'HIT! -1', '#f87171');
  if (p.hp <= 0) {
    G.defeat();
  }
  return true;
}

// --- Player update -------------------------------------------------------
export function updatePlayer(G, dt) {
  const p = G.player;
  const S = G.stage;
  const input = G.input;
  const mv = input.readMove();
  const speed = PLAYER_SPEED * (G.hasMod('swift') ? 1.25 : 1) * (G.inJammer(p.x, p.y) ? 0.7 : 1);

  // Dash: Space / click / key 1. Direction is the move vector, else the mouse.
  const wantDash = input.wasPressed('Space') || input.wasPressed('Digit1') || G.clickDash;
  G.clickDash = false;
  if (wantDash && p.dashCd <= 0 && p.dashT <= 0) {
    let dx = mv.x, dy = mv.y;
    if (dx === 0 && dy === 0) {
      // The pointer arrives in screen pixels; the world is isometric, so
      const wp = screenToWorld(input.pointer.x, input.pointer.y);
      const a = Math.atan2(wp.y - p.y, wp.x - p.x);
      dx = Math.cos(a); dy = Math.sin(a);
    }
    const len = Math.hypot(dx, dy) || 1;
    p.vx = (dx / len) * DASH_SPEED; p.vy = (dy / len) * DASH_SPEED;
    p.dashT = DASH_TIME; p.dashCd = DASH_COOLDOWN;
    p.face = Math.atan2(dy, dx);
    G.audio.sfx('dash');
    G.addParticles(p.x, p.y, 10, '#22d3ee');
  }
  if (p.dashT > 0) {
    p.dashT -= dt;
  } else {
    p.vx = mv.x * speed;
    p.vy = mv.y * speed;
    if (mv.x !== 0 || mv.y !== 0) p.face = Math.atan2(mv.y, mv.x);
  }
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.shieldCd = Math.max(0, p.shieldCd - dt);
  p.empCd = Math.max(0, p.empCd - dt);
  p.anchorCd = Math.max(0, p.anchorCd - dt);
  p.invulnT = Math.max(0, p.invulnT - dt);

  // Abilities.
  if (input.wasPressed('Digit2') && p.shieldCd <= 0) {
    p.shieldT = SHIELD_TIME; p.shieldCd = SHIELD_COOLDOWN;
    G.audio.sfx('deflect');
  }
  if (input.wasPressed('Digit3') && p.empCd <= 0) {
    p.empCd = EMP_COOLDOWN;
    G.fireEMP();
  }
  if (input.wasPressed('Digit4') && p.anchorCd <= 0 && G.echoes.length > 0) {
    p.anchorCd = ANCHOR_COOLDOWN;
    const e = G.echoes[G.echoes.length - 1];
    e.anchored = true; e.anchorX = e.x; e.anchorY = e.y;
    G.addCallout(e.x, e.y - 30, 'ANCHORED!', '#34d399');
    G.audio.sfx('click');
  }
  p.shieldT = Math.max(0, (p.shieldT || 0) - dt);

  // Move + collide with walls and closed doors.
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = clamp(p.x, ARENA.x + p.r, ARENA.x + ARENA.w - p.r);
  p.y = clamp(p.y, ARENA.y + p.r, ARENA.y + ARENA.h - p.r);
  for (const w of S.walls) circleRectResolve(p, p.r, w);
  for (const d of S.doors) if (!d.open) circleRectResolve(p, p.r, d);

  // Trail.
  p.trailT -= dt;
  if (p.trailT <= 0) { p.trail.push({ x: p.x, y: p.y, life: 0.4 }); p.trailT = 0.03; }
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter((t) => t.life > 0);

  // Hacking terminals (hold E) and channeling cores (stand close).
  p.hacking = false;
  const holdingE = input.keys.has('KeyE');
  for (const t of S.terminals) {
    if (t.hackedT > 0) continue;
    if (dist(p.x, p.y, t.x, t.y) < 52 && holdingE) {
      p.hacking = true;
      t.hack += dt / 1.5;
      if (t.hack >= 1) {
        t.hack = 1; t.hackedT = 6;
        G.addScore(200, 'TERMINAL HACKED!');
        G.addCallout(t.x, t.y - 34, 'TERMINAL HACKED!', '#60a5fa');
        G.audio.sfx('hack');
      }
    }
  }
  p.chanTarget = null;
  for (const c of S.cores) {
    if (c.taken) continue;
    if (dist(p.x, p.y, c.x, c.y) < 48) {
      p.chanTarget = c;
      c.chan += dt / CORE_CHANNEL_TIME;
      if (c.chan >= 1) G.extractCore(c, 'you');
    }
  }
  // Warden contact damage (dash into a vulnerable Warden hurts it instead).
  const w = S.warden;
  if (w && w.hp > 0) {
    const d = dist(p.x, p.y, w.x, w.y);
    if (d < 62 + p.r) {
      if (!w.shield && p.dashT > 0) {
        G.damageWarden(40, p.x, p.y);
        p.vx = -p.vx * 0.6; p.vy = -p.vy * 0.6;
      } else if (!w.shield) {
        // Bounce off the armored hull.
        const a = Math.atan2(p.y - w.y, p.x - w.x);
        p.x = w.x + Math.cos(a) * (62 + p.r);
        p.y = w.y + Math.sin(a) * (62 + p.r);
      }
    }
  }
}

// --- Turrets --------------------------------------------------------------
export function updateTurret(G, t, dt) {
  const p = G.player;
  if (t.disabledT > 0) { t.disabledT -= dt; return; }
  // Terminal hacks disable turrets.
  for (const term of G.stage.terminals) {
    if (term.hackedT > 0 && term.link === 'T1') { t.disabledT = Math.max(t.disabledT, 0.1); }
  }
  t.t += dt;
  const d = dist(p.x, p.y, t.x, t.y);
  const wantAngle = Math.atan2(p.y - t.y, p.x - t.x);
  if (t.state === 'aim') {
    t.angle = angleLerp(t.angle, wantAngle, Math.min(1, dt * 3));
    if (d < t.range && t.t > 0.7) { t.state = 'fire'; t.t = 0; t.fireT = 0; G.audio.sfx('alarm'); }
  } else if (t.state === 'fire') {
    t.fireT += dt;
    // The beam is the segment from the muzzle toward the aim angle.
    const mx = t.x + Math.cos(t.angle) * 22, my = t.y + Math.sin(t.angle) * 22;
    const bx = mx + Math.cos(t.angle) * t.range, by = my + Math.sin(t.angle) * t.range;
    // Deflect: a shielding player (or a Mirror-Coat echo) sends it back.
    const shielded = p.shieldT > 0 && segDist(p.x, p.y, mx, my, bx, by) < p.r + 4;
    let deflected = false;
    if (shielded) {
      t.hp -= 2; deflected = true;
      G.addCallout(p.x, p.y - 30, 'LASER DEFLECTED!', '#22d3ee');
      G.addScore(150, 'DEFLECT');
      G.audio.sfx('deflect');
      G.syncEvent('deflect');
    }
    for (const e of G.echoes) {
      if (G.hasMod('mirror') && segDist(e.x, e.y, mx, my, bx, by) < 18) {
        t.hp -= 2; deflected = true;
        G.addCallout(e.x, e.y - 26, 'ECHO REFLECT!', '#f472b6');
        G.addScore(150, 'ECHO REFLECT');
        G.syncEvent('deflect');
      }
    }
    if (!deflected && segDist(p.x, p.y, mx, my, bx, by) < p.r) {
      damagePlayer(G, 1, t.x, t.y);
    }
    // Beam can also clip echoes (they flicker, they do not die).
    if (t.fireT > 0.7) { t.state = 'cool'; t.t = 0; }
    if (t.hp <= 0) {
      t.dead = true;
      G.addScore(300, 'TURRET DOWN');
      G.addCallout(t.x, t.y - 30, 'TURRET DOWN!', '#fbbf24');
      G.addParticles(t.x, t.y, 22, '#fbbf24');
    }
  } else {
    if (t.t > 1.4) { t.state = 'aim'; t.t = 0; }
  }
}

function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// --- The Chrono-Warden (stage 7 boss) --------------------------------------
export function updateWarden(G, dt) {
  const w = G.stage.warden;
  if (!w || w.hp <= 0) return;
  w.flash = Math.max(0, w.flash - dt);
  if (w.shieldDown) w.shield = false;
  const held = (link) => G.stage.plates.some((p) => p.link === link && p.heldBy);
  // Rotating laser arms sweep the chamber (telegraphed, then live).
  w.armAngle += w.armSpeed * dt * (w.shield ? 1 : 0.6);
  w.pulseT -= dt;
  if (w.pulseT <= 0) {
    if (held('N3')) {
      w.pulseT = 1.0; // node N3 held: the pulse never fires
    } else {
      w.pulseT = 3.2;
      w.state = 'telegraph';
      w.teleT = 0.8;
      G.addCallout(w.x, w.y - 100, 'SWEEP IN 0.8s — DIVE!', '#ef4444');
      G.audio.sfx('alarm');
    }
  }
  if (w.state === 'telegraph') {
    w.teleT -= dt;
    if (w.teleT <= 0) {
      w.state = 'sweep';
      w.sweepT = 1.1;
    }
  } else if (w.state === 'sweep') {
    w.sweepT -= dt;
    // The two arms are live laser bars; touching one hurts — unless the
    for (let k = 0; k < 2; k++) {
      if (held('N' + (k + 1))) continue;
      const a = w.armAngle + k * Math.PI;
      const x2 = w.x + Math.cos(a) * 200, y2 = w.y + Math.sin(a) * 200;
      const p = G.player;
      if (segDist(p.x, p.y, w.x, w.y, x2, y2) < p.r + 5) {
        damagePlayer(G, 1, w.x, w.y);
      }
      for (const e of G.echoes) {
        if (segDist(e.x, e.y, w.x, w.y, x2, y2) < 14) {
          G.addParticles(e.x, e.y, 6, e.color);
        }
      }
    }
    if (w.sweepT <= 0) w.state = 'guard';
  }
  // EMP and dash damage arrive through G.damageWarden.
}

// --- Mines & sweepers -------------------------------------------------------
export function updateMines(G, dt) {
  const p = G.player;
  for (const m of G.stage.mines) {
    if (m.gone) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    if (!m.armed && d < 56) { m.armed = true; m.fuse = 0.7; G.audio.sfx('alarm'); }
    if (m.armed) {
      m.fuse -= dt;
      if (m.fuse <= 0) {
        m.gone = true;
        G.addParticles(m.x, m.y, 26, '#f87171');
        G.audio.sfx('emp');
        if (dist(p.x, p.y, m.x, m.y) < 78) damagePlayer(G, 1, m.x, m.y);
      }
    }
  }
}

export function updateSweepers(G, dt) {
  for (const s of G.stage.sweepers) {
    s.t += s.speed * s.dir * dt;
    if (s.t > 1) { s.t = 1; s.dir = -1; }
    if (s.t < 0) { s.t = 0; s.dir = 1; }
    const x = s.x1 + (s.x2 - s.x1) * s.t;
    const y = s.y1 + (s.y2 - s.y1) * s.t;
    const p = G.player;
    if (Math.abs(p.x - x) < 26 && Math.abs(p.y - y) < 10) damagePlayer(G, 1, x, y);
    for (const e of G.echoes) {
      if (Math.abs(e.x - x) < 20 && Math.abs(e.y - y) < 8) G.addParticles(e.x, e.y, 4, e.color);
    }
  }
}

// --- Character art ----------------------------------------------------------
export function drawThief(ctx, x, y, color, opts = {}) {
  const { face = 0, alpha = 1, tag = null, scarf = true, time = 0, shield = false } = opts;
  const c = iso(x, y);
  const top = iso(x, y, 36);
  ctx.save();
  ctx.globalAlpha = alpha;
  // 1.6x visual scale: the whole figure is drawn in screen space scaled
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(1.6, 1.6);
  ctx.translate(-c.x, -c.y);
  // Bright ground ring beneath the feet, in the figure's own color.
  groundEllipse(ctx, x, y, 24, null, color, 3);
  // Long, soft directional drop-shadow.
  isoShadow(ctx, x, y, 16, 7, 0.45);
  // Holographic scarf: a sine ribbon trailing behind the movement direction.
  if (scarf) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.75;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const bx = x - Math.cos(face) * 9, by = y - Math.sin(face) * 9;
    const bp = iso(bx, by, 26);
    ctx.moveTo(bp.x, bp.y);
    for (let i = 1; i <= 4; i++) {
      const px = bx - Math.cos(face) * i * 8 + Math.sin(time * 6 + i) * 3.5;
      const py = by - Math.sin(face) * i * 8 + Math.cos(time * 5 + i * 1.3) * 3.5;
      const pp = iso(px, py, 26 - i * 2.4);
      ctx.lineTo(pp.x, pp.y);
    }
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }
  // Additive halo behind the hood: the figure glows against the dark floor
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, glowSprite(color), top.x, top.y - 4, 20);
  ctx.restore();
  // Cloak body, assembled from 3D boxes: a wide hem box, a narrower torso
  const tinted = color !== '#e8ecff';
  const sA = tinted ? shade(color, 0.85) : '#33406a';
  const sB = tinted ? shade(color, 0.6) : '#2a3556';
  const sC = tinted ? shade(color, 0.4) : '#232c48';
  extrudeBox(ctx, x - 13, y - 13, 26, 26, 18, sC, sC, '#121a2c');
  extrudeBox(ctx, x - 10, y - 10, 20, 20, 30, sB, sB, '#141c30');
  extrudeBox(ctx, x - 8, y - 8, 16, 16, 36, sA, sA, '#161e33');
  // Gold trim at the hem (the south face's top edge).
  const h1 = iso(x - 13, y + 13, 18);
  const h2 = iso(x + 13, y + 13, 18);
  ctx.strokeStyle = 'rgba(251,191,36,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(h1.x, h1.y);
  ctx.lineTo(h2.x, h2.y);
  ctx.stroke();
  // Rim light on the upper-left edge (the light rakes in from the left).
  const r1 = iso(x - 10, y + 10, 30);
  const r2 = iso(x - 8, y + 8, 36);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha * 0.95;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(r1.x, r1.y);
  ctx.lineTo(r2.x, r2.y);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  // Hood + glowing visor slit, sitting on the shoulder box.
  ctx.fillStyle = tinted ? sB : '#2a3358';
  ctx.beginPath();
  ctx.arc(top.x + Math.cos(face) * 2, top.y - 2, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(top.x - 5, top.y - 3);
  ctx.lineTo(top.x + 6, top.y - 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(top.x - 2, top.y - 3);
  ctx.lineTo(top.x + 3, top.y - 3);
  ctx.stroke();
  // Dagger glint in the facing hand (projected along the facing vector).
  const d1 = iso(x + Math.cos(face) * 12, y + Math.sin(face) * 12, 16);
  const d2 = iso(x + Math.cos(face) * 20, y + Math.sin(face) * 20, 16);
  ctx.strokeStyle = '#e8ecff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.stroke();
  // Reflect shield ring (projected ground ellipse).
  if (shield) {
    groundEllipse(ctx, x, y, 23 + Math.sin(time * 8) * 1.5, null, 'rgba(34,211,238,0.9)', 3);
  }
  // Overhead tag.
  if (tag) {
    ctx.font = 'bold 10px Georgia, serif';
    const w = ctx.measureText(tag).width + 10;
    ctx.fillStyle = 'rgba(10,14,26,0.85)';
    ctx.beginPath();
    ctx.roundRect(c.x - w / 2, top.y - 30, w, 14, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, c.x, top.y - 22.5);
  }
  ctx.restore(); // end 1.6x scale
  ctx.restore();
}

// Sentry turret in 3D: a hex-prism base, a barrel along the aim vector,
export function drawTurret(ctx, t, time) {
  const c = iso(t.x, t.y);
  const aim = iso(t.x + Math.cos(t.angle) * t.range, t.y + Math.sin(t.angle) * t.range);
  // Sentry vision cone (additive) along the aim direction: a wide faint
  if (t.disabledT <= 0) {
    const cr = t.range * 0.7;
    for (const [spread, col] of [[0.22, 'rgba(239,68,68,0.06)'], [0.11, 'rgba(251,146,60,0.07)']]) {
      const l = iso(t.x + Math.cos(t.angle - spread) * cr, t.y + Math.sin(t.angle - spread) * cr);
      const r = iso(t.x + Math.cos(t.angle + spread) * cr, t.y + Math.sin(t.angle + spread) * cr);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(l.x, l.y);
      ctx.lineTo(r.x, r.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // Telegraph dashed line while aiming (muzzle to aim point).
  const muzzle = iso(t.x, t.y, 14);
  if (t.state === 'aim' && t.disabledT <= 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(239,68,68,0.4)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
    ctx.restore();
  }
  // Fire beam.
  if (t.state === 'fire' && t.disabledT <= 0) {
    const b1 = iso(t.x + Math.cos(t.angle) * 22, t.y + Math.sin(t.angle) * 22, 14);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(239,68,68,0.35)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
    ctx.restore();
  }
  // Long drop-shadow.
  isoShadow(ctx, t.x, t.y, 15, 6, 0.45);
  // Hex base as a 3D hex prism: the two south-facing side quads, then the
  const hexTop = [], hexBot = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    hexTop.push(iso(t.x + Math.cos(a) * 15, t.y + Math.sin(a) * 15, 8));
    hexBot.push(iso(t.x + Math.cos(a) * 15, t.y + Math.sin(a) * 15, 0));
  }
  ctx.fillStyle = t.disabledT > 0 ? '#232830' : '#2e2118';
  for (const [i, j] of [[0, 1], [1, 2]]) {
    ctx.beginPath();
    ctx.moveTo(hexTop[i].x, hexTop[i].y);
    ctx.lineTo(hexTop[j].x, hexTop[j].y);
    ctx.lineTo(hexBot[j].x, hexBot[j].y);
    ctx.lineTo(hexBot[i].x, hexBot[i].y);
    ctx.closePath();
    ctx.fill();
  }
  const base = iso(t.x, t.y, 8);
  ctx.fillStyle = t.disabledT > 0 ? '#2a2f3a' : '#3a2b22';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  hexTop.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Rotating barrel: a short bar from the base top toward the aim point.
  const bEnd = iso(t.x + Math.cos(t.angle) * 24, t.y + Math.sin(t.angle) * 24, 14);
  ctx.strokeStyle = '#c9d1e3';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(bEnd.x, bEnd.y);
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(bEnd.x, bEnd.y, 4, 0, Math.PI * 2);
  ctx.fill();
  // Eye dome.
  ctx.fillStyle = t.disabledT > 0 ? '#4b5563' : '#ef4444';
  ctx.beginPath();
  ctx.arc(base.x, base.y, 5, 0, Math.PI * 2);
  ctx.fill();
  if (t.disabledT > 0) {
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFLINE', c.x, c.y - 30);
  }
}

// The Chrono-Warden in 2.5D: an extruded hexagonal vault-core prism, piston
export function drawWarden(ctx, w, time) {
  const { x, y } = w;
  const c = iso(x, y);
  const top = iso(x, y, 48);
  ctx.save();
  // Long cast shadow.
  isoShadow(ctx, x, y, 50, 17, 0.5);
  // 1.6x visual scale for the BODY only (legs, hex core, dial, eye, gear
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(1.6, 1.6);
  ctx.translate(-c.x, -c.y);
  // Piston legs.
  for (let k = -1; k <= 1; k++) {
    const lb = iso(x + k * 36, y + 19);
    const lt = iso(x + k * 36, y + 19, 28);
    ctx.fillStyle = '#4a4238';
    ctx.fillRect(lb.x - 6, lt.y, 12, lb.y - lt.y);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(lb.x - 6, lb.y - 6, 12, 4);
  }
  // Sweep arms (behind the body): segmented bars with claw tips.
  for (let k = 0; k < 2; k++) {
    const a = w.armAngle + k * Math.PI;
    const b = iso(x, y, 36);
    const tip = iso(x + Math.cos(a) * 119, y + Math.sin(a) * 119, 34);
    // Live sweep beam.
    if (w.state === 'sweep') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(239,68,68,0.8)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = '#8b93ad';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.strokeStyle = '#3a3f52';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    // Gold segment ticks along the arm.
    ctx.fillStyle = '#fbbf24';
    for (let s = 1; s <= 3; s++) {
      const px = b.x + (tip.x - b.x) * (s / 4);
      const py = b.y + (tip.y - b.y) * (s / 4);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Claw emitter.
    ctx.fillStyle = w.state === 'sweep' ? '#ef4444' : '#f87171';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Telegraph hazard grid before a sweep: a dashed projected ellipse on
  if (w.state === 'telegraph') {
    ctx.save();
    ctx.setLineDash([10, 8]);
    groundEllipse(ctx, x, y, 84, null, 'rgba(239,68,68,0.45)', 3);
    ctx.setLineDash([]);
    ctx.restore();
  }
  // Hex core body: extruded hexagonal prism (side faces, then the top face).
  const hexTop = [], hexBot = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    hexTop.push(iso(x + Math.cos(a) * 63, y + Math.sin(a) * 63, 48));
    hexBot.push(iso(x + Math.cos(a) * 63, y + Math.sin(a) * 63, 0));
  }
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    ctx.fillStyle = i % 2 === 0 ? '#1c2740' : '#141b2e';
    ctx.beginPath();
    ctx.moveTo(hexTop[i].x, hexTop[i].y);
    ctx.lineTo(hexTop[j].x, hexTop[j].y);
    ctx.lineTo(hexBot[j].x, hexBot[j].y);
    ctx.lineTo(hexBot[i].x, hexBot[i].y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#232a42';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  hexTop.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Inner vault dial (rotating) on the top face.
  ctx.save();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, 28, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 0.4;
    const s1 = iso(x + Math.cos(a) * 28, y + Math.sin(a) * 28, 48);
    const s2 = iso(x + Math.cos(a) * 38, y + Math.sin(a) * 38, 48);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();
  }
  ctx.restore();
  // Glowing core eye.
  const eye = w.shield ? '#fbbf24' : '#ef4444';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, glowSprite(eye, { a0: 1 }), top.x, top.y, 26);
  ctx.restore();
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.arc(top.x, top.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(top.x, top.y, 6, 0, Math.PI * 2);
  ctx.fill();
  // Gear crown: six orbs ringing the top, slowly rotating.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time * 0.25;
    const gx = iso(x + Math.cos(a) * 63, y + Math.sin(a) * 63, 67);
    ctx.fillStyle = '#8b93ad';
    ctx.beginPath();
    ctx.arc(gx.x, gx.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(gx.x, gx.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shield dome: a dashed gold projected ellipse while guarded, a solid
  ctx.restore(); // end 1.6x body scale
  ctx.save();
  if (w.shield) {
    groundEllipse(ctx, x, y, 52, 'rgba(251,191,36,0.05)', null);
    ctx.setLineDash([18, 10]);
    groundEllipse(ctx, x, y, 52, null, 'rgba(251,191,36,0.75)', 3);
  } else {
    groundEllipse(ctx, x, y, 52, null, 'rgba(239,68,68,0.9)', 3);
  }
  ctx.restore();
  // HP bar above (raised: the 1.6x body + gear crown now reach higher).
  const hpTop = iso(x, y, 150);
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.85)';
  ctx.beginPath();
  ctx.roundRect(hpTop.x - 70, hpTop.y - 20, 140, 12, 5);
  ctx.fill();
  ctx.fillStyle = w.shield ? '#fbbf24' : '#ef4444';
  ctx.beginPath();
  ctx.roundRect(hpTop.x - 68, hpTop.y - 18, 136 * Math.max(0, w.hp / w.maxHp), 8, 4);
  ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  const lt = w.shield ? 'THE CHRONO-WARDEN · SHIELDED' : 'THE CHRONO-WARDEN · VULNERABLE';
  const lw = ctx.measureText(lt).width + 16;
  ctx.fillStyle = 'rgba(8,12,24,0.92)';
  ctx.beginPath();
  ctx.roundRect(hpTop.x - lw / 2, hpTop.y - 40, lw, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.fillText(lt, hpTop.x, hpTop.y - 28);
  // Phase readout: the Warden's phase is its remaining health in thirds.
  const ph = w.hp > 200 ? 'PHASE 1/3' : w.hp > 100 ? 'PHASE 2/3' : 'PHASE 3/3';
  const pw = ctx.measureText(ph).width + 16;
  ctx.fillStyle = 'rgba(8,12,24,0.92)';
  ctx.beginPath();
  ctx.roundRect(hpTop.x + lw / 2 + 6, hpTop.y - 40, pw, 18, 9);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(ph, hpTop.x + lw / 2 + 6 + pw / 2, hpTop.y - 28);
  ctx.restore();
  ctx.restore();
}
