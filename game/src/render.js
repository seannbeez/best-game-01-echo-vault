// ECHO VAULT — all drawing: the full-bleed vault floor, props, entities,
import { W, H, ARENA, ECHO_COLORS, clamp, hash01, THREATS, FEATS } from './config.js';
import { STAGE_NAMES } from './levels.js';
import { iso, screenToWorld, isoDiamond, extrudeBox, isoShadow, depthOf, groundEllipse } from './iso.js';
import { drawThief, drawTurret, drawWarden, segDist } from './entities.js';
import { glowSprite, drawGlow, vbeamSprite } from './glow.js';

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
let floorCache = null;
function drawFloorStatic(ctx) {
  // Abyss.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04141a');
  g.addColorStop(0.5, '#071018');
  g.addColorStop(1, '#030507');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Holographic circuit grid (dense, Timelie-style): cyan '+' crosses and
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
  ctx.restore();
  // The floating floor slab: a thick extruded diamond under the whole arena.
  const corners = [
    iso(ARENA.x, ARENA.y), iso(ARENA.x + ARENA.w, ARENA.y),
    iso(ARENA.x + ARENA.w, ARENA.y + ARENA.h), iso(ARENA.x, ARENA.y + ARENA.h),
  ];
  ctx.save();
  // Slab sides (the diorama's thickness): slate, not black — a thin edge.
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(corners[3].x, corners[3].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[2].x, corners[2].y + 14);
  ctx.lineTo(corners[3].x, corners[3].y + 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[1].x, corners[1].y + 14);
  ctx.lineTo(corners[2].x, corners[2].y + 14);
  ctx.closePath();
  ctx.fill();
  // Floor base: the whole arena diamond filled solid FIRST. The tile
  ctx.fillStyle = '#2e3a52';
  ctx.beginPath();
  corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
  ctx.closePath();
  ctx.fill();
  // DARK slate floor: deep blue-slate tiles (#2f3a52 to #4a5878) with
  const ts = 92;
  for (let ty = 0; ty < ARENA.h / ts; ty++) {
    for (let tx = 0; tx < ARENA.w / ts; tx++) {
      const cx = ARENA.x + tx * ts + ts / 2;
      const cy = ARENA.y + ty * ts + ts / 2;
      const shade = ((tx * 7 + ty * 13) % 3);
      const fill = shade === 0 ? '#3a4763' : shade === 1 ? '#2f3a52' : '#4a5878';
      isoDiamond(ctx, cx, cy, ts / 2, ts / 2, fill, 'rgba(148,163,184,0.35)');
      // Projected tile corners (perspective): rivets and edge light sit on
      const cn = iso(cx, cy - ts / 2), ce = iso(cx + ts / 2, cy);
      const cs = iso(cx, cy + ts / 2), cw = iso(cx - ts / 2, cy);
      const p = iso(cx, cy);
      // Rivets at the four diamond corners.
      ctx.fillStyle = 'rgba(226,232,240,0.35)';
      for (const corner of [cn, ce, cs, cw]) {
        ctx.fillRect(corner.x - 1, corner.y - 1, 2, 2);
      }
      // Edge-lit panel: one glowing edge per chosen tile — more of them in
      const lit = hash01(tx * 13.7 + ty * 7.3 + 0.5);
      if (lit < (ty >= 2 && ty <= 4 ? 0.34 : 0.14)) {
        ctx.strokeStyle = lit < 0.07 ? 'rgba(8,145,178,0.65)' : 'rgba(180,83,9,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cw.x, cw.y);
        ctx.lineTo(cn.x, cn.y);
        ctx.stroke();
      }
      // Hazard chevron on a few tiles near the chamber edge.
      if (ty === 0 && tx % 3 === 1) {
        const dy = cs.y - p.y;
        ctx.fillStyle = 'rgba(180,83,9,0.35)';
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y + dy * 0.4);
        ctx.lineTo(p.x, p.y - dy * 0.2);
        ctx.lineTo(p.x + 8, p.y + dy * 0.4);
        ctx.lineTo(p.x, p.y + dy * 0.1);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // Glowing floor conduits along the tile seams (deep gold / deep cyan so
  ctx.save();
  ctx.strokeStyle = 'rgba(180,83,9,0.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let a = iso(ARENA.x, ARENA.y + 46);
  let b = iso(ARENA.x + ARENA.w, ARENA.y + 46);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  a = iso(ARENA.x, ARENA.y + ARENA.h - 46);
  b = iso(ARENA.x + ARENA.w, ARENA.y + ARENA.h - 46);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(8,145,178,0.7)';
  ctx.beginPath();
  a = iso(ARENA.x + 46, ARENA.y);
  b = iso(ARENA.x + 46, ARENA.y + ARENA.h);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  a = iso(ARENA.x + ARENA.w - 46, ARENA.y);
  b = iso(ARENA.x + ARENA.w - 46, ARENA.y + ARENA.h);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
  // Crossing conduits through the middle: a gold spine along logical y=355
  ctx.save();
  ctx.strokeStyle = 'rgba(180,83,9,0.65)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let m1 = iso(ARENA.x, ARENA.y + ARENA.h / 2);
  let m2 = iso(ARENA.x + ARENA.w, ARENA.y + ARENA.h / 2);
  ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(8,145,178,0.6)';
  ctx.beginPath();
  m1 = iso(ARENA.x + ARENA.w / 2, ARENA.y);
  m2 = iso(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h);
  ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y);
  ctx.stroke();
  ctx.restore();
  // Central vault seal: concentric glowing rings + hazard chevrons on the
  const sc = iso(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
  const sg = ctx.createRadialGradient(sc.x, sc.y, 10, sc.x, sc.y, 170);
  sg.addColorStop(0, 'rgba(8,145,178,0.12)');
  sg.addColorStop(1, 'rgba(8,145,178,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sc.x - 170, sc.y - 110, 340, 220);
  // Concentric rings as projected ground circles (foreshortened ellipses
  const sealRing = (r, color, lw) => groundEllipse(ctx, 640, 355, r, null, color, lw);
  sealRing(130, 'rgba(180,83,9,0.85)', 4.5);
  sealRing(96, 'rgba(8,145,178,0.85)', 3);
  sealRing(64, 'rgba(180,83,9,0.5)', 2);
  // Filled center emblem: a glowing cyan disc at the seal's heart.
  groundEllipse(ctx, 640, 355, 40, 'rgba(8,145,178,0.18)', 'rgba(8,145,178,0.8)', 2);
  // Hazard chevrons around the seal rim (projected logical circle points).
  ctx.fillStyle = 'rgba(180,83,9,0.55)';
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const pp = iso(640 + Math.cos(an) * 113, 355 + Math.sin(an) * 113);
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.rotate(an);
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(0, 0); ctx.lineTo(-6, 4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Brass inlay rim around the chamber.
  ctx.strokeStyle = 'rgba(180,83,9,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(8,145,178,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y - 6);
  ctx.lineTo(corners[1].x, corners[1].y - 6);
  ctx.lineTo(corners[2].x, corners[2].y - 6);
  ctx.lineTo(corners[3].x, corners[3].y - 6);
  ctx.closePath();
  ctx.stroke();
  // Glossy sheen sweeping the floor (subtle now — the floor is already
  ctx.save();
  const sheen = ctx.createLinearGradient(200, 80, 1080, 640);
  sheen.addColorStop(0, 'rgba(255,255,255,0.05)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.03)');
  sheen.addColorStop(0.75, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
  ctx.closePath();
  ctx.fill();
  const cc = iso(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
  const cg = ctx.createRadialGradient(cc.x, cc.y, 20, cc.x, cc.y, 420);
  cg.addColorStop(0, 'rgba(255,255,255,0.05)');
  cg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(cc.x - 420, cc.y - 260, 840, 520);
  ctx.restore();
  // Volumetric spotlight cones from the ceiling (additive), with warm
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

// The live floor: one blit of the cached static diorama, then only the
export function drawFloor(ctx, G, time) {
  if (!floorCache) {
    floorCache = document.createElement('canvas');
    floorCache.width = W;
    floorCache.height = H;
    drawFloorStatic(floorCache.getContext('2d'));
  }
  ctx.drawImage(floorCache, 0, 0);
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
  for (const s of G.stage.sparks) {
    const tw = 0.5 + 0.5 * Math.sin(time * 2 + s.p);
    const p = iso(s.x, s.y);
    ctx.fillStyle = `rgba(251,191,36,${0.3 * tw * s.s})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6 * s.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Flat world decals ------------------------------------------------------
export function drawProps(ctx, G, time) {
  const S = G.stage;
  // Jammer fields: translucent projected ground ellipses with rotating
  for (const j of S.jammers) {
    const c = iso(j.x, j.y);
    const px = iso(j.x + j.r, j.y);
    const py = iso(j.x, j.y + j.r);
    const rx = Math.abs(px.x - c.x);
    const ry = Math.abs(py.y - c.y);
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
    ctx.fillStyle = 'rgba(88,28,135,0.9)';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEMPORAL JAMMER', c.x, c.y - ry - 8);
    ctx.restore();
  }
  // Mirrors: small projected diamonds with a bright edge.
  for (const m of S.mirrors) {
    const n = iso(m.x, m.y - 9), e = iso(m.x + 15, m.y);
    const s = iso(m.x, m.y + 9), w = iso(m.x - 15, m.y);
    const c = iso(m.x, m.y);
    ctx.save();
    ctx.fillStyle = 'rgba(56,189,248,0.9)';
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(e.x, e.y);
    ctx.lineTo(s.x, s.y);
    ctx.lineTo(w.x, w.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.lineTo(n.x, n.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    ctx.restore();
    text(ctx, 'REFLECTOR', c.x, c.y + 22, 'bold 9px Georgia, serif', 'rgba(226,232,240,0.85)');
  }
  // Laser grids: razor-sharp crimson beams floating just above the floor
  for (const l of S.lasers) {
    const a = iso(l.x1, l.y1, 16);
    const b = iso(l.x2, l.y2, 16);
    const fa = iso(l.x1, l.y1);
    const fb = iso(l.x2, l.y2);
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
    // Emitter pillars (pre-rendered beam sprite, alpha = live pulse):
    ctx.save();
    ctx.globalAlpha = tw;
    const pillar = vbeamSprite('239,68,68', 6, 60, 0.65);
    for (const p of [fa, fb]) ctx.drawImage(pillar, p.x - 3, p.y - 60);
    ctx.restore();
    ctx.restore();
    for (const p of [fa, fb]) {
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
      if (h > 0.68 || out.length >= 12) continue;
      out.push({ x: cx, y: cy, kind: h < 0.16 ? 'crate' : h < 0.30 ? 'console' : h < 0.40 ? 'barrel' : h < 0.52 ? 'rack' : h < 0.62 ? 'gate' : 'vent', seed: h });
    }
  }
  propCache.set(S, out);
  return out;
}

function drawProp(ctx, p, time) {
  if (p.kind === 'rack') {
    // Server rack: a tall dark monolith with cyan LED strips on its top.
    extrudeBox(ctx, p.x - 16, p.y - 12, 32, 24, 54, '#1e293b', '#0f172a', '#0b1120');
    const rt = iso(p.x, p.y, 54);
    ctx.fillStyle = 'rgba(34,211,238,0.9)';
    for (let i = 0; i < 3; i++) ctx.fillRect(rt.x - 10, rt.y - 8 + i * 6, 20, 3);
    return;
  }
  if (p.kind === 'gate') {
    // Security gate: two posts and a beam with alternating green/red LEDs.
    for (const gx of [-22, 16]) extrudeBox(ctx, p.x + gx, p.y - 6, 6, 12, 40, '#1e293b', '#0f172a', '#0b1120');
    extrudeBox(ctx, p.x - 22, p.y - 6, 44, 12, 36, '#334155', '#1e293b', '#0f172a');
    const g1 = iso(p.x - 19, p.y + 6, 36), g2 = iso(p.x + 19, p.y + 6, 36);
    for (let i = 0; i < 5; i++) {
      const lx = g1.x + (g2.x - g1.x) * (i / 4), ly = g1.y + (g2.y - g1.y) * (i / 4);
      ctx.fillStyle = i % 2 ? '#4ade80' : '#f87171';
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
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
const items = [];
export function drawEntities(ctx, G, time) {
  const S = G.stage;
  items.length = 0;
  const add = (x, y, f) => items.push({ d: depthOf(x, y), f });

  // Walls: extruded dark-slate slabs with height variation, a brass top
  for (const w of S.walls) {
    add(w.x + w.w / 2, w.y + w.h / 2, () => {
      // The south border wall is capped low: its face plus the slab edge
      const isSouth = w.y >= ARENA.y + ARENA.h - 1;
      const wh = isSouth ? 26 : 42 + Math.floor(hash01(w.x * 0.13 + w.y * 0.29) * 3) * 14;
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
  for (const gp of S.glass) {
    add(gp.x + gp.w / 2, gp.y + gp.h / 2, () => {
      extrudeBox(ctx, gp.x, gp.y, gp.w, gp.h, 34,
        'rgba(103,232,249,0.28)', 'rgba(103,232,249,0.14)', 'rgba(103,232,249,0.10)');
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
  for (const p of S.plates) {
    add(p.x, p.y, () => {
      const held = p.heldBy;
      const col = held ? (held === 'you' ? '#e8ecff' : ECHO_COLORS[held] || '#34d399') : '#475569';
      // Glowing pressure-pad pedestal: a dark slate pad under the plate.
      groundEllipse(ctx, p.x, p.y, p.r + 8, '#1e293b', null);
      isoDiamond(ctx, p.x, p.y, p.r, p.r, held ? 'rgba(52,211,153,0.30)' : 'rgba(148,163,184,0.25)', col);
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
        // Pre-rendered pillar sprite; the live pulse is just globalAlpha.
        ctx.globalAlpha = (0.6 + 0.25 * pulse) / 0.85;
        ctx.drawImage(vbeamSprite(pillarCol, 16, 110, 0.85), c.x - 8, c.y - 110);
        ctx.globalAlpha = 1;
        groundEllipse(ctx, p.x, p.y, p.r + 4, `rgba(255,255,255,${0.3 + 0.2 * pulse})`);
        groundEllipse(ctx, p.x, p.y, p.r + 10, null, `rgba(${pillarCol},${0.5 + 0.2 * pulse})`, 2);
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
      const ex = iso(m.x + 11, m.y);
      const ey = iso(m.x, m.y + 6);
      const mrx = Math.abs(ex.x - c.x);
      const mry = Math.abs(ey.y - c.y);
      groundEllipse(ctx, m.x, m.y, 11, m.armed ? '#ef4444' : '#475569', '#f87171', 2);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * mrx, c.y + Math.sin(a) * mry);
        ctx.lineTo(c.x + Math.cos(a) * mrx * 1.45, c.y + Math.sin(a) * mry * 1.5);
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
  for (const c of S.cores) {
    if (c.taken) continue;
    add(c.x, c.y, () => {
      isoShadow(ctx, c.x, c.y, 20, 8, 0.4);
      const p = iso(c.x, c.y);
      const bob = Math.sin(time * 2 + c.x) * 2;
      groundEllipse(ctx, c.x, c.y, 20, 'rgba(8,145,178,0.18)', 'rgba(8,145,178,0.9)', 2);
      // Vertical light beam above the pod (pre-rendered sprite).
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(vbeamSprite('34,211,238', 12, 90, 0.30), p.x - 6, p.y - 90);
      ctx.restore();
      // The diamond floats at real height (z ≈ 13 + bob) above the pod.
      const dp = iso(c.x, c.y, 13 + bob);
      const pulse = 1 + 0.12 * Math.sin(time * 3 + c.x);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, glowSprite('#22d3ee', { white: true }), dp.x, dp.y, 22);
      ctx.restore();
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(dp.x, dp.y - 11 * pulse);
      ctx.lineTo(dp.x + 8 * pulse, dp.y);
      ctx.lineTo(dp.x, dp.y + 11 * pulse);
      ctx.lineTo(dp.x - 8 * pulse, dp.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(dp.x, dp.y - 5);
      ctx.lineTo(dp.x + 3.5, dp.y);
      ctx.lineTo(dp.x, dp.y + 5);
      ctx.lineTo(dp.x - 3.5, dp.y);
      ctx.closePath();
      ctx.fill();
      if (c.chan > 0) {
        const cxp = iso(c.x + 28, c.y);
        const cyp = iso(c.x, c.y + 15);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.abs(cxp.x - p.x), Math.abs(cyp.y - p.y), 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.chan);
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
      // Same white→gold profile as before, baked into a sprite; the live
      ctx.globalAlpha = e.open ? pulse : 0.22;
      drawGlow(ctx, glowSprite('#fbbf24', { white: true, mid: 0.4, midA: 0.55 }), p.x, p.y, 34);
      ctx.restore();
      groundEllipse(ctx, e.x, e.y, 24, null, e.open ? `rgba(251,191,36,${0.9 * pulse})` : '#475569', 3);
      text(ctx, e.open ? 'EXIT' : 'LOCKED', p.x, p.y, 'bold 12px Georgia, serif', e.open ? '#34d399' : '#cbd5e1');
    });
  }
  // Omega Core (stage 7, after the Warden falls).
  if (S.omega) {
    const o = S.omega;
    add(o.x, o.y, () => {
      const p = iso(o.x, o.y);
      const bob = Math.sin(time * 2) * 2;
      const op = iso(o.x, o.y, 12 + bob);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, glowSprite('#d946ef', { white: true }), op.x, op.y, 30);
      ctx.restore();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(op.x, op.y - 16);
      ctx.lineTo(op.x + 12, op.y);
      ctx.lineTo(op.x, op.y + 16);
      ctx.lineTo(op.x - 12, op.y);
      ctx.closePath();
      ctx.fill();
      const ot = iso(o.x, o.y, 42);
      text(ctx, 'OMEGA CORE', ot.x, ot.y, 'bold 11px Georgia, serif', GOLD);
      if (o.chan > 0) {
        const oxp = iso(o.x + 26, o.y);
        const oyp = iso(o.x, o.y + 14);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.abs(oxp.x - p.x), Math.abs(oyp.y - p.y), 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.chan);
        ctx.stroke();
      }
    });
  }
  // Turrets and the Warden.
  for (const t of S.turrets) if (!t.dead) add(t.x, t.y, () => drawTurret(ctx, t, time));
  if (S.warden && S.warden.hp > 0) add(S.warden.x, S.warden.y, () => drawWarden(ctx, S.warden, time));
  // Echoes: glowing white/cyan timeline trajectory lines, trail ribbons,
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
        ctx.strokeStyle = 'rgba(15,23,42,0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        pts.forEach((p, i) => {
          const pp = iso(p.x, p.y);
          if (i === 0) ctx.moveTo(pp.x, pp.y); else ctx.lineTo(pp.x, pp.y);
        });
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = 0.95;
        ctx.setLineDash([3, 7]);
        ctx.lineWidth = 3;
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
  // Painter's algorithm: nearer (larger view depth) draws last.
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  // Distance fog: the far end of the vault fades into slate haze, so the
  const fog = ctx.createLinearGradient(0, 150, 0, 340);
  fog.addColorStop(0, 'rgba(15,23,42,0.20)');
  fog.addColorStop(1, 'rgba(15,23,42,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 150, W, 190);
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
  // Comic callouts: solid dark pills with the event color as text, offset
  const shown = G.callouts.slice(-2);
  shown.forEach((c, i) => {
    const a = Math.max(0, c.life / c.max);
    ctx.save();
    ctx.globalAlpha = a;
    const fs = 20;
    ctx.font = `bold ${fs}px Georgia, serif`;
    const w = ctx.measureText(c.text).width + 28;
    const h = 30;
    // Fixed top-band slots: pills always sit clear of the boss, the
    const px = i === 0 ? 360 : 920;
    const py = 140;
    ctx.fillStyle = 'rgba(8,12,24,0.95)';
    ctx.beginPath();
    ctx.roundRect(px - w / 2, py - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = c.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.text, px, py + 1);
    ctx.restore();
  });
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

// Summarize a recording's samples into 96 pixel columns (cached on the
function waveformCols(rec, duration) {
  if (rec._cols) return rec._cols;
  const cols = new Array(96).fill(null);
  for (const s of rec.samples) {
    if (s.t > duration) continue;
    const k = Math.min(95, Math.floor((s.t / duration) * 96));
    const sp = Math.min(1, Math.hypot(s.vx, s.vy) / 300);
    const c = cols[k] || (cols[k] = { sp: 0, dash: false, shield: false });
    if (sp > c.sp) c.sp = sp;
    if (s.dash) c.dash = true;
    if (s.shield) c.shield = true;
  }
  rec._cols = cols;
  return cols;
}

export function drawHUD(ctx, G, time) {
  const st = G.state;
  const S = G.stage;
  // --- Top center: Chrono-Clock ring + stage + cores ---
  const cx = 640, cy = 30;
  const frac = G.loopDuration > 0 ? G.loopT / G.loopDuration : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.88)';
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

  // WIN / LOSE pill, centered under the top bar: the run's win and lose
  pill(ctx, cx - 150, 58, 300, 20, 'rgba(10,14,26,0.88)', 'rgba(251,191,36,0.4)');
  text(ctx, 'WIN: SHATTER WARDEN', cx - 74, 68, 'bold 11px Georgia, serif', '#34d399');
  text(ctx, 'LOSE: INTEGRITY 0', cx + 74, 68, 'bold 11px Georgia, serif', '#f87171');

  // --- Left panel: Active Echo Timeline + Chrono-Mods Held ---
  const rows = [{ label: 'YOU', color: '#e8ecff', rec: null }];
  for (const e of G.echoes) rows.push({ label: 'ECHO ' + (e.idx + 1), color: e.color, rec: e.recording });
  const leftH = 44 + rows.length * 26 + 24 + Math.max(1, st.mods.length) * 20 + 12;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.88)';
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
      // Waveform: one bar per pixel column (96), summarized once per
      const cols = waveformCols(r.rec, G.loopDuration);
      for (let k = 0; k < cols.length; k++) {
        const col = cols[k];
        if (!col) continue;
        const px = bx + (k / cols.length) * bw;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = r.color;
        ctx.fillRect(px, y - 5 + (1 - col.sp) * 5, 1.5, 10 * col.sp + 1);
        ctx.globalAlpha = 1;
        if (col.dash) { ctx.fillStyle = '#fff'; ctx.fillRect(px - 1, y - 8, 3, 3); }
        if (col.shield) { ctx.fillStyle = '#fff'; ctx.fillRect(px - 1, y + 5, 3, 3); }
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
  // Chrono-Shards: the run's currency, banked at the victory workshop.
  text(ctx, '◆ ' + st.shards + ' SHARDS', 98, 102 + rows.length * 26 + 28 + Math.max(1, st.mods.length) * 20, 'bold 11px Georgia, serif', GOLD, 'center');
  ctx.restore();

  // --- Right panel: Vault Security / Threat Queue ---
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.88)';
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
    ctx.fillStyle = c.ready ? 'rgba(34,211,238,0.16)' : 'rgba(10,14,26,0.88)';
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
  pill(ctx, 12, 656, 150, 34, 'rgba(10,14,26,0.9)', 'rgba(251,191,36,0.6)');
  text(ctx, `SYNC COMBO x${st.combo.toFixed(2)}`, 87, 673, 'bold 14px Georgia, serif', GOLD);
  ctx.beginPath();
  ctx.arc(1064, 673, 28, 0, Math.PI * 2);
  ctx.fillStyle = st.grade === 'S' ? '#fbbf24' : st.grade === 'A' ? '#c9d1e3' : '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'GRADE ' + st.grade, 1064, 673, 'bold 9px Georgia, serif', '#0b1020');
  ctx.restore();

  // --- Vault Radar (bottom-right) ---
  ctx.save();
  const rx = 1196, ry = 632, rr = 46;
  ctx.fillStyle = 'rgba(10,14,26,0.9)';
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
  pill(ctx, 1180, 12, 44, 26, 'rgba(10,14,26,0.9)', 'rgba(148,163,184,0.5)');
  text(ctx, G.audio.muted ? 'MUTE' : 'SOUND', 1202, 25, 'bold 9px Georgia, serif', '#e8ecff');
  pill(ctx, 1228, 12, 40, 26, 'rgba(10,14,26,0.9)', 'rgba(148,163,184,0.5)');
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
let titleHeader = null;
function titleHeaderSprite() {
  if (titleHeader) return titleHeader;
  const c = document.createElement('canvas');
  c.width = W; c.height = 240;
  const x = c.getContext('2d');
  const scrim = x.createLinearGradient(0, 0, 0, 240);
  scrim.addColorStop(0, 'rgba(5,7,13,0.55)');
  scrim.addColorStop(1, 'rgba(5,7,13,0)');
  x.fillStyle = scrim;
  x.fillRect(0, 0, W, 240);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.shadowColor = 'rgba(251,191,36,0.8)';
  x.shadowBlur = 18;
  x.font = 'bold 64px Georgia, serif';
  x.fillStyle = '#fbbf24';
  x.fillText('ECHO VAULT', 640, 108);
  x.shadowBlur = 0;
  x.font = 'bold 20px Georgia, serif';
  // Dark translucent pill behind the subtitle (text is 309px wide) so it
  x.fillStyle = 'rgba(5,7,13,0.82)';
  x.beginPath();
  x.roundRect(640 - 190, 136, 380, 36, 18);
  x.fill();
  x.fillStyle = '#22d3ee';
  x.fillText('— Break Time. Steal Everything. —', 640, 152);
  // The sub-tagline sits over the bright floor (the arena's far edge is
  x.fillStyle = 'rgba(5,7,13,0.82)';
  x.beginPath();
  x.roundRect(640 - 250, 178, 500, 30, 15);
  x.fill();
  x.font = '15px Georgia, serif';
  x.fillStyle = '#cbd5e1';
  x.fillText('Eight seconds a loop. Four past selves. One impossible heist.', 640, 194);
  titleHeader = c;
  return c;
}

export function drawTitle(ctx, G, time) {
  const P = G.persist;
  ctx.save();
  // Dark veil: the world behind the title goes dark so the beams and the
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, 'rgba(5,7,13,0.5)');
  veil.addColorStop(0.6, 'rgba(5,7,13,0.3)');
  veil.addColorStop(1, 'rgba(5,7,13,0.55)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(titleHeaderSprite(), 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Persistent strip (left): the player's record, always on the title.
  ctx.fillStyle = 'rgba(10,14,26,0.92)';
  ctx.beginPath(); ctx.roundRect(12, 250, 184, 150, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, 'YOUR HEISTS', 104, 268, 'bold 11px Georgia, serif', GOLD);
  const pRows = [
    ['BEST', P.best ? P.best.toLocaleString('en-US') : '—', '#e8ecff'],
    ['FURTHEST', P.furthest > 1 ? 'VAULT ' + P.furthest : '—', '#e8ecff'],
    ['LAST RUN', P.runs.length ? (P.runs[0].won ? 'WON · ' + P.runs[0].grade : 'LOST · V' + (P.runs[0].label.match(/V(\d)/)?.[1] || '?')) : '—', P.runs.length && P.runs[0].won ? '#34d399' : '#f87171'],
  ];
  pRows.forEach((r, i) => {
    const y = 296 + i * 34;
    text(ctx, r[0], 24, y, 'bold 10px Georgia, serif', '#94a3b8', 'left');
    text(ctx, r[1], 184, y + 14, 'bold 16px Georgia, serif', r[2], 'right');
  });
  // Bestiary (right): the six threats, one line each.
  ctx.fillStyle = 'rgba(10,14,26,0.92)';
  ctx.beginPath(); ctx.roundRect(1084, 250, 184, 222, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(239,68,68,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, 'BESTIARY', 1176, 268, 'bold 11px Georgia, serif', '#f87171');
  THREATS.forEach((t, i) => {
    const y = 292 + i * 32;
    ctx.fillStyle = t[2];
    ctx.beginPath(); ctx.arc(1098, y - 2, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, t[0], 1110, y - 2, 'bold 11px Georgia, serif', '#e8ecff', 'left');
    text(ctx, t[1], 1110, y + 12, '10px Georgia, serif', '#94a3b8', 'left');
  });
  // Difficulty row: CALM x0.75 / HEIST x1 / NIGHTMARE x1.5.
  text(ctx, 'DIFFICULTY', 640, 488, 'bold 11px Georgia, serif', '#94a3b8');
  const diffs = [['CALM', '×0.75'], ['HEIST', '×1'], ['NIGHTMARE', '×1.5']];
  diffs.forEach((d, i) => {
    const x = 445 + i * 135, sel = G.diff === d[0];
    pill(ctx, x, 500, 120, 30, sel ? GOLD : 'rgba(10,14,26,0.92)', sel ? null : 'rgba(251,191,36,0.5)');
    text(ctx, d[0] + ' ' + d[1], x + 60, 515, 'bold 12px Georgia, serif', sel ? '#0b1020' : '#e8ecff');
  });
  // Glowing PLAY button (same rect as before: 510-770 x 566-622).
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.roundRect(640 - 130, 566, 260, 56, 10);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('▶  PLAY', 640, 595);
  // Compact 3-icon HOW TO PLAY strip (bottom, never blocking the center).
  const how = [
    ['move', 'WASD MOVE · STEAL CORES'],
    ['rewind', '0.00s REWIND · ECHOES REPLAY'],
    ['echo', 'ECHOES HOLD PLATES · YOU FINISH'],
  ];
  how.forEach((h, i) => {
    const x = 180 + i * 310;
    ctx.fillStyle = 'rgba(10,14,26,0.92)';
    ctx.beginPath(); ctx.roundRect(x, 634, 300, 34, 10); ctx.fill();
    drawHowIcon(ctx, h[0], x + 22, 651, CYAN);
    text(ctx, h[1], x + 42, 651, 'bold 11px Georgia, serif', '#e8ecff', 'left');
  });
  text(ctx, 'Space dash · E hack · 1–4 abilities · R rewind · P pause · M mute', 640, 690, '12px Georgia, serif', '#cbd5e1');
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

// The draft header is identical for a given stage; its shadowBlur title is
const draftHeaders = new Map();
function draftHeaderSprite(stage) {
  const hit = draftHeaders.get(stage);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W; c.height = 120;
  const x = c.getContext('2d');
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.shadowColor = 'rgba(251,191,36,0.7)';
  x.shadowBlur = 14;
  x.font = 'bold 30px Georgia, serif';
  x.fillStyle = '#fbbf24';
  x.fillText(`VAULT ${stage} CLEARED — CHOOSE YOUR PATH`, 640, 40);
  x.shadowBlur = 0;
  x.fillStyle = 'rgba(5,7,13,0.78)';
  x.beginPath(); x.roundRect(640 - 330, 62, 660, 32, 10); x.fill();
  x.font = '15px Georgia, serif';
  x.fillStyle = '#cbd5e1';
  x.fillText('Pick 1 of 3 Chrono-Mods — your echoes inherit it at once.', 640, 78);
  draftHeaders.set(stage, c);
  return c;
}

const FAMCOL = { TIME: '#22d3ee', WARD: '#a78bfa', FLOW: '#34d399', GOLD: '#fbbf24' };
const RARECOL = { C: '#94a3b8', R: '#22d3ee', E: '#fbbf24' };
const RARENAME = { C: 'COMMON', R: 'RARE', E: 'EPIC' };
const NEXT_NEW = { 2: 'Sentry Turret', 3: 'Temporal Jammer', 4: 'Sentry Turret + Jammer', 5: 'Laser Sweeper', 6: 'Chrono-Mine', 7: 'THE CHRONO-WARDEN' };

// Draft: route map + CHOOSE AN UPGRADE — PICK 1 OF 3.
export function drawDraft(ctx, G) {
  const st = G.state;
  ctx.save();
  // Light scrim (was 0.72): the arena must stay visible behind the cards —
  ctx.fillStyle = 'rgba(5,7,13,0.35)';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(draftHeaderSprite(st.stage), 0, 56);
  // Shards balance, top right (clear of the SOUND / pause buttons).
  pill(ctx, 1000, 12, 160, 28, 'rgba(10,14,26,0.92)', 'rgba(251,191,36,0.5)');
  text(ctx, '◆ ' + st.shards + ' SHARDS', 1080, 26, 'bold 13px Georgia, serif', GOLD);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Vault Blueprint route map: 7 vault nodes, the path, next-vault preview.
  text(ctx, 'VAULT BLUEPRINT — ROUTE MAP', 640, 156, 'bold 11px Georgia, serif', GOLD);
  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(200, 176); ctx.lineTo(1080, 176); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const nx = 200 + i * 146.67, done = i < st.stage, next = i === st.stage;
    ctx.fillStyle = done ? '#34d399' : next ? GOLD : '#1e293b';
    ctx.beginPath(); ctx.arc(nx, 176, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = done ? '#34d399' : next ? GOLD : '#64748b';
    ctx.lineWidth = next ? 3 : 1.5; ctx.stroke();
    text(ctx, done ? '✓' : 'V' + (i + 1), nx, 176, 'bold 10px Georgia, serif', done || next ? '#0b1020' : '#94a3b8');
    text(ctx, STAGE_NAMES[i + 1], nx, 198, '9px Georgia, serif', next ? GOLD : '#94a3b8');
  }
  text(ctx, 'NEXT: VAULT ' + (st.stage + 1) + ' — ' + STAGE_NAMES[st.stage + 1] + ' · NEW: ' + NEXT_NEW[st.stage + 1], 640, 214, 'bold 12px Georgia, serif', CYAN);
  st.draft.forEach((m, i) => {
    const x = 640 - 3 * 140 + i * 290 + 15, y = 224, w = 260, h = 290;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Rarity trim along the top edge.
    ctx.fillStyle = RARECOL[m.rare];
    ctx.beginPath();
    ctx.roundRect(x, y, w, 6, [12, 12, 0, 0]);
    ctx.fill();
    // Colored header band.
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.roundRect(x, y + 6, w, 38, [0, 0, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#0b1020';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(m.tag.toUpperCase(), x + w / 2, y + 25);
    // Family + rarity tags.
    text(ctx, '◆ ' + m.fam, x + 12, y + 56, 'bold 11px Georgia, serif', FAMCOL[m.fam], 'left');
    text(ctx, RARENAME[m.rare] + ' ★', x + w - 12, y + 56, 'bold 11px Georgia, serif', RARECOL[m.rare], 'right');
    ctx.textAlign = 'center'; // text() above leaves align 'right'; the
    // name / desc / synergy / take-bar below are all centered fillText.
    // Procedural illustrated art: glow + rays + the mod icon, large.
    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 66, w - 20, 90, 8);
    ctx.fill();
    drawGlow(ctx, glowSprite(m.color, { a0: 0.5 }), x + w / 2, y + 111, 70);
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const a = -0.9 + k * 0.9;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 111);
      ctx.lineTo(x + w / 2 + Math.cos(a) * 100, y + 111 + Math.sin(a) * 38);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(x + w / 2, y + 111);
    ctx.scale(1.5, 1.5);
    drawModIcon(ctx, m.icon, 0, 0, m.color);
    ctx.restore();
    // Name + description + synergy + take bar.
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(m.name, x + w / 2, y + 178);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Georgia, serif';
    wrapText(ctx, m.desc, x + w / 2, y + 200, w - 32, 17);
    ctx.fillStyle = GOLD;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillText('↗ ' + m.syn, x + w / 2, y + 232);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x + 20, y + 246, w - 40, 24, 8);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('CLICK TO TAKE · [' + (i + 1) + ']', x + w / 2, y + 258);
  });
  // Shop row: Mend +1 Integrity, Reroll — Chrono-Shards economy.
  const canMend = st.shards >= 20 && st.hpLeft < st.maxHp;
  const canReroll = st.shards >= 10;
  pill(ctx, 400, 530, 180, 36, canMend ? 'rgba(52,211,153,0.25)' : 'rgba(10,14,26,0.92)', canMend ? '#34d399' : 'rgba(148,163,184,0.4)');
  text(ctx, 'MEND +1 ◆20', 490, 548, 'bold 13px Georgia, serif', canMend ? '#34d399' : '#64748b');
  pill(ctx, 600, 530, 160, 36, canReroll ? 'rgba(34,211,238,0.25)' : 'rgba(10,14,26,0.92)', canReroll ? CYAN : 'rgba(148,163,184,0.4)');
  text(ctx, 'REROLL ◆10 [R]', 680, 548, 'bold 13px Georgia, serif', canReroll ? CYAN : '#64748b');
  text(ctx, '◆ ' + st.shards, 800, 548, 'bold 14px Georgia, serif', GOLD, 'left');
  ctx.fillStyle = 'rgba(5,7,13,0.78)';
  ctx.beginPath(); ctx.roundRect(640 - 310, 580, 620, 30, 10); ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('Mods held: ' + (st.mods.length ? st.mods.map((m) => m.name).join(' · ') : 'none yet') + '  (' + st.mods.length + '/5)', 640, 596);
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

// Victory: dawn analytics — Rank S medal, stats grid, timeline graph,
// feats, last runs, next goal, three replay options.
export function drawVictory(ctx, G) {
  const st = G.state;
  const P = G.persist;
  ctx.save();
  // Dawn palette shift: the vault wakes to a warm sunrise over the arena.
  const dawn = ctx.createLinearGradient(0, 0, 0, H);
  dawn.addColorStop(0, 'rgba(30,27,75,0.94)');
  dawn.addColorStop(0.55, 'rgba(124,45,18,0.92)');
  dawn.addColorStop(1, 'rgba(180,83,9,0.92)');
  ctx.fillStyle = dawn;
  ctx.fillRect(0, 0, W, H);
  [[200, 120], [1080, 90], [640, 640], [120, 620], [1160, 600]].forEach((b) => {
    drawGlow(ctx, glowSprite(GOLD, { a0: 0.22 }), b[0], b[1], 90);
  });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Banner.
  text(ctx, 'HEIST COMPLETE', 640, 52, 'bold 36px Georgia, serif', GOLD);
  text(ctx, 'The Omega Core is yours. The vault wakes to empty shelves.', 640, 84, '15px Georgia, serif', CYAN);
  const mm = Math.floor(G.runTime / 60), ss = Math.floor(G.runTime % 60);
  const tstr = mm + ':' + String(ss).padStart(2, '0');
  const dm = G.diff === 'CALM' ? '0.75' : G.diff === 'NIGHTMARE' ? '1.5' : '1';
  text(ctx, 'SEED ' + G.runSeed + ' · ' + tstr + ' · ' + G.diff + ' ×' + dm, 640, 112, '12px Georgia, serif', '#cbd5e1');
  // Left panel: sunburst medal + score + shards banked.
  ctx.fillStyle = 'rgba(10,14,26,0.92)';
  ctx.beginPath(); ctx.roundRect(40, 130, 260, 430, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(170 + Math.cos(a) * 60, 208 + Math.sin(a) * 60);
    ctx.lineTo(170 + Math.cos(a) * 78, 208 + Math.sin(a) * 78);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(170, 208, 52, 0, Math.PI * 2);
  ctx.fillStyle = GOLD; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#7c2d12';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(st.grade, 170, 210);
  text(ctx, 'RANK ' + st.grade, 170, 276, 'bold 12px Georgia, serif', '#94a3b8');
  if (st.score >= P.best && P.best > 0) {
    pill(ctx, 95, 292, 150, 24, GOLD, null);
    text(ctx, '★ NEW BEST!', 170, 304, 'bold 13px Georgia, serif', '#0b1020');
  }
  text(ctx, 'FINAL SCORE', 170, 340, 'bold 11px Georgia, serif', '#94a3b8');
  text(ctx, st.score.toLocaleString('en-US'), 170, 366, 'bold 28px Georgia, serif', '#e8ecff');
  text(ctx, '◆ +' + st.shardsBanked + ' SHARDS BANKED', 170, 400, 'bold 13px Georgia, serif', GOLD);
  text(ctx, 'WORKSHOP: ' + P.workshop + ' ◆', 170, 424, '12px Georgia, serif', '#94a3b8');
  // Middle panel: 8-stat grid + combo/damage timeline graph.
  ctx.fillStyle = 'rgba(10,14,26,0.92)';
  ctx.beginPath(); ctx.roundRect(320, 130, 420, 430, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(34,211,238,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, 'RUN STATS', 340, 150, 'bold 11px Georgia, serif', CYAN, 'left');
  const stats = [
    ['FINAL SCORE', st.score.toLocaleString('en-US')],
    ['CORES', st.coresGot + ' / ' + st.coresTotal],
    ['LOOPS', st.loopsUsed + ' · saved ' + st.loopsSaved],
    ['MAX SYNC', '×' + st.maxSync.toFixed(2)],
    ['DAMAGE', st.dmgDealt.toLocaleString('en-US')],
    ['TIME', tstr],
    ['INTEGRITY', st.hpLeft + ' / ' + st.maxHp],
    ['DIFFICULTY', G.diff + ' ×' + dm],
  ];
  stats.forEach((s, i) => {
    const cx = 340 + (i % 2) * 210, cy = 176 + Math.floor(i / 2) * 58;
    text(ctx, s[0], cx, cy, 'bold 10px Georgia, serif', '#94a3b8', 'left');
    text(ctx, s[1], cx, cy + 20, 'bold 16px Georgia, serif', '#e8ecff', 'left');
  });
  text(ctx, 'SCORE BY VAULT — BARS: SCORE · LINE: COMBO', 340, 420, 'bold 11px Georgia, serif', '#94a3b8', 'left');
  const bars = st.scoreByStage, maxV = Math.max(1, ...bars);
  bars.forEach((v, i) => {
    const x = 340 + i * 58, h = Math.max(4, (v / maxV) * 64);
    ctx.fillStyle = i === 6 ? GOLD : CYAN;
    ctx.fillRect(x, 500 - h, 44, h);
    text(ctx, 'V' + (i + 1), x + 22, 514, '9px Georgia, serif', '#94a3b8');
  });
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  st.comboByStage.forEach((c, i) => {
    const x = 340 + i * 58 + 22, y = 500 - (c / 5) * 64;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  st.comboByStage.forEach((c, i) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(340 + i * 58 + 22, 500 - (c / 5) * 64, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  // Right panel: feats + last 3 runs.
  ctx.fillStyle = 'rgba(10,14,26,0.92)';
  ctx.beginPath(); ctx.roundRect(760, 130, 480, 430, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(52,211,153,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  const doneN = st.feats.filter((f) => f.done).length;
  text(ctx, 'FEATS ' + doneN + '/8', 780, 150, 'bold 11px Georgia, serif', '#34d399', 'left');
  FEATS.forEach((f, i) => {
    const y = 172 + i * 26, got = st.feats[i] && st.feats[i].done;
    text(ctx, got ? '✓' : '·', 780, y, 'bold 13px Georgia, serif', got ? '#34d399' : '#64748b', 'left');
    text(ctx, f[0], 800, y, '12px Georgia, serif', got ? '#e8ecff' : '#64748b', 'left');
    if (st.feats[i] && st.feats[i].isNew) text(ctx, 'NEW', 1220, y, 'bold 10px Georgia, serif', GOLD, 'right');
  });
  text(ctx, 'LAST 3 RUNS', 780, 396, 'bold 11px Georgia, serif', CYAN, 'left');
  P.runs.slice(0, 3).forEach((r, i) => {
    const y = 420 + i * 26;
    text(ctx, r.grade, 780, y, 'bold 14px Georgia, serif', r.won ? GOLD : '#94a3b8', 'left');
    text(ctx, r.label, 806, y, '12px Georgia, serif', '#e8ecff', 'left');
    text(ctx, r.score.toLocaleString('en-US'), 1220, y, 'bold 12px Georgia, serif', '#e8ecff', 'right');
  });
  // Next goal + replay options.
  pill(ctx, 40, 576, 1200, 30, 'rgba(10,14,26,0.92)', 'rgba(251,191,36,0.5)');
  text(ctx, 'NEXT GOAL: reach Vault 7 on NIGHTMARE — or beat 30,000 on HEIST', 640, 591, 'bold 13px Georgia, serif', GOLD);
  pill(ctx, 340, 626, 200, 52, '#b91c1c', GOLD);
  text(ctx, '↻ RUN AGAIN', 440, 652, 'bold 18px Georgia, serif', '#fff');
  pill(ctx, 560, 626, 200, 52, 'rgba(10,14,26,0.92)', GOLD);
  text(ctx, '↻ SAME SEED [S]', 660, 652, 'bold 15px Georgia, serif', GOLD);
  pill(ctx, 780, 626, 160, 52, 'rgba(10,14,26,0.92)', 'rgba(148,163,184,0.5)');
  text(ctx, 'MENU [Esc]', 860, 652, 'bold 15px Georgia, serif', '#e8ecff');
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
