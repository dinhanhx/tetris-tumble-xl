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
