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
