# ECHO VAULT — Break Time. Steal Everything.

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/seannbeez/best-game-01-echo-vault/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/seannbeez/best-game-01-echo-vault/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**ECHO VAULT** is a time-loop tactical heist roguelite. Every loop gives you
exactly **8.0 seconds** to move, dash, hack terminals, hold pressure plates,
deflect security lasers, and extract the Vault Cores — then time rewinds and
your past self replays beside you as a luminous **Time Echo**. Cooperate with
up to four versions of yourself: one Echo holds a plate, another deflects a
sentry beam, a third opens the blast gate, while you dash in for the final
Core and trigger a synchronized `CHRONO-SYNC! x4 COMBO`. Seven vault stages,
a Chrono-Mod draft between stages, and a final showdown with
**THE CHRONO-WARDEN** — a massive articulated vault sentinel whose shield
only breaks when three pressure nodes are held at once.

Built for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).
Play it free: [make.fun/?ref=ebv85brk](https://make.fun/?ref=ebv85brk&utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

## How to play

| Control | Action |
|---|---|
| WASD / Arrows | Move the thief |
| Mouse / Touch drag | Steer (touch: virtual joystick) |
| Space / Click | Phase Dash (short burst, brief cooldown) |
| E (hold) | Hack terminal / channel a Core |
| 1 | Phase Dash |
| 2 | Reflect Shield (deflects turret beams) |
| 3 | EMP Pulse (stuns turrets, damages the Warden) |
| 4 | Anchor Drop (pin an Echo in place) |
| R | Rewind Loop early (records your Echo now) |
| P | Pause |
| M | Mute |

## The loop

- **8.00s loop** — when the Chrono-Clock hits zero, time rewinds. Your exact
  path, velocity, and actions are recorded as a new Time Echo (Cyan, Amber,
  Magenta, Emerald) that replays alongside you next loop.
- **Plates & doors** — standing on a pressure plate (you or an Echo) holds it.
  Doors and laser grids open only while their plates are held.
- **Cores** — channel each glass pod to extract its Core. All 3 Cores open
  the exit gate. Stage 7 hides the Omega Core behind the Warden's shield.
- **Chrono-Mods** — after every cleared stage, pick 1 of 3 upgrade cards
  (up to 5 held): longer loops, lightning Echo trails, laser-reflecting
  Echoes, phantom decoys, and more.
- **Win / lose** — shatter the Chrono-Warden on Vault 7 and extract the
  Omega Core for a Rank S heist. If your integrity hits zero, you're caught.

## HUD

Top center: the razor-sharp 8.00s Chrono-Clock ring, `VAULT 7 / 7` stage,
`CORES: 3/3`. Left: ACTIVE ECHO TIMELINE (colored waveform bars with action
icons) and CHRONO-MODS HELD. Right: VAULT SECURITY / THREAT QUEUE plus a
circular VAULT RADAR. Bottom: 5 tactical ability cards with cooldown sweeps,
live `SYNC COMBO` multiplier, and a live Grade medal (S / A / B / C).

## Tech

- Pure static files under `game/` — Canvas 2D, procedural neon-noir art,
  synthesized Web Audio heist music and SFX (no audio files), no network,
  no external assets, no build step. Open `game/index.html` and play.
- Serve locally: `node serve.ts` → http://localhost:8080
- Screenshots in `screenshots/` (live title with How-To-Play diagram,
  Stage 7 multi-Echo boss heist, Chrono-Mod draft, Rank S heist summary).
