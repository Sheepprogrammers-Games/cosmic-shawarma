import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

const { DROP_ZONE, findDropTarget, isTapNotDrag, isWormDropTarget } = await import('../src/systems/delivery.js');
const { beginFrame, dragZone, inputTest } = await import('../src/core/input.js');
const { reset } = await import('../src/core/state.js');
const { customers, leave, queueX } = await import('../src/entities/customer.js');
const { forceSpawn, startDay } = await import('../src/systems/day.js');

function waiting(id, x) {
  return { id, x, state: 'WAITING' };
}

test('成品只在等待顾客的头肩范围内才判定命中', () => {
  const queue = [waiting('a', 410), waiting('b', 780)];
  const mid = (DROP_ZONE.top + DROP_ZONE.bottom) / 2;

  assert.equal(findDropTarget(queue, { x: 410, y: mid })?.id, 'a');
  assert.equal(findDropTarget(queue, { x: 780, y: mid })?.id, 'b');
  // 两位顾客之间的空隙不算命中
  assert.equal(findDropTarget(queue, { x: 595, y: mid }), null);
  // 吧台之下与 HUD 之上都不接收
  assert.equal(findDropTarget(queue, { x: 410, y: DROP_ZONE.bottom + 20 }), null);
  assert.equal(findDropTarget(queue, { x: 410, y: DROP_ZONE.top - 20 }), null);
  // 边界包含
  assert.equal(findDropTarget(queue, { x: 410 + DROP_ZONE.halfWidth, y: DROP_ZONE.top })?.id, 'a');
});

test('正在入场或离场的顾客不接收成品', () => {
  const mid = (DROP_ZONE.top + DROP_ZONE.bottom) / 2;
  assert.equal(findDropTarget([{ id: 'x', x: 410, state: 'ENTERING' }], { x: 410, y: mid }), null);
  assert.equal(findDropTarget([{ id: 'x', x: 410, state: 'LEAVING' }], { x: 410, y: mid }), null);
});

test('重叠时后入场的顾客先接收', () => {
  const queue = [waiting('front', 500), waiting('back', 520)];
  const mid = (DROP_ZONE.top + DROP_ZONE.bottom) / 2;
  assert.equal(findDropTarget(queue, { x: 510, y: mid }).id, 'back');
});

test('虫洞蠕虫按自身范围接收，已结算后不再接收', () => {
  const worm = { def: { id: 'worm' }, x: 880, y: 205, resolved: false };
  assert.equal(isWormDropTarget(worm, { x: 880, y: 205 }), true);
  assert.equal(isWormDropTarget(worm, { x: 880, y: 400 }), false);
  assert.equal(isWormDropTarget({ ...worm, resolved: true }, { x: 880, y: 205 }), false);
  assert.equal(isWormDropTarget({ ...worm, def: { id: 'thief' } }, { x: 880, y: 205 }), false);
  assert.equal(isWormDropTarget(null, { x: 880, y: 205 }), false);
});

test('原地按下松手识别为点击而非拖拽', () => {
  assert.equal(isTapNotDrag({ x: 772, y: 540 }, { x: 774, y: 543 }), true);
  assert.equal(isTapNotDrag({ x: 772, y: 540 }, { x: 772, y: 300 }), false);
});

test('前排顾客离场后新顾客补空位，不会与在场顾客同槽重叠', () => {
  reset();
  startDay({ noSpawn: true });
  const first = forceSpawn('crystal');
  const second = forceSpawn('astronaut');
  first.slotIndex = 0;
  second.slotIndex = 1;
  first.state = 'WAITING';
  second.state = 'WAITING';

  leave(first, 'served');
  const third = forceSpawn('octopus');
  third.state = 'WAITING';

  const active = customers.filter((item) => item.state !== 'LEAVING');
  const slots = active.map((item) => item.slotIndex);
  assert.equal(new Set(slots).size, slots.length, `在场顾客槽位不应重复：${slots}`);
  assert.equal(third.slotIndex, 0, '新顾客应补到最前面的空位');
});

test('队列站位始终留在吧台可见范围内，订单气泡不会被推出屏幕', () => {
  assert.equal(queueX(0), 410);
  assert.equal(queueX(4), 1150);
  // 多出来的槽位压在最右一位，不允许越过 1280 的画面右边
  for (const slot of [5, 6, 9]) {
    assert.equal(queueX(slot), 1150);
    assert.ok(queueX(slot) + 91 <= 1280, `槽位 ${slot} 的气泡右缘应留在画面内`);
  }
});

test('拖拽热区按按下、移动、松手顺序回调，并带上逻辑坐标', () => {
  beginFrame();
  const seen = [];
  dragZone('deliver', { x: 630, y: 430, w: 284, h: 215 }, 40, {
    onStart: (point) => seen.push(['start', point.x, point.y]),
    onMove: (point) => seen.push(['move', point.x, point.y]),
    onEnd: (point) => seen.push(['end', point.x, point.y]),
  });

  const target = inputTest.zones.find((item) => item.id === 'deliver');
  assert.ok(target?.drag, '投递热区应注册为拖拽区');
  target.drag.onStart({ x: 772, y: 540 });
  target.drag.onMove({ x: 700, y: 400 });
  target.drag.onEnd({ x: 410, y: 300 });
  assert.deepEqual(seen, [['start', 772, 540], ['move', 700, 400], ['end', 410, 300]]);
});
