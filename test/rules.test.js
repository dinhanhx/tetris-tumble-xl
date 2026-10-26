import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from '../src/shapes.js';
import { board, place } from '../src/board.js';
import { game, newGame, PRESETS, beginPlace, onPlaced, endTurn, startTurn, pickUp, placementAllowed,
         poolEmpty, rollPiece, cancelPickUp, canCancel } from '../src/rules.js';

test('2P: topple puts the mover out, other player wins, state restored', () => {
  newGame(2, PRESETS.easy);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced();
  endTurn(false); assert.equal(game.phase, 'handoff'); assert.equal(game.turn, 1);
  startTurn(); assert.equal(game.phase, 'pick');
  assert.ok(beginPlace('T')); place(spawn('T'), 1, 4, 1, 'T'); onPlaced();
  const before = [...board.values()].length;
  endTurn(true);
  assert.equal(game.phase, 'over'); assert.deepEqual(game.result, { winner: 0 });
  assert.equal([...board.values()].length, before - 4);       // T removed again
});

test('3P: one out, game continues with the same tower', () => {
  newGame(3, PRESETS.easy);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(true);
  assert.equal(game.phase, 'handoff'); assert.equal(game.turn, 1);
  assert.equal(game.players[0].alive, false);
});

test('solo: topple ends the game with last stable height', () => {
  newGame(1, PRESETS.hard);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(false);
  assert.equal(game.phase, 'pick');
  assert.ok(beginPlace('L')); place(spawn('L'), 1, 4, 0, 'L'); onPlaced(); endTurn(true);
  assert.equal(game.phase, 'over');
  assert.equal(game.result.height, 3);
});

test('die: first roll of the game is never I while other shapes exist', () => {
  newGame(1);
  for (let n = 0; n < 500; n++) assert.notEqual(rollPiece(), 'I');
});

test('pool runs out -> relocate; hard mode only allows on-top placement', () => {
  newGame(1, PRESETS.hard, 0);
  game.pool.O = 1; game.pool.T = 1;
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(false);
  assert.equal(game.phase, 'pick');
  assert.ok(beginPlace('T')); place(spawn('T'), 1, 4, 0, 'T'); onPlaced(); endTurn(false);
  assert.ok(poolEmpty()); assert.equal(game.phase, 'relocate');
  assert.ok(pickUp([...board.values()].find(c => c.shape === 'O').pid) === null);   // O carries the T: not removable
  const hand = pickUp([...board.values()].find(c => c.shape === 'T').pid);
  assert.ok(hand); assert.equal(game.phase, 'place');
  assert.ok(!placementAllowed(hand, -4, 1));                  // valid cell, but not on top
  assert.ok(placementAllowed(hand, 1, 4));                    // back on top
  cancelPickUp(); assert.equal(game.phase, 'relocate');
  assert.equal([...board.values()].filter(c => !c.base).length, 8);
});

test('a topple while picking restores the tower as it was at the end of the last turn', () => {
  newGame(2, PRESETS.easy);
  assert.ok(beginPlace('O')); place(spawn('O'), 0, 1, 0, 'O'); onPlaced(); endTurn(false);
  startTurn();                                                // player 1 is in the pick phase
  endTurn(true);
  assert.equal([...board.values()].filter(c => !c.base).length, 4);
});

test('easy: a piece taken from the pool can be put back and a different one chosen', () => {
  newGame(1, PRESETS.easy);
  assert.ok(beginPlace('O'));
  assert.ok(canCancel());
  cancelPickUp();
  assert.equal(game.phase, 'pick'); assert.equal(game.hand, null);
  assert.equal(game.pool.O, 4);
  assert.equal(game.moves, 0);
  assert.ok(beginPlace('T'));
});

test('hard: a rolled piece cannot be cancelled (that would be a free re-roll)', () => {
  newGame(1, PRESETS.hard);
  assert.ok(beginPlace('O'));
  assert.ok(!canCancel());
  cancelPickUp();
  assert.equal(game.phase, 'place');
});

test('canCancel is false outside the place phase', () => {
  newGame(1, PRESETS.easy);
  assert.ok(!canCancel());
});
