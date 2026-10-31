import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };
const { state, reset } = await import('../src/core/state.js');
const { eventState, hitEvent, serveEventOrder, triggerEvent } = await import('../src/systems/events.js');
const { failInspection, inspectorRuntime, recordFinalOrder, startInspection } = await import('../src/systems/inspector.js');
const { bioState, forceBio, resetBio, squashRoach } = await import('../src/entities/bio.js');

test('四类事件按表创建并有完整敲打反馈', () => {
  reset();
  for (const id of ['scavenger', 'thief', 'critic']) { triggerEvent(id); hitEvent(); assert.equal(eventState.shake, 4); assert.equal(eventState.particles.length >= 6, true); eventState.particles.length = 0; }
  triggerEvent('worm'); assert.equal(eventState.active.slots, 2); for (let n = 0; n < 5; n += 1) serveEventOrder(); assert.equal(eventState.active.resolved, true);
});

test('蟑螂每日第四只不再奖励', () => {
  reset(); resetBio();
  for (let n = 0; n < 4; n += 1) { forceBio('roach'); squashRoach((value) => { state.coins += value; }); bioState.roach = null; }
  assert.equal(state.coins, 3); assert.equal(bioState.roachRewards, 3);
});

test('第 5/15 天评审与失败顺延规则', () => {
  reset(); state.day = 5; state.inspector.nextDay = 5; assert.ok(startInspection(5, () => 0));
  failInspection(); assert.equal(state.inspector.nextDay, 8);
  state.inspector.pending = 2; state.inspector.nextDay = 15; state.day = 15; assert.ok(startInspection(15, () => 0));
});

test('三星终审连续三笔普通订单达标', () => {
  reset(); state.stars = 2; state.day = 30; state.inspector.pending = 3; state.inspector.nextDay = 30; startInspection(30, () => 0);
  assert.equal(recordFinalOrder(0.95, false, false).streak, 1);
  assert.equal(recordFinalOrder(0.2, true, false).streak, 1);
  recordFinalOrder(0.96, false, false); const result = recordFinalOrder(0.97, false, false);
  assert.equal(result.passed, true); assert.equal(state.stars, 3); assert.equal(inspectorRuntime.current, null);
});
