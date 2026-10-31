import { CUSTOMERS, DAY, SCORING, UPGRADES_B, INSPECTOR } from '../data.js';
import { state, save } from '../core/state.js';
import { clearCustomers, customers, leave, spawn, update as updateCustomers } from '../entities/customer.js';
import { createCoin, resetBio } from '../entities/bio.js';
import { makeOrder } from './orders.js';
import { scoreOrder } from './scoring.js';
import { resetStations } from './stations.js';
import { activeBuff, awardXp, takeNextBuffs } from './progression.js';

export const dayRuntime = {
  active: false,
  paused: false,
  remaining: 0,
  duration: 0,
  spawnIn: 0,
  speed: 1,
  summary: null,
  hooks: {},
  activeBuffs: {},
};

export function dayDuration(day = state.day, shopLevel = state.shopLevel) {
  return Math.min(DAY.maxSeconds, DAY.baseSeconds + (day - 1) * DAY.perDay + (shopLevel - 1) * DAY.perShopLevel);
}

export function setDayHooks(hooks = {}) { dayRuntime.hooks = hooks; }
export function setPaused(paused) { dayRuntime.paused = paused; }
export function setDaySpeed(speed) { dayRuntime.speed = Math.max(0.1, speed); }

function unlocked() { return { stars: state.stars, menuC: state.menuC }; }

function queueCapacity() {
  const base = UPGRADES_B[state.shopLevel - 1]?.queueCap || UPGRADES_B[0].queueCap;
  return base + (state.upgradesD?.includes('D2') ? 1 : 0);
}

function rejectionReason(result) {
  const details = [];
  if (result.missing > 0) details.push(`少 ${result.missing} 项`);
  if (result.extra > 0) details.push(`多 ${result.extra} 项`);
  if (details.length) return `订单不符：${details.join('，')}`;
  if (result.W <= 0) return '顾客已等太久';
  if (result.H < 0.75) return '火候不合格';
  return '满意度不足';
}

// 取最前面的空槽，而不是按人数递增：否则前排顾客离场后
// 新顾客会拿到已被占用的编号，两人叠在同一位置。
export function nextFreeSlot() {
  const taken = new Set(customers.filter((item) => item.state !== 'LEAVING').map((item) => item.slotIndex));
  for (let index = 0; index < queueCapacity(); index += 1) {
    if (!taken.has(index)) return index;
  }
  return taken.size;
}

function spawnRegular(rng = Math.random, enterDelay = 0) {
  if (customers.filter((item) => item.state !== 'LEAVING').length >= queueCapacity()) return null;
  const def = CUSTOMERS[Math.floor(rng() * CUSTOMERS.length)];
  const slot = nextFreeSlot();
  const customer = spawn(def, slot, makeOrder(state.day, def, unlocked(), rng), { shopLevel: state.shopLevel, rng, enterDelay, patienceMul: activeBuff('patience', dayRuntime.activeBuffs) ? 1.25 : 1 });
  dayRuntime.hooks.onSpawn?.(customer);
  return customer;
}

function spawnBatch(rng = Math.random) {
  const occupied = customers.filter((item) => item.state !== 'LEAVING').length;
  const room = Math.max(0, queueCapacity() - occupied);
  if (!room) return [];
  const count = Math.min(room, 1 + Math.floor(rng() * 3));
  const batch = Array.from({ length: count }, (_, index) => spawnRegular(rng, index * 0.45)).filter(Boolean);
  dayRuntime.hooks.onBatchSpawn?.(batch);
  return batch;
}

export function startDay(options = {}) {
  clearCustomers(); resetBio(); resetStations(unlocked());
  dayRuntime.activeBuffs = takeNextBuffs();
  dayRuntime.active = true;
  dayRuntime.paused = false;
  dayRuntime.duration = dayDuration() + (activeBuff('time', dayRuntime.activeBuffs) ? 8 : 0);
  dayRuntime.remaining = dayRuntime.duration;
  dayRuntime.spawnIn = options.spawnImmediately === false ? 4 : 0;
  dayRuntime.speed = options.speed || 1;
  dayRuntime.summary = { revenue: 0, orders: 0, perfect: 0, repDelta: 0, star: 0, day: state.day };
  if (!options.noSpawn && options.spawnImmediately !== false) {
    spawnBatch(options.rng);
    // 首批入场后留出完整的营业节奏，避免下一帧又立刻补一批。
    dayRuntime.spawnIn = 4;
  }
  dayRuntime.hooks.onStart?.(dayRuntime);
  return dayRuntime;
}

export function resolveService(customer, product) {
  if (!dayRuntime.active || customer.state === 'LEAVING') return null;
  const shop = UPGRADES_B[state.shopLevel - 1];
  const inspector = INSPECTOR.find((row) => row.star === state.stars);
  const result = scoreOrder(customer.order, product, Math.max(0, 1 - customer.elapsed / customer.maxPatience), {
    shopPriceMul: shop.priceMul,
    starMul: inspector?.starMul || 1,
    customerPriceMul: customer.def.priceMul || 1,
  });
  // 配料完全正确时即使等待较久/火候评分较低也接单；等待与火候只影响
  // S、口碑和小费，避免玩家按订单制作却被“隐形条件”直接拒收。
  if (result.S < SCORING.acceptAt && !result.ingredientExact) {
    const reason = rejectionReason(result);
    result.reason = reason;
    customer.lastDelivery = { ...result, accepted: false, reason };
    customer.mood = 0;
    dayRuntime.hooks.onReject?.({ customer, result });
    return { accepted: false, result, coin: null };
  }
  customer.lastDelivery = { ...result, accepted: true };
  state.rep += result.repDelta;
  dayRuntime.summary.orders += 1;
  dayRuntime.summary.revenue += result.income;
  dayRuntime.summary.perfect += result.perfect ? 1 : 0;
  dayRuntime.summary.repDelta += result.repDelta;
  state.stats.orders += 1;
  state.stats.perfect += result.perfect ? 1 : 0;
  state.stats.revenue += result.income;
  state.stats.maxTicket = Math.max(state.stats.maxTicket, result.income);
  leave(customer, result.S >= 0.75 ? 'happy' : 'unhappy');
  const coin = createCoin(result.income, customer.x, 520, state.rep);
  dayRuntime.hooks.onServe?.({ customer, result, coin });
  return { accepted: true, result, coin };
}

export function update(dt) {
  if (!dayRuntime.active || dayRuntime.paused) return;
  const step = dt * dayRuntime.speed;
  dayRuntime.remaining = Math.max(0, dayRuntime.remaining - step);
  updateCustomers(step, (customer) => {
    const penalty = customer.def.penaltyOnTimeout || Math.abs(SCORING.timeoutRep);
    state.rep -= penalty;
    dayRuntime.summary.repDelta -= penalty;
    dayRuntime.hooks.onTimeout?.(customer);
  });
  dayRuntime.spawnIn -= step;
  if (dayRuntime.spawnIn <= 0 && dayRuntime.remaining > 3) {
    spawnBatch();
    dayRuntime.spawnIn = Math.max(2.8, 6.2 - state.day * 0.08);
  }
  if (dayRuntime.remaining <= 0) endDay();
}

export function endDay() {
  if (!dayRuntime.summary) return null;
  dayRuntime.active = false;
  clearCustomers();
  const summary = { ...dayRuntime.summary, revenue: Math.round(dayRuntime.summary.revenue), mode: state.mode || 'stage' };
  summary.xpEarned = summary.orders * 18 + summary.perfect * 12 + Math.max(0, Math.round(summary.repDelta));
  const progression = awardXp(summary.xpEarned);
  summary.level = progression.level;
  summary.levelUp = progression.levels > 0;
  if (summary.mode === 'endless') {
    state.endlessWave = Math.max(state.endlessWave || 1, summary.day + 1);
    state.endlessBest = Math.max(state.endlessBest || 0, summary.day);
    state.day += 1;
  } else {
    state.stageProgress = Math.max(state.stageProgress || 0, Math.min(DAY.total, summary.day));
    if (summary.day >= DAY.total) {
      state.stageCompleted = true;
      state.endlessUnlocked = true;
    }
    state.day = Math.min(DAY.total + 1, state.day + 1);
  }
  summary.stageProgress = state.stageProgress || 0;
  summary.endlessUnlocked = Boolean(state.endlessUnlocked);
  save();
  dayRuntime.hooks.onEnd?.(summary);
  return summary;
}

export function forceSpawn(customerId) {
  const def = CUSTOMERS.find((item) => item.id === customerId) || CUSTOMERS[0];
  return spawn(def, nextFreeSlot(), makeOrder(state.day, def, unlocked()), { shopLevel: state.shopLevel });
}
