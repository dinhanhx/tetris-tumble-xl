// ui.js: menu, HUD, tray, die, handoff, result. Rebuilds the DOM only when the game state changes.
import { SHAPES, rotate, flipH, flipV } from './shapes.js';
import { height } from './board.js';
import { game, newGame, startTurn, canCancel, PRESETS } from './rules.js';
import { ghost, pick, rollAndPick, transform, commit, cancelPickUp } from './main.js';
import { view, setZoom, zoomBy, ZOOM } from './render.js';

const tray = document.querySelector('#tray');
const app = document.querySelector('#app');
const overlay = Object.assign(document.createElement('div'), { id: 'overlay' });
const live = Object.assign(document.createElement('div'), { id: 'live' });
live.setAttribute('aria-live', 'polite');

app.append(overlay, live);

const setup = { players: 1, preset: 'easy' };

const best = {
  get() { try { return +localStorage.getItem('tumble.best') || 0; } catch { return 0; } },
  set(v) { try { localStorage.setItem('tumble.best', v); } catch { /* storage unavailable */ } },
};

function el(tag, props = {}, ...kids) {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
}
const button = (content, onclick, props = {}) => el('button', { type: 'button', onclick, ...props }, ...[content].flat());
const zoomOut = button('−', () => zoomBy(1 / ZOOM.step), { title: 'Zoom out (-)' });
const zoomIn = button('+', () => zoomBy(ZOOM.step), { title: 'Zoom in (+)' });
const zoomReset = button('100%', () => setZoom(1), { title: 'Reset zoom (0)' });
const zoom = el('div', { id: 'zoom' }, zoomOut, zoomReset, zoomIn);
const hud = el('div', { id: 'hud' });
const ZOOM_KEYS = { '+': () => zoomBy(ZOOM.step), '=': () => zoomBy(ZOOM.step), '-': () => zoomBy(1 / ZOOM.step), '0': () => setZoom(1) };
addEventListener('keydown', e => { if (!e.ctrlKey && !e.metaKey && ZOOM_KEYS[e.key]) ZOOM_KEYS[e.key](); });

for (const b of [zoomOut, zoomIn, zoomReset]) b.setAttribute('aria-label', b.title.replace(/ \(.\)$/, ''));
app.prepend(el('header', { id: 'bar' }, hud, zoom));

const who = id => `Player ${id + 1}`;

function menu() {
  const choice = (key, value, text) =>
    button(text, () => { setup[key] = value; render(true); }, { className: setup[key] === value ? 'on' : '' });
  return el('div', { className: 'card' },
    el('h1', {}, 'Tumble'),
    el('h2', {}, 'Players'), el('div', { className: 'row' }, choice('players', 1, '1 player'), choice('players', 2, '2 players')),
    el('h2', {}, 'Mode'), el('div', { className: 'row' }, choice('preset', 'easy', 'Easy: pick any piece'), choice('preset', 'hard', 'Hard: roll the die')),
    el('p', {}, setup.preset === 'easy'
      ? 'Flip and placement hints on. When the pool is empty, move any piece.'
      : 'Flip and hints off. When the pool is empty, take a piece off and put it on top.'),
    button('Start', () => newGame(setup.players, PRESETS[setup.preset]), { className: 'go' }));
}

function handoff() {
  return el('div', { className: 'card' },
    el('h1', {}, `${who(game.turn)}, tap to start`),
    ...(game.players.some(p => !p.alive)
      ? [el('p', {}, `Out: ${game.players.filter(p => !p.alive).map(p => who(p.id)).join(', ')}`)] : []),
    button('Start turn', startTurn, { className: 'go' }));
}

function result() {
  const r = game.result;
  if (r.winner === undefined && r.height > best.get()) best.set(r.height);
  return el('div', { className: 'card' },
    el('h1', {}, r.winner === undefined ? 'Tower fell' : `${who(r.winner)} wins`),
    el('p', {}, r.winner === undefined
      ? `Height ${r.height} rows in ${r.moves} moves. Best: ${best.get()}.`
      : `${who(1 - r.winner)} toppled the tower.`),
    button('Play again', () => { game.phase = 'menu'; }, { className: 'go' }));
}

const stat = (value, label) => el('span', { className: 'stat' }, el('b', {}, value), ` ${label}`);
const hudItems = () => [
  el('strong', { className: 'who' }, game.players.length > 1 ? who(game.turn) : 'Solo'),
  stat(height(), 'height'), stat(game.moves, 'moves'),
  ...(game.cfg.pick === 'free' ? [] : [stat(Object.values(game.pool).reduce((a, b) => a + b, 0), 'pool')]),
];

const swatch = k => el('span', { className: 'swatch', style: `background:${SHAPES[k].color}` });

function controls() {
  const place = button('Place', commit, { id: 'place', className: 'go' });
  return [
    button('Rotate (R)', () => transform(rotate)),
    ...(game.cfg.flip ? [button('Flip H (F)', () => transform(flipH)), button('Flip V (V)', () => transform(flipV))] : []),
    place,
    ...(canCancel() ? [button('Cancel (Esc)', cancelPickUp)] : []),
  ];
}

function trayItems() {
  switch (game.phase) {
    case 'pick':
      return game.cfg.pick === 'die'
        ? [button('Roll the die', rollAndPick, { className: 'go' })]
        : Object.keys(SHAPES).map(k =>
            button([swatch(k), `${k} × ${game.pool[k]}`], () => pick(k), { disabled: game.pool[k] === 0 }));
    case 'place': return [el('span', {}, swatch(game.hand.shape), `${game.hand.shape}`), ...controls()];
    case 'settle': return [el('span', {}, 'Settling…')];
    case 'relocate': return [el('span', {}, 'Pool empty: click a piece to move it')];
    default: return [];
  }
}

const announce = () => {
  if (game.phase === 'pick' || game.phase === 'relocate') return `${game.players.length > 1 ? who(game.turn) + ': ' : ''}${game.phase === 'pick' ? 'choose a piece' : 'move a piece'}`;
  if (game.phase === 'over') return game.result.winner === undefined ? 'Tower fell' : `${who(game.result.winner)} wins`;
  return '';
};

let sig = '';
function render(force) {
  const next = JSON.stringify([game.phase, game.turn, game.moves, game.hand?.shape, game.pool, game.players, setup]);
  if (next === sig && !force) return;
  sig = next;
  const screen = { menu, handoff, over: result }[game.phase];
  overlay.replaceChildren(...(screen ? [screen()] : []));
  overlay.hidden = !overlay.childNodes.length;
  const playing = game.phase !== 'menu' && game.phase !== 'over';
  hud.replaceChildren(...(playing ? hudItems() : []));
  tray.replaceChildren(...(playing ? trayItems() : []));
  live.textContent = announce();
}

(function tick() {
  render();
  const place = document.querySelector('#place');
  if (place) place.disabled = !ghost.valid;
  zoomReset.textContent = `${Math.round(view.zoom * 100)}%`;
  zoomOut.disabled = view.zoom <= ZOOM.min;
  zoomIn.disabled = view.zoom >= ZOOM.max;
  requestAnimationFrame(tick);
})();
