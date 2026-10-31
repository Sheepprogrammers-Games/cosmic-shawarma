import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, SCORING } from '../src/data.js';
import { clearCustomers, customers, spawn, update } from '../src/entities/customer.js';
import { CUSTOMER_ROLE_META } from '../src/ui/counter.js';

test('三个顾客依次入队并在耐心耗尽后超时', () => {
  clearCustomers();
  for (let index = 0; index < 3; index += 1) spawn(CUSTOMERS[index], index, { wrap: {}, snack: null, drink: null }, { patience: 0.1, rng: () => 0 });
  assert.deepEqual(customers.map((item) => item.slotIndex), [0, 1, 2]);
  for (let tick = 0; tick < 20; tick += 1) update(0.1, () => {});
  assert.ok(customers.every((item) => item.reason === 'timeout' || item.x < -180));
  assert.equal(SCORING.timeoutRep, -5);
});

test('每类外星顾客都有可见的身份与操作提示', () => {
  for (const customer of CUSTOMERS) {
    const role = CUSTOMER_ROLE_META[customer.id];
    assert.ok(role, `${customer.id} 缺少身份标签`);
    assert.ok(role.label && role.hint, `${customer.id} 缺少操作提示`);
  }
});
