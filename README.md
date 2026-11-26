# Cloud Runner

A small, original flight game for the make.fun bounty "Make the best flight game".
Fly a little red propeller plane over rolling green hills and a winding river, chase golden rings,
and land on the runway (or just enjoy 90 seconds of sky). Plain HTML, CSS and JavaScript:
no build step, no libraries, no network requests. All art is drawn on a Canvas and all sound is synthesized with WebAudio.

## How to open it

Open `game/index.html` in desktop Chrome (double-click works; no server needed). Press **Enter** to take off.

## Controls

| Keys | Action |
| --- | --- |
| Left / Right arrows, A / D | Bank and turn |
| Up / Down arrows | Climb and dive |
| W / S, or Shift / Ctrl | Throttle up / down |
| P | Pause |
| R | Restart a flight at any time |
| M | Mute or unmute sound |

## Rules

- Fly through a **golden ring**: +100 points and a short speed boost.
- Missing a ring is fine, the flight goes on. The nearest ring and the runway are shown by arrows at the top of the screen.
- The flight lasts **90 seconds**. You can end it early with a **soft landing on the runway** (+250): keep the nose close to level, wings level, and ease down gently.
- Touching the ground anywhere else, or landing too hard, ends the run with a gentle "You crashed" screen.
- Your best score is remembered in the browser (localStorage).

## Files

- `game/index.html` the page
- `game/src/config.js` speeds, scores, sizes
- `game/src/input.js` keyboard controls
- `game/src/world.js` terrain, river, runway, rings, clouds
- `game/src/render.js` sky, terrain, plane, HUD and screens
- `game/src/main.js` game loop, flight model, scoring, sound
- `game/src/shots.js` optional screenshot presets (`index.html?shot=fly`, `end`, `crash`)
- `main.ts` hand-in program (copies `game/` and `screenshots/`, writes `dossier.json` using `./vendor/makefun-game.ts`)
- `screenshots/` real renders from headless Chromium: flying (cover), start, end and crash screens

## License

MIT, see `LICENSE`.
