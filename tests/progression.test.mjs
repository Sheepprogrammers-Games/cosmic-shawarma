import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

const { DAY, UPGRADES_D, TIMING } = await import('../src/data.js');
const { load, reset, state } = await import('../src/core/state.js');
const { createCoin, resetBio } = await import('../src/entities/bio.js');
const { endDay, startDay } = await import('../src/systems/day.js');
const { unlockAchievement } = await import('../src/systems/achievements.js');
const { buyD, canBuyD } = await import('../src/systems/upgrades.js');
const { pack, resetStations, roll, sliceMeat, addFromTray, stationState, update } = await import('../src/systems/stations.js');

function advance(seconds) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) update(1 / 60);
}

test('第 30 关完成后解锁无尽模式并记录关卡进度', () => {
  reset();
  state.day = DAY.total;
  startDay({ noSpawn: true });
  const summary = endDay();
  assert.equal(summary.mode, 'stage');
  assert.equal(state.stageProgress, DAY.total);
  assert.equal(state.stageCompleted, true);
  assert.equal(state.endlessUnlocked, true);
});

test('无尽模式会保存下一波次与最高波次', () => {
  reset();
  state.mode = 'endless';
  state.endlessUnlocked = true;
  state.day = 1;
  state.endlessWave = 1;
  startDay({ noSpawn: true });
  endDay();
  assert.equal(state.endlessBest, 1);
  assert.equal(state.endlessWave, 2);
});

test('无尽高级设备在通关前锁定，解锁后可购买并生效', () => {
  reset();
  state.coins = 99999;
  assert.equal(canBuyD(UPGRADES_D[0]).ok, false);
  state.endlessUnlocked = true;
  assert.equal(buyD('D1'), true);
  assert.equal(state.upgradesD.includes('D1'), true);
  resetBio();
  const coin = createCoin(10, 0, 0, 0);
  assert.equal(coin.life, TIMING.coinLife + 4);
  assert.equal(unlockAchievement('advanced_gear'), false);
});

test('相位包装器只缩短包装任务，不改变手动投递流程', () => {
  reset();
  state.endlessUnlocked = true;
  state.upgradesD = ['D3'];
  resetStations();
  sliceMeat();
  addFromTray('meat');
  assert.equal(roll(), true);
  advance(TIMING.roll + 0.1);
  assert.equal(stationState.product.rolled, true);
  assert.equal(pack(), true);
  advance(TIMING.pack * 0.7 + 0.1);
  assert.equal(stationState.product.packed, true);
});

test('旧存档会补齐模式、进度与成就字段', () => {
  memory.set('cosmic_shawarma_save_v1', JSON.stringify({ version: 1, day: 31, coins: 12, rep: 3, stars: 3, shopLevel: 1, upgradesA: [], menuC: [], inspector: {}, stats: {} }));
  load();
  assert.equal(state.stageProgress, DAY.total);
  assert.equal(state.endlessUnlocked, true);
  assert.deepEqual(state.achievements, []);
  assert.deepEqual(state.upgradesD, []);
  reset();
});
