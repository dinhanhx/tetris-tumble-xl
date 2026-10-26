import test from 'node:test';
import assert from 'node:assert/strict';
import { s, P, step, isSettled, resetPhysics, resetSettle, DT, THETA_MAX } from '../src/physics.js';

const cells = list => new Map(list.map(([i, j]) => [`${i},${j}`, { i, j }]));
const run = (b, seconds) => {
  let r;
  for (let t = 0; t < seconds / DT; t++) { r = step(b); if (r.toppled) break; }
  return r;
};

test('a symmetric stack stays level', () => {
  resetPhysics();
  const b = cells([[-1, 1], [1, 1], [-1, 3], [1, 3]]);
  assert.ok(!run(b, 5).toppled);
  assert.equal(s.theta, 0);
});

test('a load on the right tilts the tower clockwise (theta > 0)', () => {
  resetPhysics();
  const b = cells([[2, 1], [3, 2]]);
  assert.ok(!run(b, 3).toppled);
  assert.ok(s.theta > 0);
});

test('a load on the left tilts it counter-clockwise', () => {
  resetPhysics();
  run(cells([[-2, 1], [-3, 2]]), 3);
  assert.ok(s.theta < 0);
});

test('an overwhelming right-edge load topples', () => {
  resetPhysics();
  const b = cells(Array.from({ length: 60 }, (_, n) => [7, 1 + 2 * n]));
  assert.ok(run(b, 5).toppled);
  assert.ok(Math.abs(s.theta) > THETA_MAX);
});

test('base cells do not add torque', () => {
  resetPhysics();
  const b = new Map([['5,0', { i: 5, j: 0, base: true }]]);
  run(b, 2);
  assert.equal(s.theta, 0);
});

test('settle detection fires once the swing dies down', () => {
  resetPhysics(); resetSettle();
  const b = cells([[2, 1], [3, 2]]);
  let settled = false;
  for (let t = 0; t < 4 / DT && !settled; t++) settled = isSettled(step(b).acc);
  assert.ok(settled);
});

test('gravity strength G scales how far a load tips the tower', () => {
  const b = cells([[2, 1], [3, 2]]);
  const tilt = g => { const old = P.G; P.G = g; resetPhysics(); run(b, 5); P.G = old; return s.theta; };
  const weak = tilt(1), strong = tilt(2);
  assert.ok(strong > weak * 1.8, `${strong} vs ${weak}`);
});

test('G does not change the swing speed of an unloaded rocker', () => {
  const b = new Map();
  const swing = g => { const old = P.G; P.G = g; resetPhysics(); s.theta = 0.2; run(b, 0.3); P.G = old; return s.theta; };
  assert.equal(swing(1), swing(3));
});
