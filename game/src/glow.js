// ECHO VAULT — pre-rendered glow sprites. One clear job: the gradients the
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

export function drawGlow(ctx, sprite, x, y, r) {
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

const beamCache = new Map();
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

export function glowAt(ctx, sprite, x, y, r, alpha = 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha; drawGlow(ctx, sprite, x, y, r); ctx.restore(); }
