import { save, state } from '../core/state.js';

export const ACHIEVEMENTS = [
  { id: 'first_service', name: '第一份订单', description: '完成第一份满意订单' },
  { id: 'perfect_service', name: '火候大师', description: '完成一份完美订单' },
  { id: 'rush_three', name: '三客同堂', description: '同一批迎接 3 名顾客' },
  { id: 'coin_collector', name: '台面清洁工', description: '手动拾取 10 枚星币' },
  { id: 'full_menu', name: '全菜单', description: '解锁全部菜单内容' },
  { id: 'stage_clear', name: '星门通关', description: '完成 30 个关卡日' },
  { id: 'endless_five', name: '无尽初探', description: '无尽模式坚持 5 个波次' },
  { id: 'advanced_gear', name: '量子工坊', description: '购买一件无尽模式高级设备' },
];

export function hasAchievement(id) {
  return Array.isArray(state.achievements) && state.achievements.includes(id);
}

export function unlockAchievement(id) {
  if (!ACHIEVEMENTS.some((item) => item.id === id) || hasAchievement(id)) return false;
  if (!Array.isArray(state.achievements)) state.achievements = [];
  state.achievements.push(id);
  save();
  return true;
}

export function achievementSnapshot() {
  return ACHIEVEMENTS.map((item) => ({ ...item, unlocked: hasAchievement(item.id) }));
}
