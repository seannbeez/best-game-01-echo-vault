// ECHO VAULT — shared constants, tuning, and small math helpers.
export const W = 1280;
export const H = 720;
// The vault chamber the heist plays in (the floor itself is full-bleed).
export const ARENA = { x: 196, y: 66, w: 888, h: 578 };
export const LOOP_BASE = 8.0; // seconds per time-loop
export const MAX_ECHOES = 4;
export const ECHO_COLORS = ['#22d3ee', '#fbbf24', '#f472b6', '#34d399'];

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
  { id: 'overclock', name: 'Overclocked Loop', tag: '+2.0s Loop', color: '#22d3ee', icon: 'clock', fam: 'TIME', rare: 'R',
    desc: 'Every loop lasts 2.0 seconds longer. More time to steal.', syn: 'overclocks Chrono-Phase & Slow-Mo' },
  { id: 'phase', name: 'Phase Dash', tag: 'Lightning Trails', color: '#a78bfa', icon: 'bolt', fam: 'TIME', rare: 'E',
    desc: 'Echoes leave damaging lightning trails as they replay.', syn: 'phases through Slow-Mo & mirrors' },
  { id: 'mirror', name: 'Mirror Coat', tag: 'Echoes Reflect', color: '#f472b6', icon: 'mirror', fam: 'WARD', rare: 'R',
    desc: 'Echoes reflect turret beams back at the turrets.', syn: 'mirrors Phase Dash & EMP blasts' },
  { id: 'quantum', name: 'Quantum Clone', tag: '+1 Phantom Decoy', color: '#34d399', icon: 'clone', fam: 'FLOW', rare: 'E',
    desc: 'Spawn a phantom decoy that draws turret fire for one loop.', syn: 'clones echo the Mirror Coat' },
  { id: 'swift', name: 'Swift Boots', tag: '+25% Speed', color: '#fbbf24', icon: 'boot', fam: 'FLOW', rare: 'C',
    desc: 'You move 25% faster. Outrun the sweepers.', syn: 'swift feet feed the Greedy loop' },
  { id: 'plated', name: 'Plated Vest', tag: '+1 Integrity', color: '#f87171', icon: 'vest', fam: 'WARD', rare: 'C',
    desc: 'Gain +1 max integrity. Survive one more hit.', syn: 'plating guards the EMP rush' },
  { id: 'emp', name: 'EMP Overload', tag: 'EMP Disables', color: '#60a5fa', icon: 'emp', fam: 'GOLD', rare: 'R',
    desc: 'EMP Pulse also disables turrets for 3 seconds.', syn: 'EMP clears the way for mirrors' },
  { id: 'greedy', name: 'Greedy Hands', tag: '+50% Score', color: '#facc15', icon: 'coin', fam: 'GOLD', rare: 'E',
    desc: 'All score gains are worth 50% more.', syn: 'greed funds every reroll' },
];

// Title-screen bestiary: [name, one-line behaviour].
export const THREATS = [
  ['Sentry Turret', 'rotating beam'], ['Laser Grid', 'razor beams'],
  ['Chrono-Mine', 'proximity blast'], ['Sweeper', 'patrolling bar'],
  ['Jammer', 'slows you'], ['Chrono-Warden', 'shield + sweep arms'],
];

// Victory feats: [name, how to earn it].
export const FEATS = [
  ['First Heist', 'clear Vault 1'], ['No Damage', 'finish at full integrity'],
  ['All Cores', 'steal 21/21 cores'], ['4-Echo Sync', 'reach x4 combo'],
  ['Warden Down', 'shatter the Warden'], ['Seven Vaults', 'clear all 7 vaults'],
  ['S Rank', 'finish with Rank S'], ['Nightmare', 'win on NIGHTMARE'],
];

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
// Deterministic pseudo-random from a stage seed, for stable staged shots.
export function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
