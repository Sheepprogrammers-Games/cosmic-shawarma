import { save, state } from '../core/state.js';

export const BUFFS = [
  { id: 'patience', name: '引力缓释剂', desc: '下一关顾客耐心 +25%', cost: 45 },
  { id: 'time', name: '相位燃料', desc: '下一关营业时间 +8 秒', cost: 60 },
  { id: 'magnet', name: '磁场手套', desc: '下一关自动吸取掉落星币', cost: 75 },
];

export function xpForLevel(level = state.level) { return 100 + Math.max(0, level - 1) * 35; }

export function awardXp(amount) {
  let gained = Math.max(0, Math.round(amount));
  state.xp = Math.max(0, Number(state.xp) || 0) + gained;
  let levels = 0;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level += 1;
    levels += 1;
  }
  save();
  return { gained, levels, level: state.level, xp: state.xp, next: xpForLevel(state.level) };
}

export function buyBuff(id) {
  const buff = BUFFS.find((item) => item.id === id);
  if (!buff || state.coins < buff.cost) return false;
  state.coins -= buff.cost;
  if (!state.nextBuffs || typeof state.nextBuffs !== 'object') state.nextBuffs = {};
  state.nextBuffs[id] = (state.nextBuffs[id] || 0) + 1;
  save();
  return true;
}

export function takeNextBuffs() {
  const active = { ...(state.nextBuffs || {}) };
  state.nextBuffs = {};
  return active;
}

export function activeBuff(id, active) { return Number(active?.[id] || 0) > 0; }
