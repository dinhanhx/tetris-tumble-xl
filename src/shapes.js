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
