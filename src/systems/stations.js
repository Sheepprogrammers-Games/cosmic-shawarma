import { SLOTS, TIMING } from '../data.js';
import { state } from '../core/state.js';
import { copyProduct, createProduct, productHasContent } from '../entities/item.js';

export const stationState = {
  time: 0,
  meatPhase: 0,
  meatTray: [],
  stock: {},
  locked: {},
  product: createProduct(),
  tasks: [],
  maw: { state: 'closed', elapsed: 0, active: false },
  fryer: { state: 'idle', elapsed: 0, tray: [] },
  drink: { cup: false, pouring: false, elapsed: 0, target: null },
};

function schedule(id, duration, complete) {
  if (stationState.tasks.some((task) => task.id === id)) return false;
  stationState.tasks.push({ id, left: duration, complete });
  return true;
}

export function resetStations(unlocked = {}) {
  stationState.time = 0;
  stationState.meatPhase = 0;
  stationState.meatTray.length = 0;
  stationState.stock = {};
  stationState.locked = {};
  for (const slot of SLOTS) {
    const open = !slot.unlock || slot.unlock === 'star1' ? !slot.unlock || unlocked.stars >= 1 : unlocked.menuC?.includes(slot.unlock);
    stationState.locked[slot.id] = !open;
    stationState.stock[slot.id] = open ? slot.stock : 0;
  }
  stationState.product = createProduct();
  stationState.tasks.length = 0;
  stationState.maw = { state: 'closed', elapsed: 0, active: false };
  stationState.fryer = { state: 'idle', elapsed: 0, tray: [] };
  stationState.drink = { cup: false, pouring: false, elapsed: 0, target: null };
}

export function sliceMeat(_windowRatio = TIMING.bestWindow) {
  // 烤肉现在是“有库存就能切”：不再要求玩家盯火候或翻滚。
  // 保留参数只是为了兼容自动化系统与旧存档调用，质量固定为满值。
  if (stationState.meatTray.length >= TIMING.sliceTrayCap || stationState.stock.meat <= 0) return false;
  stationState.stock.meat -= 1;
  stationState.meatTray.push(1);
  return true;
}

export function addFromTray(slotId) {
  if (stationState.product.rolled || stationState.locked[slotId]) return false;
  if (slotId === 'meat') {
    if (!stationState.meatTray.length) return false;
    stationState.product.wrap.meat += 1;
    stationState.product.heats.push(stationState.meatTray.shift());
    return true;
  }
  if (!stationState.stock[slotId]) return false;
  stationState.stock[slotId] -= 1;
  stationState.product.wrap[slotId] += 1;
  return true;
}

export function addExtra(id) {
  if (stationState.product.rolled || id !== 'syrup') return false;
  stationState.product.wrap.syrup += 1;
  return true;
}

export function roll() {
  if (stationState.product.rolled || !productHasContent(stationState.product)) return false;
  return schedule('roll', TIMING.roll, () => { stationState.product.rolled = true; });
}

export function pack() {
  if (!stationState.product.rolled || stationState.product.packed) return false;
  const duration = TIMING.pack * (state.upgradesD?.includes('D3') ? 0.7 : 1);
  return schedule('pack', duration, () => { stationState.product.packed = true; });
}

export function discard() {
  if (!productHasContent(stationState.product) || stationState.maw.active) return false;
  stationState.product = createProduct();
  stationState.maw = { state: 'open', elapsed: 0, active: true };
  return true;
}

export function restock(slotId) {
  const slot = SLOTS.find((entry) => entry.id === slotId);
  if (!slot || stationState.locked[slotId] || stationState.stock[slotId] >= slot.stock) return false;
  const duration = slotId === 'meat' && state.upgradesA?.includes('A3') ? TIMING.restock * 0.5 : TIMING.restock;
  return schedule(`restock-${slotId}`, duration, () => { stationState.stock[slotId] = slot.stock; });
}

export function dropFries() {
  if (stationState.fryer.state !== 'idle') return false;
  stationState.fryer = { ...stationState.fryer, state: 'cooking', elapsed: 0 };
  return true;
}

export function takeFries() {
  const fryer = stationState.fryer;
  if (fryer.state === 'burnt') { fryer.state = 'idle'; fryer.elapsed = 0; return false; }
  if (fryer.elapsed < TIMING.fryCook || fryer.tray.length >= TIMING.fryTrayCap) return false;
  fryer.tray.push({ best: fryer.elapsed <= TIMING.fryBestUntil, heat: fryer.elapsed <= TIMING.fryBestUntil ? 1 : 0.65 });
  fryer.state = 'idle'; fryer.elapsed = 0;
  return true;
}

export function addFries() {
  if (stationState.product.rolled || !stationState.fryer.tray.length) return false;
  const fries = stationState.fryer.tray.shift();
  stationState.product.snack = 'fries';
  stationState.product.friesBest = fries.best;
  return true;
}

export function takeCup() {
  if (stationState.drink.cup) return false;
  stationState.drink = { cup: true, pouring: false, elapsed: 0, target: null };
  return true;
}

export function pour(drinkId) {
  const drink = stationState.drink;
  if (!drink.cup) return false;
  if (!drink.pouring) {
    drink.pouring = true; drink.elapsed = 0; drink.target = drinkId;
    return true;
  }
  if (drink.target !== drinkId || drink.elapsed < TIMING.pour) return false;
  drink.pouring = false;
  stationState.product.drink = drinkId;
  stationState.drink = { cup: false, pouring: false, elapsed: 0, target: null };
  return true;
}

export function serveTo(customerId) {
  if (!stationState.product.packed) return null;
  const served = { customerId, product: copyProduct(stationState.product) };
  return served;
}

export function clearProduct() {
  stationState.product = createProduct();
}

export function update(dt) {
  stationState.time += dt;
  stationState.meatPhase = (stationState.meatPhase + dt) % TIMING.meatCyclePeriod;
  for (let index = stationState.tasks.length - 1; index >= 0; index -= 1) {
    const task = stationState.tasks[index];
    task.left -= dt;
    if (task.left <= 0) { task.complete(); stationState.tasks.splice(index, 1); }
  }
  const maw = stationState.maw;
  if (maw.active) {
    maw.elapsed += dt;
    const ratio = maw.elapsed / TIMING.incinerate;
    maw.state = ratio < 0.25 ? 'open' : ratio < 0.75 ? 'chew' : ratio < 1 ? 'closed' : 'closed';
    if (ratio >= 1) maw.active = false;
  }
  const fryer = stationState.fryer;
  if (fryer.state === 'cooking' || fryer.state === 'ready' || fryer.state === 'best') {
    fryer.elapsed += dt;
    fryer.state = fryer.elapsed >= TIMING.fryBurntAt ? 'burnt' : fryer.elapsed >= TIMING.fryBestUntil ? 'ready' : fryer.elapsed >= TIMING.fryCook ? 'best' : 'cooking';
  }
  const drink = stationState.drink;
  if (drink.pouring) {
    drink.elapsed += dt;
    if (drink.elapsed >= TIMING.pourOverflowAt) stationState.drink = { cup: false, pouring: false, elapsed: 0, target: null, overflowed: true };
  }
}

resetStations();
