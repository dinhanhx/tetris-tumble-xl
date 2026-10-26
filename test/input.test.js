import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from '../src/shapes.js';
import { s, ARC_CY } from '../src/physics.js';
import { view, h, R } from '../src/render.js';
import { toTower, snap } from '../src/input.js';

const canvas = { getBoundingClientRect: () => ({ left: 10, top: 20 }) };
view.cell = 40;
view.pivot = { x: 300, y: 500 };

// the forward transform used by draw(): translate(pivot + R*theta), rotate(theta), scale(1, -1)
const toClient = ({ x, y }, t) => ({
  clientX: 10 + view.pivot.x + R() * t + x * Math.cos(t) + y * Math.sin(t),
  clientY: 20 + view.pivot.y - (-x * Math.sin(t) + y * Math.cos(t)),
  pointerType: 'mouse',
});

test('toTower inverts the draw transform at several tilts', () => {
  for (const t of [-0.4, -0.1, 0, 0.2, 0.45]) {
    s.theta = t;
    for (const p of [{ x: 0, y: 0 }, { x: 80, y: 120 }, { x: -150, y: 30 }]) {
      const q = toTower(toClient(p, t), canvas);
      assert.ok(Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9, `${t} ${JSON.stringify(p)}`);
    }
  }
  s.theta = 0;
});

test('touch lifts the aim point 64 px above the finger', () => {
  s.theta = 0;
  const e = { ...toClient({ x: 0, y: 0 }, 0), pointerType: 'touch' };
  assert.ok(Math.abs(toTower(e, canvas).y - 64) < 1e-9);
});

test('snap round-trips a piece centred on its anchor', () => {
  const H = h();
  for (const k of ['I', 'O', 'T', 'S', 'Z', 'J', 'L']) {
    const piece = spawn(k);
    const mid = a => (Math.min(...a) + Math.max(...a)) / 2;
    const mi = mid(piece.map(c => c[0])), mj = mid(piece.map(c => c[1]));
    for (const [ci, cj] of [[0, 1], [-4, 1], [3, 6], [-2, 9]]) {
      const p = { x: (ci + mi) * H, y: (cj + mj - ARC_CY) * H };
      assert.deepEqual(snap(p, piece), [ci, cj], `${k} ${ci},${cj}`);
    }
  }
});

test('snap always lands on the odd-parity lattice', () => {
  const piece = spawn('T');
  for (let n = 0; n < 500; n++) {
    const [ci, cj] = snap({ x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.3) * 600 }, piece);
    assert.equal((ci + cj) & 1, 1);
  }
});
