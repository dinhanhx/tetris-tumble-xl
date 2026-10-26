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
