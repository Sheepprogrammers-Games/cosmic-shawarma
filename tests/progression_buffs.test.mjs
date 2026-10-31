import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };
const { state, reset } = await import('../src/core/state.js');
const { awardXp, buyBuff, takeNextBuffs, xpForLevel } = await import('../src/systems/progression.js');

test('关卡结算经验可以升级', () => {
  reset();
  const result = awardXp(xpForLevel(1));
  assert.equal(result.level, 2);
  assert.equal(state.level, 2);
});

test('过场补给站购买的 Buff 会留到下一关并在开始时取出', () => {
  reset(); state.coins = 100;
  assert.equal(buyBuff('time'), true);
  assert.equal(state.nextBuffs.time, 1);
  assert.deepEqual(takeNextBuffs(), { time: 1 });
  assert.deepEqual(state.nextBuffs, {});
});
