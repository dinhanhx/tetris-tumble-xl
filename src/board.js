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
