// ECHO VAULT — the 7 vault stages. One clear job: build a stage's walls,
import { ARENA } from './config.js';

export const STAGE_NAMES = [
  '', 'LASER GRID', 'TURRET ROW', 'JAMMER FIELD', 'SWEEPER ALLEY',
  'MULTI-LOCK VAULT', 'MINEFIELD', 'THE CHRONO-WARDEN',
];

function base(n) {
  return {
    num: n,
    walls: [], plates: [], doors: [], lasers: [], turrets: [], mines: [],
    cores: [], terminals: [], sweepers: [], jammers: [], mirrors: [],
    glass: [],
    exit: { x: 1042, y: 355, r: 30, open: false },
    warden: null,
    spawn: { x: 250, y: 355 },
  };
}
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

export function buildStage(n, rng) {
  const S = base(n);
  const A = ARENA;
  // Arena border walls (thin, drawn as the chamber edge).
  S.walls.push(
    wall(A.x - 10, A.y - 10, A.w + 20, 10), wall(A.x - 10, A.y + A.h, A.w + 20, 10),
    wall(A.x - 10, A.y - 10, 10, A.h + 20), wall(A.x + A.w, A.y - 10, 10, A.h + 20),
  );

  if (n === 1) {
    // One wall, one door, one grid: the tutorial.
    S.walls.push(wall(552, A.y, 16, 220), wall(552, 396, 16, A.h - 330));
    S.doors.push(door(552, 286, 16, 110, 'A'));
    S.plates.push(plate(470, 341, 'A'));
    S.lasers.push(laser(A.x, 520, 700, 520, 'A'));
    S.cores.push(core(300, 150), core(920, 150), core(1000, 560));
    S.glass.push(glass(700, 200, 90, 10), glass(900, 420, 90, 10));
  } else if (n === 2) {
    S.walls.push(wall(A.x, 347, 440, 16), wall(596, 347, 488, 16));
    S.doors.push(door(500, 347, 96, 16, 'A'));
    S.walls.push(wall(820, A.y, 16, 300), wall(820, 420, 16, A.h - 354));
    S.doors.push(door(820, 366, 16, 54, 'B'));
    S.plates.push(plate(420, 290, 'A'), plate(920, 520, 'B'), plate(300, 560, 'C'));
    S.lasers.push(laser(700, A.y, 700, A.y + A.h, 'C'));
    S.turrets.push(turret(960, 140));
    S.terminals.push(terminal(250, 120, 'T1'));
    S.cores.push(core(300, 150), core(700, 570), core(1020, 560));
    S.glass.push(glass(500, 150, 90, 10), glass(700, 520, 90, 10));
  } else if (n === 3) {
    S.walls.push(wall(420, A.y, 16, 200), wall(420, 300, 16, A.h - 234));
    S.doors.push(door(420, 266, 16, 34, 'A'));
    S.walls.push(wall(860, 200, 16, A.h - 134));
    S.doors.push(door(860, 120, 16, 80, 'B'));
    S.plates.push(plate(330, 341, 'A'), plate(950, 300, 'B'), plate(640, 580, 'C'));
    S.lasers.push(laser(A.x, 200, 420, 200, 'C'), laser(860, 480, A.x + A.w, 480, 'C'));
    S.turrets.push(turret(960, 140), turret(300, 560));
    S.mines.push(mine(640, 300), mine(760, 420));
    S.jammers.push(jammer(640, 355, 95));
    S.mirrors.push(mirror(640, 200, 0.6));
    S.terminals.push(terminal(250, 120, 'T1'));
    S.cores.push(core(280, 140), core(1000, 140), core(640, 580));
    S.glass.push(glass(500, 500, 90, 10), glass(760, 120, 90, 10));
  } else if (n === 4) {
    S.walls.push(wall(500, A.y, 16, 180), wall(500, 280, 16, A.h - 214));
    S.doors.push(door(500, 246, 16, 34, 'A'));
    S.walls.push(wall(780, 240, 16, A.h - 174));
    S.doors.push(door(780, 120, 16, 120, 'B'));
    S.plates.push(plate(420, 341, 'A'), plate(700, 150, 'B'), plate(960, 520, 'C'), plate(300, 560, 'D'));
    S.lasers.push(laser(A.x, 150, 500, 150, 'C'), laser(780, 560, A.x + A.w, 560, 'D'));
    S.turrets.push(turret(960, 140), turret(300, 150), turret(640, 580));
    S.mines.push(mine(620, 300), mine(720, 430), mine(900, 300));
    S.sweepers.push(sweeper(400, A.y + 20, 400, A.y + A.h - 20, 0.55));
    S.sweepers.push(sweeper(880, A.y + 20, 880, A.y + A.h - 20, 0.7));
    S.jammers.push(jammer(640, 355, 85));
    S.terminals.push(terminal(250, 120, 'T1'));
    S.cores.push(core(280, 140), core(1000, 140), core(640, 580));
    S.glass.push(glass(600, 420, 90, 10), glass(300, 300, 90, 10));
  } else if (n === 5) {
    // Multi-lock: the vault door needs plates A AND B at the same time.
    S.walls.push(wall(640, A.y, 16, 240), wall(640, 380, 16, A.h - 314));
    S.doors.push(door(640, 306, 16, 74, 'V', true));
    S.walls.push(wall(A.x, 480, 380, 16), wall(620, 480, 464, 16));
    S.doors.push(door(524, 480, 96, 16, 'C'));
    S.plates.push(plate(420, 200, 'A'), plate(880, 200, 'B'), plate(300, 560, 'C'), plate(1000, 560, 'D'));
    S.lasers.push(laser(A.x, 200, 640, 200, 'D'), laser(640, 560, A.x + A.w, 560, 'D'));
    S.turrets.push(turret(960, 140), turret(300, 150), turret(640, 580));
    S.mines.push(mine(560, 420), mine(720, 420), mine(640, 250), mine(900, 350));
    S.sweepers.push(sweeper(480, A.y + 20, 480, A.y + A.h - 20, 0.6));
    S.sweepers.push(sweeper(820, A.y + 20, 820, A.y + A.h - 20, 0.8));
    S.jammers.push(jammer(640, 355, 80));
    S.terminals.push(terminal(250, 120, 'T1'));
    S.cores.push(core(280, 140), core(1000, 140), core(640, 580));
    S.glass.push(glass(760, 300, 90, 10), glass(420, 350, 90, 10));
  } else if (n === 6) {
    S.walls.push(wall(420, A.y, 16, 160), wall(420, 260, 16, A.h - 194));
    S.doors.push(door(420, 226, 16, 34, 'A'));
    S.walls.push(wall(860, 220, 16, A.h - 154));
    S.doors.push(door(860, 120, 16, 100, 'B'));
    S.walls.push(wall(A.x, 480, 300, 16), wall(560, 480, 524, 16));
    S.doors.push(door(460, 480, 100, 16, 'C'));
    S.plates.push(plate(330, 341, 'A'), plate(950, 300, 'B'), plate(300, 560, 'C'), plate(700, 150, 'D'), plate(1000, 560, 'E'));
    S.lasers.push(
      laser(A.x, 150, 420, 150, 'D'), laser(860, 560, A.x + A.w, 560, 'E'),
      laser(640, A.y, 640, 300, 'D'), laser(640, 480, 640, A.y + A.h, 'E'),
    );
    S.turrets.push(turret(960, 140), turret(300, 150), turret(640, 580));
    S.mines.push(mine(560, 300), mine(720, 420), mine(900, 300), mine(420, 520), mine(760, 180));
    S.sweepers.push(sweeper(540, A.y + 20, 540, A.y + A.h - 20, 0.65));
    S.sweepers.push(sweeper(760, A.y + 20, 760, A.y + A.h - 20, 0.85));
    S.sweepers.push(sweeper(A.x + 20, 300, A.x + A.w - 20, 300, 0.5));
    S.jammers.push(jammer(500, 300, 75), jammer(800, 420, 75));
    S.mirrors.push(mirror(640, 200, -0.5));
    S.terminals.push(terminal(250, 120, 'T1'));
    S.cores.push(core(280, 140), core(1000, 140), core(640, 580));
    S.glass.push(glass(640, 340, 90, 10), glass(940, 420, 90, 10));
  } else {
    // Stage 7 — THE CHRONO-WARDEN. Open chamber, the sentinel at the center,
    S.spawn = { x: 250, y: 580 };
    S.exit = null;
    S.warden = {
      x: 640, y: 355, hp: 300, maxHp: 300, shield: true, vulnT: 0,
      armAngle: 0, armSpeed: 0.55, pulseT: 3, state: 'guard', flash: 0,
    };
    S.plates.push(plate(400, 180, 'N1'), plate(880, 180, 'N2'), plate(640, 570, 'N3'));
    S.cores.push(core(300, 150), core(980, 150), core(640, 600));
    // Turrets guard the middle of the chamber, clear of the power cells, so
    S.turrets.push(turret(640, 120), turret(1030, 350));
    S.mines.push(mine(480, 300), mine(800, 300), mine(480, 430), mine(800, 430));
    S.terminals.push(terminal(250, 355, 'T1'));
    S.glass.push(glass(300, 500, 90, 10), glass(980, 500, 90, 10), glass(640, 240, 90, 10));
  }
  // Deterministic scatter: a few gold conduit sparks are seeded per stage.
  S.sparks = [];
  for (let i = 0; i < 26; i++) {
    S.sparks.push({ x: A.x + rng.range(0, A.w), y: A.y + rng.range(0, A.h), p: rng.range(0, 6.28), s: rng.range(0.5, 1.5) });
  }
  return S;
}
