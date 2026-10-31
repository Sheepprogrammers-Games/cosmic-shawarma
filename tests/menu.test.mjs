import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, TIMING } from '../src/data.js';
import { makeOrder } from '../src/systems/orders.js';
import { dropFries, pour, resetStations, stationState, takeCup, update } from '../src/systems/stations.js';

function advance(seconds) { for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 120) update(1 / 120); }
function seeded(seed) { let value = seed >>> 0; return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296); }

test('炸锅在 8/11/14 秒进入正确状态', () => {
  resetStations(); dropFries(); advance(TIMING.fryCook + 0.02); assert.equal(stationState.fryer.state, 'best');
  advance(TIMING.fryBestUntil - TIMING.fryCook + 0.02); assert.equal(stationState.fryer.state, 'ready');
  advance(TIMING.fryBurntAt - TIMING.fryBestUntil + 0.02); assert.equal(stationState.fryer.state, 'burnt');
});

test('饮料注液超过 2.4 秒溢出作废', () => {
  resetStations(); takeCup(); pour('soda'); advance(TIMING.pourOverflowAt + 0.02);
  assert.equal(stationState.drink.cup, false); assert.equal(stationState.drink.overflowed, true);
});

test('C1-C7 解锁内容能进入订单', () => {
  const unlocked = { stars: 1, menuC: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'] };
  const seen = new Set();
  for (let seed = 1; seed <= 1200; seed += 1) {
    const made = makeOrder(30, CUSTOMERS[1], unlocked, seeded(seed));
    if (made.wrap.pepper) seen.add('pepper'); if (made.wrap.syrup) seen.add('syrup'); if (made.snack) seen.add('fries');
    if (made.drink) seen.add(made.drink); if (made.wrap.meat > 1) seen.add('deluxe');
  }
  assert.deepEqual([...seen].sort(), ['deluxe', 'fries', 'nova', 'pepper', 'plasma', 'soda', 'syrup']);
});
