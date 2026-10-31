import test from 'node:test';
import assert from 'node:assert/strict';
import { TIMING } from '../src/data.js';
import { addFromTray, discard, pack, resetStations, restock, roll, sliceMeat, stationState, update } from '../src/systems/stations.js';

function advance(seconds) { for (let time = 0; time < seconds; time += 1 / 60) update(1 / 60); }

test('手动完成肉二触须一并包装', () => {
  resetStations();
  sliceMeat(); sliceMeat();
  assert.equal(addFromTray('meat'), true); assert.equal(addFromTray('meat'), true); assert.equal(addFromTray('tentacle'), true);
  assert.equal(roll(), true); advance(TIMING.roll + 0.1); assert.equal(stationState.product.rolled, true);
  assert.equal(pack(), true); advance(TIMING.pack + 0.1); assert.equal(stationState.product.packed, true);
});

test('库存耗尽后 ARM-7 补满', () => {
  resetStations(); stationState.stock.tentacle = 0;
  assert.equal(addFromTray('tentacle'), false);
  assert.equal(restock('tentacle'), true); advance(TIMING.restock + 0.1);
  assert.equal(stationState.stock.tentacle, 10);
});

test('烤肉只检查库存，切片不再要求翻滚火候', () => {
  resetStations();
  assert.equal(sliceMeat(0), true);
  assert.equal(stationState.meatTray[0], 1);
  assert.equal(sliceMeat(0), true);
  assert.equal(sliceMeat(0), true);
  assert.equal(sliceMeat(0), false);
  addFromTray('meat'); addFromTray('meat'); addFromTray('meat');
  assert.equal(stationState.stock.meat, 0);
  assert.equal(restock('meat'), true);
  advance(TIMING.restock + 0.1);
  assert.equal(stationState.stock.meat, 3);
});

test('口器花完成张开咀嚼闭合', () => {
  resetStations(); sliceMeat(); addFromTray('meat');
  assert.equal(discard(), true); assert.equal(stationState.maw.state, 'open');
  advance(TIMING.incinerate * 0.4); assert.equal(stationState.maw.state, 'chew');
  advance(TIMING.incinerate); assert.equal(stationState.maw.state, 'closed'); assert.equal(stationState.maw.active, false);
});
