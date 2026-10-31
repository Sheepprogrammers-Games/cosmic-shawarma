import { reset, state } from '../core/state.js';
import { setPaused } from '../systems/day.js';

const panel = typeof document === 'undefined' ? null : document.querySelector('#headline-panel');

const ENDINGS = {
  3: ['三星照亮星门', '虫洞两端排起了队，你的星际卷饼成为航线上的新招牌。'],
  2: ['二星名店留在星门', '评审认可你的手艺，只是最后三单仍差了一点宇宙级稳定。'],
  1: ['一颗星照亮摊位', '小摊被正式写进星级指南，下一卷也许会轮到更远的航站。'],
  0: ['无星，但炉火未熄', '评审离开了，熟客还在。回收花打了个嗝，明天照常营业。'],
};

async function share(canvas) {
  if (!canvas?.toBlob) return;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) return;
  const file = new File([blob], 'cosmic-shawarma.jpg', { type: 'image/jpeg' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: ENDINGS[state.stars][0], files: [file] });
  else {
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); URL.revokeObjectURL(link.href);
  }
}

export function show(data = {}, options = {}) {
  if (!panel) return;
  setPaused(true);
  const stars = Math.max(0, Math.min(3, data.stars ?? state.stars));
  const [title, copy] = ENDINGS[stars];
  const stats = data.stats || state.stats;
  const perfectRate = stats.orders ? Math.round(stats.perfect / stats.orders * 100) : 0;
  const restartLabel = options.restartLabel || '再来一局';
  panel.innerHTML = `<article class="headline"><header><span>THE GALACTIC DINING GUIDE</span><b>银河餐饮指南</b></header><div class="headline-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><h2>${title}</h2><p>${copy}</p><div class="headline-stats"><span>总营业额<strong>${Math.round(stats.revenue)}</strong></span><span>总订单<strong>${stats.orders}</strong></span><span>完美率<strong>${perfectRate}%</strong></span><span>最高单价<strong>${Math.round(stats.maxTicket)}</strong></span><span>营业天数<strong>${Math.min(30, data.days || state.day)}</strong></span></div><footer><button class="secondary-btn" id="headline-share">分享截图</button><button class="primary-btn" id="headline-restart">${restartLabel}</button></footer></article>`;
  panel.hidden = false;
  panel.querySelector('#headline-share').addEventListener('click', () => share(options.canvas));
  panel.querySelector('#headline-restart').addEventListener('click', () => { if (options.resetOnRestart !== false) reset(); hide(); options.onRestart?.(); });
}

export function hide() {
  if (!panel) return;
  panel.hidden = true; panel.innerHTML = ''; setPaused(false);
}
