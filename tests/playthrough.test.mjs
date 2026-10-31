import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };

const { CUSTOMERS } = await import('../src/data.js');
const { reset, state } = await import('../src/core/state.js');
const { spawn } = await import('../src/entities/customer.js');
const { dayDuration, endDay, resolveService, startDay } = await import('../src/systems/day.js');
const { makeOrder } = await import('../src/systems/orders.js');
const { scoreOrder } = await import('../src/systems/scoring.js');
const { recordFinalOrder, resolveInspection, startInspection } = await import('../src/systems/inspector.js');

function exactProduct(order) {
  return { wrap: { ...order.wrap }, snack: order.snack, drink: order.drink, heats: Array(order.wrap.meat).fill(1), friesBest: true };
}

test('完整 30 天流程可到三星且时长落在 15-25 分钟', () => {
  reset();
  const seconds = Array.from({ length: 30 }, (_, index) => dayDuration(index + 1, 1)).reduce((sum, value) => sum + value, 0);
  assert.ok(seconds >= 15 * 60 && seconds <= 25 * 60);
  for (let day = 1; day <= 30; day += 1) {
    startDay({ noSpawn: true });
    const def = CUSTOMERS[0];
    const order = makeOrder(day, def, { stars: state.stars, menuC: state.menuC }, () => 0.25);
    const customer = spawn(def, 0, order, { shopLevel: 1, rng: () => 0 });
    resolveService(customer, exactProduct(order));
    if (day === 5 || day === 15) {
      const inspection = startInspection(day, () => 0);
      const result = scoreOrder(inspection.order, exactProduct(inspection.order), 1);
      assert.equal(resolveInspection(result).passed, true);
    }
    if (day === 30) {
      startInspection(day, () => 0);
      recordFinalOrder(0.95); recordFinalOrder(0.96);
      assert.equal(recordFinalOrder(0.97).passed, true);
    }
    endDay();
  }
  assert.equal(state.stars, 3);
  assert.equal(state.day, 31);
});
