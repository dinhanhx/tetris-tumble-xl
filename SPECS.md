# Tumble: Web Clone of Tetris Tumble XL — Software Specification Plan

v2 (implemented). Vanilla HTML/CSS/JS (ES modules), Canvas 2D, no dependencies, no build step.
Targets: desktop and phone, 1 player and 2 players (hot-seat). Pieces are placed like Lego, not dropped.

## Status (v2)

Everything in section 5 is implemented, including `ui.js`, plus the changes below.

- [Verified by test run] 38 tests pass under Node 20.20.2 (`npm test`).
- [Checked in headless Chromium] The browser code was driven by scripted runs (Playwright, desktop 1000x700 and phone 390x780, synthetic pointer events plus real button clicks): 1P and 2P turns, handoff, topple and winner screen, relocation, cancel, zoom, top bar.
- Not checked: Firefox, Safari, Android, a real touchscreen, other `devicePixelRatio` values, frame rate. Constants are tuned only by headless bots (section 8), not by human play.

Changes from the v1 draft. All are Decisions unless labeled.

| Change | Where |
|---|---|
| `endTurn(false)` refreshes `game.snap`. In v1, a topple in the `pick` or `relocate` phase restored a stale snapshot and removed the last placed piece | 6.4 |
| Cancel: a pool piece picked in easy mode can be put back (`canCancel`). A rolled piece in hard mode cannot, because that would be a free re-roll. The sources say nothing about taking a pick back [Unverified] | 3.1, 3.4, 6.4 |
| Gravity strength `G` (default 2) multiplies the load torque only, so sway speed is unchanged | 6.3, 8 |
| Zoom 50% to 200% (buttons, `+` `-` `0`), tower anchored to the bottom and centred | 4, 6.5, 7.3 |
| Status moved from the tray to a top bar (player, height, moves, pool), zoom controls at its right | 7.3 |
| Ghost stays hidden until aimed, and a new pick resets it. Click commits on the left button only. Touch `pointerdown` aims the ghost. With hints off the ghost never turns red | 6.7 |
| Rocker polygon fix (a stray sliver on the left edge, caused by the arc loop stopping short of `-phi`). Base drawn darker with an outline | 6.5 |

## 0. Evidence labels

Every statement about the physical product carries a label. Statements without a label are **Decisions**: design choices for this clone, not claims about the product.

| Label | Meaning |
|---|---|
| [Sourced] | Paraphrased from a page fetched for this spec (product page, rules page, wiki) |
| [Inference] | Deduced from sources or from the two photos you supplied; not stated by them |
| [Speculation] | A guess that needs playtesting |
| [Unverified] | Cannot be confirmed from the material I have |
| [Verified by test run] | Checked by running the code or tests in this repo under Node, headless, no browser. The suite was re-run under Node 20.20.2. Figures marked "v1 draft" were not re-run |
| [Checked in headless Chromium] | Checked by a scripted browser run (Playwright), not on real devices |

## 1. Scope

**Goals**

- A browser game that mimics the Tumble XL idea: a rocking base with a zigzag top edge ("ziggles"), square cells that fit the gaps, tetromino pieces made of 4 cells, and a tower that tilts and sways as pieces are added.
- Pieces are placed at a chosen spot, like Lego. No falling or drop mechanic.
- The 7 basic tetrominoes. Because it is software, players can rotate and flip (horizontal and vertical).
- 1 player and 2 players, on desktop (mouse and keyboard) and phone (touch).

**Non-goals**

- Online multiplayer, accounts, 3D rendering, a rigid-body physics engine.
- Fidelity to the physical product beyond what the sources show.

## 2. Evidence

### 2.1 Product page (tetris.com, Tumble XL) [Sourced]

- The game uses a dynamic, tilting tower. Players stack oversized Tetris blocks while the tower shifts and sways, and each move changes the balance.
- 2 players compete to topple the tower first. 1 player stacks to see how high it goes.
- Released Mar 1, 2025. Manufacturer: Eastpoint Sports.
- The page footer reserves the Tetris name, the Tetriminos and the trade dress for Tetris Holding.

### 2.2 Rules page (1-Up Game Truck) [Sourced]

- Objective: balance Tetriminos on the rocking base without making the tower fall. The last player to place a piece without toppling the tower wins.
- Setup: put the rocking platform on the flat base, spread the pieces out, and decide the play order (usually the youngest first).
- Turn: roll the six-sided die to get the shape to place. If an I comes up on the first roll, roll again. Easy mode: pick any piece instead.
- Placement: anywhere on the existing structure, as long as it stays balanced. Hard mode: one hand only.
- A player who topples the tower is out. The remaining players continue with the same tower configuration until one is left.
- When the pieces run out: easy mode moves any piece on the tower to a different position. Hard mode removes a piece and places it back on top.

### 2.3 Photos (two images supplied) [Inference]

- The stack's grid is rotated about 45° to the base. Each cell looks like a diamond, and the base's top edge has V-notches. A diamond's bottom corner fits a notch and its two lower edges rest on the notch slopes. This matches "ziggles with gaps that fit a square".
- The platform has a shallow curved bottom (a rocker) on a dark flat plate.
- Pieces overhang the platform edges.
- Each cell has a raised, bevelled top.
- Colors match the guideline scheme: cyan I, blue J, orange L, yellow O, green S, purple T, red Z.
- A die with piece icons and loose pieces appear in photo 2.
- Tilt differs between photos: visible in photo 1, close to level in photo 2. Tilt is continuous, not a fixed lean.
- [Speculation] By-eye numbers from photo 2: about 5 valleys, platform width about 10 half-diagonals, rocker radius about 0.85 of the platform width.

### 2.4 Tetromino wiki [Sourced]

- 7 one-sided tetrominoes: I, O, T, S, Z, J, L, each of 4 squares.
- Guideline colors: I cyan, O yellow, T purple/magenta, S green, Z red, J blue, L orange.
- The wiki states that The Tetris Company owns the copyright and trademark on all seven tetrominoes. [Unverified] I cannot confirm this legal claim.

### 2.5 Cannot verify

- Which of the 7 shapes is missing from the 6-face die.
- Whether the "roll again on I" rule applies to the first roll of the game or of every turn.
- How many of each piece the physical set contains.
- The real topple threshold, the rocker geometry, and the real stiffness of the base.
- Whether the physical pieces can be flipped. The rules page does not mention flipping.

## 3. Game design

### 3.1 Physical to digital mapping

| Physical (per sources) | Digital |
|---|---|
| Rocking platform on a flat base | Zigzag base drawn on a rocker; the rocker is simulated (section 6.3) |
| Physical pool of pieces | Pool of N pieces per shape, default N = 4 [Speculation: real counts unknown] |
| Six-sided die | `rollPiece()`, uniform over the shapes left in the pool |
| Easy mode: pick any piece | `cfg.pick = 'free'` |
| Change your mind after picking | `cancelPickUp()`: allowed for a free pick and for a piece lifted off the tower, not for a rolled piece [Unverified: not in the sources] |
| Hard mode: one hand | `cfg.flip = false`, `cfg.hints = false` [Speculation: stand-in for one-handed] |
| Topple: player is out, the rest continue with the same tower | `endTurn(true)` restores the pre-move snapshot [Inference: reading of "same configuration"] |
| Pool empty: move a piece (easy) or take it off and put it back on top (hard) | `relocate` phase, `cfg.relocate = 'any' \| 'top'` |
| Solo: how high | 1P result = tower height at the last stable state, plus piece count |

### 3.2 Presets

| Setting | Easy | Hard |
|---|---|---|
| `pick` | `free` (choose any piece with pieces left) | `die` (roll) |
| `relocate` | `any` | `top` |
| `flip` | on | off |
| `hints` (valid/invalid ghost color) | on | off |

### 3.3 Pieces and orientations

The 7 pieces, with colors from the wiki's color names (hex values are mine):

| Shape | Color | Hex |
|---|---|---|
| I | cyan | `#00BCD4` |
| O | yellow | `#FDD835` |
| T | purple | `#8E24AA` |
| S | green | `#43A047` |
| Z | red | `#E53935` |
| J | blue | `#1E5BD8` |
| L | orange | `#FB8C00` |

[Verified by test run] Distinct orientations per shape:

| Shape | Rotate only | Rotate + flip |
|---|---|---|
| I | 2 | 2 |
| O | 1 | 1 |
| T | 4 | 4 |
| S | 2 | 4 (same set as Z) |
| Z | 2 | 4 (same set as S) |
| J | 4 | 8 (same set as L) |
| L | 4 | 8 (same set as J) |

With flip on, S and Z are equivalent in what they can do, and so are J and L. Only color and pool counts tell them apart, so there are effectively 5 free shapes. The `flip` flag exists so a mode can keep them distinct.

A vertical flip is a horizontal flip plus a 180° rotation, so the full state is a rotation and a mirror bit. Two flip buttons are UI convenience only.

### 3.4 Turn flow

```
menu -> pick -> place -> settle -> handoff (2+ players alive) -> pick | relocate
                            \-> over (topple in 1P, or one player left)
relocate -> place (pickUp) -> settle
place -> pick        (cancel, easy mode, piece taken from the pool)
place -> relocate    (cancel, piece lifted off the tower; the tower is restored)
```

| Phase | Meaning |
|---|---|
| `menu` | Mode and preset selection |
| `pick` | Roll the die, or choose a piece (easy). `beginPlace(shape)` takes a snapshot |
| `place` | The hand piece follows the pointer; commit when the ghost is valid. Cancel returns to `pick` or `relocate` (`canCancel`) |
| `settle` | Physics runs until calm (0.3 s below thresholds) or 3 s; a topple ends the turn at once |
| `handoff` | Pass-the-device screen between players; a tap calls `startTurn()` |
| `relocate` | Pool empty: pick a piece up off the tower (`pickUp`), then place it |
| `over` | Result shown |

### 3.5 Modes

- **1P:** no opponent. A topple ends the game. Result: height (in lattice rows) and moves.
- **2P:** hot-seat on one device, one shared tower. The player whose move topples the tower is out and the other player wins.
- **N players (2 to 4):** the code in section 6.4 already supports it, matching the rules page's "last player standing". Ship 1P and 2P first.

## 4. Geometry and coordinates

**Lattice.** Cell `(i, j)` is a diamond, 45° to the base. Valid cells have `(i + j)` odd.

**Base.** Teeth are filled virtual cells at `j = 0`, odd `i`, for `i` in `[-W, W]`, with `W = 5` (6 teeth, 5 valleys). A cell at `j = 1`, even `i` sits corner-down in a valley.

**Support.** Cell `(i, j)` rests on `(i-1, j-1)` and `(i+1, j-1)`. A piece is supported when at least one of its cells has an occupied lower neighbour that is not part of the piece. Overhangs past the platform edge are allowed when one lower neighbour exists. This is a Decision; the physical pieces may need more.

**Piece transform.** Piece-local square `(x, y)` maps to lattice offset `(x - y, x + y)`. All offsets then have even `i + j`. Rotation is `(i, j) -> (-j, i)`, horizontal flip `(i, j) -> (-i, j)`, vertical flip `(i, j) -> (i, -j)`. Doing the transforms in lattice space makes flips match the screen axes.

**Tower space** (origin at the rocker's arc center, y up, px, `h = cell / sqrt(2)`):

| Quantity | Formula |
|---|---|
| Cell size | `cell = fit * zoom`, `fit = min(width / 15, height / 16)` of the stage in CSS px, `zoom` from 0.5 to 2 (step 1.25x) |
| Cell center | `x = i * h`, `y = (j - ARC_CY) * h` |
| Valley floor | `y = -ARC_CY * h` |
| Tooth peak | floor + `h` |
| Rocker radius | `R = (ARC_CY + PLATFORM_H) * h` |
| Screen transform | translate(`pivot.x + R * theta`, `pivot.y`), rotate(`theta`), scale(1, -1) |

`theta` is clockwise positive and matches `ctx.rotate`. The arc center shifts by `R * theta` as the rocker rolls without slipping.

The pivot is the arc center in CSS px: `x = width / 2`, `y = height - 9.2 * h`. Zoom changes `cell`, so the tower stays centred and the gap under the rocker scales with it. Zooming out shows a tall tower; zooming in cuts off the top of one, because there is no pan.

## 5. Architecture

| Module | Responsibility | DOM | Tests |
|---|---|---|---|
| `shapes.js` | 7 shapes, colors, lattice transforms | no | yes |
| `board.js` | lattice, placement and removal rules, snapshots | no | yes |
| `physics.js` | rocker model, topple, settle detection | no | yes |
| `rules.js` | players, pool, die, phases, elimination, relocation | no | yes |
| `render.js` | canvas layout, zoom, drawing | yes | layout and zoom math (Node, `window` stubbed); drawing is [Checked in headless Chromium] |
| `input.js` | pointer to tower space to lattice anchor | no | yes |
| `main.js` | event wiring, fixed-timestep loop | yes | [Checked in headless Chromium] |
| `ui.js` | menu, top bar (HUD, zoom), tray, die, handoff, result | yes | [Checked in headless Chromium] |

Per frame: the fixed-timestep loop runs `step(board)` at 120 Hz, then `draw()`. The tower keeps swaying in every phase except `menu` and `over`. A topple in any phase counts against the current player.

## 6. Module code

The listings below are the files in `src/`, copied verbatim. [Verified by test run] applies to what the tests in section 9 cover. The drawing code in `render.js`, `main.js` and `ui.js` has no unit tests; see Status for what was checked in a browser.

### 6.1 `src/shapes.js`

```js
// shapes.js: the 7 tetrominoes and their transforms
export const SHAPES = {                                // piece-local squares [x, y], y up
  I: { color: '#00BCD4', cells: [[0,0],[1,0],[2,0],[3,0]] },
  O: { color: '#FDD835', cells: [[0,0],[1,0],[0,1],[1,1]] },
  T: { color: '#8E24AA', cells: [[0,0],[1,0],[2,0],[1,1]] },
  S: { color: '#43A047', cells: [[0,0],[1,0],[1,1],[2,1]] },
  Z: { color: '#E53935', cells: [[1,0],[2,0],[0,1],[1,1]] },
  J: { color: '#1E5BD8', cells: [[0,0],[1,0],[2,0],[0,1]] },
  L: { color: '#FB8C00', cells: [[0,0],[1,0],[2,0],[2,1]] },
};

// piece-local -> lattice offsets (i, j); every offset has even i + j
export const toLattice = cells => cells.map(([x, y]) => [x - y, x + y]);
export const spawn = k => toLattice(SHAPES[k].cells);

// Transforms act on lattice offsets, so they match the screen axes. No re-normalising: parity is kept.
export const rotate = p => p.map(([i, j]) => [-j, i]);   // 90 degrees
export const flipH  = p => p.map(([i, j]) => [-i, j]);   // mirror left <-> right on screen
export const flipV  = p => p.map(([i, j]) => [i, -j]);   // mirror top <-> bottom on screen
```

### 6.2 `src/board.js`

```js
// board.js: 45-degree lattice. Cell (i, j) is a diamond; valid when (i + j) is odd.
// Base teeth are filled virtual cells at j = 0 (odd i). Valleys are the gaps between them.
export const W = 5;                                    // teeth at odd i in [-W, W]
const key = (i, j) => i + ',' + j;
export const board = new Map();                        // key -> { i, j, pid, owner, shape, base? }
let nextPid = 1;

export function resetBoard() {
  board.clear(); nextPid = 1;
  for (let i = -W; i <= W; i += 2) board.set(key(i, 0), { i, j: 0, base: true });
}
resetBoard();

const rests = (i, j) => board.has(key(i - 1, j - 1)) || board.has(key(i + 1, j - 1));

export function canPlace(piece, ci, cj) {              // piece = lattice offsets
  if (((ci + cj) & 1) === 0) return false;             // off the lattice
  let supported = false;
  for (const [di, dj] of piece) {
    const i = ci + di, j = cj + dj;
    if (j < 1 || board.has(key(i, j))) return false;   // inside the base, or overlapping
    if (rests(i, j)) supported = true;                 // lower-left or lower-right neighbour exists
  }
  return supported;
}

export function place(piece, ci, cj, owner, shape) {
  const pid = nextPid++;
  for (const [di, dj] of piece)
    board.set(key(ci + di, cj + dj), { i: ci + di, j: cj + dj, pid, owner, shape });
  return pid;
}

export function remove(pid) {                          // returns the removed cell records
  const out = [];
  for (const [k, c] of board) if (c.pid === pid) { out.push(c); board.delete(k); }
  return out;
}

export const height = () =>
  Math.max(0, ...[...board.values()].filter(c => !c.base).map(c => c.j));

// Removable only if every other piece keeps a support chain to the base (my rule, not in the rules page).
export function canRemove(pid) {
  const pieces = new Map();
  for (const c of board.values())
    if (!c.base && c.pid !== pid) (pieces.get(c.pid) ?? pieces.set(c.pid, []).get(c.pid)).push(c);
  const held = new Set();
  const isHeld = (i, j) => {
    const c = board.get(key(i, j));
    return !!c && c.pid !== pid && (c.base || held.has(c.pid));
  };
  for (let grew = true; grew; ) {
    grew = false;
    for (const [p, cs] of pieces)
      if (!held.has(p) && cs.some(c => isHeld(c.i - 1, c.j - 1) || isHeld(c.i + 1, c.j - 1)))
        { held.add(p); grew = true; }
  }
  return held.size === pieces.size;
}

export const snapshot = () => [...board].map(([k, v]) => [k, { ...v }]);
export function restore(snap) {
  board.clear();
  for (const [k, v] of snap) board.set(k, { ...v });
}
```

### 6.3 `src/physics.js`

The rocker is modeled as rolling about its arc center. Gravity torque about the contact point equals `sum(x cos(theta) + y sin(theta))` for cells measured from the arc center. Cells below the arc center (`j < ARC_CY`) are stabilizing, cells above it are destabilizing. The base's own restoring torque is folded into `K`. `G` multiplies the load torque (gravity strength); `K`, `C` and `I` are unchanged, so the swing frequency does not depend on `G`.

```js
// physics.js: the rocker is modelled as rolling about its arc centre.
// x, y in lattice half-diagonals (h). Origin = arc centre. theta: clockwise positive.
export const ARC_CY = 4;                               // arc centre above valley floor, in h  [Speculation]
export const PLATFORM_H = 4;                           // valley floor to rocker bottom, in h  [Speculation]
export const DT = 1 / 120;
export const THETA_MAX = 0.5;                          // rad, topple threshold
export const P = { K: 300, C: 30, I: 9, LEAN: 1, G: 2 };  // tunable; K = base restoring torque, C = damping, I = inertia, G = gravity strength
export const s = { theta: 0, omega: 0 };
let calm = 0, total = 0;

export function resetPhysics() { s.theta = s.omega = 0; calm = total = 0; }
export function resetSettle() { calm = total = 0; }

export function step(board) {
  const c = Math.cos(s.theta), n = Math.sin(s.theta);
  let tau = 0;
  for (const { i, j, base } of board.values())
    if (!base) tau += i * c + P.LEAN * (j - ARC_CY) * n;   // cells below the arc centre stabilise
  const acc = (P.G * tau - P.K * s.theta - P.C * s.omega) / P.I;   // G scales the load only, so sway speed is unchanged
  s.omega += acc * DT;                                     // semi-implicit Euler
  s.theta += s.omega * DT;
  return { toppled: Math.abs(s.theta) > THETA_MAX, acc };
}

export function isSettled(acc) {                       // call once per step while phase === 'settle'
  total += DT;
  calm = Math.abs(s.omega) < 0.05 && Math.abs(acc) < 0.5 ? calm + DT : 0;
  return calm > 0.3 || total > 3;
}
```

### 6.4 `src/rules.js`

```js
// rules.js: pure game state, no DOM.
import { SHAPES } from './shapes.js';
import { resetBoard, snapshot, restore, canPlace, canRemove, remove, height } from './board.js';
import { resetPhysics, resetSettle } from './physics.js';

export const PRESETS = {
  easy: { pick: 'free', relocate: 'any', flip: true,  hints: true  },
  hard: { pick: 'die',  relocate: 'top', flip: false, hints: false },   // flip: false = stand-in for one-handed [Speculation]
};
export const game = { cfg: PRESETS.easy, players: [], turn: 0, phase: 'menu', moves: 0, pool: {}, hand: null, snap: null, result: null };

export function newGame(nPlayers, cfg = PRESETS.easy, perShape = 4) {
  resetBoard(); resetPhysics();
  Object.assign(game, {
    cfg, turn: 0, moves: 0, phase: 'pick', hand: null, snap: null, result: null,
    players: Array.from({ length: nPlayers }, (_, id) => ({ id, alive: true })),
    pool: Object.fromEntries(Object.keys(SHAPES).map(k => [k, perShape])),
  });
}
export const poolEmpty = () => Object.values(game.pool).every(n => n === 0);

// The real die has 6 faces and the missing shape is unknown [Unverified], so this picks uniformly from the pool.
export function rollPiece() {
  const keys = Object.keys(game.pool).filter(k => game.pool[k] > 0);
  let k;
  do k = keys[(Math.random() * keys.length) | 0];
  while (k === 'I' && game.moves === 0 && keys.length > 1);      // re-roll I on the first roll [Unverified reading]
  return k;
}

export function beginPlace(shape) {                    // from the pool: die result or free pick
  if (game.phase !== 'pick' || game.pool[shape] < 1) return false;
  game.snap = snapshot();
  game.hand = { shape, fromPool: true };
  game.phase = 'place';
  return true;
}

export function pickUp(pid) {                          // relocate phase: lift a piece off the tower
  if (game.phase !== 'relocate' || !canRemove(pid)) return null;
  game.snap = snapshot();
  const cells = remove(pid);
  game.hand = { shape: cells[0].shape, fromPool: false };
  game.phase = 'place';
  return cells.map(c => [c.i - cells[0].i, c.j - cells[0].j]);   // lattice offsets for the hand
}

// A lifted tower piece can always go back. A pool piece can only go back when the player chose it (free pick);
// a rolled piece must be placed, or cancelling would be a free re-roll.
export const canCancel = () => game.phase === 'place' && (!game.hand.fromPool || game.cfg.pick === 'free');

export function cancelPickUp() {
  if (!canCancel()) return;
  if (game.hand.fromPool) { game.hand = null; game.phase = 'pick'; return; }
  restore(game.snap);
  game.phase = 'relocate';
}

export function placementAllowed(piece, ci, cj) {
  if (!canPlace(piece, ci, cj)) return false;
  if (!game.hand.fromPool && game.cfg.relocate === 'top')        // my reading of "place it back on top" [Speculation]
    return Math.min(...piece.map(([, dj]) => cj + dj)) >= height();
  return true;
}

export function onPlaced() {                           // call right after board.place()
  if (game.hand.fromPool) game.pool[game.hand.shape]--;
  game.moves++;
  resetSettle();
  game.phase = 'settle';
}

export function endTurn(toppled) {
  if (toppled) {
    game.players[game.turn].alive = false;             // the player who toppled is out
    restore(game.snap);                                // same configuration as before the move [Inference]
    resetPhysics();
  } else game.snap = snapshot();                       // a later topple (pick or relocate phase) restores to here
  const solo = game.players.length === 1;
  const alive = game.players.filter(q => q.alive);
  if (solo ? toppled : alive.length === 1) {
    game.result = solo ? { height: height(), moves: game.moves } : { winner: alive[0].id };
    game.phase = 'over';
    return;
  }
  do game.turn = (game.turn + 1) % game.players.length; while (!game.players[game.turn].alive);
  if (alive.length > 1) game.phase = 'handoff'; else startTurn();
}
export function startTurn() { game.phase = poolEmpty() ? 'relocate' : 'pick'; }
```

### 6.5 `src/render.js`

```js
// render.js: canvas drawing in tower space (origin = arc centre, y up, px). Needs a browser.
import { SHAPES } from './shapes.js';
import { board, W } from './board.js';
import { s, ARC_CY, PLATFORM_H } from './physics.js';

export const ZOOM = { min: 0.5, max: 2, step: 1.25 };
export const view = { cell: 40, fit: 40, zoom: 1, size: { w: 0, h: 0 }, pivot: { x: 0, y: 0 }, dpr: 1 };
export const h = () => view.cell / Math.SQRT2;          // half-diagonal of a cell, px
export const R = () => (ARC_CY + PLATFORM_H) * h();     // rocker radius, px

function applyView() {                                 // cell from the fitted size and the zoom; tower stays centred, anchored to the bottom
  view.cell = view.fit * view.zoom;
  view.pivot = { x: view.size.w / 2, y: view.size.h - 9.2 * h() };   // arc centre in CSS px; rocker bottom near the canvas bottom
}

export function layout(canvas) {                        // call from a ResizeObserver
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  view.dpr = dpr;
  view.size = { w: width, h: height };
  view.fit = Math.min(width / 15, height / 16);         // fit factors are a starting point [tune]
  applyView();
}

export function setZoom(z) {
  view.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, z));
  applyView();
  return view.zoom;
}
export const zoomBy = f => setZoom(view.zoom * f);

function drawBase(ctx, H, r) {                          // zigzag top: peaks at odd i, valleys at even i
  const fy = -ARC_CY * H;
  ctx.beginPath();
  ctx.moveTo(-(W + 1) * H, fy);
  for (let i = -W; i <= W; i++) ctx.lineTo(i * H, fy + (i & 1 ? H : 0));
  ctx.lineTo((W + 1) * H, fy);
  const phi = Math.asin((W + 1) * H / r);               // rocker arc as points, ending exactly at -phi
  const n = 24;
  for (let k = 0; k <= n; k++) { const t = phi - 2 * phi * k / n; ctx.lineTo(r * Math.sin(t), -r * Math.cos(t)); }
  ctx.closePath();
  ctx.fillStyle = '#aab2bc';
  ctx.fill();
  ctx.strokeStyle = '#6b7480';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCell(ctx, H, i, j, color, alpha = 1) {     // diamond with a raised inner square
  const a = H * Math.SQRT2;                             // cell side
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(i * H, (j - ARC_CY) * H);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-a / 2 + 1, -a / 2 + 1, a - 2, a - 2);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(-a * 0.3, -a * 0.3, a * 0.6, a * 0.6);
  ctx.restore();
}

export function draw(ctx, canvas, ghost, hand) {
  const { dpr, pivot } = view, H = h(), r = R();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4a4f57';                            // fixed flat plate under the rocker
  ctx.fillRect(pivot.x - 5 * H, pivot.y + r, 10 * H, 0.6 * H);

  ctx.translate(pivot.x + r * s.theta, pivot.y);        // rolling without slipping
  ctx.rotate(s.theta);                                  // clockwise positive
  ctx.scale(1, -1);                                     // tower space: y up
  drawBase(ctx, H, r);
  for (const c of board.values())
    if (!c.base) drawCell(ctx, H, c.i, c.j, SHAPES[c.shape].color);
  if (ghost)
    for (const [di, dj] of hand.cells)
      drawCell(ctx, H, ghost.ci + di, ghost.cj + dj, ghost.valid ? hand.color : '#d32f2f', 0.55);
}
```

### 6.6 `src/input.js`

```js
// input.js: pointer -> tower space -> lattice anchor.
import { s, ARC_CY } from './physics.js';
import { view, h, R } from './render.js';

export function toTower(e, canvas, lift = e.pointerType === 'touch' ? 64 : 0) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left - (view.pivot.x + R() * s.theta);   // undo the roll
  const sy = view.pivot.y - (e.clientY - r.top) + lift;             // y up, lifted so the finger does not cover the piece
  const t = s.theta;                                                // inverse of a clockwise rotation by theta
  return { x: sx * Math.cos(t) - sy * Math.sin(t), y: sx * Math.sin(t) + sy * Math.cos(t) };
}

export function snap(p, piece) {                        // piece = lattice offsets
  const mid = a => (Math.min(...a) + Math.max(...a)) / 2;
  const H = h();
  const mi = mid(piece.map(c => c[0])), mj = mid(piece.map(c => c[1]));
  const fx = p.x / H - mi;
  let ci = Math.round(fx);
  const cj = Math.round(p.y / H + ARC_CY - mj);
  if (((ci + cj) & 1) === 0) ci += fx > ci ? 1 : -1;    // stay on the odd-parity lattice
  return [ci, cj];
}
```

### 6.7 `src/main.js`

```js
// main.js: wiring. Needs a browser. UI chrome (menu, HUD, tray, die) lives in ui.js.
import { SHAPES, spawn, rotate, flipH, flipV } from './shapes.js';
import { board, place } from './board.js';
import { step, isSettled, DT, ARC_CY } from './physics.js';
import { game, beginPlace, onPlaced, endTurn, pickUp, cancelPickUp, placementAllowed, rollPiece } from './rules.js';
import { layout, draw, h } from './render.js';
import { toTower, snap } from './input.js';

const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
export const hand = { cells: [], color: '#fff' };
export const ghost = { ci: 0, cj: 1, valid: false, on: false };

new ResizeObserver(() => layout(canvas)).observe(canvas);

const refresh = () => {
  ghost.valid = game.phase === 'place' && ghost.on && placementAllowed(hand.cells, ghost.ci, ghost.cj);
};
function setHand(shape, cells = spawn(shape)) {
  hand.cells = cells; hand.color = SHAPES[shape].color;
  Object.assign(ghost, { ci: 0, cj: 1, on: false });                        // hidden until the pointer or keys aim it
  refresh();
}

export const pick = shape => { if (beginPlace(shape)) setHand(shape); };   // free pick (easy) or die result
export const rollAndPick = () => pick(rollPiece());
export { cancelPickUp };

export function transform(op) {
  if (game.phase !== 'place') return;
  if (op !== rotate && !game.cfg.flip) return;                              // flip can be disabled per preset
  hand.cells = op(hand.cells);
  refresh();
}
export function commit() {
  if (game.phase !== 'place' || !ghost.valid) return;
  place(hand.cells, ghost.ci, ghost.cj, game.turn, game.hand.shape);
  ghost.on = false;
  onPlaced();
}

function pickAt(p) {                                    // relocate phase: diamond hit test
  const H = h();
  for (const c of board.values())
    if (!c.base && Math.abs(p.x - c.i * H) + Math.abs(p.y - (c.j - ARC_CY) * H) <= H) return c.pid;
}

function aim(e) {
  [ghost.ci, ghost.cj] = snap(toTower(e, canvas), hand.cells);
  ghost.on = true;
  refresh();
}

canvas.addEventListener('pointermove', e => { if (game.phase === 'place') aim(e); });
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  if (game.phase === 'place' && e.pointerType === 'touch') return aim(e);   // show the lifted ghost under the finger
  if (game.phase !== 'relocate') return;
  const pid = pickAt(toTower(e, canvas, 0));
  const cells = pid && pickUp(pid);
  if (cells) setHand(game.hand.shape, cells);
});
canvas.addEventListener('pointerup', e => { if (e.pointerType !== 'touch' && e.button === 0) commit(); });   // touch commits via the Place button
canvas.addEventListener('contextmenu', e => { e.preventDefault(); transform(rotate); });
canvas.addEventListener('wheel', e => { e.preventDefault(); transform(rotate); }, { passive: false });

const OPS = { r: rotate, f: flipH, v: flipV };
const STEP = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, 2], ArrowDown: [0, -2] };
const STEP_SHIFT = { ArrowLeft: [-1, -1], ArrowRight: [1, 1], ArrowUp: [-1, 1], ArrowDown: [1, -1] };  // unit diagonal steps
addEventListener('keydown', e => {
  if (game.phase !== 'place') return;
  const k = e.key.toLowerCase();
  const d = (e.shiftKey ? STEP_SHIFT : STEP)[e.key];
  if (OPS[k]) transform(OPS[k]);
  else if (k === 'enter') commit();
  else if (k === 'escape') cancelPickUp();
  else if (d) { e.preventDefault(); ghost.ci += d[0]; ghost.cj += d[1]; ghost.on = true; refresh(); }
});

let last = performance.now(), acc = 0;                  // fixed timestep
function frame(now) {
  acc += Math.min(now - last, 50) / 1000; last = now;
  while (acc >= DT) {
    acc -= DT;
    if (game.phase === 'menu' || game.phase === 'over') continue;
    const r = step(board);
    if (r.toppled) { endTurn(true); continue; }         // blames the current player in any phase
    if (game.phase === 'settle' && isSettled(r.acc)) endTurn(false);
  }
  const shown = game.phase === 'place' && ghost.on;
  draw(ctx, canvas, shown ? (game.cfg.hints ? ghost : { ...ghost, valid: true }) : null, hand);   // hints off: never reveal validity
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

### 6.8 `src/ui.js`

```js
// ui.js: menu, HUD, tray, die, handoff, result. Rebuilds the DOM only when the game state changes.
import { SHAPES, rotate, flipH, flipV } from './shapes.js';
import { height } from './board.js';
import { game, newGame, startTurn, canCancel, PRESETS } from './rules.js';
import { ghost, pick, rollAndPick, transform, commit, cancelPickUp } from './main.js';
import { view, setZoom, zoomBy, ZOOM } from './render.js';

const tray = document.querySelector('#tray');
const app = document.querySelector('#app');
const overlay = Object.assign(document.createElement('div'), { id: 'overlay' });
const live = Object.assign(document.createElement('div'), { id: 'live' });
live.setAttribute('aria-live', 'polite');

app.append(overlay, live);

const setup = { players: 1, preset: 'easy' };

const best = {
  get() { try { return +localStorage.getItem('tumble.best') || 0; } catch { return 0; } },
  set(v) { try { localStorage.setItem('tumble.best', v); } catch { /* storage unavailable */ } },
};

function el(tag, props = {}, ...kids) {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
}
const button = (content, onclick, props = {}) => el('button', { type: 'button', onclick, ...props }, ...[content].flat());
const zoomOut = button('−', () => zoomBy(1 / ZOOM.step), { title: 'Zoom out (-)' });
const zoomIn = button('+', () => zoomBy(ZOOM.step), { title: 'Zoom in (+)' });
const zoomReset = button('100%', () => setZoom(1), { title: 'Reset zoom (0)' });
const zoom = el('div', { id: 'zoom' }, zoomOut, zoomReset, zoomIn);
const hud = el('div', { id: 'hud' });
const ZOOM_KEYS = { '+': () => zoomBy(ZOOM.step), '=': () => zoomBy(ZOOM.step), '-': () => zoomBy(1 / ZOOM.step), '0': () => setZoom(1) };
addEventListener('keydown', e => { if (!e.ctrlKey && !e.metaKey && ZOOM_KEYS[e.key]) ZOOM_KEYS[e.key](); });

for (const b of [zoomOut, zoomIn, zoomReset]) b.setAttribute('aria-label', b.title.replace(/ \(.\)$/, ''));
app.prepend(el('header', { id: 'bar' }, hud, zoom));

const who = id => `Player ${id + 1}`;

function menu() {
  const choice = (key, value, text) =>
    button(text, () => { setup[key] = value; render(true); }, { className: setup[key] === value ? 'on' : '' });
  return el('div', { className: 'card' },
    el('h1', {}, 'Tumble'),
    el('h2', {}, 'Players'), el('div', { className: 'row' }, choice('players', 1, '1 player'), choice('players', 2, '2 players')),
    el('h2', {}, 'Mode'), el('div', { className: 'row' }, choice('preset', 'easy', 'Easy: pick any piece'), choice('preset', 'hard', 'Hard: roll the die')),
    el('p', {}, setup.preset === 'easy'
      ? 'Flip and placement hints on. When the pool is empty, move any piece.'
      : 'Flip and hints off. When the pool is empty, take a piece off and put it on top.'),
    button('Start', () => newGame(setup.players, PRESETS[setup.preset]), { className: 'go' }));
}

function handoff() {
  return el('div', { className: 'card' },
    el('h1', {}, `${who(game.turn)}, tap to start`),
    ...(game.players.some(p => !p.alive)
      ? [el('p', {}, `Out: ${game.players.filter(p => !p.alive).map(p => who(p.id)).join(', ')}`)] : []),
    button('Start turn', startTurn, { className: 'go' }));
}

function result() {
  const r = game.result;
  if (r.winner === undefined && r.height > best.get()) best.set(r.height);
  return el('div', { className: 'card' },
    el('h1', {}, r.winner === undefined ? 'Tower fell' : `${who(r.winner)} wins`),
    el('p', {}, r.winner === undefined
      ? `Height ${r.height} rows in ${r.moves} moves. Best: ${best.get()}.`
      : `${who(1 - r.winner)} toppled the tower.`),
    button('Play again', () => { game.phase = 'menu'; }, { className: 'go' }));
}

const stat = (value, label) => el('span', { className: 'stat' }, el('b', {}, value), ` ${label}`);
const hudItems = () => [
  el('strong', { className: 'who' }, game.players.length > 1 ? who(game.turn) : 'Solo'),
  stat(height(), 'height'), stat(game.moves, 'moves'),
  ...(game.cfg.pick === 'free' ? [] : [stat(Object.values(game.pool).reduce((a, b) => a + b, 0), 'pool')]),
];

const swatch = k => el('span', { className: 'swatch', style: `background:${SHAPES[k].color}` });

function controls() {
  const place = button('Place', commit, { id: 'place', className: 'go' });
  return [
    button('Rotate (R)', () => transform(rotate)),
    ...(game.cfg.flip ? [button('Flip H (F)', () => transform(flipH)), button('Flip V (V)', () => transform(flipV))] : []),
    place,
    ...(canCancel() ? [button('Cancel (Esc)', cancelPickUp)] : []),
  ];
}

function trayItems() {
  switch (game.phase) {
    case 'pick':
      return game.cfg.pick === 'die'
        ? [button('Roll the die', rollAndPick, { className: 'go' })]
        : Object.keys(SHAPES).map(k =>
            button([swatch(k), `${k} × ${game.pool[k]}`], () => pick(k), { disabled: game.pool[k] === 0 }));
    case 'place': return [el('span', {}, swatch(game.hand.shape), `${game.hand.shape}`), ...controls()];
    case 'settle': return [el('span', {}, 'Settling…')];
    case 'relocate': return [el('span', {}, 'Pool empty: click a piece to move it')];
    default: return [];
  }
}

const announce = () => {
  if (game.phase === 'pick' || game.phase === 'relocate') return `${game.players.length > 1 ? who(game.turn) + ': ' : ''}${game.phase === 'pick' ? 'choose a piece' : 'move a piece'}`;
  if (game.phase === 'over') return game.result.winner === undefined ? 'Tower fell' : `${who(game.result.winner)} wins`;
  return '';
};

let sig = '';
function render(force) {
  const next = JSON.stringify([game.phase, game.turn, game.moves, game.hand?.shape, game.pool, game.players, setup]);
  if (next === sig && !force) return;
  sig = next;
  const screen = { menu, handoff, over: result }[game.phase];
  overlay.replaceChildren(...(screen ? [screen()] : []));
  overlay.hidden = !overlay.childNodes.length;
  const playing = game.phase !== 'menu' && game.phase !== 'over';
  hud.replaceChildren(...(playing ? hudItems() : []));
  tray.replaceChildren(...(playing ? trayItems() : []));
  live.textContent = announce();
}

(function tick() {
  render();
  const place = document.querySelector('#place');
  if (place) place.disabled = !ghost.valid;
  zoomReset.textContent = `${Math.round(view.zoom * 100)}%`;
  zoomOut.disabled = view.zoom <= ZOOM.min;
  zoomIn.disabled = view.zoom >= ZOOM.max;
  requestAnimationFrame(tick);
})();
```

## 7. UI and layout

### 7.1 Files

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Tumble</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <canvas id="stage"></canvas>
    <aside id="tray"><!-- piece buttons, die, rotate/flip/place/cancel: built by ui.js --></aside>
  </div>
  <script type="module" src="src/ui.js"></script>
</body>
</html>
```

`style.css`:

```css
:root {
  color-scheme: light dark;
  --bg: #f4f5f7; --fg: #1d2127; --panel: #ffffff; --line: #c9ced6; --accent: #1e5bd8; --accent-fg: #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #14171b; --fg: #e8eaee; --panel: #1f242a; --line: #3a414a; --accent: #5b8cf0; --accent-fg: #0c1118; }
}
html, body { margin: 0; height: 100%; overscroll-behavior: none; background: var(--bg); color: var(--fg); font: 16px system-ui, sans-serif; }
#app {
  position: relative;
  display: grid; height: 100dvh; box-sizing: border-box;
  grid-template: "bar" auto "stage" minmax(0, 1fr) "tray" auto / minmax(0, 1fr);   /* phone portrait */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}
#stage { grid-area: stage; display: block; width: 100%; height: 100%; touch-action: none; }
#tray  { grid-area: tray; display: flex; align-items: center; gap: .5rem; padding: .5rem; overflow-x: auto; background: var(--panel); border-top: 1px solid var(--line); }
@media (orientation: landscape) and (min-width: 700px) {                     /* desktop */
  #app  { grid-template: "bar tray" auto "stage tray" minmax(0, 1fr) / minmax(0, 1fr) 240px; }
  #tray { flex-direction: column; align-items: stretch; overflow-y: auto; border-top: 0; border-left: 1px solid var(--line); }
}
#tray:empty { display: none; }

button { font: inherit; color: inherit; background: var(--panel); border: 1px solid var(--line); border-radius: .5rem; padding: .5rem .75rem; min-height: 44px; white-space: nowrap; cursor: pointer; }
button:disabled { opacity: .4; cursor: default; }
button.on, button.go { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
button.go:disabled { background: var(--panel); color: inherit; border-color: var(--line); }
.swatch { display: inline-block; width: .9em; height: .9em; margin-right: .4em; border-radius: 2px; vertical-align: -.1em; }

#overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0, 0, 0, .45); padding: 1rem; box-sizing: border-box; }
#overlay[hidden] { display: none; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: .75rem; padding: 1.25rem; max-width: 26rem; width: 100%; box-sizing: border-box; display: grid; gap: .75rem; }
.card h1 { margin: 0; font-size: 1.6rem; }
.card h2 { margin: 0; font-size: .9rem; opacity: .7; text-transform: uppercase; letter-spacing: .05em; }
.card p { margin: 0; }
.row { display: flex; flex-wrap: wrap; gap: .5rem; }
#live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

#bar { grid-area: bar; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .25rem .75rem; padding: .5rem; background: var(--panel); border-bottom: 1px solid var(--line); }
#hud { display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem 1rem; font-size: 1.1rem; }
#hud .who { font-size: 1.25rem; }
#hud .stat b { font-size: 1.4rem; font-variant-numeric: tabular-nums; }
#zoom { display: flex; gap: .25rem; margin-left: auto; }
#zoom button { min-width: 44px; padding: .25rem .5rem; }
#tray span { white-space: nowrap; }
```

Serve over HTTP (`python3 -m http.server`). Opening `index.html` from `file://` blocks ES module imports. `README.md` has the run, test and deploy steps.

### 7.2 Input matrix

| Action | Desktop | Phone |
|---|---|---|
| Aim | Mouse move | Drag; ghost is lifted 64 px above the finger and shown from touch start |
| Commit | Left click, or Enter | Place button (no commit on finger lift) |
| Rotate | R, right-click, wheel | Rotate button |
| Flip horizontal / vertical | F / V | Flip buttons (hidden when `cfg.flip` is false) |
| Nudge ghost | Arrows: 2 lattice units; Shift+Arrows: 1 diagonal unit | n/a |
| Cancel a pickup, or an easy-mode pick | Esc | Cancel button (not shown for a rolled piece in hard mode) |
| Zoom out / in / reset | `-` / `+` or `=` / `0` | Zoom buttons in the top bar |
| Choose piece (easy) or roll (hard) | Tray click, die button | Tray tap, die button |
| Pick a piece up (relocate) | Click the piece | Tap the piece |

Arrow keys step by 2 units to stay on the valid-parity lattice; Shift+Arrows switch between the two parity sub-lattices. Pointer events cover mouse and touch with one code path.

### 7.3 `ui.js` responsibilities

| Element | Behavior |
|---|---|
| Menu | Players (1 or 2), preset (easy or hard), start |
| Top bar | Above the stage. Left: player (or "Solo"), height, moves, and pool total in hard mode, with the numbers in a larger font. Right: zoom out, zoom level (click to reset), zoom in. Wraps on a narrow screen. Stats are empty on the menu and result screens |
| Tray | Easy `pick`: one button per shape with remaining count. Hard `pick`: die button. `place`: current piece, Rotate, Flip H and V (hidden when `cfg.flip` is false), Place (enabled only when the ghost is valid), Cancel (when `canCancel()`). `settle` and `relocate`: a one-line message |
| Handoff | Full-screen "Player N, tap to start" shown while `phase === 'handoff'`, with the list of players who are out; a tap calls `startTurn()` |
| Result | Winner (2P) or height, moves and best (1P), play again |
| Persistence | Best 1P height in `localStorage` key `tumble.best`, wrapped in try/catch |
| Announcements | An `aria-live` region says whose turn it is and the result |

The DOM is rebuilt only when a state signature changes (phase, turn, moves, hand shape, pool, players, menu choices), not every frame. The Place button and zoom labels update every frame without a rebuild.

## 8. Tuning

| Constant | Value | Meaning | Status |
|---|---|---|---|
| `W` | 5 | Half-width of the base in lattice units | [Speculation] by-eye from photo 2 |
| `ARC_CY` | 4 | Arc center above the valley floor, in half-diagonals | [Speculation] |
| `PLATFORM_H` | 4 | Valley floor to rocker bottom, in half-diagonals | [Speculation] |
| `THETA_MAX` | 0.5 rad | Topple threshold | [Speculation] |
| `K` | 300 | Base restoring torque | Tunable |
| `C` | 30 | Damping | Tunable |
| `I` | 9 | Inertia | Tunable |
| `LEAN` | 1 | Weight of the tower's lean (inverted-pendulum) term | Tunable |
| `G` | 2 | Gravity strength: multiplies the load torque only, so sway speed is unchanged. Headless bots, 60 random games: median pieces before topple 12 at `G=1`, 6 at `G=2`, 3 at `G=3` | Tunable; not playtested by a human |
| `DT` | 1/120 s | Physics step | Decision |

Damping ratio is about 0.29 and the swing frequency about 5.8 rad/s with `K = 300`, `I = 9`, `C = 30`. Keep `K / I` and `C` scaled together when changing stiffness.

v1 draft results from headless Node runs (physics only; no browser, no frame-rate or touch data). [Unverified] These were not re-run in the v2 pass; the gravity sweep below is the re-run for `K = 300`:

- v1 draft: no single first piece topples the tower: 0 of 388 candidate single-piece placements, at `K` = 100, 200, 300 and 400 (`G = 1`).
- v1 draft: pieces survived under uniformly random valid placements (60 games per setting, all 7 shapes in 8 orientations; `G = 1`). Random play is weaker than careful play.

| `K` | `I` | `C` | Min | Median | Max |
|---|---|---|---|---|---|
| 100 | 3 | 10 | 2 | 6 | 11 |
| 200 | 6 | 20 | 3 | 9 | 18 |
| 300 | 9 | 30 | 5 | 11 | 23 |
| 400 | 12 | 40 | 8 | 16 | 27 |

- v1 draft: adversarial right-edge loading with `K = 300` and `G = 1`: the third piece topples the tower.
- A perfectly symmetric stack stays at `theta = 0` however tall it gets, because `theta = 0` is an unstable equilibrium and nothing perturbs it. [Inference] Add a small random torque on each placement if tall symmetric towers should wobble.
- v1 draft: settle time in the runs looked at was about 0.3 to 2.3 s.

**Gravity sweep.** [Verified by test run] Headless physics, `K = 300`, `I = 9`, `C = 30`, each placement settled for up to 4 s. Pool of 4 per shape (28 pieces). Counts are pieces placed before the tower fell, as min / median / max.

| `G` | First piece topples (all orientations and anchors, 223 placements) | Random play, 60 games | Greedy bot, 8 games (max 28) |
|---|---|---|---|
| 1 | 0 | 3 / 12 / 22 | 8 / 10 / 12 |
| 2 | 0 | 2 / 6 / 13 | 7 / 9 / 11 |
| 3 | 0 | 1 / 3 / 12 | 5 / 7 / 9 |
| 4 | 0 | 1 / 3 / 10 | 5 / 7 / 8 |

Random play picks a random shape, orientation and valid anchor. The greedy bot picks a random shape, tries every orientation and anchor, and keeps the one with the smallest settled tilt. The script that produced the table is not kept in the repo. The 223 count is lower than the v1 draft's 388 because it removes duplicate orientations and limits anchors to `i` in [-12, 12] and `j` in [1, 24] [Inference: that explains the gap; I did not confirm it].

`G = 2` was chosen because `G = 3` makes random play end after about 3 pieces. [Speculation] A careful human should survive longer than either bot; confirm by playtesting. `K = 300` is still a starting value.

## 9. Testing

Run: `npm test` (`node --test`) from the project root, with `package.json` containing `{"type":"module"}`. No install step.

[Verified by test run] 38 tests pass under Node 20.20.2:

| File | Covers |
|---|---|
| `shapes.test.js` | Lattice parity, flipV identity, orientation table, S/Z and J/L equivalence under flip |
| `board.test.js` | Base teeth, valley placement, floating/overlap/off-lattice rejection, edge overhang, removal rule, snapshots |
| `input.test.js` | `toTower` inverts the draw transform at several tilts, `snap` round trip and parity |
| `physics.test.js` | Symmetric stack stays level, clockwise and counter-clockwise tilt, topple under an overwhelming load, base cells carry no torque, settle detection, `G` scales tilt without changing swing speed |
| `rules.test.js` | 2P elimination and winner, 3P continuation, 1P result, die first-roll rule, relocate and on-top rule, cancel pickup, stale-snapshot topple in `pick`, easy-mode cancel, hard-mode no cancel, `canCancel` outside `place` |
| `render.test.js` | Layout fit at zoom 1, `setZoom` scaling and anchoring, clamping, `zoomBy`, zoom surviving a resize |

`shapes.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, spawn, rotate, flipH, flipV } from '../src/shapes.js';

const norm = p => {
  const a = Math.min(...p.map(c => c[0])), b = Math.min(...p.map(c => c[1]));
  return p.map(([i, j]) => `${i - a},${j - b}`).sort().join('|');
};
const orientations = (p, withFlip) => {
  const set = new Set();
  for (const base of withFlip ? [p, flipH(p)] : [p]) {
    let q = base;
    for (let r = 0; r < 4; r++) { set.add(norm(q)); q = rotate(q); }
  }
  return set;
};

test('every lattice offset has even i + j', () => {
  for (const k of Object.keys(SHAPES))
    for (const [i, j] of spawn(k)) assert.equal(((i + j) & 1), 0, k);
});

test('flipV equals flipH then rotate twice', () => {
  for (const k of Object.keys(SHAPES)) {
    const p = spawn(k);
    assert.equal(norm(flipV(p)), norm(rotate(rotate(flipH(p)))), k);
  }
});

test('orientation counts', () => {
  const rot = {}, flip = {};
  for (const k of Object.keys(SHAPES)) {
    rot[k] = orientations(spawn(k), false).size;
    flip[k] = orientations(spawn(k), true).size;
  }
  assert.deepEqual(rot,  { I: 2, O: 1, T: 4, S: 2, Z: 2, J: 4, L: 4 });
  assert.deepEqual(flip, { I: 2, O: 1, T: 4, S: 4, Z: 4, J: 8, L: 8 });
});

test('flip makes S and Z the same set of shapes, and J and L', () => {
  const eq = (a, b) => {
    const A = orientations(spawn(a), true), B = orientations(spawn(b), true);
    return A.size === B.size && [...A].every(x => B.has(x));
  };
  assert.ok(eq('S', 'Z')); assert.ok(eq('J', 'L'));
  assert.ok(!eq('S', 'T'));
});

test('flipH is a mirror on screen: i -> -i, j unchanged', () => {
  assert.deepEqual(flipH([[1, 3]]), [[-1, 3]]);
  assert.deepEqual(flipV([[1, 3]]), [[1, -3]]);
});
```

`rules.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from '../src/shapes.js';
import { board, place } from '../src/board.js';
import { game, newGame, PRESETS, beginPlace, onPlaced, endTurn, startTurn, pickUp, placementAllowed,
         poolEmpty, rollPiece, cancelPickUp, canCancel } from '../src/rules.js';

test('2P: topple puts the mover out, other player wins, state restored', () => {
  newGame(2, PRESETS.easy);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced();
  endTurn(false); assert.equal(game.phase, 'handoff'); assert.equal(game.turn, 1);
  startTurn(); assert.equal(game.phase, 'pick');
  assert.ok(beginPlace('T')); place(spawn('T'), 1, 4, 1, 'T'); onPlaced();
  const before = [...board.values()].length;
  endTurn(true);
  assert.equal(game.phase, 'over'); assert.deepEqual(game.result, { winner: 0 });
  assert.equal([...board.values()].length, before - 4);       // T removed again
});

test('3P: one out, game continues with the same tower', () => {
  newGame(3, PRESETS.easy);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(true);
  assert.equal(game.phase, 'handoff'); assert.equal(game.turn, 1);
  assert.equal(game.players[0].alive, false);
});

test('solo: topple ends the game with last stable height', () => {
  newGame(1, PRESETS.hard);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(false);
  assert.equal(game.phase, 'pick');
  assert.ok(beginPlace('L')); place(spawn('L'), 1, 4, 0, 'L'); onPlaced(); endTurn(true);
  assert.equal(game.phase, 'over');
  assert.equal(game.result.height, 3);
});

test('die: first roll of the game is never I while other shapes exist', () => {
  newGame(1);
  for (let n = 0; n < 500; n++) assert.notEqual(rollPiece(), 'I');
});

test('pool runs out -> relocate; hard mode only allows on-top placement', () => {
  newGame(1, PRESETS.hard, 0);
  game.pool.O = 1; game.pool.T = 1;
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(false);
  assert.equal(game.phase, 'pick');
  assert.ok(beginPlace('T')); place(spawn('T'), 1, 4, 0, 'T'); onPlaced(); endTurn(false);
  assert.ok(poolEmpty()); assert.equal(game.phase, 'relocate');
  assert.ok(pickUp([...board.values()].find(c => c.shape === 'O').pid) === null);   // O carries the T: not removable
  const hand = pickUp([...board.values()].find(c => c.shape === 'T').pid);
  assert.ok(hand); assert.equal(game.phase, 'place');
  assert.ok(!placementAllowed(hand, -4, 1));                  // valid cell, but not on top
  assert.ok(placementAllowed(hand, 1, 4));                    // back on top
  cancelPickUp(); assert.equal(game.phase, 'relocate');
  assert.equal([...board.values()].filter(c => !c.base).length, 8);
});

test('a topple while picking restores the tower as it was at the end of the last turn', () => {
  newGame(2, PRESETS.easy);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(false);
  startTurn();                                                // player 1 is in the pick phase
  endTurn(true);
  assert.equal([...board.values()].filter(c => !c.base).length, 4);
});

test('easy: a piece taken from the pool can be put back and a different one chosen', () => {
  newGame(1, PRESETS.easy);
  assert.ok(beginPlace('O'));
  assert.ok(canCancel());
  cancelPickUp();
  assert.equal(game.phase, 'pick'); assert.equal(game.hand, null);
  assert.equal(game.pool.O, 4);
  assert.equal(game.moves, 0);
  assert.ok(beginPlace('T'));
});

test('hard: a rolled piece cannot be cancelled (that would be a free re-roll)', () => {
  newGame(1, PRESETS.hard);
  assert.ok(beginPlace('O'));
  assert.ok(!canCancel());
  cancelPickUp();
  assert.equal(game.phase, 'place');
});

test('canCancel is false outside the place phase', () => {
  newGame(1, PRESETS.easy);
  assert.ok(!canCancel());
});
```

**Manual matrix**

| Area | Check | Status |
|---|---|---|
| Browsers | Chrome desktop, Firefox desktop, Safari iOS, Chrome Android | Headless Chromium only (Playwright). The rest not run |
| Input | Mouse, touch, keyboard; right-click and wheel do not scroll or open menus | Mouse and keyboard through synthetic events: aim, commit, Esc, zoom keys. Real mouse, touch and the right-click and wheel behaviour not run |
| Layout | Portrait phone, landscape phone, desktop; resize and rotate mid-game; sharp at devicePixelRatio 1 to 3 | Desktop 1000x700 and portrait phone 390x780 viewed. Landscape phone, rotate mid-game and other pixel ratios not run |
| Modes | 1P and 2P, easy and hard, pool exhaustion, relocation, cancel pickup | 2P easy to a topple and winner, hard-mode roll, relocation with pool of 2, cancel in easy and hard run. A full 1P game to a topple in the browser not run |
| Physics feel | Sway readable, topple not instant, settle under 3 s, 55+ fps on a mid-range phone [Speculation: target] | Not run by a human. Settle time and fps not measured in the browser |

## 10. Milestones

| # | Deliverable | Acceptance | Status |
|---|---|---|---|
| M0 | Scaffold: `index.html`, `style.css`, `layout()` | Canvas fills the grid cell; sharp on high-DPI; resize works | Done; high-DPI not checked |
| M1 | Static draw: base and a few lattice cells | Bottom cells sit corner-down in the valleys at `theta = 0` | Done, viewed in headless Chromium |
| M2 | Placement: ghost, snap, rotate, flip, commit (mouse) | Invalid spots show red; overlap and floating rejected (board tests) | Done |
| M3 | Physics loop | Right-side load tilts clockwise; topple triggers; settle detection ends the turn | Done |
| M4 | Rules: 1P, 2P, die and free pick, pool, handoff, elimination, relocation | `rules.test.js` passes; a full 2P game is playable from the console | Done; a 2P game played through the UI to a winner |
| M5 | `ui.js`: menu, HUD, tray, die, result, presets | Both layouts usable; flip buttons follow `cfg.flip` | Done |
| M6 | Phone: touch lift, Place button, pointer capture | Playable on iOS Safari and Android Chrome | Code written; not run on a device |
| M7 | Tuning and polish | Constants settled by playtest; best score stored; optional sound and haptics | Best score stored; `G` set by bots; no playtest, sound or haptics |
| M8 | Zoom, top bar, cancel of a pick, gravity strength | Section 7.3 and the Status table | Done |

## 11. Best practices

- **Fixed timestep.** Accumulate time, step at 1/120 s, clamp the frame delta to 50 ms. Draw once per frame.
- **One transform.** `draw()` and `toTower()` use the same transform. `input.test.js` checks that they invert each other.
- **Pointer Events.** Use them for mouse and touch, with `touch-action: none` on the canvas and `setPointerCapture`.
- **Touch.** Lift the ghost above the finger and commit with a button, since lifting a finger moves the ghost.
- **Layout.** `100dvh`, safe-area insets, `minmax(0, 1fr)` grid tracks, `ResizeObserver` on the canvas.
- **High-DPI.** Size the canvas buffer by `devicePixelRatio`, draw in CSS pixels via `setTransform`.
- **State.** Keep `rules.js`, `board.js`, `physics.js` free of DOM so they stay testable in Node.
- **Persistence.** `localStorage` in try/catch, with the game working when it is empty.
- **Accessibility.** Full keyboard play, an `aria-live` region announcing turn changes, respect `prefers-reduced-motion`, and color-blind help (a letter on each cell, optional). Done: keyboard play, `aria-live`, zoom buttons with labels. Not done: `prefers-reduced-motion`, letters on cells.
- **Handoff.** Hide the tower tilt result behind the handoff screen only if you want surprise; otherwise keep it visible.

## 12. Risks and open questions

**Risks**

| Risk | Note |
|---|---|
| Physics feel | [Unverified] The rocker model (rolling about the arc center, one torque term, one stiffness) is mine. The real product's behavior is not documented in the sources |
| Support rule | One lower neighbour is enough, including past the platform edge. Real pieces may need more |
| Hard mode | Disabling flip and hints as a "one-handed" stand-in is [Speculation] |
| Relocation | The removal rule (every other piece keeps a support chain to the base) and "on top" (`min j >= height`) are my readings |
| Browser code | [Checked in headless Chromium] with synthetic events. Real touch, other browsers and frame rate are untested |
| Cancel | Taking back a pick is not in the sources. It is allowed only in easy mode, where any piece is free to choose anyway |
| Gravity | `G = 2` is tuned by bots only. Humans may find it too hard or too easy |
| Zoom | No pan, so a tall tower is cut off at the top when zoomed in |
| Legal | [Unverified] The wiki claims The Tetris Company owns the tetrominoes, and the product page footer reserves the name and trade dress. Check before any public release, and avoid the Tetris name and logo |

**Open questions.** v2 used these defaults. Confirm or change them.

1. Default for 1P: free pick (easy) or die roll? Default: easy, free pick.
2. Pool size per shape: 4. Unlimited until you want the relocation phase?
3. N-player (up to 4): not in the menu. The rules code supports it.
4. Hard-mode stand-in for "one hand": flip and hints off. A time limit per placement is the alternative.
5. Should a rolled piece in hard mode be cancellable? Default: no.

## 13. Deployment

The game is a static site: no build step, no server code.

Render, static site:

1. Push the repo to GitHub, GitLab or Bitbucket.
2. [Render Dashboard](https://dashboard.render.com/): New > Static Site, connect the repo, choose the branch. [Sourced: Render docs, "Static Sites"]
3. Build Command blank, Publish Directory `.` [Sourced: a Render community forum answer, not the official docs]
4. Create Static Site. Render redeploys on every push to the branch. [Sourced: Render docs]

Publishing `.` also serves `SPECS.md` and `test/`. To avoid that, move `index.html`, `style.css` and `src/` into `public/` and set Publish Directory to `public`. An optional `render.yaml` with `runtime: static`, `staticPublishPath` and `autoDeployTrigger: commit` is in Render's blueprint spec [Sourced: Render docs, "Blueprint spec"]; this repo does not include one. Static sites count against the workspace's monthly bandwidth and pipeline minutes [Sourced: Render docs]. I did not deploy this site.

## Appendix: file layout

```
tumble/
  index.html
  style.css
  README.md
  SPECS.md
  package.json            {"type":"module"}
  src/    shapes.js board.js physics.js rules.js render.js input.js main.js ui.js
  test/   shapes.test.js board.test.js input.test.js physics.test.js rules.test.js render.test.js
```
