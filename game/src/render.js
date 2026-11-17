// ECHO VAULT — all drawing: the full-bleed vault floor, props, entities,
import { W, H, ARENA, ECHO_COLORS, clamp, hash01, THREATS, FEATS, F8, F9, F10, F11, F12, F13, F14, F15, F16, F20, F24, F64, R9, R10, R12, R15, PAN, PAN88, PAN90, INK, MUTE, PALE, GOLD, CYAN, GREEN, RED, REDL, SLATE, DARKT, GOLD50, CYAN40, RED40, GREEN25, WARDEN_PYLONS } from './config.js';
import { STAGE_NAMES } from './levels.js';
import { iso, screenToWorld, isoDiamond, extrudeBox, isoShadow, depthOf, groundEllipse, dot, isoQuad } from './iso.js';
import { drawThief, drawTurret, drawWarden, segDist } from './entities.js';
import { glowSprite, drawGlow, vbeamSprite, glowAt } from './glow.js';


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

function panel(ctx, x, y, w, h, r, stroke, fill = PAN) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// --- Floor ------------------------------------------------------------------
let floorCache = null;
function drawFloorStatic(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04141a');
  g.addColorStop(0.5, '#071018');
  g.addColorStop(1, '#030507');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
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
  const corners = [
    iso(ARENA.x, ARENA.y), iso(ARENA.x + ARENA.w, ARENA.y),
    iso(ARENA.x + ARENA.w, ARENA.y + ARENA.h), iso(ARENA.x, ARENA.y + ARENA.h),
  ];
  ctx.save();
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
  isoQuad(ctx, ARENA.x, ARENA.y, ARENA.w, ARENA.h, 0, '#2e3a52');
  const ts = 92;
  for (let ty = 0; ty < ARENA.h / ts; ty++) {
    for (let tx = 0; tx < ARENA.w / ts; tx++) {
      const cx = ARENA.x + tx * ts + ts / 2;
      const cy = ARENA.y + ty * ts + ts / 2;
      const shade = ((tx * 7 + ty * 13) % 3);
      const fill = shade === 0 ? '#3a4763' : shade === 1 ? '#2f3a52' : '#4a5878';
      isoDiamond(ctx, cx, cy, ts / 2, ts / 2, fill, 'rgba(148,163,184,0.35)');
      const cnr = [iso(cx, cy - ts / 2), iso(cx + ts / 2, cy), iso(cx, cy + ts / 2), iso(cx - ts / 2, cy)];
      const p = iso(cx, cy);
      ctx.fillStyle = 'rgba(226,232,240,0.35)';
      for (const corner of cnr) {
        ctx.fillRect(corner.x - 1, corner.y - 1, 2, 2);
      }
      const lit = hash01(tx * 13.7 + ty * 7.3 + 0.5);
      if (lit < (ty >= 2 && ty <= 4 ? 0.34 : 0.14)) {
        ctx.strokeStyle = lit < 0.07 ? 'rgba(8,145,178,0.65)' : 'rgba(180,83,9,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cnr[3].x, cnr[3].y);
        ctx.lineTo(cnr[0].x, cnr[0].y);
        ctx.stroke();
      }
      if (ty === 0 && tx % 3 === 1) {
        const dy = cnr[2].y - p.y;
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
  const sc = iso(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2);
  const sg = ctx.createRadialGradient(sc.x, sc.y, 10, sc.x, sc.y, 170);
  sg.addColorStop(0, 'rgba(8,145,178,0.12)');
  sg.addColorStop(1, 'rgba(8,145,178,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sc.x - 170, sc.y - 110, 340, 220);
  const sealRing = (r, color, lw) => groundEllipse(ctx, 640, 355, r, null, color, lw);
  sealRing(130, 'rgba(180,83,9,0.85)', 4.5);
  sealRing(96, 'rgba(8,145,178,0.85)', 3);
  sealRing(64, 'rgba(180,83,9,0.5)', 2);
  groundEllipse(ctx, 640, 355, 40, 'rgba(8,145,178,0.18)', 'rgba(8,145,178,0.8)', 2);
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
  const v = ctx.createRadialGradient(640, 360, 300, 640, 360, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

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
    dot(ctx, nx, ny, 2.2, `rgba(34,211,238,${pulse})`);
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
    dot(ctx, p.x, p.y, 1.6 * s.s, `rgba(251,191,36,${0.3 * tw * s.s})`);
  }
}

// --- Flat world decals ------------------------------------------------------
export function drawProps(ctx, G, time) {
  const S = G.stage;
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
    ctx.font = F10;
    ctx.textAlign = 'center';
    ctx.fillText('TEMPORAL JAMMER', c.x, c.y - ry - 8);
    ctx.restore();
  }
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
    text(ctx, 'REFLECTOR', c.x, c.y + 22, F9, 'rgba(226,232,240,0.85)');
  }
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
    ctx.strokeStyle = `rgba(239,68,68,${0.22 * tw})`;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = `rgba(239,68,68,${0.8 * tw})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * tw})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.save();
    ctx.globalAlpha = tw;
    const pillar = vbeamSprite('239,68,68', 6, 60, 0.65);
    for (const p of [fa, fb]) ctx.drawImage(pillar, p.x - 3, p.y - 60);
    ctx.restore();
    ctx.restore();
    for (const p of [fa, fb]) {
      ctx.fillStyle = '#3a2b22';
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
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
    dot(ctx, c.x, c.y, 5, GOLD);
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
    extrudeBox(ctx, p.x - 16, p.y - 12, 32, 24, 54, '#1e293b', '#0f172a', '#0b1120');
    const rt = iso(p.x, p.y, 54);
    ctx.fillStyle = 'rgba(34,211,238,0.9)';
    for (let i = 0; i < 3; i++) ctx.fillRect(rt.x - 10, rt.y - 8 + i * 6, 20, 3);
    return;
  }
  if (p.kind === 'gate') {
    for (const gx of [-22, 16]) extrudeBox(ctx, p.x + gx, p.y - 6, 6, 12, 40, '#1e293b', '#0f172a', '#0b1120');
    extrudeBox(ctx, p.x - 22, p.y - 6, 44, 12, 36, '#334155', '#1e293b', '#0f172a');
    const g1 = iso(p.x - 19, p.y + 6, 36), g2 = iso(p.x + 19, p.y + 6, 36);
    for (let i = 0; i < 5; i++) {
      const lx = g1.x + (g2.x - g1.x) * (i / 4), ly = g1.y + (g2.y - g1.y) * (i / 4);
      dot(ctx, lx, ly, 2.5, i % 2 ? '#4ade80' : REDL);
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
    ctx.strokeStyle = GOLD50;
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
    dot(ctx, top.x + 12, top.y - 6, 2, `rgba(239,68,68,${blink})`);
    return;
  }
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
  const prop = (list, fn, centered = false) => { for (const e of list) add(e.x + (centered ? e.w / 2 : 0), e.y + (centered ? e.h / 2 : 0), () => fn(e)); };

  prop(S.walls, (w) => {    const isSouth = w.y >= ARENA.y + ARENA.h - 1;
    const wh = isSouth ? 26 : 42 + Math.floor(hash01(w.x * 0.13 + w.y * 0.29) * 3) * 14;
    extrudeBox(ctx, w.x, w.y, w.w, w.h, wh, '#2b3a55', '#1c2740', '#121a2c');
    const t3 = iso(w.x + w.w, w.y + w.h, wh);
    const t4 = iso(w.x, w.y + w.h, wh);
    isoQuad(ctx, w.x, w.y, w.w, w.h, wh, null, 'rgba(251,191,36,0.55)', 2);
    const ins = Math.min(5, w.w / 4, w.h / 4);
    isoQuad(ctx, w.x + ins, w.y + ins, w.w - 2 * ins, w.h - 2 * ins, wh, 'rgba(255,255,255,0.05)', 'rgba(148,163,184,0.28)', 1);
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
    const b4 = iso(w.x, w.y + w.h, 0);
    const b3 = iso(w.x + w.w, w.y + w.h, 0);
    ctx.strokeStyle = 'rgba(251,191,36,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b4.x, b4.y); ctx.lineTo(b3.x, b3.y);
    ctx.stroke();
  }, true);
  prop(S.glass, (gp) => {    extrudeBox(ctx, gp.x, gp.y, gp.w, gp.h, 34,
      'rgba(103,232,249,0.28)', 'rgba(103,232,249,0.14)', 'rgba(103,232,249,0.10)');
    const t1 = iso(gp.x, gp.y, 34);
    const t2 = iso(gp.x + gp.w, gp.y, 34);
    const t3 = iso(gp.x + gp.w, gp.y + gp.h, 34);
    const t4 = iso(gp.x, gp.y + gp.h, 34);
    isoQuad(ctx, gp.x, gp.y, gp.w, gp.h, 34, null, 'rgba(103,232,249,0.7)', 1.5);
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
  }, true);
  for (const p of getProps(S)) {
    add(p.x, p.y, () => drawProp(ctx, p, time));
  }
  prop(S.plates, (p) => {    const held = p.heldBy;
    const col = held ? (held === 'you' ? INK : ECHO_COLORS[held] || GREEN) : '#475569';
    groundEllipse(ctx, p.x, p.y, p.r + 8, '#1e293b', null);
    isoDiamond(ctx, p.x, p.y, p.r, p.r, held ? 'rgba(52,211,153,0.30)' : 'rgba(148,163,184,0.25)', col);
    const c = iso(p.x, p.y);
    ctx.fillStyle = held ? GREEN : PALE;
    ctx.font = F13;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.link, c.x, c.y + 1);
    if (held) {
      const pillarCol = S.warden ? '217,70,239' : '34,211,238';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.globalAlpha = (0.6 + 0.25 * pulse) / 0.85;
      ctx.drawImage(vbeamSprite(pillarCol, 16, 110, 0.85), c.x - 8, c.y - 110);
      ctx.globalAlpha = 1;
      groundEllipse(ctx, p.x, p.y, p.r + 4, `rgba(255,255,255,${0.3 + 0.2 * pulse})`);
      groundEllipse(ctx, p.x, p.y, p.r + 10, null, `rgba(${pillarCol},${0.5 + 0.2 * pulse})`, 2);
      ctx.restore();
      text(ctx, held === 'you' ? 'YOU' : 'ECHO ' + (held + 1), c.x, c.y + p.r * 0.7 + 12, F9, col);
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
  prop(S.doors, (d) => {    if (d.open) {
      ctx.setLineDash([4, 4]);
      isoQuad(ctx, d.x, d.y, d.w, d.h, 0, null, GREEN, 2);
      ctx.setLineDash([]);
    } else {
      extrudeBox(ctx, d.x, d.y, d.w, d.h, 52, '#8a6d2b', '#4b3b1a', '#3d2f14');
      const t = iso(d.x + d.w / 2, d.y + d.h / 2, 52);
      text(ctx, d.needTwo ? 'A+B' : d.link, t.x, t.y, F11, GOLD);
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
  }, true);
  prop(S.mines, (m) => {  if (m.gone) return;
    isoShadow(ctx, m.x, m.y, 12, 5, 0.4);
    const c = iso(m.x, m.y);
    const ex = iso(m.x + 11, m.y);
    const ey = iso(m.x, m.y + 6);
    const mrx = Math.abs(ex.x - c.x);
    const mry = Math.abs(ey.y - c.y);
    groundEllipse(ctx, m.x, m.y, 11, m.armed ? RED : '#475569', REDL, 2);
    ctx.strokeStyle = REDL;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(a) * mrx, c.y + Math.sin(a) * mry);
      ctx.lineTo(c.x + Math.cos(a) * mrx * 1.45, c.y + Math.sin(a) * mry * 1.5);
      ctx.stroke();
    }
    if (m.armed) text(ctx, '!', c.x, c.y - 2, F11, '#fff');
  });
  prop(S.terminals, (t) => {    isoShadow(ctx, t.x, t.y, 14, 6, 0.4);
    extrudeBox(ctx, t.x - 14, t.y - 16, 28, 32, 26,
      t.hackedT > 0 ? '#1d4ed8' : '#1e3a5f', '#16294a', '#0f1e38');
    const top = iso(t.x, t.y, 26);
    ctx.fillStyle = t.hackedT > 0 ? '#052e16' : '#082f49';
    ctx.fillRect(top.x - 9, top.y - 5, 18, 9);
    ctx.fillStyle = t.hackedT > 0 ? '#4ade80' : '#67e8f9';
    ctx.fillRect(top.x - 6, top.y - 3, 12, 2);
    if (t.hackedT > 0) {
      text(ctx, 'HACKED', top.x, top.y - 16, F9, '#60a5fa');
    } else if (t.hack > 0) {
      ctx.fillStyle = DARKT;
      ctx.fillRect(top.x - 16, top.y - 20, 32, 5);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(top.x - 16, top.y - 20, 32 * t.hack, 5);
      text(ctx, 'HOLD E TO HACK', top.x, top.y - 28, F9, '#93c5fd');
    } else {
      text(ctx, 'TERMINAL', top.x, top.y - 16, F9, 'rgba(147,197,253,0.8)');
    }
  });
  prop(S.cores, (c) => {  if (c.taken) return;
    isoShadow(ctx, c.x, c.y, 20, 8, 0.4);
    const p = iso(c.x, c.y);
    const bob = Math.sin(time * 2 + c.x) * 2;
    groundEllipse(ctx, c.x, c.y, 20, 'rgba(8,145,178,0.18)', 'rgba(8,145,178,0.9)', 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(vbeamSprite('34,211,238', 12, 90, 0.30), p.x - 6, p.y - 90);
    ctx.restore();
    const dp = iso(c.x, c.y, 13 + bob);
    const pulse = 1 + 0.12 * Math.sin(time * 3 + c.x);
    glowAt(ctx, glowSprite(CYAN, { white: true }), dp.x, dp.y, 22);
    ctx.fillStyle = CYAN;
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
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.abs(cxp.x - p.x), Math.abs(cyp.y - p.y), 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.chan);
      ctx.stroke();
    }
  });
  if (S.exit) {
    const e = S.exit;
    add(e.x, e.y, () => {
      const p = iso(e.x, e.y);
      const pulse = 0.6 + 0.4 * Math.sin(time * 3);
      glowAt(ctx, glowSprite(GOLD, { white: true, mid: 0.4, midA: 0.55 }), p.x, p.y, 34, e.open ? pulse : 0.22);
      groundEllipse(ctx, e.x, e.y, 24, null, e.open ? `rgba(251,191,36,${0.9 * pulse})` : '#475569', 3);
      text(ctx, e.open ? 'EXIT' : 'LOCKED', p.x, p.y, F12, e.open ? GREEN : PALE);
    });
  }
  if (S.omega) {
    const o = S.omega;
    add(o.x, o.y, () => {
      const p = iso(o.x, o.y);
      const bob = Math.sin(time * 2) * 2;
      const op = iso(o.x, o.y, 12 + bob);
      glowAt(ctx, glowSprite('#d946ef', { white: true }), op.x, op.y, 30);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(op.x, op.y - 16);
      ctx.lineTo(op.x + 12, op.y);
      ctx.lineTo(op.x, op.y + 16);
      ctx.lineTo(op.x - 12, op.y);
      ctx.closePath();
      ctx.fill();
      const ot = iso(o.x, o.y, 42);
      text(ctx, 'OMEGA CORE', ot.x, ot.y, F11, GOLD);
      if (o.chan > 0) {
        const oxp = iso(o.x + 26, o.y);
        const oyp = iso(o.x, o.y + 14);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.abs(oxp.x - p.x), Math.abs(oyp.y - p.y), 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.chan);
        ctx.stroke();
      }
    });
  }
  for (const t of S.turrets) if (!t.dead) add(t.x, t.y, () => drawTurret(ctx, t, time));
  if (S.warden && S.warden.hp > 0) add(S.warden.x, S.warden.y, () => drawWarden(ctx, S.warden, time));
  for (const e of G.echoes) {
    add(e.x, e.y, () => {
      for (const t of e.trail) {
        const tp = iso(t.x, t.y);
        ctx.save();
        ctx.globalAlpha = (t.life / 0.5) * 0.6;
        dot(ctx, tp.x, tp.y, 4, e.color);
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
      const w = S.warden;
      drawThief(ctx, e.x, e.y, e.color, {
        face: e.hack && w ? Math.atan2(w.y - e.y, w.x - e.x) : Math.atan2(e.vy, e.vx),
        alpha: 0.92, tag: 'ECHO ' + (e.idx + 1), time, shield: e.shield, vx: e.vx, vy: e.vy,
        pose: e.dash ? 'dash' : e.shield ? 'deflect' : e.hack ? 'plate' : 'idle',
      });
    });
  }
  add(G.player.x, G.player.y, () => {
    for (const t of G.player.trail) {
      const tp = iso(t.x, t.y);
      ctx.save();
      ctx.globalAlpha = (t.life / 0.4) * 0.5;
      dot(ctx, tp.x, tp.y, 4, INK);
      ctx.restore();
    }
  });
  add(G.player.x, G.player.y, () => {
    const p = G.player;
    if (p.invulnT <= 0 || Math.floor(time * 12) % 2 === 0) {
      drawThief(ctx, p.x, p.y, INK, {
        face: p.face, tag: 'YOU', time, shield: p.shieldT > 0, vx: p.vx, vy: p.vy,
        pose: p.dashT > 0 ? 'dash' : p.shieldT > 0 ? 'deflect' : p.hacking ? 'plate' : 'idle',
      });
    }
  });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  drawTethers(ctx, G, time);
  const fog = ctx.createLinearGradient(0, 150, 0, 340);
  fog.addColorStop(0, 'rgba(15,23,42,0.20)');
  fog.addColorStop(1, 'rgba(15,23,42,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 150, W, 190);
  for (const pt of G.particles) {
    const p = iso(pt.x, pt.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    dot(ctx, p.x, p.y, pt.size, pt.color);
    ctx.restore();
  }
  const shown = G.callouts.slice(-2);
  shown.forEach((c, i) => {
    const a = Math.max(0, c.life / c.max);
    ctx.save();
    ctx.globalAlpha = a;
    const fs = 20;
    ctx.font = `bold ${fs}px Georgia, serif`;
    const w = ctx.measureText(c.text).width + 28;
    const h = 30;
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

function drawTethers(ctx, G, time) {
  const S = G.stage, w = S.warden;
  if (!w || w.shield || w.hp <= 0 || G.echoes.length < 3) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const e of G.echoes) {
    const a = Math.atan2(e.y - w.y, e.x - w.x);
    let best = WARDEN_PYLONS[0], bd = 1e9;
    for (const pa of WARDEN_PYLONS) {
      const d = Math.abs(((a - pa + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < bd) { bd = d; best = pa; }
    }
    const n = iso(w.x + Math.cos(best) * 52, w.y + Math.sin(best) * 52, 24);
    const s = iso(e.x, e.y, 42);
    const pulse = 0.75 + 0.25 * Math.sin(time * 5 + e.idx * 1.7);
    ctx.strokeStyle = e.color + '1f';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
    ctx.strokeStyle = e.color + '4d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
    ctx.strokeStyle = e.color + 'd9';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(254,243,199,' + (0.95 * pulse).toFixed(2) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
    dot(ctx, s.x, s.y, 4, '#fef3c7');
    const tt = (time * 0.45 + e.idx * 0.25) % 1;
    dot(ctx, s.x + (n.x - s.x) * tt, s.y + (n.y - s.y) * tt, 5, '#fff');
    dot(ctx, n.x, n.y, 6, GOLD);
  }
  // Corner prism reflections: bright rays from the 4 screen corners to the core.
  const core = iso(w.x, w.y, 48);
  const corners = [[0, 0, CYAN], [W, 0, GOLD], [0, H, GOLD], [W, H, CYAN]];
  for (const [cx, cy, col] of corners) {
    const tx = core.x + (cx < W / 2 ? -30 : 30);
    const ty = core.y + (cy < H / 2 ? -18 : 18);
    ctx.strokeStyle = col + '38';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = col + '8c';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
    const ix = cx < W / 2 ? 16 : W - 16, iy = cy < H / 2 ? 16 : H - 16;
    glowAt(ctx, glowSprite(col, { a0: 0.8 }), ix, iy, 18);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(ix, iy - 6); ctx.lineTo(ix + 6, iy); ctx.lineTo(ix, iy + 6); ctx.lineTo(ix - 6, iy);
    ctx.closePath(); ctx.fill();
    dot(ctx, tx, ty, 3.5, '#fff');
  }
  ctx.restore();
}

export function drawHUD(ctx, G, time) {
  const st = G.state;
  const S = G.stage;
  // --- Top center: Chrono-Clock ring + stage + cores ---
  const cx = 640, cy = 30;
  const frac = G.loopDuration > 0 ? G.loopT / G.loopDuration : 0;
  ctx.save();
  panel(ctx, cx - 330, 8, 660, 46, 12, GOLD50, PAN88);
  ctx.beginPath();
  ctx.arc(cx, cy, 19, 0, Math.PI * 2);
  ctx.fillStyle = DARKT;
  ctx.fill();
  ctx.strokeStyle = frac < 0.25 ? RED : CYAN;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  text(ctx, G.loopT.toFixed(2) + 's', cx, cy, F10, frac < 0.25 ? RED : CYAN);
  text(ctx, `VAULT ${st.stage} / 7 — ${STAGE_NAMES[st.stage]}`, cx - 120, cy - 8, F13, INK);
  text(ctx, `CORES: ${st.coresGot}/${st.coresTotal}`, cx + 120, cy - 8, F13, GOLD);
  text(ctx, `SCORE ${st.score.toLocaleString('en-US')}`, cx - 120, cy + 12, F11, MUTE);
  text(ctx, `LOOP ${st.loopsUsed}`, cx + 120, cy + 12, F11, MUTE);
  for (let i = 0; i < G.player.maxHp; i++) {
    dot(ctx, cx - 300 + i * 16, cy, 5, i < G.player.hp ? GREEN : 'rgba(148,163,184,0.3)');
  }
  text(ctx, 'INTEGRITY', cx - 300, cy - 16, F8, MUTE);
  ctx.restore();

  pill(ctx, cx - 150, 58, 300, 20, PAN88, 'rgba(251,191,36,0.4)');
  text(ctx, 'WIN: SHATTER WARDEN', cx - 74, 68, F11, GREEN);
  text(ctx, 'LOSE: INTEGRITY 0', cx + 74, 68, F11, REDL);

  // --- Left panel: Active Echo Timeline + Chrono-Mods Held ---
  const rows = [{ label: 'YOU', color: INK, rec: null }];
  for (const e of G.echoes) rows.push({ label: 'ECHO ' + (e.idx + 1), color: e.color, rec: e.recording });
  const leftH = 44 + rows.length * 26 + 24 + Math.max(1, st.mods.length) * 20 + 12;
  ctx.save();
  panel(ctx, 12, 66, 172, leftH, 10, CYAN40, PAN88);
  text(ctx, 'ACTIVE ECHO TIMELINE', 98, 82, F11, CYAN, 'center');
  rows.forEach((r, i) => {
    const y = 102 + i * 26;
    text(ctx, r.label, 22, y, F10, r.color, 'left');
    const bx = 76, bw = 96;
    ctx.fillStyle = 'rgba(148,163,184,0.18)';
    ctx.fillRect(bx, y - 5, bw, 10);
    if (r.rec) {
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
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(bx + (G.loopElapsed / G.loopDuration) * bw, y - 8);
      ctx.lineTo(bx + (G.loopElapsed / G.loopDuration) * bw, y + 8);
      ctx.stroke();
    } else {
      dot(ctx, bx + (G.loopElapsed / G.loopDuration) * bw, y, 3, '#fff');
      text(ctx, 'recording…', bx + 52, y + 14, R9, MUTE, 'center');
    }
  });
  text(ctx, `CHRONO-MODS HELD (${st.mods.length}/5)`, 98, 102 + rows.length * 26 + 8, F11, GOLD, 'center');
  st.mods.forEach((m, i) => {
    const y = 102 + rows.length * 26 + 28 + i * 20;
    dot(ctx, 28, y - 3, 6, m.color);
    text(ctx, `${m.name} — ${m.tag}`, 40, y, R10, INK, 'left');
  });
  if (st.mods.length === 0) text(ctx, 'No mods yet — clear a vault!', 98, 102 + rows.length * 26 + 28, R10, MUTE, 'center');
  text(ctx, '◆ ' + st.shards + ' SHARDS', 98, 102 + rows.length * 26 + 28 + Math.max(1, st.mods.length) * 20, F11, GOLD, 'center');
  ctx.restore();

  // --- Right panel: Vault Security / Threat Queue ---
  ctx.save();
  panel(ctx, 1096, 66, 172, 236, 10, RED40, PAN88);
  text(ctx, 'VAULT SECURITY', 1182, 82, F11, REDL, 'center');
  const threats = G.threatList();
  threats.slice(0, 5).forEach((t, i) => {
    const y = 104 + i * 34;
    text(ctx, t.name, 1108, y - 4, F10, INK, 'left');
    text(ctx, t.note, 1256, y - 4, R9, MUTE, 'right');
    if (t.frac != null) hpBar(ctx, 1108, y + 4, 148, t.frac, t.color || RED);
  });
  if (threats.length === 0) text(ctx, 'All quiet… for now.', 1182, 130, R10, MUTE, 'center');
  if (st.stage === 7 && S.warden) {
    text(ctx, 'BOSS ON THE FLOOR', 1182, 104 + 5 * 34 + 6, F10, GOLD, 'center');
    text(ctx, 'Chrono-Warden — break the shield!', 1182, 104 + 5 * 34 + 22, R9, MUTE, 'center');
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
    ctx.fillStyle = c.ready ? 'rgba(34,211,238,0.16)' : PAN88;
    ctx.beginPath();
    ctx.roundRect(x, y, 84, 58, 8);
    ctx.fill();
    ctx.strokeStyle = c.ready ? CYAN : 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (!c.ready) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.moveTo(x + 42, y + 26);
      ctx.arc(x + 42, y + 26, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - c.cd / c.max));
      ctx.closePath();
      ctx.fill();
      text(ctx, c.cd.toFixed(1) + 's', x + 42, y + 26, F12, '#fff');
    }
    drawAbilityIcon(ctx, c.icon, x + 42, y + 24, c.ready ? CYAN : MUTE);
    text(ctx, c.name, x + 42, y + 46, F9, INK);
    dot(ctx, x + 76, y + 8, 9, GOLD);
    text(ctx, c.key, x + 76, y + 8, F10, DARKT);
    ctx.restore();
  });
  ctx.save();
  pill(ctx, 12, 656, 150, 34, PAN90, 'rgba(251,191,36,0.6)');
  text(ctx, `SYNC COMBO x${st.combo.toFixed(2)}`, 87, 673, F14, GOLD);
  ctx.beginPath();
  ctx.arc(1064, 673, 28, 0, Math.PI * 2);
  ctx.fillStyle = st.grade === 'S' ? GOLD : st.grade === 'A' ? '#c9d1e3' : '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'GRADE ' + st.grade, 1064, 673, F9, DARKT);
  ctx.restore();

  // --- Vault Radar (bottom-right) ---
  ctx.save();
  const rx = 1196, ry = 632, rr = 46;
  dot(ctx, rx, ry, rr, PAN90);
  ctx.strokeStyle = 'rgba(34,211,238,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rx, ry, rr - 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(148,163,184,0.25)';
  ctx.stroke();
  const mapX = (x) => rx + ((x - ARENA.x) / ARENA.w - 0.5) * (rr * 2 - 12);
  const mapY = (y) => ry + ((y - ARENA.y) / ARENA.h - 0.5) * (rr * 2 - 12);
  for (const c of S.cores) if (!c.taken) dot(ctx, mapX(c.x), mapY(c.y), 3, GOLD);
  for (const t of S.turrets) if (!t.dead) dot(ctx, mapX(t.x), mapY(t.y), 3, RED);
  if (S.warden && S.warden.hp > 0) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(mapX(S.warden.x), mapY(S.warden.y), 6, 0, Math.PI * 2); ctx.fill(); }
  for (const e of G.echoes) { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(mapX(e.x), mapY(e.y), 3, 0, Math.PI * 2); ctx.fill(); }
  dot(ctx, mapX(G.player.x), mapY(G.player.y), 3.5, '#fff');
  text(ctx, 'VAULT RADAR', rx, ry + rr + 12, F9, MUTE);
  ctx.restore();

  ctx.save();
  pill(ctx, 1180, 12, 44, 26, PAN90, 'rgba(148,163,184,0.5)');
  text(ctx, G.audio.muted ? 'MUTE' : 'SOUND', 1202, 25, F9, INK);
  pill(ctx, 1228, 12, 40, 26, PAN90, 'rgba(148,163,184,0.5)');
  text(ctx, 'II', 1248, 25, F10, INK);
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
  x.font = F64;
  x.fillStyle = GOLD;
  x.fillText('ECHO VAULT', 640, 108);
  x.shadowBlur = 0;
  x.font = F20;
  x.fillStyle = 'rgba(5,7,13,0.82)';
  x.beginPath();
  x.roundRect(640 - 190, 136, 380, 36, 18);
  x.fill();
  x.fillStyle = CYAN;
  x.fillText('— Break Time. Steal Everything. —', 640, 152);
  x.fillStyle = 'rgba(5,7,13,0.82)';
  x.beginPath();
  x.roundRect(640 - 250, 178, 500, 30, 15);
  x.fill();
  x.font = R15;
  x.fillStyle = PALE;
  x.fillText('Eight seconds a loop. Four past selves. One impossible heist.', 640, 194);
  titleHeader = c;
  return c;
}

export function drawTitle(ctx, G, time) {
  const P = G.persist;
  ctx.save();
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, 'rgba(5,7,13,0.5)');
  veil.addColorStop(0.6, 'rgba(5,7,13,0.3)');
  veil.addColorStop(1, 'rgba(5,7,13,0.55)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(titleHeaderSprite(), 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  pill(ctx, 440, 222, 190, 26, GREEN25, GREEN);
  text(ctx, 'WIN: SHATTER WARDEN', 535, 235, F11, GREEN);
  pill(ctx, 650, 222, 190, 26, 'rgba(239,68,68,0.25)', REDL);
  text(ctx, 'LOSE: INTEGRITY 0', 745, 235, F11, REDL);
  panel(ctx, 12, 250, 184, 150, 10, GOLD50);
  text(ctx, 'YOUR HEISTS', 104, 268, F11, GOLD);
  const pRows = [
    ['BEST', P.best ? P.best.toLocaleString('en-US') : '—', INK],
    ['FURTHEST', P.furthest > 1 ? 'VAULT ' + P.furthest : '—', INK],
    ['LAST RUN', P.runs.length ? (P.runs[0].won ? 'WON · ' + P.runs[0].grade : 'LOST · V' + (P.runs[0].label.match(/V(\d)/)?.[1] || '?')) : '—', P.runs.length && P.runs[0].won ? GREEN : REDL],
  ];
  pRows.forEach((r, i) => {
    const y = 296 + i * 34;
    text(ctx, r[0], 24, y, F10, MUTE, 'left');
    text(ctx, r[1], 184, y + 14, F16, r[2], 'right');
  });
  panel(ctx, 1084, 250, 184, 222, 10, 'rgba(239,68,68,0.5)');
  text(ctx, 'BESTIARY', 1176, 268, F11, REDL);
  THREATS.forEach((t, i) => {
    const y = 292 + i * 32;
    ctx.fillStyle = t[2];
    ctx.beginPath(); ctx.arc(1098, y - 2, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, t[0], 1110, y - 2, F11, INK, 'left');
    text(ctx, t[1], 1110, y + 12, R10, PALE, 'left');
  });
  text(ctx, 'DIFFICULTY', 640, 488, F11, PALE);
  const diffs = [['CALM', '×0.75'], ['HEIST', '×1'], ['NIGHTMARE', '×1.5']];
  diffs.forEach((d, i) => {
    const x = 445 + i * 135, sel = G.diff === d[0];
    pill(ctx, x, 500, 120, 30, sel ? GOLD : PAN, sel ? null : GOLD50);
    text(ctx, d[0] + ' ' + d[1], x + 60, 515, F12, sel ? DARKT : INK);
  });
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.roundRect(640 - 130, 566, 260, 56, 10);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = F24;
  ctx.fillText('▶  PLAY', 640, 595);
  const how = [
    ['move', 'WASD MOVE · STEAL CORES'],
    ['rewind', '0.00s REWIND · ECHOES REPLAY'],
    ['echo', 'ECHOES HOLD PLATES · YOU FINISH'],
  ];
  how.forEach((h, i) => {
    const x = 180 + i * 310;
    panel(ctx, x, 634, 300, 34, 10);
    drawHowIcon(ctx, h[0], x + 22, 651, CYAN);
    text(ctx, h[1], x + 42, 651, F11, INK, 'left');
  });
  text(ctx, 'Space dash · E hack · 1–4 abilities · R rewind · P pause · M mute', 640, 690, R12, PALE);
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
  x.fillStyle = GOLD;
  x.fillText(`VAULT ${stage} CLEARED — CHOOSE YOUR PATH`, 640, 40);
  x.shadowBlur = 0;
  x.fillStyle = 'rgba(5,7,13,0.78)';
  x.beginPath(); x.roundRect(640 - 330, 62, 660, 32, 10); x.fill();
  x.font = R15;
  x.fillStyle = PALE;
  x.fillText('Pick 1 of 3 Chrono-Mods — your echoes inherit it at once.', 640, 78);
  draftHeaders.set(stage, c);
  return c;
}

const FAMCOL = { TIME: CYAN, WARD: '#a78bfa', FLOW: GREEN, GOLD: GOLD };
const RARECOL = { C: MUTE, R: CYAN, E: GOLD };
const RARENAME = { C: 'COMMON', R: 'RARE', E: 'EPIC' };
const NEXT_NEW = { 2: 'Sentry Turret', 3: 'Temporal Jammer', 4: 'Sentry Turret + Jammer', 5: 'Laser Sweeper', 6: 'Chrono-Mine', 7: 'THE CHRONO-WARDEN' };

export function drawDraft(ctx, G) {
  const st = G.state;
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,13,0.35)';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(draftHeaderSprite(st.stage), 0, 56);
  pill(ctx, 1000, 12, 160, 28, PAN, GOLD50);
  text(ctx, '◆ ' + st.shards + ' SHARDS', 1080, 26, F13, GOLD);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  text(ctx, 'VAULT BLUEPRINT — ROUTE MAP', 640, 156, F11, GOLD);
  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(200, 176); ctx.lineTo(1080, 176); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const nx = 200 + i * 146.67, done = i < st.stage, next = i === st.stage;
    ctx.fillStyle = done ? GREEN : next ? GOLD : '#1e293b';
    ctx.beginPath(); ctx.arc(nx, 176, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = done ? GREEN : next ? GOLD : SLATE;
    ctx.lineWidth = next ? 3 : 1.5; ctx.stroke();
    text(ctx, done ? '✓' : 'V' + (i + 1), nx, 176, F10, done || next ? DARKT : MUTE);
    text(ctx, STAGE_NAMES[i + 1], nx, 198, R10, next ? GOLD : PALE);
  }
  text(ctx, 'NEXT: VAULT ' + (st.stage + 1) + ' — ' + STAGE_NAMES[st.stage + 1] + ' · NEW: ' + NEXT_NEW[st.stage + 1], 640, 214, F12, CYAN);
  st.draft.forEach((m, i) => {
    const x = 640 - 3 * 140 + i * 290 + 15, y = 224, w = 260, h = 290;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = RARECOL[m.rare];
    ctx.beginPath();
    ctx.roundRect(x, y, w, 6, [12, 12, 0, 0]);
    ctx.fill();
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.roundRect(x, y + 6, w, 38, [0, 0, 0, 0]);
    ctx.fill();
    ctx.fillStyle = DARKT;
    ctx.font = F15;
    ctx.fillText(m.tag.toUpperCase(), x + w / 2, y + 25);
    text(ctx, '◆ ' + m.fam, x + 12, y + 56, F11, FAMCOL[m.fam], 'left');
    text(ctx, RARENAME[m.rare] + ' ★', x + w - 12, y + 56, F11, RARECOL[m.rare], 'right');
    ctx.textAlign = 'center'; // text() above leaves align 'right'; the
    ctx.fillStyle = DARKT;
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
    ctx.fillStyle = INK;
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(m.name, x + w / 2, y + 178);
    ctx.fillStyle = PALE;
    ctx.font = '13px Georgia, serif';
    wrapText(ctx, m.desc, x + w / 2, y + 200, w - 32, 17);
    ctx.fillStyle = GOLD;
    ctx.font = 'italic 12px Georgia, serif';
    ctx.fillText('↗ ' + m.syn, x + w / 2, y + 232);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x + 20, y + 246, w - 40, 24, 8);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = F12;
    ctx.fillText('CLICK TO TAKE · [' + (i + 1) + ']', x + w / 2, y + 258);
  });
  const canMend = st.shards >= 20 && st.hpLeft < st.maxHp;
  const canReroll = st.shards >= 10;
  pill(ctx, 400, 530, 180, 36, canMend ? GREEN25 : PAN, canMend ? GREEN : 'rgba(148,163,184,0.4)');
  text(ctx, 'MEND +1 ◆20', 490, 548, F13, canMend ? GREEN : SLATE);
  pill(ctx, 600, 530, 160, 36, canReroll ? 'rgba(34,211,238,0.25)' : PAN, canReroll ? CYAN : 'rgba(148,163,184,0.4)');
  text(ctx, 'REROLL ◆10 [R]', 680, 548, F13, canReroll ? CYAN : SLATE);
  text(ctx, '◆ ' + st.shards, 800, 548, F14, GOLD, 'left');
  panel(ctx, 640 - 310, 580, 620, 30, 10, null, 'rgba(5,7,13,0.78)');
  ctx.fillStyle = PALE;
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
    ctx.font = F16;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 1);
  }
  ctx.restore();
}

export function drawVictory(ctx, G) {
  const st = G.state;
  const P = G.persist;
  ctx.save();
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
  text(ctx, 'HEIST COMPLETE', 640, 52, 'bold 36px Georgia, serif', GOLD);
  text(ctx, 'The Omega Core is yours. The vault wakes to empty shelves.', 640, 84, R15, CYAN);
  const mm = Math.floor(G.runTime / 60), ss = Math.floor(G.runTime % 60);
  const tstr = mm + ':' + String(ss).padStart(2, '0');
  const dm = G.diff === 'CALM' ? '0.75' : G.diff === 'NIGHTMARE' ? '1.5' : '1';
  text(ctx, 'SEED ' + G.runSeed + ' · ' + tstr + ' · ' + G.diff + ' ×' + dm, 640, 112, R12, PALE);
  panel(ctx, 40, 130, 260, 430, 12, GOLD50);
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
  text(ctx, 'RANK ' + st.grade, 170, 276, F12, MUTE);
  if (st.score >= P.best && P.best > 0) {
    pill(ctx, 95, 292, 150, 24, GOLD, null);
    text(ctx, '★ NEW BEST!', 170, 304, F13, DARKT);
  }
  text(ctx, 'FINAL SCORE', 170, 340, F11, MUTE);
  text(ctx, st.score.toLocaleString('en-US'), 170, 366, 'bold 28px Georgia, serif', INK);
  text(ctx, '◆ +' + st.shardsBanked + ' SHARDS BANKED', 170, 400, F13, GOLD);
  text(ctx, 'WORKSHOP: ' + P.workshop + ' ◆', 170, 424, R12, MUTE);
  panel(ctx, 320, 130, 420, 430, 12, CYAN40);
  text(ctx, 'RUN STATS', 340, 150, F11, CYAN, 'left');
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
    text(ctx, s[0], cx, cy, F10, MUTE, 'left');
    text(ctx, s[1], cx, cy + 20, F16, INK, 'left');
  });
  text(ctx, 'SCORE BY VAULT — BARS: SCORE · LINE: COMBO', 340, 420, F11, MUTE, 'left');
  const bars = st.scoreByStage, maxV = Math.max(1, ...bars);
  bars.forEach((v, i) => {
    const x = 340 + i * 58, h = Math.max(4, (v / maxV) * 64);
    ctx.fillStyle = i === 6 ? GOLD : CYAN;
    ctx.fillRect(x, 500 - h, 44, h);
    text(ctx, 'V' + (i + 1), x + 22, 514, R9, MUTE);
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
    dot(ctx, 340 + i * 58 + 22, 500 - (c / 5) * 64, 3, '#fff');
  });
  panel(ctx, 760, 130, 480, 430, 12, 'rgba(52,211,153,0.4)');
  const doneN = st.feats.filter((f) => f.done).length;
  text(ctx, 'FEATS ' + doneN + '/8', 780, 150, F11, GREEN, 'left');
  FEATS.forEach((f, i) => {
    const y = 172 + i * 26, got = st.feats[i] && st.feats[i].done;
    text(ctx, got ? '✓' : '·', 780, y, F13, got ? GREEN : SLATE, 'left');
    text(ctx, f[0], 800, y, R12, got ? INK : SLATE, 'left');
    if (st.feats[i] && st.feats[i].isNew) text(ctx, 'NEW', 1220, y, F10, GOLD, 'right');
  });
  text(ctx, 'LAST 3 RUNS', 780, 396, F11, CYAN, 'left');
  P.runs.slice(0, 3).forEach((r, i) => {
    const y = 420 + i * 26;
    text(ctx, r.grade, 780, y, F14, r.won ? GOLD : MUTE, 'left');
    text(ctx, r.label, 806, y, R12, INK, 'left');
    text(ctx, r.score.toLocaleString('en-US'), 1220, y, F12, INK, 'right');
  });
  pill(ctx, 40, 576, 1200, 30, PAN, GOLD50);
  text(ctx, 'NEXT GOAL: reach Vault 7 on NIGHTMARE — or beat 30,000 on HEIST', 640, 591, F13, GOLD);
  pill(ctx, 340, 626, 200, 52, '#b91c1c', GOLD);
  text(ctx, '↻ RUN AGAIN', 440, 652, 'bold 18px Georgia, serif', '#fff');
  pill(ctx, 560, 626, 200, 52, PAN, GOLD);
  text(ctx, '↻ SAME SEED [S]', 660, 652, F15, GOLD);
  pill(ctx, 780, 626, 160, 52, PAN, 'rgba(148,163,184,0.5)');
  text(ctx, 'MENU [Esc]', 860, 652, F15, INK);
  ctx.restore();
}

export function drawDefeat(ctx, G) {
  const st = G.state;
  const P = G.persist;
  const mm = Math.floor(G.runTime / 60), ss = Math.floor(G.runTime % 60);
  const tstr = mm + ':' + String(ss).padStart(2, '0');
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,13,0.82)';
  ctx.fillRect(0, 0, W, H);
  const cg = ctx.createRadialGradient(640, 300, 40, 640, 300, 420);
  cg.addColorStop(0, 'rgba(127,29,29,0.4)');
  cg.addColorStop(1, 'rgba(127,29,29,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = REDL;
  ctx.font = F64;
  ctx.fillText('CAUGHT!', 640, 128);
  pill(ctx, 640 - 170, 168, 340, 30, 'rgba(239,68,68,0.25)', RED);
  text(ctx, 'FELLED BY THE ' + (st.cause || 'VAULT'), 640, 183, F12, REDL);
  panel(ctx, 340, 230, 600, 170, 12, 'rgba(239,68,68,0.5)');
  text(ctx, 'RUN BREAKDOWN', 360, 252, F11, REDL, 'left');
  const stats = [
    ['VAULT', 'V' + st.stage + ' / 7'],
    ['SCORE', st.score.toLocaleString('en-US')],
    ['CORES', st.coresGot + ' / ' + st.coresTotal],
    ['LOOPS', st.loopsUsed + ''],
    ['TIME', tstr],
    ['MAX COMBO', '×' + st.maxSync.toFixed(2)],
  ];
  stats.forEach((s, i) => {
    const cx = 360 + (i % 3) * 200, cy = 282 + Math.floor(i / 3) * 58;
    text(ctx, s[0], cx, cy, F10, MUTE, 'left');
    text(ctx, s[1], cx, cy + 20, F16, INK, 'left');
  });
  const doneN = st.feats.filter((f) => f.done).length;
  text(ctx, 'FEATS ' + doneN + '/8', 640, 430, F11, GREEN);
  FEATS.forEach((f, i) => {
    const x = 640 - 7 * 34 + i * 68;
    const got = st.feats[i] && st.feats[i].done;
    dot(ctx, x, 458, 10, got ? GREEN : 'rgba(100,116,139,0.4)');
    text(ctx, got ? '✓' : '·', x, 458, F11, got ? DARKT : MUTE);
  });
  text(ctx, 'The vault keeps its secrets — this time. Your echoes fade with you.', 640, 500, R15, PALE);
  text(ctx, 'BEST ' + (P.best ? P.best.toLocaleString('en-US') : '—') + '  ·  FURTHEST VAULT ' + (P.furthest > 1 ? P.furthest : '—'), 640, 545, R12, MUTE);
  pill(ctx, 340, 626, 200, 52, '#b91c1c', GOLD);
  text(ctx, '↻  RETRY VAULT', 440, 644, F13, '#fff');
  text(ctx, '[R]', 440, 664, F10, 'rgba(255,255,255,0.7)');
  pill(ctx, 560, 626, 200, 52, PAN, CYAN40);
  text(ctx, 'SAME SEED', 660, 644, F13, CYAN);
  text(ctx, '[S]', 660, 664, F10, MUTE);
  pill(ctx, 780, 626, 200, 52, PAN, GOLD50);
  text(ctx, 'MENU', 880, 644, F13, INK);
  text(ctx, '[Esc]', 880, 664, F10, MUTE);
  ctx.restore();
}

export function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,7,13,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('PAUSED', 640, 330);
  ctx.font = R15;
  ctx.fillStyle = MUTE;
  ctx.fillText('P to resume · M to mute · R to rewind the loop', 640, 370);
  ctx.restore();
}
