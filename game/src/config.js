// ECHO VAULT — shared constants, tuning, and small math helpers.
// One clear job: every magic number in the game lives here.
export const W = 1280;
export const H = 720;
// The vault chamber the heist plays in (the floor itself is full-bleed).
export const ARENA = { x: 196, y: 66, w: 888, h: 578 };
export const LOOP_BASE = 8.0; // seconds per time-loop
export const MAX_ECHOES = 4;
export const ECHO_COLORS = ['#22d3ee', '#fbbf24', '#f472b6', '#34d399'];
export const ECHO_NAMES = ['ECHO 1', 'ECHO 2', 'ECHO 3', 'ECHO 4'];
export const ECHO_DARK = ['#0e7490', '#b45309', '#be185d', '#047857'];

export const PLAYER_SPEED = 265;
export const PLAYER_RADIUS = 13;
export const DASH_SPEED = 560;
export const DASH_TIME = 0.18;
export const DASH_COOLDOWN = 1.1;
export const SHIELD_TIME = 1.4;
export const SHIELD_COOLDOWN = 4.0;
export const EMP_COOLDOWN = 6.0;
export const EMP_RADIUS = 170;
export const ANCHOR_COOLDOWN = 8.0;
export const CORE_CHANNEL_TIME = 1.1; // seconds standing at a pod to extract
export const WARDEN_HP = 300;
export const WARDEN_VULN_TIME = 4.5; // shield-down window once all nodes held

// Chrono-Mods offered in the draft (pick 1 of 3 between stages, max 5 held).
export const MODS = [
  { id: 'overclock', name: 'Overclocked Loop', tag: '+2.0s Loop', color: '#22d3ee', icon: 'clock',
    desc: 'Every loop lasts 2.0 seconds longer. More time to steal.' },
  { id: 'phase', name: 'Phase Dash', tag: 'Lightning Trails', color: '#a78bfa', icon: 'bolt',
    desc: 'Echoes leave damaging lightning trails as they replay.' },
  { id: 'mirror', name: 'Mirror Coat', tag: 'Echoes Reflect', color: '#f472b6', icon: 'mirror',
    desc: 'Echoes reflect turret beams back at the turrets.' },
  { id: 'quantum', name: 'Quantum Clone', tag: '+1 Phantom Decoy', color: '#34d399', icon: 'clone',
    desc: 'Spawn a phantom decoy that draws turret fire for one loop.' },
  { id: 'swift', name: 'Swift Boots', tag: '+25% Speed', color: '#fbbf24', icon: 'boot',
    desc: 'You move 25% faster. Outrun the sweepers.' },
  { id: 'plated', name: 'Plated Vest', tag: '+1 Integrity', color: '#f87171', icon: 'vest',
    desc: 'Gain +1 max integrity. Survive one more hit.' },
  { id: 'emp', name: 'EMP Overload', tag: 'EMP Disables', color: '#60a5fa', icon: 'emp',
    desc: 'EMP Pulse also disables turrets for 3 seconds.' },
  { id: 'greedy', name: 'Greedy Hands', tag: '+50% Score', color: '#facc15', icon: 'coin',
    desc: 'All score gains are worth 50% more.' },
];

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
export function angTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
export function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
// Deterministic pseudo-random from a stage seed, for stable staged shots.
export function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
