import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };

const { state, reset, load } = await import('../src/core/state.js');
const { dayDuration, dayRuntime, endDay, setPaused, startDay, update: updateDay } = await import('../src/systems/day.js');

test('连续三日倒计时逐日增加并从第四日续档', () => {
  reset(); const durations = [];
  for (let day = 0; day < 3; day += 1) { durations.push(dayDuration()); startDay({ noSpawn: true }); endDay(); }
  assert.deepEqual(durations, [32, 33, 34]);
  assert.equal(state.day, 4);
  state.day = 1; load(); assert.equal(state.day, 4);
});

test('营业菜单暂停时冻结倒计时，继续后恢复', () => {
  reset();
  startDay({ noSpawn: true });
  const before = dayRuntime.remaining;
  setPaused(true);
  updateDay(1);
  assert.equal(dayRuntime.remaining, before);
  setPaused(false);
  updateDay(1);
  assert.equal(dayRuntime.remaining, before - 1);
  endDay();
});
