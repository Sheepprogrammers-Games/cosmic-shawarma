import { PATIENCE_BASE, PATIENCE_PER_SHOP_LV } from '../data.js';

// 队列站位。最右一位压在吧台素材的右边界内，避免多出来的槽位
// 把顾客和订单气泡推到屏幕外。
const QUEUE_X0 = 410;
const QUEUE_GAP = 185;
const QUEUE_X_MAX = 1150;

export function queueX(slotIndex) {
  return Math.min(QUEUE_X_MAX, QUEUE_X0 + slotIndex * QUEUE_GAP);
}

let sequence = 0;
export const customers = [];

export function spawn(def, slotIndex, order = null, options = {}) {
  const variants = [def.id, ...(def.variants || [])];
  const item = {
    id: `customer-${sequence += 1}`,
    def,
    headId: variants[Math.floor((options.rng || Math.random)() * variants.length)],
    slotIndex,
    order,
    elapsed: 0,
    maxPatience: options.patience || PATIENCE_BASE * def.patience * (1 + (options.shopLevel || 1) * PATIENCE_PER_SHOP_LV) * (options.patienceMul || 1),
    mood: 1,
    state: 'ENTERING',
    x: 1360,
    y: 220,
    enterDelay: options.enterDelay || 0,
    lastDelivery: null,
    reason: null,
  };
  customers.push(item);
  return item;
}

export function patienceRatio(item) {
  return Math.max(0, 1 - item.elapsed / item.maxPatience);
}

export function setMood(item, mood) { item.mood = mood; }

export function leave(item, reason = 'served') {
  item.state = 'LEAVING';
  item.reason = reason;
}

export function update(dt, onTimeout = () => {}) {
  for (let index = customers.length - 1; index >= 0; index -= 1) {
    const item = customers[index];
    const targetX = queueX(item.slotIndex);
    if (item.state === 'ENTERING') {
      if (item.enterDelay > 0) {
        item.enterDelay = Math.max(0, item.enterDelay - dt);
        if (item.enterDelay > 0) {
          item.y = 218;
          continue;
        }
      }
      item.x += (targetX - item.x) * Math.min(1, dt * 10);
      if (Math.abs(item.x - targetX) < 2) item.state = 'WAITING';
    } else if (item.state === 'WAITING') {
      item.elapsed += dt;
      item.x += (targetX - item.x) * Math.min(1, dt * 7);
      if (item.elapsed >= item.maxPatience) {
        item.mood = 0;
        item.state = 'LEAVING';
        item.reason = 'timeout';
        onTimeout(item);
      }
    } else {
      item.x -= dt * 620;
      if (item.x < -180) customers.splice(index, 1);
    }
    item.y = 218 + Math.sin(item.elapsed * 3 + item.slotIndex) * 7;
  }
}

export function clearCustomers() { customers.length = 0; }
