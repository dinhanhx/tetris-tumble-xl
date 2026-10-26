import test from 'node:test';
import assert from 'node:assert/strict';
import { view, h, R, layout, setZoom, zoomBy, ZOOM } from '../src/render.js';

globalThis.window = { devicePixelRatio: 1 };
const canvas = (width, height) => ({ width: 0, height: 0, getBoundingClientRect: () => ({ width, height }) });

test('zoom 1 fits the stage: cell = min(width / 15, height / 16)', () => {
  layout(canvas(600, 700));
  assert.equal(view.zoom, 1);
  assert.equal(view.cell, 40);
});

test('setZoom scales the cell and keeps the tower centred and anchored to the bottom', () => {
  layout(canvas(600, 700));
  const bottom = () => view.pivot.y + R();                // rocker bottom, CSS px
  const gap = 700 - bottom();
  setZoom(2);
  assert.equal(view.cell, 80);
  assert.equal(view.pivot.x, 300);
  assert.ok(Math.abs((700 - bottom()) - gap * 2) < 1e-9, 'the margin under the rocker scales with the zoom');
  assert.ok(Math.abs(R() - 8 * h()) < 1e-9);
});

test('setZoom clamps to the allowed range', () => {
  layout(canvas(600, 700));
  assert.equal(setZoom(100), ZOOM.max);
  assert.equal(setZoom(0.001), ZOOM.min);
});

test('zoomBy multiplies the current zoom', () => {
  layout(canvas(600, 700)); setZoom(1);
  assert.equal(zoomBy(ZOOM.step), ZOOM.step);
  assert.ok(Math.abs(zoomBy(1 / ZOOM.step) - 1) < 1e-9);
});

test('the zoom survives a resize', () => {
  const c = canvas(600, 700);
  layout(c); setZoom(1.5);
  layout(canvas(300, 800));
  assert.equal(view.zoom, 1.5);
  assert.equal(view.cell, Math.min(300 / 15, 800 / 16) * 1.5);
});
