import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoin, bioState, collectCoin, resetBio, slug, updateBio } from '../src/entities/bio.js';
import { scoreOrder } from '../src/systems/scoring.js';

const wrap = { meat: 1, tentacle: 0, sauce: 0, pepper: 0, fries: 0, syrup: 0 };
const order = { wrap, snack: null, drink: null, basePrice: 8, riddle: null };
const product = { wrap, snack: null, drink: null, heats: [1], friesBest: false };

test('正确出餐生成可收取星币', () => {
  resetBio(); const score = scoreOrder(order, product, 1); let received = 0;
  const coin = createCoin(score.income, 500, 520, 0);
  assert.equal(score.S, 1); assert.equal(collectCoin(coin.id, (value) => { received += value; }), true);
  updateBio(0.1); assert.ok(received > 0); assert.equal(bioState.coins.length, 0);
});

test('超时星币被蛞蝓吞掉', () => {
  resetBio(); const coin = createCoin(10, 0, 0, 0); coin.life = 0;
  for (let tick = 0; tick < 20; tick += 1) updateBio(0.1);
  assert.equal(bioState.coins.length, 0); assert.equal(slug.target, null);
});

test('蛞蝓途中仍能抢收', () => {
  resetBio(); const coin = createCoin(10, 500, 0, 0); coin.life = 0; let received = 0;
  updateBio(0.2); assert.equal(slug.mode, 'eat');
  assert.equal(collectCoin(coin.id, (value) => { received += value; }), true); updateBio(0.1);
  assert.equal(received, 10); assert.equal(slug.target, null);
});
