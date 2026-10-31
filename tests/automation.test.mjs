import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };
const { state, reset } = await import('../src/core/state.js');
const { UPGRADES_A, TIMING } = await import('../src/data.js');
const { bestWindow, isAutoCoin, setAutomationOrder, updateAutomation } = await import('../src/systems/automation.js');
const { resetStations, stationState, update } = await import('../src/systems/stations.js');

test('A 线全满后按目标订单自动包装', () => {
  reset(); state.upgradesA = UPGRADES_A.map((item) => item.id);
  resetStations({ stars: 1, menuC: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'] });
  setAutomationOrder({ wrap: { meat: 1, tentacle: 1, sauce: 0, pepper: 0, fries: 0, syrup: 0 }, snack: null, drink: null });
  for (let tick = 0; tick < 500 && !stationState.product.packed; tick += 1) { updateAutomation(1 / 60); update(1 / 60); }
  assert.equal(stationState.product.packed, true);
  assert.equal(bestWindow(), TIMING.bestWindowUpgraded);
  assert.equal(isAutoCoin(), true);
});
