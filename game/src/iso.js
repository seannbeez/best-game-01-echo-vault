// ECHO VAULT — isometric projection. One clear job: map the game's logical
// ground-plane coordinates (the same grid the logic plays on) to screen
// coordinates of a true 2.5D isometric diorama, and back again.
// Standard 2:1 diamond: screenX = OX + (x - y) * cos30 * S,
// screenY = OY + (x + y) * 0.5 * S - z * S. The arena diamond lands at
// x 145..1135, y 74..646, floating over the abyss.
export const ISO_S = 0.78;
export const ISO_OX = 447.5;
export const ISO_OY = -28;
const COS30 = 0.8660254;

export function iso(x, y, z = 0) {
  return {
    x: ISO_OX + (x - y) * COS30 * ISO_S,
    y: ISO_OY + (x + y) * 0.5 * ISO_S - z * ISO_S,
  };
}

// Inverse projection (z = 0 plane): screen point -> logical ground point.
export function screenToWorld(sx, sy) {
  const dx = (sx - ISO_OX) / (COS30 * ISO_S);
  const dy = (sy - ISO_OY) / (0.5 * ISO_S);
  return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
}

// Depth key for the painter's algorithm: larger (x + y) is nearer the camera.
export function depthOf(x, y) { return x + y; }

// Draw a filled diamond (an iso tile) centered at logical (x, y).
export function isoDiamond(ctx, x, y, hw, hh, fill, stroke) {
  const c = iso(x, y);
  const w = hw * COS30 * ISO_S;
  const h = hh * 0.5 * ISO_S;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - h);
  ctx.lineTo(c.x + w, c.y);
  ctx.lineTo(c.x, c.y + h);
  ctx.lineTo(c.x - w, c.y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// Draw an extruded box: top face (diamond) at height z, left face (dark),
// right face (darker). Logical rect (x, y, w, h), height z.
export function extrudeBox(ctx, x, y, w, h, z, top, left, right) {
  const p1 = iso(x, y, z);
  const p2 = iso(x + w, y, z);
  const p3 = iso(x + w, y + h, z);
  const p4 = iso(x, y + h, z);
  const b1 = iso(x, y, 0);
  const b2 = iso(x + w, y, 0);
  const b3 = iso(x + w, y + h, 0);
  const b4 = iso(x, y + h, 0);
  // Left face (p4, p3, b3, b4) and right face (p2, p3, b3, b2).
  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(p4.x, p4.y); ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(b3.x, b3.y); ctx.lineTo(b4.x, b4.y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(b3.x, b3.y); ctx.lineTo(b2.x, b2.y);
  ctx.closePath(); ctx.fill();
  // Top face.
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
  ctx.closePath(); ctx.fill();
}

// A long, soft directional drop-shadow for an object standing at (x, y):
// a dense core ellipse plus a fainter, farther tail — the light rakes in
// from the upper-left, so every shadow stretches down-right.
export function isoShadow(ctx, x, y, rx, ry, alpha = 0.45) {
  const c = iso(x, y);
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(c.x + 20, c.y + 12, rx * 1.35, ry * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.45})`;
  ctx.beginPath();
  ctx.ellipse(c.x + 38, c.y + 21, rx * 1.5, ry * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
