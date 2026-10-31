import { TIMING } from '../data.js';
import { state } from '../core/state.js';
import { addExtra, addFries, addFromTray, dropFries, pack, pour, restock, roll, sliceMeat, stationState, takeCup, takeFries } from './stations.js';
import { activeBuff } from './progression.js';
import { dayRuntime } from './day.js';

const runtime = { target: null, sliceIn: 0, restockIn: {} };
const owns = (id) => state.upgradesA.includes(id);

export function setAutomationOrder(order) { runtime.target = order; }
export function clearAutomationOrder() { runtime.target = null; }
// 兼容旧调用：烤肉不再依赖火候窗口，自动切肉只检查库存。
export function bestWindow() { return owns('A3') ? TIMING.bestWindowUpgraded : TIMING.bestWindow; }
export function isAutoCoin() { return owns('A10') || activeBuff('magnet', dayRuntime.activeBuffs); }

function restockLevel() {
  if (owns('A9')) return 3;
  if (owns('A5')) return 2;
  if (owns('A1')) return 1;
  return 0;
}

function handleRestock(dt) {
  const level = restockLevel();
  if (!level) return;
  for (const [id, amount] of Object.entries(stationState.stock)) {
    runtime.restockIn[id] = (runtime.restockIn[id] || 0) - dt;
    if (amount === 0 && runtime.restockIn[id] <= 0) {
      if (restock(id)) runtime.restockIn[id] = TIMING.autoRestock[level];
    }
  }
}

function targetComplete(order) {
  return Object.entries(order.wrap).every(([id, count]) => (stationState.product.wrap[id] || 0) >= count)
    && stationState.product.snack === order.snack && stationState.product.drink === order.drink;
}

function addTargetIngredients(order) {
  for (const id of ['meat', 'tentacle', 'sauce', 'pepper']) {
    if ((stationState.product.wrap[id] || 0) < (order.wrap[id] || 0)) { addFromTray(id); return; }
  }
  if ((stationState.product.wrap.syrup || 0) < (order.wrap.syrup || 0)) { addExtra('syrup'); return; }
  if (order.snack === 'fries' && stationState.product.snack !== 'fries') {
    if (stationState.fryer.tray.length) addFries();
    else if (stationState.fryer.state === 'idle' && owns('A7')) dropFries();
    else if ((stationState.fryer.state === 'best' || stationState.fryer.state === 'ready') && owns('A7')) takeFries();
    return;
  }
  if (order.drink && stationState.product.drink !== order.drink && owns('A8')) {
    if (!stationState.drink.cup) takeCup();
    if (!stationState.drink.pouring) pour(order.drink);
    else if (stationState.drink.elapsed >= TIMING.pour) pour(order.drink);
  }
}

export function updateAutomation(dt) {
  handleRestock(dt);
  runtime.sliceIn -= dt;
  if (owns('A2') && runtime.sliceIn <= 0 && stationState.meatTray.length < TIMING.sliceTrayCap) {
    sliceMeat(); runtime.sliceIn = 0.7;
  }
  const order = runtime.target;
  if (!order || stationState.product.packed) return;
  if (owns('A4') && owns('A6')) addTargetIngredients(order);
  if (targetComplete(order)) {
    if (!stationState.product.rolled && owns('A4')) roll();
    else if (stationState.product.rolled && !stationState.product.packed && owns('A6')) pack();
  }
}
