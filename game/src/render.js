// ECHO VAULT — all drawing: the full-bleed vault floor, props, entities,
// floating HUD, and the title / draft / victory / defeat screens.
// One clear job: turn game state into pixels. No logic lives here.
import { W, H, ARENA, ECHO_COLORS, clamp, lerp, hash01 } from './config.js';
import { STAGE_NAMES } from './levels.js';
import { iso, screenToWorld, isoDiamond, extrudeBox, isoShadow, ISO_S } from './iso.js';
import { drawThief, drawTurret, drawWarden, segDist } from './entities.js';

const GOLD = '#fbbf24';
const CYAN = '#22d3ee';

function pill(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function text(ctx, s, x, y, font, color, align = 'center', baseline = 'middle') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(s, x, y);
}

// --- Floor ------------------------------------------------------------------
// The diorama floats over a deep dark-teal/obsidian abyss with a faint
// holographic circuit grid. The vault floor itself is an isometric diamond
// of brushed steel tiles with glowing conduits and a glossy sheen.
export function drawFloor(ctx, G, time) {
  // Abyss.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04141a');
  g.addColorStop(0.5, '#071018');
  g.addColorStop(1, '#030507');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Holographic circuit grid (dense, Timelie-style): cyan '+' crosses and
  // right-angle corner traces scattered over the abyss, a few pulsing nodes,
  // and slow-drifting dust motes. All positions are deterministic (hash01),
  // so the abyss is stable frame to frame.
  ctx.save();
  ctx.strokeStyle = 'rgba(34,211,238,0.08)';
  ctx.lineWidth = 1;
  for (let x = -40; x < W + 40; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 120, H);
    ctx.stroke();
  }
  for (let y = -40; y < H + 40; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + 60);
    ctx.stroke();
  }
  for (let i = 0; i < 110; i++) {
    const nx = hash01(i * 1.37 + 0.11) * W;
    const ny = hash01(i * 2.91 + 0.53) * H;
    const a = 0.10 + 0.12 * hash01(i * 4.7 + 0.9);
    const arm = 5 + 9 * hash01(i * 3.3 + 0.2);
    ctx.strokeStyle = `rgba(34,211,238,${a})`;
    ctx.lineWidth = 1.2;
    if (i % 3 === 0) {
      // Corner trace: two right-angle arms, like a circuit elbow.
      const dx = (hash01(i * 7.1) > 0.5 ? 1 : -1) * arm * 1.6;
      const dy = (hash01(i * 5.3) > 0.5 ? 1 : -1) * arm * 1.2;
      ctx.beginPath();
      ctx.moveTo(nx, ny + dy);
      ctx.lineTo(nx, ny);
      ctx.lineTo(nx + dx, ny);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(nx - arm, ny); ctx.lineTo(nx + arm, ny);
      ctx.moveTo(nx, ny - arm * 0.7); ctx.lineTo(nx, ny + arm * 0.7);
      ctx.stroke();
    }
  }
  // Pulsing circuit nodes + drifting dust motes.
  for (let i = 0; i < 18; i++) {
    const nx = hash01(i * 9.4 + 0.31) * W;
    const ny = hash01(i * 6.2 + 0.77) * H;
    const pulse = 0.18 + 0.16 * Math.sin(time * 1.4 + i * 1.7);
    ctx.fillStyle = `rgba(34,211,238,${pulse})`;
    ctx.beginPath();
    ctx.arc(nx, ny, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 42; i++) {
    const bx = hash01(i * 3.9 + 0.41) * W;
    const by = hash01(i * 8.8 + 0.19) * H;
    const drift = Math.sin(time * 0.22 + i * 2.4) * 14;
    ctx.fillStyle = `rgba(165,243,252,${0.10 + 0.10 * hash01(i * 1.9)})`;
    ctx.fillRect(bx + drift, by + Math.cos(time * 0.16 + i) * 8, 2, 2);
  }
  ctx.restore();
  // The floating floor slab: a thick extruded diamond under the whole arena.
  const corners = [
    iso(ARENA.x, ARENA.y), iso(ARENA.x + ARENA.w, ARENA.y),
    iso(ARENA.x + ARENA.w, ARENA.y + ARENA.h), iso(ARENA.x, ARENA.y + ARENA.h),
  ];
  ctx.save();
  // Slab sides (the diorama's thickness).
  ctx.fillStyle = '#0a0f1c';
  ctx.beginPath();
  ctx.moveTo(corners[3].x, corners[3].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[2].x, corners[2].y + 26);
  ctx.lineTo(corners[3].x, corners[3].y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#070a13';
  ctx.beginPath();
  ctx.moveTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[1].x, corners[1].y + 26);
  ctx.lineTo(corners[2].x, corners[2].y + 26);
  ctx.closePath();
  ctx.fill();
  // Steel tile diamonds with brushed variation, corner rivets, and a few
  // edge-lit glowing floor panels (deterministic per tile).
  const ts = 92;
  for (let ty = 0; ty < ARENA.h / ts; ty++) {
    for (let tx = 0; tx < ARENA.w / ts; tx++) {
      const cx = ARENA.x + tx * ts + ts / 2;
      const cy = ARENA.y + ty * ts + ts / 2;
      const shade = ((tx * 7 + ty * 13) % 3);
      const fill = shade === 0 ? '#141b2e' : shade === 1 ? '#101624' : '#171f36';
      isoDiamond(ctx, cx, cy, ts / 2, ts / 2, fill, 'rgba(120,140,180,0.14)');
      const p = iso(cx, cy);
      const hw = (ts / 2) * 0.866 * ISO_S;
      const hh = (ts / 2) * 0.5 * ISO_S;
      // Rivets at the four diamond corners.
      ctx.fillStyle = 'rgba(190,210,240,0.22)';
      for (const [rx, ry] of [[0, -hh], [hw, 0], [0, hh], [-hw, 0]]) {
        ctx.fillRect(p.x + rx - 1, p.y + ry - 1, 2, 2);
      }
      // Edge-lit panel: one glowing edge per chosen tile.
      const lit = hash01(tx * 13.7 + ty * 7.3 + 0.5);
      if (lit < 0.14) {
        ctx.strokeStyle = lit < 0.07 ? 'rgba(34,211,238,0.5)' : 'rgba(251,191,36,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - hw, p.y);
        ctx.lineTo(p.x, p.y - hh);
        ctx.stroke();
      }
      // Hazard chevron on a few tiles near the chamber edge.
      if (ty === 0 && tx % 3 === 1) {
        ctx.fillStyle = 'rgba(251,191,36,0.28)';
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y + hh * 0.4);
        ctx.lineTo(p.x, p.y - hh * 0.2);
        ctx.lineTo(p.x + 8, p.y + hh * 0.4);
        ctx.lineTo(p.x, p.y + hh * 0.1);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // Glowing gold/cyan floor conduits along the tile seams.
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let a = iso(ARENA.x, ARENA.y + 46);
  let b = iso(ARENA.x + ARENA.w, ARENA.y + 46);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  a = iso(ARENA.x, ARENA.y + ARENA.h - 46);
  b = iso(ARENA.x + ARENA.w, ARENA.y + ARENA.h - 46);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(34,211,238,0.38)';
  ctx.beginPath();
  a = iso(ARENA.x + 46, ARENA.y);
  b = iso(ARENA.x + 46, ARENA.y + ARENA.h);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  a = iso(ARENA.x + ARENA.w - 46, ARENA.y);
  b = iso(ARENA.x + ARENA.w - 46, ARENA.y + ARENA.h);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
  // Gold conduit sparks.
  for (const s of G.stage.sparks) {
    const tw = 0.5 + 0.5 * Math.sin(time * 2 + s.p);
    const p = iso(s.x, s.y);
    ctx.fillStyle = `rgba(251,191,36,${0.3 * tw * s.s})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6 * s.s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Brass inlay rim around the chamber.
  ctx.strokeStyle = 'rgba(251,191,36,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(34,211,238,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y - 6);
  ctx.lineTo(corners[1].x, corners[1].y - 6);
  ctx.lineTo(corners[2].x, corners[2].y - 6);
  ctx.lineTo(corners[3].x, corners[3].y - 6);
  ctx.closePath();
  ctx.stroke();
  // Glossy sheen sweeping the floor, plus a soft central glow.
  ctx.save();
  const sheen = ctx.createLinearGradient(200, 80, 1080, 640);
  sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.045)');
  sheen.addColorStop(0.75, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
  ctx.closePath();
  ctx.fill();
  const cc = iso(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
  const cg = ctx.createRadialGradient(cc.x, cc.y, 20, cc.x, cc.y, 420);
  cg.addColorStop(0, 'rgba(180,220,255,0.06)');
  cg.addColorStop(1, 'rgba(180,220,255,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(cc.x - 420, cc.y - 260, 840, 520);
  ctx.restore();
  // Volumetric spotlight cones from the ceiling (additive), with warm
  // light pools where they land on the floor.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [sx, col, a0] of [[360, '255,240,200', 0.16], [640, '255,240,200', 0.16], [920, '255,240,200', 0.16], [780, '251,191,36', 0.10]]) {
    const grad = ctx.createLinearGradient(sx, 0, sx, 430);
    grad.addColorStop(0, `rgba(${col},${a0})`);
    grad.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx - 26, 0);
    ctx.lineTo(sx + 26, 0);
    ctx.lineTo(sx + 170, 430);
    ctx.lineTo(sx - 170, 430);
    ctx.closePath();
    ctx.fill();
    const pool = ctx.createRadialGradient(sx, 430, 4, sx, 430, 150);
    pool.addColorStop(0, `rgba(${col},${a0 * 0.9})`);
    pool.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(sx, 430, 150, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Vignette.
  const v = ctx.createRadialGradient(640, 360, 300, 640, 360, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// --- Flat world decals ------------------------------------------------------
// Flat things that live ON the floor plane: jammer fields, mirror decals,
// and the additive security laser beams + sweepers. Everything with height
// (walls, glass, plates, doors, mines, terminals, cores, exit, Omega Core,
// turrets, Warden) is drawn depth-sorted in drawEntities.
export function drawProps(ctx, G, time) {
  const S = G.stage;
  // Jammer fields: translucent iso ellipses with rotating dashed rings.
  for (const j of S.jammers) {
    const c = iso(j.x, j.y);
    const rx = j.r * ISO_S * 0.866;
    const ry = j.r * ISO_S * 0.5;
    ctx.save();
    ctx.fillStyle = 'rgba(168,85,247,0.10)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.5)';
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 30;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(216,180,254,0.9)';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEMPORAL JAMMER', c.x, c.y - ry - 8);
    ctx.restore();
  }
  // Mirrors: small iso diamonds with a bright edge.
  for (const m of S.mirrors) {
    const c = iso(m.x, m.y);
    ctx.save();
    ctx.fillStyle = 'rgba(186,230,253,0.85)';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 9);
    ctx.lineTo(c.x + 15, c.y);
    ctx.lineTo(c.x, c.y + 9);
    ctx.lineTo(c.x - 15, c.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x - 15, c.y);
    ctx.lineTo(c.x, c.y - 9);
    ctx.lineTo(c.x + 15, c.y);
    ctx.stroke();
    ctx.restore();
    text(ctx, 'REFLECTOR', c.x, c.y + 22, 'bold 9px Georgia, serif', 'rgba(201,209,227,0.8)');
  }
  // Laser grids: razor-sharp crimson beams along the iso floor, additive,
  // with glowing emitter pillars at each end.
  for (const l of S.lasers) {
    const a = iso(l.x1, l.y1);
    const b = iso(l.x2, l.y2);
    if (!l.on) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tw = 0.75 + 0.25 * Math.sin(time * 6 + l.x1);
    // Wide outer halo, then the hot core, then a white spine.
    ctx.strokeStyle = `rgba(239,68,68,${0.22 * tw})`;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = `rgba(239,68,68,${0.8 * tw})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * tw})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    // Emitter pillars.
    for (const p of [a, b]) {
      const grad = ctx.createLinearGradient(p.x, p.y - 60, p.x, p.y);
      grad.addColorStop(0, 'rgba(239,68,68,0)');
      grad.addColorStop(1, `rgba(239,68,68,${0.65 * tw})`);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - 3, p.y - 60, 6, 60);
    }
    ctx.restore();
    for (const p of [a, b]) {
      ctx.fillStyle = '#3a2b22';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // Sweepers: glowing orange bars sliding along their axis.
  for (const s of S.sweepers) {
    const x = s.x1 + (s.x2 - s.x1) * s.t;
    const y = s.y1 + (s.y2 - s.y1) * s.t;
    const a = iso(x - 24, y);
    const b = iso(x + 24, y);
    const c = iso(x, y);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(239,68,68,0.7)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Vault furniture (procedural props) -------------------------------------
// Crates, consoles, barrels and vents placed on FREE floor cells only: every
// candidate tile center is rejected if it is near a plate, core, terminal,
// exit, spawn, mine, turret, the Warden, a laser line, a wall/door, a jammer
// or a sweeper path — so no prop ever covers an objective or blocks a route.
// Candidates hug the chamber walls (like real vault furniture). The list is
// cached per stage object and purely visual: props have no collision.
const propCache = new WeakMap();
function getProps(S) {
  const cached = propCache.get(S);
  if (cached) return cached;
  const out = [];
  const near = (x, y, r, list) => list.some((o) => Math.hypot(o.x - x, o.y - y) < r);
  const inRect = (x, y, r, list) => list.some((o) => x > o.x - r && x < o.x + o.w + r && y > o.y - r && y < o.y + o.h + r);
  for (let ty = 0; ty < ARENA.h / 92; ty++) {
    for (let tx = 0; tx < ARENA.w / 92; tx++) {
      const cx = ARENA.x + tx * 92 + 46;
      const cy = ARENA.y + ty * 92 + 46;
      const border = Math.min(cx - ARENA.x, ARENA.x + ARENA.w - cx, cy - ARENA.y, ARENA.y + ARENA.h - cy);
      if (border > 150) continue; // hug the walls
      if (near(cx, cy, 70, S.plates) || near(cx, cy, 70, S.cores) || near(cx, cy, 70, S.terminals)) continue;
      if (near(cx, cy, 80, [S.spawn]) || (S.exit && near(cx, cy, 80, [S.exit]))) continue;
      if (near(cx, cy, 55, S.mines) || near(cx, cy, 60, S.turrets)) continue;
      if (S.warden && Math.hypot(cx - S.warden.x, cy - S.warden.y) < 140) continue;
      if (S.lasers.some((l) => segDist(cx, cy, l.x1, l.y1, l.x2, l.y2) < 36)) continue;
      if (inRect(cx, cy, 26, S.walls) || inRect(cx, cy, 26, S.doors)) continue;
      if (S.jammers.some((j) => Math.hypot(cx - j.x, cy - j.y) < j.r + 10)) continue;
      if (S.sweepers.some((s) => segDist(cx, cy, s.x1, s.y1, s.x2, s.y2) < 34)) continue;
      const h = hash01(tx * 5.1 + ty * 11.7 + S.num * 3.3);
      if (h > 0.55 || out.length >= 10) continue;
      out.push({ x: cx, y: cy, kind: h < 0.18 ? 'crate' : h < 0.34 ? 'console' : h < 0.46 ? 'barrel' : 'vent', seed: h });
    }
  }
  propCache.set(S, out);
  return out;
}

function drawProp(ctx, p, time) {
  if (p.kind === 'vent') {
    isoDiamond(ctx, p.x, p.y, 16, 16, '#0d1220', 'rgba(148,163,184,0.4)');
    const c = iso(p.x, p.y);
    ctx.strokeStyle = 'rgba(100,116,139,0.8)';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(c.x - 8 + i * 8, c.y - 4 - i * 2);
      ctx.lineTo(c.x - 2 + i * 8, c.y + 1 - i * 2);
      ctx.stroke();
    }
    return;
  }
  if (p.kind === 'crate') {
    extrudeBox(ctx, p.x - 17, p.y - 17, 34, 34, 22, '#33415e', '#232c44', '#182035');
    const t1 = iso(p.x - 17, p.y - 17, 22);
    const t2 = iso(p.x + 17, p.y - 17, 22);
    const t3 = iso(p.x + 17, p.y + 17, 22);
    const t4 = iso(p.x - 17, p.y + 17, 22);
    ctx.strokeStyle = 'rgba(251,191,36,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y); ctx.lineTo(t3.x, t3.y);
    ctx.moveTo(t2.x, t2.y); ctx.lineTo(t4.x, t4.y);
    ctx.stroke();
    return;
  }
  if (p.kind === 'console') {
    extrudeBox(ctx, p.x - 15, p.y - 11, 30, 22, 26, '#1e3a5f', '#16294a', '#0f1e38');
    const top = iso(p.x, p.y, 26);
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(top.x - 8, top.y - 4, 16, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(top.x - 5, top.y - 2, 10, 2);
    const blink = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + p.seed * 20));
    ctx.fillStyle = `rgba(239,68,68,${blink})`;
    ctx.beginPath();
    ctx.arc(top.x + 12, top.y - 6, 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // barrel
  extrudeBox(ctx, p.x - 9, p.y - 9, 18, 18, 26, '#5b4a2a', '#3d2f14', '#2c2110');
  const bt = iso(p.x, p.y, 26);
  ctx.strokeStyle = 'rgba(251,191,36,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(bt.x, bt.y, 10, 5.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// --- Depth-sorted world -----------------------------------------------------
// Everything with height goes through one painter's pass: each drawable
// carries a depth key (x + y — larger is nearer the camera), the list is
// sorted, then drawn. That is what makes the isometric diorama read as real
// 3D: nearer walls and characters occlude farther ones.
export function drawEntities(ctx, G, time) {
  const S = G.stage;
  const items = [];
  const add = (x, y, f) => items.push({ d: x + y, f });

  // Walls: extruded dark-slate slabs with height variation, a brass top
  // edge, an inset top panel, vent slits on the tall face, and a gold base
  // trim — the chamber reads as built architecture, not flat bars.
  for (const w of S.walls) {
    add(w.x + w.w / 2, w.y + w.h / 2, () => {
      const wh = 42 + Math.floor(hash01(w.x * 0.13 + w.y * 0.29) * 3) * 14;
      extrudeBox(ctx, w.x, w.y, w.w, w.h, wh, '#2b3a55', '#1c2740', '#121a2c');
      const t1 = iso(w.x, w.y, wh);
      const t2 = iso(w.x + w.w, w.y, wh);
      const t3 = iso(w.x + w.w, w.y + w.h, wh);
      const t4 = iso(w.x, w.y + w.h, wh);
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y); ctx.lineTo(t4.x, t4.y);
      ctx.closePath();
      ctx.stroke();
      // Inset top panel.
      const ins = Math.min(5, w.w / 4, w.h / 4);
      const i1 = iso(w.x + ins, w.y + ins, wh);
      const i2 = iso(w.x + w.w - ins, w.y + ins, wh);
      const i3 = iso(w.x + w.w - ins, w.y + w.h - ins, wh);
      const i4 = iso(w.x + ins, w.y + w.h - ins, wh);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.moveTo(i1.x, i1.y); ctx.lineTo(i2.x, i2.y);
      ctx.lineTo(i3.x, i3.y); ctx.lineTo(i4.x, i4.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,184,0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Vent slits on the tall face (only on long walls).
      if (Math.max(w.w, w.h) > 60) {
        ctx.strokeStyle = 'rgba(148,163,184,0.35)';
        ctx.lineWidth = 2;
        for (const f of [0.3, 0.5, 0.7]) {
          const sx = t4.x + (t3.x - t4.x) * f;
          const sy = t4.y + (t3.y - t4.y) * f;
          ctx.beginPath();
          ctx.moveTo(sx, sy + 6);
          ctx.lineTo(sx, sy + 16);
          ctx.stroke();
        }
      }
      // Gold base trim along the front-bottom edge.
      const b4 = iso(w.x, w.y + w.h, 0);
      const b3 = iso(w.x + w.w, w.y + w.h, 0);
      ctx.strokeStyle = 'rgba(251,191,36,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b4.x, b4.y); ctx.lineTo(b3.x, b3.y);
      ctx.stroke();
    });
  }
  // Glass partitions: translucent cyan extruded panels with dark frame
  // posts, a gold top rail, and a diagonal glint.
  for (const gp of S.glass) {
    add(gp.x + gp.w / 2, gp.y + gp.h / 2, () => {
      extrudeBox(ctx, gp.x, gp.y, gp.w, gp.h, 34,
        'rgba(103,232,249,0.20)', 'rgba(103,232,249,0.10)', 'rgba(103,232,249,0.06)');
      const t1 = iso(gp.x, gp.y, 34);
      const t2 = iso(gp.x + gp.w, gp.y, 34);
      const t3 = iso(gp.x + gp.w, gp.y + gp.h, 34);
      const t4 = iso(gp.x, gp.y + gp.h, 34);
      ctx.strokeStyle = 'rgba(103,232,249,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y); ctx.lineTo(t4.x, t4.y);
      ctx.closePath();
      ctx.stroke();
      // Frame posts at both ends + gold top rail + glint.
      for (const [fx, fy] of [[gp.x, gp.y], [gp.x + gp.w - 6, gp.y + gp.h - 6]]) {
        extrudeBox(ctx, fx, fy, 6, 6, 34, '#1c2740', '#141b2e', '#0d1322');
      }
      ctx.strokeStyle = 'rgba(251,191,36,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t1.x + 8, t1.y + 10);
      ctx.lineTo(t3.x - 8, t3.y - 4);
      ctx.stroke();
    });
  }
  // Vault furniture on free floor cells (never on objectives or paths).
  for (const p of getProps(S)) {
    add(p.x, p.y, () => drawProp(ctx, p, time));
  }
  // Pressure plates: glowing iso diamonds. A held plate rises as a vertical
  // light pillar; on stage 7 the node plates are shield pylons linked to
  // the Warden by magenta energy tethers.
  for (const p of S.plates) {
    add(p.x, p.y, () => {
      const held = p.heldBy;
      const col = held ? (held === 'you' ? '#e8ecff' : ECHO_COLORS[held] || '#34d399') : '#94a3b8';
      isoDiamond(ctx, p.x, p.y, p.r, p.r, held ? 'rgba(52,211,153,0.30)' : 'rgba(148,163,184,0.14)', col);
      const c = iso(p.x, p.y);
      ctx.fillStyle = held ? '#34d399' : '#cbd5e1';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.link, c.x, c.y + 1);
      if (held) {
        const pillarCol = S.warden ? '217,70,239' : '34,211,238';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.5 + 0.5 * Math.sin(time * 4);
        const grad = ctx.createLinearGradient(c.x, c.y - 110, c.x, c.y);
        grad.addColorStop(0, `rgba(${pillarCol},0)`);
        grad.addColorStop(1, `rgba(${pillarCol},${0.6 + 0.25 * pulse})`);
        ctx.fillStyle = grad;
        ctx.fillRect(c.x - 8, c.y - 110, 16, 110);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * pulse})`;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, p.r + 4, (p.r + 4) * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${pillarCol},${0.5 + 0.2 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, p.r + 10, (p.r + 10) * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        text(ctx, held === 'you' ? 'YOU' : 'ECHO ' + (held + 1), c.x, c.y + p.r * 0.7 + 12, 'bold 9px Georgia, serif', col);
      }
      if (S.warden && S.warden.hp > 0) {
        const w = iso(S.warden.x, S.warden.y, 30);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = held ? 'rgba(217,70,239,0.75)' : 'rgba(217,70,239,0.35)';
        ctx.lineWidth = held ? 2.5 : 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 60);
        ctx.lineTo(w.x, w.y);
        ctx.stroke();
        ctx.restore();
      }
    });
  }
  // Doors: extruded gold steel gates while locked; dashed green outline open.
  for (const d of S.doors) {
    add(d.x + d.w / 2, d.y + d.h / 2, () => {
      if (d.open) {
        const c1 = iso(d.x, d.y), c2 = iso(d.x + d.w, d.y);
        const c3 = iso(d.x + d.w, d.y + d.h), c4 = iso(d.x, d.y + d.h);
        ctx.strokeStyle = '#34d399';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        extrudeBox(ctx, d.x, d.y, d.w, d.h, 52, '#8a6d2b', '#4b3b1a', '#3d2f14');
        const t = iso(d.x + d.w / 2, d.y + d.h / 2, 52);
        text(ctx, d.needTwo ? 'A+B' : d.link, t.x, t.y, 'bold 11px Georgia, serif', '#fbbf24');
        // Hazard-striped threshold along the door's front-bottom edge.
        const b4 = iso(d.x, d.y + d.h, 0);
        const b3 = iso(d.x + d.w, d.y + d.h, 0);
        for (let i = 0; i < 5; i++) {
          const f = (i + 0.5) / 5;
          const px = b4.x + (b3.x - b4.x) * f;
          const py = b4.y + (b3.y - b4.y) * f + 7;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(251,191,36,0.85)' : 'rgba(17,24,39,0.9)';
          ctx.beginPath();
          ctx.moveTo(px, py - 4);
          ctx.lineTo(px + 7, py);
          ctx.lineTo(px, py + 4);
          ctx.lineTo(px - 7, py);
          ctx.closePath();
          ctx.fill();
        }
      }
    });
  }
  // Mines: spiked iso discs with a pulsing danger glow.
  for (const m of S.mines) {
    if (m.gone) continue;
    add(m.x, m.y, () => {
      isoShadow(ctx, m.x, m.y, 12, 5, 0.4);
      const c = iso(m.x, m.y);
      ctx.fillStyle = m.armed ? '#ef4444' : '#3a3f52';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * 11, c.y + Math.sin(a) * 6);
        ctx.lineTo(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 9);
        ctx.stroke();
      }
      if (m.armed) text(ctx, '!', c.x, c.y - 2, 'bold 11px Georgia, serif', '#fff');
    });
  }
  // Terminals: extruded consoles with a glowing screen face.
  for (const t of S.terminals) {
    add(t.x, t.y, () => {
      isoShadow(ctx, t.x, t.y, 14, 6, 0.4);
      extrudeBox(ctx, t.x - 14, t.y - 16, 28, 32, 26,
        t.hackedT > 0 ? '#1d4ed8' : '#1e3a5f', '#16294a', '#0f1e38');
      const top = iso(t.x, t.y, 26);
      ctx.fillStyle = t.hackedT > 0 ? '#052e16' : '#082f49';
      ctx.fillRect(top.x - 9, top.y - 5, 18, 9);
      ctx.fillStyle = t.hackedT > 0 ? '#4ade80' : '#67e8f9';
      ctx.fillRect(top.x - 6, top.y - 3, 12, 2);
      if (t.hackedT > 0) {
        text(ctx, 'HACKED', top.x, top.y - 16, 'bold 9px Georgia, serif', '#60a5fa');
      } else if (t.hack > 0) {
        ctx.fillStyle = '#0b1020';
        ctx.fillRect(top.x - 16, top.y - 20, 32, 5);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(top.x - 16, top.y - 20, 32 * t.hack, 5);
        text(ctx, 'HOLD E TO HACK', top.x, top.y - 28, 'bold 9px Georgia, serif', '#93c5fd');
      } else {
        text(ctx, 'TERMINAL', top.x, top.y - 16, 'bold 9px Georgia, serif', 'rgba(147,197,253,0.8)');
      }
    });
  }
  // Cores in glass containment pods: a glowing faceted diamond floating
  // above an iso glass ellipse, with a channel progress ring.
  for (const c of S.cores) {
    if (c.taken) continue;
    add(c.x, c.y, () => {
      isoShadow(ctx, c.x, c.y, 20, 8, 0.4);
      const p = iso(c.x, c.y);
      const bob = Math.sin(time * 2 + c.x) * 3;
      ctx.fillStyle = 'rgba(147,197,253,0.12)';
      ctx.strokeStyle = 'rgba(147,197,253,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 20, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Vertical light beam above the pod (like the reference's pillars).
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(p.x, p.y - 90, p.x, p.y);
      beam.addColorStop(0, 'rgba(34,211,238,0)');
      beam.addColorStop(1, 'rgba(34,211,238,0.30)');
      ctx.fillStyle = beam;
      ctx.fillRect(p.x - 6, p.y - 90, 12, 90);
      ctx.restore();
      const pulse = 1 + 0.12 * Math.sin(time * 3 + c.x);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(p.x, p.y - 12 + bob, 1, p.x, p.y - 12 + bob, 22);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.35, 'rgba(34,211,238,0.7)');
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 12 + bob, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 12 - 11 * pulse + bob);
      ctx.lineTo(p.x + 8 * pulse, p.y - 12 + bob);
      ctx.lineTo(p.x, p.y - 12 + 11 * pulse + bob);
      ctx.lineTo(p.x - 8 * pulse, p.y - 12 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 12 - 5 + bob);
      ctx.lineTo(p.x + 3.5, p.y - 12 + bob);
      ctx.lineTo(p.x, p.y - 12 + 5 + bob);
      ctx.lineTo(p.x - 3.5, p.y - 12 + bob);
      ctx.closePath();
      ctx.fill();
      if (c.chan > 0) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 28, 15, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.chan);
        ctx.stroke();
      }
    });
  }
  // Exit gate: a glowing gold portal once all cores are taken.
  if (S.exit) {
    const e = S.exit;
    add(e.x, e.y, () => {
      const p = iso(e.x, e.y);
      const pulse = 0.6 + 0.4 * Math.sin(time * 3);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
      grad.addColorStop(0, `rgba(255,255,255,${e.open ? 0.9 * pulse : 0.2})`);
      grad.addColorStop(0.4, `rgba(251,191,36,${e.open ? 0.55 * pulse : 0.1})`);
      grad.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = e.open ? `rgba(251,191,36,${0.9 * pulse})` : '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 24, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, e.open ? 'EXIT' : 'LOCKED', p.x, p.y, 'bold 12px Georgia, serif', e.open ? '#34d399' : '#cbd5e1');
    });
  }
  // Omega Core (stage 7, after the Warden falls).
  if (S.omega) {
    const o = S.omega;
    add(o.x, o.y, () => {
      const p = iso(o.x, o.y);
      const bob = Math.sin(time * 2) * 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(p.x, p.y - 10 + bob, 2, p.x, p.y - 10 + bob, 30);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.35, 'rgba(217,70,239,0.7)');
      grad.addColorStop(1, 'rgba(217,70,239,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 10 + bob, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 10 - 16 + bob);
      ctx.lineTo(p.x + 12, p.y - 10 + bob);
      ctx.lineTo(p.x, p.y - 10 + 16 + bob);
      ctx.lineTo(p.x - 12, p.y - 10 + bob);
      ctx.closePath();
      ctx.fill();
      text(ctx, 'OMEGA CORE', p.x, p.y - 40, 'bold 11px Georgia, serif', GOLD);
      if (o.chan > 0) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 26, 14, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.chan);
        ctx.stroke();
      }
    });
  }
  // Turrets and the Warden.
  for (const t of S.turrets) if (!t.dead) add(t.x, t.y, () => drawTurret(ctx, t, time));
  if (S.warden && S.warden.hp > 0) add(S.warden.x, S.warden.y, () => drawWarden(ctx, S.warden, time));
  // Echoes: glowing white/cyan timeline trajectory lines, trail ribbons,
  // then the thief figure. Trajectory and figure share a depth key so the
  // line always draws under its own echo.
  for (const e of G.echoes) {
    add(e.x, e.y, () => {
      for (const t of e.trail) {
        const tp = iso(t.x, t.y);
        ctx.save();
        ctx.globalAlpha = (t.life / 0.5) * 0.6;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const pts = e.futurePath(G.loopElapsed, 1.2, 0.12);
      if (pts.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        pts.forEach((p, i) => {
          const pp = iso(p.x, p.y);
          if (i === 0) ctx.moveTo(pp.x, pp.y); else ctx.lineTo(pp.x, pp.y);
        });
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = 0.7;
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
    });
    add(e.x, e.y, () => {
      drawThief(ctx, e.x, e.y, e.color, {
        face: Math.atan2(e.vy, e.vx), alpha: 0.92, tag: 'ECHO ' + (e.idx + 1),
        time, shield: e.shield,
      });
    });
  }
  // The player: trail ribbon, then the thief figure.
  add(G.player.x, G.player.y, () => {
    for (const t of G.player.trail) {
      const tp = iso(t.x, t.y);
      ctx.save();
      ctx.globalAlpha = (t.life / 0.4) * 0.5;
      ctx.fillStyle = '#e8ecff';
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  add(G.player.x, G.player.y, () => {
    const p = G.player;
    if (p.invulnT <= 0 || Math.floor(time * 12) % 2 === 0) {
      drawThief(ctx, p.x, p.y, '#e8ecff', {
        face: p.face, tag: 'YOU', time, shield: p.shieldT > 0,
      });
    }
  });
  // Painter's algorithm: nearer (larger x + y) draws last.
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  // Particles (projected).
  for (const pt of G.particles) {
    const p = iso(pt.x, pt.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Comic callouts: bold type, dark outline, white drop shadow, radiating lines.
  for (const c of G.callouts) {
    const p = iso(c.x, c.y);
    p.y -= 30;
    const a = Math.max(0, c.life / c.max);
    ctx.save();
    ctx.globalAlpha = a;
    const fs = 22;
    ctx.font = `bold ${fs}px Georgia, serif`;
    const w = ctx.measureText(c.text).width;
    // Radiating impact lines.
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(an) * (w / 2 + 8), p.y + Math.sin(an) * 14);
      ctx.lineTo(p.x + Math.cos(an) * (w / 2 + 18), p.y + Math.sin(an) * 22);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0b1020';
    ctx.strokeText(c.text, p.x, p.y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(c.text, p.x, p.y);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, p.x, p.y + 1);
    ctx.restore();
  }
}

// --- HUD -----------------------------------------------------------------------
function hpBar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = 'rgba(10,14,26,0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 8, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, Math.max(0, (w - 2) * frac), 6, 3);
  ctx.fill();
}

export function drawHUD(ctx, G, time) {
  const st = G.state;
  const S = G.stage;
  // --- Top center: Chrono-Clock ring + stage + cores ---
  const cx = 640, cy = 30;
  const frac = G.loopDuration > 0 ? G.loopT / G.loopDuration : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.72)';
  ctx.beginPath();
  ctx.roundRect(cx - 330, 8, 660, 46, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Clock ring.
  ctx.beginPath();
  ctx.arc(cx, cy, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1020';
  ctx.fill();
  ctx.strokeStyle = frac < 0.25 ? '#ef4444' : CYAN;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  text(ctx, G.loopT.toFixed(2) + 's', cx, cy + 26, 'bold 10px Georgia, serif', frac < 0.25 ? '#ef4444' : CYAN);
  text(ctx, `VAULT ${st.stage} / 7 — ${STAGE_NAMES[st.stage]}`, cx - 120, cy - 8, 'bold 13px Georgia, serif', '#e8ecff');
  text(ctx, `CORES: ${st.coresGot}/${st.coresTotal}`, cx + 120, cy - 8, 'bold 13px Georgia, serif', GOLD);
  text(ctx, `SCORE ${st.score.toLocaleString('en-US')}`, cx - 120, cy + 12, 'bold 11px Georgia, serif', '#94a3b8');
  text(ctx, `LOOP ${st.loopsUsed}`, cx + 120, cy + 12, 'bold 11px Georgia, serif', '#94a3b8');
  // Integrity pips.
  for (let i = 0; i < G.player.maxHp; i++) {
    ctx.fillStyle = i < G.player.hp ? '#34d399' : 'rgba(148,163,184,0.3)';
    ctx.beginPath();
    ctx.arc(cx - 300 + i * 16, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'INTEGRITY', cx - 300, cy - 16, 'bold 8px Georgia, serif', '#94a3b8');
  ctx.restore();

  // --- Left panel: Active Echo Timeline + Chrono-Mods Held ---
  // Height grows with the echo rows and the mods held, so nothing overflows.
  const rows = [{ label: 'YOU', color: '#e8ecff', rec: null }];
  for (const e of G.echoes) rows.push({ label: 'ECHO ' + (e.idx + 1), color: e.color, rec: e.recording });
  const leftH = 44 + rows.length * 26 + 24 + Math.max(1, st.mods.length) * 20 + 12;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.72)';
  ctx.beginPath();
  ctx.roundRect(12, 66, 172, leftH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34,211,238,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, 'ACTIVE ECHO TIMELINE', 98, 82, 'bold 11px Georgia, serif', CYAN, 'center');
  // YOU row + one row per echo: colored waveform bar with action marks.
  rows.forEach((r, i) => {
    const y = 102 + i * 26;
    text(ctx, r.label, 22, y, 'bold 10px Georgia, serif', r.color, 'left');
    const bx = 76, bw = 96;
    ctx.fillStyle = 'rgba(148,163,184,0.18)';
    ctx.fillRect(bx, y - 5, bw, 10);
    if (r.rec) {
      // Waveform: bar height from recorded speed; marks where actions fired.
      for (const s of r.rec.samples) {
        if (s.t > G.loopDuration) continue;
        const px = bx + (s.t / G.loopDuration) * bw;
        const sp = Math.min(1, Math.hypot(s.vx, s.vy) / 300);
        ctx.fillStyle = r.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(px, y - 5 + (1 - sp) * 5, 1.5, 10 * sp + 1);
        ctx.globalAlpha = 1;
        if (s.dash) { ctx.fillStyle = '#fff'; ctx.fillRect(px - 1, y - 8, 3, 3); }
        if (s.shield) { ctx.fillStyle = '#fff'; ctx.fillRect(px - 1, y + 5, 3, 3); }
      }
      // Playhead.
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(bx + (G.loopElapsed / G.loopDuration) * bw, y - 8);
      ctx.lineTo(bx + (G.loopElapsed / G.loopDuration) * bw, y + 8);
      ctx.stroke();
    } else {
      // YOU: live position dot.
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bx + (G.loopElapsed / G.loopDuration) * bw, y, 3, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'recording…', bx + 52, y + 14, '9px Georgia, serif', '#94a3b8', 'center');
    }
  });
  text(ctx, `CHRONO-MODS HELD (${st.mods.length}/5)`, 98, 102 + rows.length * 26 + 8, 'bold 11px Georgia, serif', GOLD, 'center');
  st.mods.forEach((m, i) => {
    const y = 102 + rows.length * 26 + 28 + i * 20;
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(28, y - 3, 6, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `${m.name} — ${m.tag}`, 40, y, '10px Georgia, serif', '#e8ecff', 'left');
  });
  if (st.mods.length === 0) text(ctx, 'No mods yet — clear a vault!', 98, 102 + rows.length * 26 + 28, '10px Georgia, serif', '#94a3b8', 'center');
  ctx.restore();

  // --- Right panel: Vault Security / Threat Queue ---
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.72)';
  ctx.beginPath();
  ctx.roundRect(1096, 66, 172, 236, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239,68,68,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, 'VAULT SECURITY', 1182, 82, 'bold 11px Georgia, serif', '#f87171', 'center');
  const threats = G.threatList();
  threats.slice(0, 5).forEach((t, i) => {
    const y = 104 + i * 34;
    text(ctx, t.name, 1108, y - 4, 'bold 10px Georgia, serif', '#e8ecff', 'left');
    text(ctx, t.note, 1256, y - 4, '9px Georgia, serif', '#94a3b8', 'right');
    if (t.frac != null) hpBar(ctx, 1108, y + 4, 148, t.frac, t.color || '#ef4444');
  });
  if (threats.length === 0) text(ctx, 'All quiet… for now.', 1182, 130, '10px Georgia, serif', '#94a3b8', 'center');
  // Boss preview on stage 7.
  if (st.stage === 7 && S.warden) {
    text(ctx, 'BOSS ON THE FLOOR', 1182, 104 + 5 * 34 + 6, 'bold 10px Georgia, serif', '#fbbf24', 'center');
    text(ctx, 'Chrono-Warden — break the shield!', 1182, 104 + 5 * 34 + 22, '9px Georgia, serif', '#94a3b8', 'center');
  }
  ctx.restore();

  // --- Bottom dock: 5 ability cards + combo + grade ---
  const cards = [
    { key: '1', name: 'PHASE DASH', cd: G.player.dashCd, max: 1.1, icon: 'dash', ready: G.player.dashCd <= 0 },
    { key: '2', name: 'REFLECT SHIELD', cd: G.player.shieldCd, max: 4.0, icon: 'shield', ready: G.player.shieldCd <= 0 },
    { key: '3', name: 'EMP PULSE', cd: G.player.empCd, max: 6.0, icon: 'emp', ready: G.player.empCd <= 0 },
    { key: '4', name: 'ANCHOR DROP', cd: G.player.anchorCd, max: 8.0, icon: 'anchor', ready: G.player.anchorCd <= 0 },
    { key: 'R', name: 'REWIND LOOP', cd: 0, max: 1, icon: 'rewind', ready: true },
  ];
  const dockW = 5 * 84 + 4 * 8;
  const dockX = 640 - dockW / 2;
  cards.forEach((c, i) => {
    const x = dockX + i * 92, y = 648;
    ctx.save();
    ctx.fillStyle = c.ready ? 'rgba(34,211,238,0.16)' : 'rgba(10,14,26,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, 84, 58, 8);
    ctx.fill();
    ctx.strokeStyle = c.ready ? CYAN : 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Cooldown radial sweep.
    if (!c.ready) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.moveTo(x + 42, y + 26);
      ctx.arc(x + 42, y + 26, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - c.cd / c.max));
      ctx.closePath();
      ctx.fill();
      text(ctx, c.cd.toFixed(1) + 's', x + 42, y + 26, 'bold 12px Georgia, serif', '#fff');
    }
    drawAbilityIcon(ctx, c.icon, x + 42, y + 24, c.ready ? CYAN : '#94a3b8');
    text(ctx, c.name, x + 42, y + 46, 'bold 9px Georgia, serif', '#e8ecff');
    // Keybind badge.
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x + 76, y + 8, 9, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, c.key, x + 76, y + 8, 'bold 10px Georgia, serif', '#0b1020');
    ctx.restore();
  });
  // SYNC COMBO + Grade medal (bottom-left and bottom-right of the dock).
  ctx.save();
  pill(ctx, 12, 656, 150, 34, 'rgba(10,14,26,0.78)', 'rgba(251,191,36,0.6)');
  text(ctx, `SYNC COMBO x${st.combo.toFixed(2)}`, 87, 673, 'bold 14px Georgia, serif', GOLD);
  ctx.beginPath();
  ctx.arc(1064, 673, 24, 0, Math.PI * 2);
  ctx.fillStyle = st.grade === 'S' ? '#fbbf24' : st.grade === 'A' ? '#c9d1e3' : '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'GRADE ' + st.grade, 1064, 673, 'bold 11px Georgia, serif', '#0b1020');
  text(ctx, 'GRADE', 1064, 652, 'bold 8px Georgia, serif', '#94a3b8');
  ctx.restore();

  // --- Vault Radar (bottom-right) ---
  ctx.save();
  const rx = 1196, ry = 632, rr = 46;
  ctx.fillStyle = 'rgba(10,14,26,0.78)';
  ctx.beginPath();
  ctx.arc(rx, ry, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34,211,238,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rx, ry, rr - 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(148,163,184,0.25)';
  ctx.stroke();
  const mapX = (x) => rx + ((x - ARENA.x) / ARENA.w - 0.5) * (rr * 2 - 12);
  const mapY = (y) => ry + ((y - ARENA.y) / ARENA.h - 0.5) * (rr * 2 - 12);
  for (const c of S.cores) if (!c.taken) { ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(mapX(c.x), mapY(c.y), 3, 0, Math.PI * 2); ctx.fill(); }
  for (const t of S.turrets) if (!t.dead) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(mapX(t.x), mapY(t.y), 3, 0, Math.PI * 2); ctx.fill(); }
  if (S.warden && S.warden.hp > 0) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(mapX(S.warden.x), mapY(S.warden.y), 6, 0, Math.PI * 2); ctx.fill(); }
  for (const e of G.echoes) { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(mapX(e.x), mapY(e.y), 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mapX(G.player.x), mapY(G.player.y), 3.5, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'VAULT RADAR', rx, ry + rr + 12, 'bold 9px Georgia, serif', '#94a3b8');
  ctx.restore();

  // Pause / mute pills (top-right corner).
  ctx.save();
  pill(ctx, 1180, 12, 44, 26, 'rgba(10,14,26,0.78)', 'rgba(148,163,184,0.5)');
  text(ctx, G.audio.muted ? 'MUTE' : 'SOUND', 1202, 25, 'bold 9px Georgia, serif', '#e8ecff');
  pill(ctx, 1228, 12, 40, 26, 'rgba(10,14,26,0.78)', 'rgba(148,163,184,0.5)');
  text(ctx, 'II', 1248, 25, 'bold 10px Georgia, serif', '#e8ecff');
  ctx.restore();
}

export function drawAbilityIcon(ctx, icon, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (icon === 'dash') {
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 4); ctx.lineTo(x + 2, y - 6); ctx.lineTo(x + 10, y + 2); ctx.lineTo(x - 2, y + 8);
    ctx.closePath(); ctx.fill();
  } else if (icon === 'shield') {
    ctx.beginPath();
    ctx.moveTo(x, y - 10); ctx.lineTo(x + 9, y - 5); ctx.lineTo(x + 9, y + 3); ctx.lineTo(x, y + 10); ctx.lineTo(x - 9, y + 3); ctx.lineTo(x - 9, y - 5);
    ctx.closePath(); ctx.stroke();
  } else if (icon === 'emp') {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  } else if (icon === 'anchor') {
    ctx.beginPath();
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 6); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + 6, 6, 0, Math.PI);
    ctx.stroke();
  } else if (icon === 'rewind') {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0.6, Math.PI * 2 - 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 6); ctx.lineTo(x - 2, y - 8); ctx.lineTo(x - 6, y - 1);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// --- Screens -------------------------------------------------------------------
// Title: compact transparent gilded logo + 3-panel HOW TO PLAY strip at the
// bottom. The live heist stays visible around it — never a full-screen box.
export function drawTitle(ctx, G, time) {
  ctx.save();
  // Soft top scrim so the logo reads, floor still visible.
  const scrim = ctx.createLinearGradient(0, 0, 0, 240);
  scrim.addColorStop(0, 'rgba(5,7,13,0.55)');
  scrim.addColorStop(1, 'rgba(5,7,13,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, 240);
  // Gilded logo.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(251,191,36,0.8)';
  ctx.shadowBlur = 18;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('ECHO VAULT', 640, 108);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('— Break Time. Steal Everything. —', 640, 152);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Eight seconds a loop. Four past selves. One impossible heist.', 640, 184);
  // 3-panel HOW TO PLAY strip (bottom, never blocking the center table).
  const panels = [
    { n: '1', title: 'MOVE & STEAL', body: 'WASD to move. Stand at a glass pod to extract its Core.', icon: 'move' },
    { n: '2', title: 'TIME REWINDS', body: 'At 0.00s the loop rewinds — and your past self replays.', icon: 'rewind' },
    { n: '3', title: 'CO-OP WITH ECHOES', body: 'Echoes hold plates, deflect beams, open gates. You finish the job.', icon: 'echo' },
  ];
  panels.forEach((p, i) => {
    const x = 640 - 3 * 130 + i * 270 + 10, y = 428, w = 250, h = 108;
    ctx.fillStyle = 'rgba(10,14,26,0.78)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(p.n, x + 24, y + 26);
    drawHowIcon(ctx, p.icon, x + 56, y + 26, '#22d3ee');
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(p.title, x + w / 2, y + 52);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Georgia, serif';
    wrapText(ctx, p.body, x + w / 2, y + 72, w - 24, 15);
  });
  // START HEIST button.
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.roundRect(640 - 130, 566, 260, 56, 10);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('▶  START HEIST', 640, 595);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Georgia, serif';
  ctx.fillText('WASD move · Space dash · E hack · 1–4 abilities · R rewind · P pause · M mute', 640, 648);
  ctx.fillText('Win: shatter the Chrono-Warden on Vault 7. Lose: your integrity hits zero.', 640, 668);
  ctx.restore();
}

function drawHowIcon(ctx, icon, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (icon === 'move') {
    ctx.beginPath();
    ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6);
    ctx.closePath(); ctx.fill();
  } else if (icon === 'rewind') {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0.6, Math.PI * 2 - 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 6); ctx.lineTo(x - 2, y - 8); ctx.lineTo(x - 6, y - 1);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x - 6, y, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 6, y, 5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function wrapText(ctx, s, x, y, maxW, lh) {
  const words = s.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

// Draft: CHOOSE AN UPGRADE — PICK 1 OF 3.
export function drawDraft(ctx, G) {
  const st = G.state;
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,13,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(251,191,36,0.7)';
  ctx.shadowBlur = 14;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('CHOOSE AN UPGRADE — PICK 1 OF 3', 640, 92);
  ctx.shadowBlur = 0;
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Vault ${st.stage} cleared! Your new Chrono-Mod joins the network at once.`, 640, 126);
  st.draft.forEach((m, i) => {
    const x = 640 - 3 * 140 + i * 290 + 15, y = 168, w = 260, h = 330;
    ctx.fillStyle = 'rgba(10,14,26,0.92)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Colored header band.
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 46, [12, 12, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#0b1020';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(m.tag.toUpperCase(), x + w / 2, y + 24);
    // Custom icon medallion.
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 118, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawModIcon(ctx, m.icon, x + w / 2, y + 118, '#0b1020');
    // Name + description + stat badge.
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(m.name, x + w / 2, y + 192);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Georgia, serif';
    wrapText(ctx, m.desc, x + w / 2, y + 222, w - 32, 17);
    ctx.fillStyle = 'rgba(251,191,36,0.15)';
    ctx.beginPath();
    ctx.roundRect(x + 20, y + 276, w - 40, 26, 8);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('CLICK TO TAKE', x + w / 2, y + 290);
  });
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('Mods held: ' + (st.mods.length ? st.mods.map((m) => m.name).join(' · ') : 'none yet') + '  (' + st.mods.length + '/5)', 640, 540);
  ctx.restore();
}

export function drawModIcon(ctx, icon, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  if (icon === 'clock') {
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 10); ctx.moveTo(x, y); ctx.lineTo(x + 7, y + 4); ctx.stroke();
  } else if (icon === 'bolt') {
    ctx.beginPath(); ctx.moveTo(x + 4, y - 16); ctx.lineTo(x - 8, y + 2); ctx.lineTo(x - 1, y + 2); ctx.lineTo(x - 4, y + 16); ctx.lineTo(x + 8, y - 2); ctx.lineTo(x + 1, y - 2); ctx.closePath(); ctx.fill();
  } else if (icon === 'mirror') {
    ctx.beginPath(); ctx.moveTo(x - 12, y - 14); ctx.lineTo(x + 12, y - 14); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x - 12, y + 14); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 12, y + 14); ctx.lineTo(x + 12, y - 14); ctx.stroke();
  } else if (icon === 'clone') {
    ctx.beginPath(); ctx.arc(x - 7, y - 3, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 7, y + 3, 8, 0, Math.PI * 2); ctx.stroke();
  } else if (icon === 'boot') {
    ctx.beginPath(); ctx.moveTo(x - 10, y - 12); ctx.lineTo(x + 2, y - 12); ctx.lineTo(x + 2, y + 4); ctx.lineTo(x + 12, y + 10); ctx.lineTo(x - 10, y + 10); ctx.closePath(); ctx.stroke();
  } else if (icon === 'vest') {
    ctx.beginPath(); ctx.moveTo(x - 10, y - 14); ctx.lineTo(x + 10, y - 14); ctx.lineTo(x + 12, y + 12); ctx.lineTo(x - 12, y + 12); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 12); ctx.stroke();
  } else if (icon === 'emp') {
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17); ctx.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); ctx.stroke();
    }
  } else {
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 1);
  }
  ctx.restore();
}

// Victory: HEIST COMPLETE — RANK S, breakdown, replay.
export function drawVictory(ctx, G) {
  const st = G.state;
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,13,0.6)';
  ctx.fillRect(0, 0, W, H);
  const bx = 640 - 290, by = 66, bw = 580, bh = 500;
  ctx.fillStyle = 'rgba(10,14,26,0.94)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(251,191,36,0.8)';
  ctx.shadowBlur = 16;
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillStyle = GOLD;
  ctx.fillText('HEIST COMPLETE', 640, by + 44);
  ctx.shadowBlur = 0;
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('The Omega Core is yours. The vault wakes to empty shelves.', 640, by + 76);
  // Rank S medal.
  ctx.beginPath();
  ctx.arc(640, by + 142, 38, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#7c2d12';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(st.grade, 640, by + 144);
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('RANK ' + st.grade, 640, by + 192);
  // Breakdown table.
  const rows = [
    ['Final Score', st.score.toLocaleString('en-US')],
    ['Cores Stolen', st.coresGot + ' / 21'],
    ['Loops Used', String(st.loopsUsed)],
    ['Loops Saved', String(st.loopsSaved)],
    ['Max Echo Sync', 'x' + st.maxSync.toFixed(2)],
    ['Time Bonus', '+' + st.timeBonus.toLocaleString('en-US')],
    ['Integrity Left', st.hpLeft + ' / ' + st.maxHp],
  ];
  rows.forEach((r, i) => {
    const y = by + 222 + i * 26;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0)';
    ctx.fillRect(bx + 60, y - 12, bw - 120, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(r[0], bx + 76, y);
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(r[1], bx + bw - 76, y);
  });
  // Mini score-by-vault bar chart.
  const bars = st.scoreByStage;
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE BY VAULT', bx + 60, by + 428);
  const maxV = Math.max(1, ...bars);
  bars.forEach((v, i) => {
    const x = bx + 60 + i * 68;
    const h = Math.max(4, (v / maxV) * 44);
    ctx.fillStyle = i === 6 ? GOLD : CYAN;
    ctx.fillRect(x, by + 470 - h, 52, h);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('V' + (i + 1), x + 26, by + 482);
  });
  // Replay button.
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.roundRect(640 - 110, by + bh - 8, 220, 48, 10);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('↻  PLAY AGAIN', 640, by + bh + 16);
  ctx.restore();
}

// Defeat: caught by the vault.
export function drawDefeat(ctx, G) {
  const st = G.state;
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,13,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillStyle = '#f87171';
  ctx.fillText('CAUGHT!', 640, 260);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('The vault keeps its secrets — this time. Your echoes fade with you.', 640, 300);
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = '#e8ecff';
  ctx.fillText(`Vault ${st.stage} · Score ${st.score.toLocaleString('en-US')} · Cores ${st.coresGot}/${st.coresTotal}`, 640, 340);
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.roundRect(640 - 110, 380, 220, 52, 10);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('↻  TRY AGAIN  (R)', 640, 407);
  ctx.restore();
}

// Pause overlay.
export function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,13,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('PAUSED', 640, 330);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('P to resume · M to mute · R to rewind the loop', 640, 370);
  ctx.restore();
}
