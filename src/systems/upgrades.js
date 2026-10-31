import { UPGRADES_A, UPGRADES_B, UPGRADES_C, UPGRADES_D } from '../data.js';
import { save, state } from '../core/state.js';
import { unlockAchievement } from './achievements.js';

function owns(id) { return state.upgradesA.includes(id) || state.menuC.includes(id) || state.upgradesD?.includes(id); }

export function canBuyA(item) {
  if (state.upgradesA.includes(item.id)) return { ok: false, reason: '已安装' };
  if (item.requires && !owns(item.requires)) return { ok: false, reason: `需要 ${item.requires}` };
  if (state.coins < item.cost) return { ok: false, reason: '星币不足' };
  return { ok: true, reason: '' };
}

export function canBuyC(item) {
  if (state.menuC.includes(item.id)) return { ok: false, reason: '已解锁' };
  if (state.coins < item.cost) return { ok: false, reason: '星币不足' };
  return { ok: true, reason: '' };
}

export function canBuyShop(item) {
  if (item.level <= state.shopLevel) return { ok: false, reason: item.level === state.shopLevel ? '当前店面' : '已拥有' };
  if (item.level !== state.shopLevel + 1) return { ok: false, reason: '先升级前一级' };
  if (state.coins < item.cost) return { ok: false, reason: '星币不足' };
  return { ok: true, reason: '' };
}

export function canBuyD(item) {
  if (!state.endlessUnlocked) return { ok: false, reason: '通关关卡后解锁' };
  if (state.upgradesD?.includes(item.id)) return { ok: false, reason: '已安装' };
  if (state.coins < item.cost) return { ok: false, reason: '星币不足' };
  return { ok: true, reason: '' };
}

function purchase(item, check, apply) {
  const status = check(item);
  if (!status.ok) return false;
  state.coins -= item.cost;
  apply(); save();
  return true;
}

export function buyA(id) {
  const item = UPGRADES_A.find((entry) => entry.id === id);
  return item ? purchase(item, canBuyA, () => state.upgradesA.push(id)) : false;
}

export function buyC(id) {
  const item = UPGRADES_C.find((entry) => entry.id === id);
  if (!item) return false;
  const bought = purchase(item, canBuyC, () => state.menuC.push(id));
  if (bought && state.menuC.length >= UPGRADES_C.length) unlockAchievement('full_menu');
  return bought;
}

export function buyShop(level) {
  const item = UPGRADES_B.find((entry) => entry.level === level);
  return item ? purchase(item, canBuyShop, () => { state.shopLevel = level; }) : false;
}

export function buyD(id) {
  const item = UPGRADES_D.find((entry) => entry.id === id);
  if (!item) return false;
  const bought = purchase(item, canBuyD, () => {
    if (!Array.isArray(state.upgradesD)) state.upgradesD = [];
    state.upgradesD.push(id);
  });
  if (bought) unlockAchievement('advanced_gear');
  return bought;
}

export function buyAll() {
  for (const item of UPGRADES_C) buyC(item.id);
  for (const item of UPGRADES_A) buyA(item.id);
  for (const item of UPGRADES_B) if (item.level > 1) buyShop(item.level);
  if (state.endlessUnlocked) for (const item of UPGRADES_D) buyD(item.id);
  return state;
}
