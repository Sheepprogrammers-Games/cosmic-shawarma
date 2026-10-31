import { setPaused } from '../systems/day.js';
import { DAY } from '../data.js';

const panel = typeof document === 'undefined' ? null : document.querySelector('#settle-panel');

export function show(data, onContinue = () => {}) {
  if (!panel) return;
  setPaused(true);
  const perfectRate = data.orders ? Math.round(data.perfect / data.orders * 100) : 0;
  const endless = data.mode === 'endless';
  const title = endless ? `无尽波次 ${data.day}` : `关卡 ${data.day}/${DAY.total}`;
  const unlockCopy = data.mode === 'stage' && data.day >= DAY.total ? `<p class="settle-unlock">★ ${DAY.total} 关完成！无尽模式与高级设备已解锁。</p>` : '';
  const levelCopy = data.levelUp ? `<p class="level-up-banner">等级提升！LV.${data.level}</p>` : '';
  panel.innerHTML = `<div class="dialog settle-dialog"><div class="dialog-kicker">${title} · 收摊</div><h2>${endless ? '无尽模式结算' : '关卡结算'}</h2><div class="settle-grid"><span>营业额</span><strong>${data.revenue} 星币</strong><span>完成订单</span><strong>${data.orders}</strong><span>完美率</span><strong>${perfectRate}%</strong><span>口碑变化</span><strong>${data.repDelta >= 0 ? '+' : ''}${data.repDelta}</strong><span>经验</span><strong>+${data.xpEarned || 0} XP · LV.${data.level || 1}</strong></div>${levelCopy}${unlockCopy}<button class="primary-btn" id="settle-next">${endless ? '继续无尽' : data.day >= DAY.total ? '查看通关结果' : '进入补给站'}</button></div>`;
  panel.hidden = false;
  panel.querySelector('#settle-next').addEventListener('click', () => { hide(); onContinue(); });
}

export function hide() {
  if (!panel) return;
  panel.hidden = true; panel.innerHTML = '';
  setPaused(false);
}
