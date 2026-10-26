// render.js: canvas drawing in tower space (origin = arc centre, y up, px). Needs a browser.
import { SHAPES } from './shapes.js';
import { board, W } from './board.js';
import { s, ARC_CY, PLATFORM_H } from './physics.js';

export const ZOOM = { min: 0.5, max: 2, step: 1.25 };
export const view = { cell: 40, fit: 40, zoom: 1, size: { w: 0, h: 0 }, pivot: { x: 0, y: 0 }, dpr: 1 };
export const h = () => view.cell / Math.SQRT2;          // half-diagonal of a cell, px
export const R = () => (ARC_CY + PLATFORM_H) * h();     // rocker radius, px

function applyView() {                                 // cell from the fitted size and the zoom; tower stays centred, anchored to the bottom
  view.cell = view.fit * view.zoom;
  view.pivot = { x: view.size.w / 2, y: view.size.h - 9.2 * h() };   // arc centre in CSS px; rocker bottom near the canvas bottom
}

export function layout(canvas) {                        // call from a ResizeObserver
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  view.dpr = dpr;
  view.size = { w: width, h: height };
  view.fit = Math.min(width / 15, height / 16);         // fit factors are a starting point [tune]
  applyView();
}

export function setZoom(z) {
  view.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, z));
  applyView();
  return view.zoom;
}
export const zoomBy = f => setZoom(view.zoom * f);

function drawBase(ctx, H, r) {                          // zigzag top: peaks at odd i, valleys at even i
  const fy = -ARC_CY * H;
  ctx.beginPath();
  ctx.moveTo(-(W + 1) * H, fy);
  for (let i = -W; i <= W; i++) ctx.lineTo(i * H, fy + (i & 1 ? H : 0));
  ctx.lineTo((W + 1) * H, fy);
  const phi = Math.asin((W + 1) * H / r);               // rocker arc as points, ending exactly at -phi
  const n = 24;
  for (let k = 0; k <= n; k++) { const t = phi - 2 * phi * k / n; ctx.lineTo(r * Math.sin(t), -r * Math.cos(t)); }
  ctx.closePath();
  ctx.fillStyle = '#aab2bc';
  ctx.fill();
  ctx.strokeStyle = '#6b7480';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCell(ctx, H, i, j, color, alpha = 1) {     // diamond with a raised inner square
  const a = H * Math.SQRT2;                             // cell side
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(i * H, (j - ARC_CY) * H);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-a / 2 + 1, -a / 2 + 1, a - 2, a - 2);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(-a * 0.3, -a * 0.3, a * 0.6, a * 0.6);
  ctx.restore();
}

export function draw(ctx, canvas, ghost, hand) {
  const { dpr, pivot } = view, H = h(), r = R();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4a4f57';                            // fixed flat plate under the rocker
  ctx.fillRect(pivot.x - 5 * H, pivot.y + r, 10 * H, 0.6 * H);

  ctx.translate(pivot.x + r * s.theta, pivot.y);        // rolling without slipping
  ctx.rotate(s.theta);                                  // clockwise positive
  ctx.scale(1, -1);                                     // tower space: y up
  drawBase(ctx, H, r);
  for (const c of board.values())
    if (!c.base) drawCell(ctx, H, c.i, c.j, SHAPES[c.shape].color);
  if (ghost)
    for (const [di, dj] of hand.cells)
      drawCell(ctx, H, ghost.ci + di, ghost.cj + dj, ghost.valid ? hand.color : '#d32f2f', 0.55);
}
