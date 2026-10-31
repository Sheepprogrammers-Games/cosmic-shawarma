import test from 'node:test';
import assert from 'node:assert/strict';
import { makeOrder, makeRiddleOrder } from '../src/systems/orders.js';
import { scoreOrder } from '../src/systems/scoring.js';
import { CUSTOMERS } from '../src/data.js';

const wrap = (values = {}) => ({ meat: 0, tentacle: 0, sauce: 0, pepper: 0, fries: 0, syrup: 0, ...values });
const order = (values = {}) => ({ id: 'test', wrap: wrap({ meat: 1 }), snack: null, drink: null, riddle: null, basePrice: 8, ...values });
const product = (values = {}) => ({ wrap: wrap({ meat: 1 }), snack: null, drink: null, heats: [1], friesBest: false, ...values });

function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
}

test('完全正确订单得到满分与完美奖励', () => {
  const result = scoreOrder(order(), product(), 1);
  assert.equal(result.S, 1);
  assert.equal(result.perfect, true);
  assert.equal(result.tip, 2);
});

test('缺少一项的准确度为 0.66', () => {
  assert.equal(scoreOrder(order(), product({ wrap: wrap() }), 1).A, 0.66);
});

test('多出一项的准确度为 0.75', () => {
  assert.equal(scoreOrder(order(), product({ wrap: wrap({ meat: 1, sauce: 1 }) }), 1).A, 0.75);
});

test('缺二多一时准确度不为负', () => {
  const result = scoreOrder(order({ wrap: wrap({ meat: 2, tentacle: 1 }) }), product({ wrap: wrap({ sauce: 1 }) }), 1);
  assert.ok(result.A >= 0);
});

test('无火候部件时火候分为 1', () => {
  assert.equal(scoreOrder(order({ wrap: wrap({ sauce: 1 }) }), product({ wrap: wrap({ sauce: 1 }), heats: [] }), 1).H, 1);
});

test('口碑增量覆盖满分与低分', () => {
  assert.equal(scoreOrder(order(), product(), 1).repDelta, 10);
  const low = scoreOrder(order({ wrap: wrap() }), product({ wrap: wrap({ meat: 1, sauce: 1, pepper: 1 }), heats: [] }), 0);
  assert.equal(low.S, 0.3);
  assert.ok(low.repDelta < 0);
});

test('配料完全正确时等待较久仍接单，只降低评分', () => {
  const result = scoreOrder(order(), product(), 0);
  assert.equal(result.ingredientExact, true);
  assert.equal(result.S, 0.6);
});

test('固定种子的订单可复现', () => {
  const unlocked = { stars: 1, menuC: ['C1', 'C2', 'C3'] };
  assert.deepEqual(makeOrder(18, CUSTOMERS[0], unlocked, seeded(42)), makeOrder(18, CUSTOMERS[0], unlocked, seeded(42)));
});

test('订单不包含未解锁内容', () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const made = makeOrder(30, CUSTOMERS[1], {}, seeded(seed));
    assert.equal(made.wrap.sauce, 0);
    assert.equal(made.wrap.pepper, 0);
    assert.equal(made.wrap.syrup, 0);
    assert.equal(made.snack, null);
    assert.equal(made.drink, null);
  }
});

test('火山谜语少于两个辣椒时失败', () => {
  const riddle = makeRiddleOrder('volcano', { menuC: ['C5'] }, seeded(7));
  const result = scoreOrder(riddle, product({ wrap: wrap({ pepper: 1 }), heats: [] }), 1);
  assert.equal(result.riddleOk, false);
});
