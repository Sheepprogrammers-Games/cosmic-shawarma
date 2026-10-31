import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

const { CUSTOMERS, SCORING } = await import('../src/data.js');
const { reset, state } = await import('../src/core/state.js');
const { bioState, collectCoin, resetBio } = await import('../src/entities/bio.js');
const { clearCustomers, customers, spawn } = await import('../src/entities/customer.js');
const { dayRuntime, resolveService, startDay, update: updateDay } = await import('../src/systems/day.js');
const { clearProduct, resetStations, serveTo, stationState } = await import('../src/systems/stations.js');

function orderWithMultipleIngredients() {
  return {
    id: 'delivery-test-order',
    wrap: { meat: 2, tentacle: 1, sauce: 0, pepper: 0, fries: 0, syrup: 0 },
    snack: null,
    drink: null,
    riddle: null,
    basePrice: 12,
  };
}

function exactProduct(order) {
  return {
    wrap: { ...order.wrap },
    snack: order.snack,
    drink: order.drink,
    heats: Array(order.wrap.meat).fill(1),
    friesBest: true,
    rolled: true,
    packed: true,
  };
}

test('营业首批随机进入 1、2 或 3 名顾客，并按延迟走入', () => {
  reset();
  for (const [rngValue, expected] of [[0, 1], [0.34, 2], [0.67, 3]]) {
    startDay({ rng: () => rngValue });
    assert.equal(customers.length, expected);
    assert.ok(customers.every((customer) => customer.x > 1280), '顾客应从屏幕外开始');
    assert.deepEqual(customers.map((customer) => customer.enterDelay), Array.from({ length: expected }, (_, index) => index * 0.45));
  }

  startDay({ rng: () => 0.67 });
  updateDay(0.46);
  assert.equal(customers[0].state, 'WAITING');
  assert.equal(customers[1].state, 'WAITING');
  assert.equal(customers[2].state, 'ENTERING');
  assert.ok(dayRuntime.spawnIn > 3.4, '首批后应等待下一批，不应下一帧补满');
});

test('低满意度投递会拒绝且不结算，合格投递才生成待拾取星币', () => {
  reset();
  resetBio();
  startDay({ noSpawn: true });
  const order = orderWithMultipleIngredients();
  const customer = spawn(CUSTOMERS[0], 0, order, { patience: 18, rng: () => 0 });
  customer.state = 'WAITING';

  const rejected = resolveService(customer, {
    wrap: { meat: 0, tentacle: 0, sauce: 0, pepper: 0, fries: 0, syrup: 0 },
    snack: null,
    drink: null,
    heats: [],
    friesBest: false,
    packed: true,
  });
  assert.equal(rejected.accepted, false);
  assert.equal(customer.state, 'WAITING');
  assert.equal(customer.lastDelivery.accepted, false);
  assert.match(rejected.result.reason, /少 3 项/);
  assert.equal(dayRuntime.summary.orders, 0);
  assert.equal(bioState.coins.length, 0);

  const accepted = resolveService(customer, exactProduct(order));
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.result.S >= SCORING.acceptAt, true);
  assert.equal(customer.state, 'LEAVING');
  assert.equal(customer.lastDelivery.accepted, true);
  assert.equal(bioState.coins.length, 1);
  const beforeCollect = state.coins;
  assert.equal(collectCoin(accepted.coin.id, (value) => { state.coins += value; }), true);
  assert.equal(state.coins, beforeCollect + accepted.coin.value);
});

test('正确配料不会因耐心耗尽前的低等待分被拒收', () => {
  reset();
  resetBio();
  startDay({ noSpawn: true });
  const order = orderWithMultipleIngredients();
  const customer = spawn(CUSTOMERS[0], 0, order, { patience: 18, rng: () => 0 });
  customer.state = 'WAITING';
  customer.elapsed = customer.maxPatience * 0.95;
  const accepted = resolveService(customer, exactProduct(order));
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.result.ingredientExact, true);
});

test('serveTo 只复制成品，只有确认满意后才清空包装台', () => {
  resetStations();
  stationState.product = exactProduct(orderWithMultipleIngredients());
  const served = serveTo('customer-1');
  assert.ok(served);
  assert.equal(stationState.product.packed, true);
  clearProduct();
  assert.equal(stationState.product.packed, false);
});
