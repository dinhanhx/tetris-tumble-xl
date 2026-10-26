import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from '../src/shapes.js';
import { board, W, resetBoard, canPlace, place, remove, canRemove, height, snapshot, restore } from '../src/board.js';

const one = [[0, 0]];

test('base has a tooth at every odd i in [-W, W], all at j = 0', () => {
  resetBoard();
  const teeth = [...board.values()].filter(c => c.base);
  assert.equal(teeth.length, 6);
  assert.deepEqual(teeth.map(c => c.i).sort((a, b) => a - b), [-5, -3, -1, 1, 3, 5]);
  assert.ok(teeth.every(c => c.j === 0 && ((c.i + c.j) & 1) === 1));
  assert.equal(W, 5);
});

test('a cell sits corner-down in a valley', () => {
  resetBoard();
  assert.ok(canPlace(one, 0, 1));
  assert.ok(canPlace(one, -4, 1));
});

test('rejects off-lattice, floating, inside-base and overlapping placements', () => {
  resetBoard();
  assert.ok(!canPlace(one, 0, 2), 'off lattice');
  assert.ok(!canPlace(one, 0, 3), 'floating');
  assert.ok(!canPlace(one, 1, 0), 'inside base');
  place(one, 0, 1, 0, 'O');
  assert.ok(!canPlace(one, 0, 1), 'overlap');
});

test('allows overhang past the platform edge with one lower neighbour, not two cells out', () => {
  resetBoard();
  assert.ok(canPlace(one, 6, 1));
  assert.ok(!canPlace(one, 8, 1));
});

test('a piece is supported when any one cell rests on something outside it', () => {
  resetBoard();
  assert.ok(canPlace(spawn('O'), 0, 1));
  assert.ok(!canPlace(spawn('O'), 0, 3));
});

test('removal rule: a supporting piece cannot go, the top piece can', () => {
  resetBoard();
  const a = place(one, 0, 1, 0, 'O');
  const b = place(one, 1, 2, 0, 'T');
  assert.ok(!canRemove(a));
  assert.ok(canRemove(b));
  assert.equal(height(), 2);
  assert.equal(remove(b).length, 1);
  assert.equal(height(), 1);
});

test('snapshot and restore round trip', () => {
  resetBoard();
  place(one, 0, 1, 0, 'O');
  const snap = snapshot();
  place(one, 1, 2, 1, 'T');
  restore(snap);
  assert.equal([...board.values()].filter(c => !c.base).length, 1);
  assert.ok(!board.has('1,2'));
});
