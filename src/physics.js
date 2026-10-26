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
