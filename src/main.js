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
