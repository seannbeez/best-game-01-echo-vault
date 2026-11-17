// ECHO VAULT — the 7 vault stages. One clear job: build a stage's walls,
import { ARENA } from './config.js';

export const STAGE_NAMES = [
  '', 'LASER GRID', 'TURRET ROW', 'JAMMER FIELD', 'SWEEPER ALLEY',
  'MULTI-LOCK VAULT', 'MINEFIELD', 'THE CHRONO-WARDEN',
];

const wall = (x, y, w, h) => ({ x, y, w, h });
const plate = (x, y, link) => ({ x, y, r: 26, link, heldBy: null, charge: 0 });
const door = (x, y, w, h, link, needTwo = false) => ({ x, y, w, h, link, needTwo, open: false });
const laser = (x1, y1, x2, y2, link) => ({ x1, y1, x2, y2, link, on: true });
const turret = (x, y) => ({ x, y, angle: 0, range: 300, state: 'aim', t: 0, hp: 3, disabledT: 0, fireT: 0 });
const mine = (x, y) => ({ x, y, r: 15, armed: false, fuse: 0, gone: false });
const core = (x, y) => ({ x, y, taken: false, chan: 0 });
const terminal = (x, y, link) => ({ x, y, r: 22, link, hack: 0, hackedT: 0 });
const sweeper = (x1, y1, x2, y2, speed) => ({ x1, y1, x2, y2, t: 0, speed, dir: 1 });
const jammer = (x, y, r) => ({ x, y, r });
const mirror = (x, y, angle) => ({ x, y, angle });
const glass = (x, y, w, h) => ({ x, y, w, h });

const A = ARENA;
const MK = {
  w: ['walls', wall], p: ['plates', plate], d: ['doors', door], l: ['lasers', laser],
  t: ['turrets', turret], m: ['mines', mine], c: ['cores', core], T: ['terminals', terminal],
  s: ['sweepers', sweeper], j: ['jammers', jammer], M: ['mirrors', mirror], g: ['glass', glass],
};
// Stage layouts as compact data: each row is the constructor args for one entity.
// A.x=196, A.y=66, A.w=888, A.h=578 (arena bounds); keys: w wall, p plate, d door,
// l laser, t turret, m mine, c core, T terminal, s sweeper, j jammer, M mirror, g glass.
const DATA = {
  1: {
    w: [[552, A.y, 16, 220], [552, 396, 16, A.h - 330]],
    d: [[552, 286, 16, 110, 'A']], p: [[470, 341, 'A']],
    l: [[A.x, 520, 700, 520, 'A']],
    c: [[300, 150], [920, 150], [1000, 560]],
    g: [[700, 200, 90, 10], [900, 420, 90, 10]],
  },
  2: {
    w: [[A.x, 347, 440, 16], [596, 347, 488, 16], [820, A.y, 16, 300], [820, 420, 16, A.h - 354]],
    d: [[500, 347, 96, 16, 'A'], [820, 366, 16, 54, 'B']],
    p: [[420, 290, 'A'], [920, 520, 'B'], [300, 560, 'C']],
    l: [[700, A.y, 700, A.y + A.h, 'C']], t: [[960, 140]], T: [[250, 120, 'T1']],
    c: [[300, 150], [700, 570], [1020, 560]],
    g: [[500, 150, 90, 10], [700, 520, 90, 10]],
  },
  3: {
    w: [[420, A.y, 16, 200], [420, 300, 16, A.h - 234], [860, 200, 16, A.h - 134]],
    d: [[420, 266, 16, 34, 'A'], [860, 120, 16, 80, 'B']],
    p: [[330, 341, 'A'], [950, 300, 'B'], [640, 580, 'C']],
    l: [[A.x, 200, 420, 200, 'C'], [860, 480, A.x + A.w, 480, 'C']],
    t: [[960, 140], [300, 560]], m: [[640, 300], [760, 420]], j: [[640, 355, 95]], M: [[640, 200, 0.6]],
    T: [[250, 120, 'T1']], c: [[280, 140], [1000, 140], [640, 580]],
    g: [[500, 500, 90, 10], [760, 120, 90, 10]],
  },
  4: {
    w: [[500, A.y, 16, 180], [500, 280, 16, A.h - 214], [780, 240, 16, A.h - 174]],
    d: [[500, 246, 16, 34, 'A'], [780, 120, 16, 120, 'B']],
    p: [[420, 341, 'A'], [700, 150, 'B'], [960, 520, 'C'], [300, 560, 'D']],
    l: [[A.x, 150, 500, 150, 'C'], [780, 560, A.x + A.w, 560, 'D']],
    t: [[960, 140], [300, 150], [640, 580]], m: [[620, 300], [720, 430], [900, 300]],
    s: [[400, A.y + 20, 400, A.y + A.h - 20, 0.55], [880, A.y + 20, 880, A.y + A.h - 20, 0.7]],
    j: [[640, 355, 85]], T: [[250, 120, 'T1']], c: [[280, 140], [1000, 140], [640, 580]],
    g: [[600, 420, 90, 10], [300, 300, 90, 10]],
  },
  5: {
    w: [[640, A.y, 16, 240], [640, 380, 16, A.h - 314], [A.x, 480, 380, 16], [620, 480, 464, 16]],
    d: [[640, 306, 16, 74, 'V', true], [524, 480, 96, 16, 'C']],
    p: [[420, 200, 'A'], [880, 200, 'B'], [300, 560, 'C'], [1000, 560, 'D']],
    l: [[A.x, 200, 640, 200, 'D'], [640, 560, A.x + A.w, 560, 'D']],
    t: [[960, 140], [300, 150], [640, 580]], m: [[560, 420], [720, 420], [640, 250], [900, 350]],
    s: [[480, A.y + 20, 480, A.y + A.h - 20, 0.6], [820, A.y + 20, 820, A.y + A.h - 20, 0.8]],
    j: [[640, 355, 80]], T: [[250, 120, 'T1']], c: [[280, 140], [1000, 140], [640, 580]],
    g: [[760, 300, 90, 10], [420, 350, 90, 10]],
  },
  6: {
    w: [[420, A.y, 16, 160], [420, 260, 16, A.h - 194], [860, 220, 16, A.h - 154], [A.x, 480, 300, 16], [560, 480, 524, 16]],
    d: [[420, 226, 16, 34, 'A'], [860, 120, 16, 100, 'B'], [460, 480, 100, 16, 'C']],
    p: [[330, 341, 'A'], [950, 300, 'B'], [300, 560, 'C'], [700, 150, 'D'], [1000, 560, 'E']],
    l: [[A.x, 150, 420, 150, 'D'], [860, 560, A.x + A.w, 560, 'E'], [640, A.y, 640, 300, 'D'], [640, 480, 640, A.y + A.h, 'E']],
    t: [[960, 140], [300, 150], [640, 580]],
    m: [[560, 300], [720, 420], [900, 300], [420, 520], [760, 180]],
    s: [[540, A.y + 20, 540, A.y + A.h - 20, 0.65], [760, A.y + 20, 760, A.y + A.h - 20, 0.85], [A.x + 20, 300, A.x + A.w - 20, 300, 0.5]],
    j: [[500, 300, 75], [800, 420, 75]], M: [[640, 200, -0.5]],
    T: [[250, 120, 'T1']], c: [[280, 140], [1000, 140], [640, 580]],
    g: [[640, 340, 90, 10], [940, 420, 90, 10]],
  },
  7: {
    p: [[400, 180, 'N1'], [880, 180, 'N2'], [640, 570, 'N3']],
    c: [[300, 150], [980, 150], [640, 600]], t: [[640, 120], [1030, 350]],
    m: [[480, 300], [800, 300], [480, 430], [800, 430]], T: [[250, 355, 'T1']],
    g: [[300, 500, 90, 10], [980, 500, 90, 10], [640, 240, 90, 10]],
  },
};

export function buildStage(n, rng) {
  const S = {
    num: n,
    walls: [], plates: [], doors: [], lasers: [], turrets: [], mines: [],
    cores: [], terminals: [], sweepers: [], jammers: [], mirrors: [],
    glass: [],
    exit: { x: 1042, y: 355, r: 30, open: false },
    warden: null,
    spawn: { x: 250, y: 355 },
  };
  S.walls.push(
    wall(A.x - 10, A.y - 10, A.w + 20, 10), wall(A.x - 10, A.y + A.h, A.w + 20, 10),
    wall(A.x - 10, A.y - 10, 10, A.h + 20), wall(A.x + A.w, A.y - 10, 10, A.h + 20),
  );
  const D = DATA[n];
  for (const k in D) for (const row of D[k]) S[MK[k][0]].push(MK[k][1](...row));
  if (n === 7) {
    S.spawn = { x: 250, y: 580 };
    S.exit = null;
    S.warden = {
      x: 640, y: 355, hp: 300, maxHp: 300, shield: true, vulnT: 0,
      armAngle: 0, armSpeed: 0.55, pulseT: 3, state: 'guard', flash: 0,
    };
  }
  S.sparks = [];
  for (let i = 0; i < 26; i++) {
    S.sparks.push({ x: A.x + rng.range(0, A.w), y: A.y + rng.range(0, A.h), p: rng.range(0, 6.28), s: rng.range(0.5, 1.5) });
  }
  return S;
}
