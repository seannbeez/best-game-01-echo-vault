// True perspective camera for the mini-3D renderer (branch mini3d).
const CX = 640, CY = 360, F = 1900;
const EX = 640, EY = 355 + 950, EZ = 1150; // camera eye
const ZS = 1.6; // vertical exaggeration for z heights
// Forward (eye -> target (640,355,0)), normalized.
const _fl = Math.hypot(0, -950, -EZ);
const FWD = [0, -950 / _fl, -EZ / _fl];
// Right = up x fwd  (screen-right = world +x).
let R = [0 * FWD[2] - 1 * FWD[1], 1 * FWD[0] - 0 * FWD[2], 0 * FWD[1] - 0 * FWD[0]];
const _rl = Math.hypot(R[0], R[1], R[2]);
R = [R[0] / _rl, R[1] / _rl, R[2] / _rl];
// Screen-up = fwd x right.
const U = [
  FWD[1] * R[2] - FWD[2] * R[1],
  FWD[2] * R[0] - FWD[0] * R[2],
  FWD[0] * R[1] - FWD[1] * R[0],
];

export function iso(x, y, z = 0) {
  const vx = x - EX, vy = y - EY, vz = z * ZS - EZ;
  const px = vx * R[0] + vy * R[1] + vz * R[2];
  const py = vx * U[0] + vy * U[1] + vz * U[2];
  const pz = vx * FWD[0] + vy * FWD[1] + vz * FWD[2];
  const s = F / pz;
  return { x: CX + px * s, y: CY - py * s, d: pz };
}

// Inverse of iso() at z = 0: the ray through a screen pixel, intersected
export function screenToWorld(sx, sy) {
  const ax = (sx - CX) / F, ay = (CY - sy) / F;
  const dx = R[0] * ax + U[0] * ay + FWD[0];
  const dy = R[1] * ax + U[1] * ay + FWD[1];
  const dz = R[2] * ax + U[2] * ay + FWD[2];
  const t = -EZ / dz;
  return { x: EX + dx * t, y: EY + dy * t };
}

// Sort key for the painter's pass: larger = nearer the camera.
export function depthOf(x, y, z = 0) {
  const vx = x - EX, vy = y - EY, vz = z * ZS - EZ;
  return -(vx * FWD[0] + vy * FWD[1] + vz * FWD[2]);
}

// A flat quad on the ground plane (a floor tile / plate / mirror).
export function isoDiamond(ctx, x, y, hw, hh, fill, stroke) {
  const a = iso(x, y - hh), b = iso(x + hw, y), c = iso(x, y + hh), d = iso(x - hw, y);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// A ground circle seen through the perspective camera: project the centre
export function groundEllipse(ctx, x, y, r, fill, stroke, lw = 2) {
  const c = iso(x, y);
  const px = iso(x + r, y);
  const py = iso(x, y + r);
  const rx = Math.abs(px.x - c.x);
  const ry = Math.abs(py.y - c.y);
  if (rx < 0.5 || ry < 0.5) return;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

// A 3D box: (x, y) is the footprint's north-west corner, w/h the logical
export function extrudeBox(ctx, x, y, w, h, z, top, left, right) {
  const bSW = iso(x, y + h), bSE = iso(x + w, y + h);
  const bNW = iso(x, y), bNE = iso(x + w, y);
  const tSW = iso(x, y + h, z), tSE = iso(x + w, y + h, z);
  const tNW = iso(x, y, z), tNE = iso(x + w, y, z);
  const quad = (p1, p2, p3, p4, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
  };
  // Side face toward the camera's x side: the east face when the box is
  const cx = x + w / 2;
  if (cx < CX - w) quad(bNE, bSE, tSE, tNE, right);
  else if (cx > CX + w) quad(bSW, bNW, tNW, tSW, right);
  // South face (toward the camera).
  quad(bSW, bSE, tSE, tSW, left);
  // Top face.
  quad(tSW, tSE, tNE, tNW, top);
}

// A long, soft directional drop-shadow for an object standing at (x, y):
export function isoShadow(ctx, x, y, rx, ry, alpha = 0.45) {
  const c = iso(x, y);
  const px = iso(x + rx, y);
  const py = iso(x, y + ry);
  const ex = Math.abs(px.x - c.x) * 1.2;
  const ey = Math.abs(py.y - c.y) * 1.2;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(c.x + 16, c.y + 10, ex, ey, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.45})`;
  ctx.beginPath();
  ctx.ellipse(c.x + 30, c.y + 18, ex * 1.15, ey, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
