import { UPGRADES_A, UPGRADES_B, UPGRADES_C, UPGRADES_D } from '../data.js';
import { state } from '../core/state.js';
import { buyA, buyC, buyD, buyShop, canBuyA, canBuyC, canBuyD, canBuyShop } from '../systems/upgrades.js';
import { setPaused } from '../systems/day.js';
import { BUFFS, buyBuff, xpForLevel } from '../systems/progression.js';

const panel = typeof document === 'undefined' ? null : document.querySelector('#shop-panel');
let continuation = () => {};

// 面板上只出现玩家能读懂的效果说明，内部 effect/unlocks 标识不外露。
const EFFECT_TEXT = {
  'autoRestock:1': 'ARM-7 每 6 秒自动补满一格备料',
  'autoRestock:2': 'ARM-7 补货加快到每 4 秒',
  'autoRestock:3': 'ARM-7 补货加快到每 2 秒',
  autoSlice: '自动切肉装盘，只在有库存时工作',
  fastMeatRestock: '烤肉库存补货耗时减半',
  autoRoll: '配料齐了自动卷制',
  autoPack: '卷好后自动包装成品',
  autoFry: '自动下薯条并在最佳时机捞起',
  autoPour: '自动注满订单需要的饮料',
  autoCoin: '清扫机器人替你收取桌面星币',
  'drink:soda': '解锁反物质气泡水',
  'drink:nova': '解锁超新星浓缩汁',
  'drink:plasma': '解锁等离子奶昔',
  'extra:fries': '解锁陨石薯条与炸锅工位',
  'extra:syrup': '解锁星尘糖浆，评分加成 +10%',
  'slot:pepper': '开启第 4 个备料槽：反物质辣椒',
  deluxe: '订单可要求双份烤肉，单价更高',
};

function effectText(item, lane) {
  if (lane === 'B') return `售价 ×${item.priceMul} · 队列 ${item.queueCap}`;
  const key = lane === 'C' ? item.unlocks : item.effect;
  return EFFECT_TEXT[key] || key;
}

function itemButton(item, lane) {
  const check = lane === 'A' ? canBuyA(item) : lane === 'B' ? canBuyShop(item) : lane === 'C' ? canBuyC(item) : canBuyD(item);
  const id = lane === 'B' ? item.level : item.id;
  const effect = effectText(item, lane);
  return `<button class="upgrade-item" data-lane="${lane}" data-id="${id}" ${check.ok ? '' : 'disabled'}><span><b>${item.name}</b><small>${effect}</small></span><em>${check.ok ? `${item.cost} ◈` : check.reason}</em></button>`;
}

function buffButton(item) {
  const owned = state.nextBuffs?.[item.id] || 0;
  const canBuy = state.coins >= item.cost;
  return `<button class="buff-item" data-buff="${item.id}" ${canBuy ? '' : 'disabled'}><span><b>${item.name}</b><small>${item.desc}</small></span><em>${item.cost} ◈${owned ? ` · 已备 ${owned}` : ''}</em></button>`;
}

function render() {
  const need = xpForLevel(state.level);
  const xp = Math.min(need, state.xp || 0);
  panel.innerHTML = `<div class="dialog shop-dialog"><header><div><div class="dialog-kicker">过场补给站 · 余额 ${Math.round(state.coins)} ◈</div><h2>整备下一关</h2><div class="level-meter"><span>LV.${state.level}</span><i><b style="width:${xp / need * 100}%"></b></i><small>${xp}/${need} XP</small></div></div><button class="icon-btn" id="shop-close" title="继续营业" aria-label="继续营业">×</button></header><section class="buff-dock"><div class="buff-dock-head"><h3>一次性 Buff</h3><small>购买后自动用于下一关</small></div><div class="buff-grid">${BUFFS.map(buffButton).join('')}</div></section><div class="shop-columns"><section><h3>自动化 <mark>推荐</mark></h3>${UPGRADES_A.map((item) => itemButton(item, 'A')).join('')}</section><section><h3>店面</h3>${UPGRADES_B.slice(1).map((item) => itemButton(item, 'B')).join('')}</section><section><h3>菜单 <mark class="warn">会让操作变忙</mark></h3>${UPGRADES_C.map((item) => itemButton(item, 'C')).join('')}</section></div><section class="advanced-shop"><h3>无尽科技 <mark>通关解锁</mark></h3><div class="advanced-grid">${UPGRADES_D.map((item) => itemButton(item, 'D')).join('')}</div></section><button class="primary-btn" id="shop-continue">开始下一关</button></div>`;
  panel.querySelectorAll('.buff-item').forEach((button) => button.addEventListener('click', () => { buyBuff(button.dataset.buff); render(); }));
  panel.querySelectorAll('.upgrade-item').forEach((button) => button.addEventListener('click', () => {
    const lane = button.dataset.lane; const id = button.dataset.id;
    if (lane === 'A') buyA(id); else if (lane === 'B') buyShop(Number(id)); else if (lane === 'C') buyC(id); else buyD(id);
    render();
  }));
  panel.querySelector('#shop-close').addEventListener('click', close);
  panel.querySelector('#shop-continue').addEventListener('click', close);
}

function close() { hide(); continuation(); }

export function show(data = {}, onContinue = () => {}) {
  if (!panel) return;
  continuation = onContinue; setPaused(true); render(); panel.hidden = false;
}

export function hide() {
  if (!panel) return;
  panel.hidden = true; panel.innerHTML = ''; setPaused(false);
}
