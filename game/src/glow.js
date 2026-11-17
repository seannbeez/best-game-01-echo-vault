// ECHO VAULT — pre-rendered glow sprites. One clear job: the gradients the
// game used to rebuild every frame (radial glows, vertical light beams,
// turret vision cones) are painted ONCE into small offscreen canvases and
// then stamped with drawImage. Same pixels, a fraction of the per-frame
// cost: no createLinearGradient / createRadialGradient inside the frame
// loop. All sprites are deterministic and cached by their parameters.
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, a) {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const glowCache = new Map();
// Radial glow, 96x96, centered. white: white-hot center fading through the
// color (core pods, exit, omega). Without it: pure color glow fading out
// (thief halo, Warden eye). a0 is the center alpha for the pure form;
// mid/midA tune the color ring (the exit glow uses 0.4 / 0.55).
export function glowSprite(color, { white = false, mid = 0.35, midA = 0.7, a0 = 0.27 } = {}) {
  const key = color + '|' + (white ? 1 : 0) + '|' + mid + '|' + midA + '|' + a0;
  const hit = glowCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(96, 96);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(48, 48, 1, 48, 48, 48);
  if (white) {
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(mid, rgba(color, midA));
    g.addColorStop(1, rgba(color, 0));
  } else {
    g.addColorStop(0, rgba(color, a0));
    g.addColorStop(1, rgba(color, 0));
  }
  x.fillStyle = g;
  x.fillRect(0, 0, 96, 96);
  glowCache.set(key, c);
  return c;
}

// Stamp a glow sprite centered at (x, y) with radius r.
export function drawGlow(ctx, sprite, x, y, r) {
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

const beamCache = new Map();
// Vertical light beam: transparent at the top, `rgb` at maxA at the bottom.
// rgb is 'r,g,b'; w/h in pixels. Used for plate pillars, core beams and
// laser emitter pillars (drawn with globalAlpha for the live pulse).
export function vbeamSprite(rgb, w, h, maxA) {
  const key = rgb + '|' + w + '|' + h + '|' + maxA;
  const hit = beamCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(1, `rgba(${rgb},${maxA})`);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  beamCache.set(key, c);
  return c;
}

const coneCache = new Map();
// Turret vision cone: a wedge pointing right, apex at (2, 80) of a
// 256x160 canvas, half-angle = spread, fading from a0 at the apex to 0 at
// the far end. Drawn rotated toward the aim with scale = screenLen / 252.
export function coneSprite(rgb, a0, spread) {
  const key = rgb + '|' + a0 + '|' + spread;
  const hit = coneCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(256, 160);
  const x = c.getContext('2d');
  const half = 252 * Math.tan(spread);
  const g = x.createLinearGradient(2, 0, 254, 0);
  g.addColorStop(0, `rgba(${rgb},${a0})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(2, 80);
  x.lineTo(254, 80 - half);
  x.lineTo(254, 80 + half);
  x.closePath();
  x.fill();
  coneCache.set(key, c);
  return c;
}
