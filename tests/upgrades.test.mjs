import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };
const { state, reset } = await import('../src/core/state.js');
const { UPGRADES_A, UPGRADES_C } = await import('../src/data.js');
const { buyAll } = await import('../src/systems/upgrades.js');

test('99999 星币可依次买满三条升级线', () => {
  reset(); state.coins = 99999; buyAll();
  assert.equal(state.upgradesA.length, UPGRADES_A.length);
  assert.equal(state.menuC.length, UPGRADES_C.length);
  assert.equal(state.shopLevel, 4);
  assert.ok(state.coins >= 0);
});
