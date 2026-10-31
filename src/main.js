import { BIO, CUSTOMERS, DAY, LOGICAL, PALETTE, SLOTS, TIMING } from './data.js';
import { createEngine } from './core/engine.js';
import { img, load as loadAssets } from './core/assets.js';
import { beginFrame, bindPointer, circleZone, dragZone, zone } from './core/input.js';
import { sprite } from './core/render.js';
import { load, save, state } from './core/state.js';
import { bgm, setMuted, sfx, unlock, voice } from './core/audio.js';
import { customers, spawn } from './entities/customer.js';
import { bioState, collectCoin, forceBio, jelly, resetBio, slug, squashRoach, updateBio } from './entities/bio.js';
import { clearAutomationOrder, isAutoCoin, setAutomationOrder, updateAutomation } from './systems/automation.js';
import { dayRuntime, forceSpawn, nextFreeSlot, resolveService, setDayHooks, setDaySpeed, startDay, update as updateDay } from './systems/day.js';
import { eventState, hitEvent, maybeEvent, serveEventOrder, setEventHooks, triggerEvent, updateEvents } from './systems/events.js';
import { inspectorRuntime, recordFinalOrder, resolveInspection, startInspection } from './systems/inspector.js';
import { buyAll } from './systems/upgrades.js';
import { addExtra, addFries, addFromTray, clearProduct, discard, dropFries, pack, pour, restock, roll, serveTo, sliceMeat, stationState, takeCup, takeFries, update as updateStations } from './systems/stations.js';
import { CUSTOMER_ROLE_META, drawCounterBase, drawHeldProduct, drawQueue, drawStations, setHeldProduct, showHint, stationFeedback } from './ui/counter.js';
import { findDropTarget, isTapNotDrag, isWormDropTarget } from './systems/delivery.js';
import { mountHud, updateHud } from './ui/hud.js';
import { show as showSettle } from './ui/settle.js';
import { show as showShop } from './ui/shop.js';
import { show as showHeadline } from './ui/headline.js';
import { show as showMenu } from './ui/menu.js';
import { hide as hideGameMenu, toggle as toggleGameMenu, togglePause as toggleGamePause } from './ui/game-menu.js';
import { unlockAchievement } from './systems/achievements.js';
import { IMAGE_MANIFEST } from './assets-manifest.js';

const canvas = document.querySelector('#game-canvas');
const hint = document.querySelector('#landscape-hint');
const hud = document.querySelector('#hud');
const ctx = canvas.getContext('2d', { alpha: false });
const stars = Array.from({ length: 54 }, (_, index) => ({ x: (index * 233) % LOGICAL.w, y: 70 + (index * 97) % 220, r: 1 + (index % 3) }));
const view = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };
const deliveryDrag = { active: false, x: 772, y: 540, startX: 772, startY: 540 };
const AUDIO_MANIFEST = { bgm_menu: 'assets/audio/银河沙威玛.mp3' };
let engine;
let hudClock = 0;
let assetsReady = false;
let queuedMode = null;
const seenCustomerRoles = new Set();

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  view.scale = Math.min(vw / LOGICAL.w, vh / LOGICAL.h);
  view.offsetX = (vw - LOGICAL.w * view.scale) / 2;
  view.offsetY = (vh - LOGICAL.h * view.scale) / 2;
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${vw}px`; canvas.style.height = `${vh}px`;
  canvas.width = Math.round(vw * view.dpr); canvas.height = Math.round(vh * view.dpr);
  hud.style.width = `${Math.min(vw, LOGICAL.w * view.scale)}px`;
  hud.style.top = `${view.offsetY}px`;
  const portrait = vh > vw;
  hint.hidden = !portrait;
  if (engine) { if (portrait) engine.stop(); else engine.start(); }
}

function toLogical(clientX, clientY) {
  return { x: (clientX - view.offsetX) / view.scale, y: (clientY - view.offsetY) / view.scale };
}

function pulse(name, action, sound = 'sfx_add') {
  const result = action();
  sfx(result === false || result == null ? 'sfx_deny' : sound);
  if (result !== false && result != null) stationFeedback(name);
  return result;
}

const actions = {
  slice: () => pulse('slice', () => sliceMeat(), 'sfx_slice'),
  addMeat: () => pulse('meat', () => addFromTray('meat')),
  addSlot: (id) => pulse(id, () => addFromTray(id), id === 'tentacle' ? 'sfx_tentacle' : id === 'pepper' ? 'sfx_pepper_pop' : 'sfx_add'),
  syrup: () => pulse('syrup', () => addExtra('syrup'), 'sfx_pour'),
  roll: () => pulse('roll', roll, 'sfx_roll'),
  pack: () => pulse('pack', pack, 'sfx_pack'),
  discard: () => {
    const result = pulse('discard', discard, 'sfx_maw_chew');
    showHint(result ? '已送入回收站 · 可以重新做一份' : '回收站只接受未完成的卷饼');
    return result;
  },
  restock: () => pulse('restock', () => {
    const slot = SLOTS.find((item) => !stationState.locked[item.id] && stationState.stock[item.id] < item.stock);
    return slot ? restock(slot.id) : false;
  }, 'sfx_upgrade'),
  fry: () => pulse('fry', () => stationState.fryer.state === 'idle' ? dropFries() : takeFries(), stationState.fryer.state === 'burnt' ? 'sfx_burnt' : 'sfx_add'),
  addFries: () => pulse('fries', addFries, 'sfx_add'),
  drink: (id) => pulse(id, () => { if (!stationState.drink.cup) takeCup(); return pour(id); }, 'sfx_pour'),
};

function activeCustomer() { return customers.find((item) => item.state !== 'LEAVING' && !item.def.id.startsWith('inspector_')); }

function beginDelivery(point) {
  if (!stationState.product.packed) return false;
  deliveryDrag.active = true;
  deliveryDrag.x = point.x;
  deliveryDrag.y = point.y;
  deliveryDrag.startX = point.x;
  deliveryDrag.startY = point.y;
  setHeldProduct(deliveryDrag);
  return true;
}

function moveDelivery(point) {
  if (!deliveryDrag.active) return;
  deliveryDrag.x = point.x;
  deliveryDrag.y = point.y;
}

function endDelivery(point) {
  if (!deliveryDrag.active) return;
  deliveryDrag.active = false;
  setHeldProduct(null);
  // 虫洞事件也是拖放交付，不再通过点击成品直接结算。
  if (isWormDropTarget(eventState.active, point)) {
    if (serveTo('worm') && serveEventOrder()) {
      clearProduct();
      clearAutomationOrder();
      sfx('sfx_serve');
    } else {
      sfx('sfx_deny');
      stationFeedback('reject');
    }
    return;
  }
  const customer = findDropTarget(customers, point);
  if (!customer) {
    sfx('sfx_deny');
    stationFeedback('reject');
    showHint(isTapNotDrag({ x: deliveryDrag.startX, y: deliveryDrag.startY }, point)
      ? '按住成品拖到顾客头顶'
      : '这里没有顾客，拖到顾客身上');
    return;
  }
  serveCustomer(customer);
}

function markStageComplete() {
  state.stageProgress = DAY.total;
  state.stageCompleted = true;
  state.endlessUnlocked = true;
  save();
  unlockAchievement('stage_clear');
}

function serveCustomer(customer) {
  const served = serveTo(customer.id);
  if (!served) { sfx('sfx_deny'); return; }
  const outcome = resolveService(customer, served.product);
  if (!outcome) {
    sfx('sfx_deny');
    showHint(customer.state === 'LEAVING' ? '顾客正在离场，无法接单' : '当前营业已结束');
    return;
  }
  if (!outcome.accepted) {
    sfx('sfx_angry');
    stationFeedback('reject');
    showHint(outcome.result.reason || '顾客不满意，按订单重做');
    return;
  }
  clearProduct();
  clearAutomationOrder(); sfx('sfx_serve');
  if (outcome.result.perfect) sfx('sfx_perfect');
  if (customer.def.id.startsWith('inspector_')) resolveInspection(outcome.result);
  else if (inspectorRuntime.current?.target.star === 3) {
    const final = recordFinalOrder(outcome.result.S, false, false, outcome.result.riddleOk);
    if (final?.passed) {
      markStageComplete();
      showHeadline({ stars: 3, days: 30 }, { canvas, restartLabel: '返回主菜单', resetOnRestart: false, onRestart: returnToMenu });
    }
  }
}

function returnToMenu() {
  hideGameMenu({ resume: false });
  showMenu({ onStart: startMode });
  playMenuMusic();
}

function playMenuMusic() {
  // 先在当前点击栈中同步触发 HTML 音频，绕过浏览器 autoplay 策略；
  // 即使图片仍在加载也可以先启动 HTML 音频，避免“加载完自动进游戏”时
  // 已经错过用户手势；WebAudio 解锁随后异步进行，仅负责音效总线。
  bgm('bgm_menu');
  unlock().catch(() => {});
}

function playGameplayMusic() {
  // 继续使用真实主题曲，不调用缺失音轨的合成器回退；同步调用确保从菜单
  // 点击“开始营业”时能通过用户手势播放，且同一首曲目不会重播。
  bgm('bgm_menu');
  unlock().then(() => bgm('bgm_menu')).catch(() => {});
}

function startMode(mode = 'stage') {
  if (!assetsReady) {
    queuedMode = mode;
    return false;
  }
  if (mode === 'endless' && !state.endlessUnlocked) return false;
  state.mode = mode;
  if (mode === 'stage') {
    // 关卡通关后再次开始时，从第 1 关重玩，但保留已解锁的无尽模式与成就。
    if (state.day > DAY.total || state.stageCompleted) {
      state.day = 1;
      state.stars = 0;
      state.rep = 0;
      state.inspector = { pending: 1, retries: 0, nextDay: 5, usedRiddles: [] };
    }
  } else {
    state.day = Math.max(1, state.endlessWave || 1);
  }
  save();
  beginDay();
  return true;
}

function beginDay() {
  startDay();
  if (state.mode !== 'endless') {
    const inspection = startInspection();
    if (inspection) spawn(inspection.def, nextFreeSlot(), inspection.order, { shopLevel: state.shopLevel, enterDelay: customers.length * 0.45 });
  }
  maybeEvent(state.day);
  playGameplayMusic();
}

function update(dt) {
  if (!dayRuntime.paused) {
    updateStations(dt);
    const first = activeCustomer();
    if (first) setAutomationOrder(first.order);
    updateAutomation(dt);
    updateDay(dt);
    updateBio(dt, { autoCoin: isAutoCoin(), onCollect: (value) => { state.coins += value; sfx('sfx_coin'); } });
    updateEvents(dt);
  }
  hudClock += dt;
  if (hudClock >= 0.08) {
    hudClock = 0;
    updateHud({ coins: state.coins, rep: state.rep, day: state.mode === 'endless' ? state.day : Math.min(DAY.total, state.day), mode: state.mode, stars: state.stars, remaining: dayRuntime.remaining, timeRatio: dayRuntime.duration ? dayRuntime.remaining / dayRuntime.duration : 0, paused: dayRuntime.paused });
  }
}

function drawBackground() {
  ctx.drawImage(img(`bg_shop_lv${state.shopLevel}`), 0, 0, LOGICAL.w, LOGICAL.h);
  ctx.fillStyle = 'rgba(3,12,14,0.28)';
  ctx.fillRect(0, 64, LOGICAL.w, 300);
  ctx.fillStyle = 'rgba(4,20,21,0.76)';
  ctx.strokeStyle = PALETTE.neonCyan;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(34, 80); ctx.lineTo(252, 80); ctx.lineTo(272, 100); ctx.lineTo(272, 132); ctx.lineTo(54, 132); ctx.lineTo(34, 112); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.neonCyan;
  ctx.font = '800 9px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('STARPORT // 03', 52, 98);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '900 17px -apple-system, sans-serif';
  ctx.fillText('虫洞卷饼摊', 52, 119);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(235, 89, 18, 2);
  ctx.fillStyle = 'rgba(114,231,194,0.6)';
  ctx.fillRect(1194, 93, 52, 2);
  ctx.fillRect(1215, 100, 31, 2);
  ctx.textAlign = 'left';
}

function drawJelly() {
  const x = 1210;
  const y = jelly.y + 78;
  sprite(ctx, 'bio_jelly', x, y, { anchor: { x: 0.5, y: 0.5 }, scale: 0.3, alpha: 0.7 + jelly.glow * 0.3, rot: Math.sin(stationState.time * 1.4) * 0.03 });
  ctx.save();
  ctx.fillStyle = 'rgba(4,15,17,0.78)';
  ctx.strokeStyle = PALETTE.neonCyan;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - 58, y + 67, 116, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PALETTE.text; ctx.font = '800 9px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('水母 // 操作提示', x, y + 78);
  ctx.restore();
  circleZone('jelly-guide', { x, y, r: 72 }, 18, () => {
    const customer = activeCustomer();
    const role = CUSTOMER_ROLE_META[customer?.def?.id];
    showHint(role ? `${role.label}：${role.hint}` : '水母照明：点击顾客标签或订单气泡查看提示', 4.2);
  });
}

function drawCoins() {
  for (const coin of bioState.coins) {
    if (coin.claimed) continue;
    const bob = Math.sin(stationState.time * 5 + coin.x) * 5;
    const x = coin.x;
    const y = coin.y + bob;
    const urgency = Math.min(1, coin.age / Math.max(1, coin.life));
    ctx.save();
    // 金币不是一粒小圆点：用外发光、厚边和高光让它在复杂背景上始终可见。
    ctx.globalAlpha = 0.26 + Math.sin(stationState.time * 7 + coin.x) * 0.06;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const gradient = ctx.createRadialGradient(x - 8, y - 10, 4, x, y, 27);
    gradient.addColorStop(0, '#FFF4A8'); gradient.addColorStop(0.35, PALETTE.gold); gradient.addColorStop(1, '#D98416');
    ctx.fillStyle = gradient; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#FFF4A8'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(x, y, 18, Math.PI * 1.08, Math.PI * 1.76); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.ink; ctx.font = '900 16px ui-monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(coin.value), x, y + 1);
    ctx.font = '900 10px -apple-system, sans-serif'; ctx.fillStyle = PALETTE.text; ctx.globalAlpha = 0.95;
    ctx.fillText('点击收取', x, y + 42);
    ctx.strokeStyle = urgency > 0.75 ? PALETTE.alert : PALETTE.gold; ctx.globalAlpha = 0.9; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - urgency)); ctx.stroke();
    ctx.restore();
    circleZone(coin.id, { x, y, r: 50 }, 30, () => collectCoin(coin.id, (value) => {
      state.coins += value;
      state.stats.coinsCollected = (state.stats.coinsCollected || 0) + 1;
      if (state.stats.coinsCollected >= 10) unlockAchievement('coin_collector');
      sfx('sfx_coin');
    }));
  }
}

function drawPlayfieldChrome() {
  ctx.save();
  // 分区标题只做轻量标记，不再绘制贯穿场景的实心横条；顾客和食材保持可见。
  const labels = [['QUEUE', 42, '顾客订单'], ['LOADOUT', 480, '备料区'], ['ASSEMBLY', 734, '卷制与包装'], ['AUX', 1073, '炸锅 / 饮料']];
  labels.forEach(([code, x, name], index) => {
    if (index) {
      ctx.strokeStyle = 'rgba(114,231,194,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 22, 341); ctx.lineTo(x - 22, 354); ctx.stroke();
    }
    ctx.shadowColor = 'rgba(0,0,0,0.72)'; ctx.shadowBlur = 5;
    ctx.fillStyle = 'rgba(114,231,194,0.82)'; ctx.font = '800 8px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillText(code, x, 344);
    ctx.fillStyle = 'rgba(232,248,240,0.72)'; ctx.font = '800 10px -apple-system, sans-serif'; ctx.fillText(name, x, 356);
  });
  ctx.restore();
}

function drawSlugAndRoach() {
  if (slug.mode !== 'idle') {
    for (const trail of bioState.slimeTrails) { ctx.globalAlpha = Math.max(0, 1 - trail.age); ctx.fillStyle = PALETTE.neonCyan; ctx.beginPath(); ctx.ellipse(trail.x, trail.y + 22, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 0.9; sprite(ctx, 'bio_slug', slug.x, slug.y + 28, { anchor: { x: 0.5, y: 0.5 }, scale: 0.4, flipX: slug.mode === 'retreat' }); ctx.globalAlpha = 1;
  }
  const roach = bioState.roach;
  if (roach) {
    sprite(ctx, 'bio_roach', roach.x, roach.y, { anchor: { x: 0.5, y: 0.5 }, scale: 0.52, rot: roach.squashed ? Math.PI / 2 : 0 });
    circleZone('roach', { x: roach.x, y: roach.y, r: 44 }, 40, () => { squashRoach((value) => { state.coins += value; }); sfx('sfx_squish'); });
  }
}

function drawEvent() {
  const active = eventState.active;
  if (active) {
    sprite(ctx, `head_${active.def.id}`, active.x, active.y, { anchor: { x: 0.5, y: 0.5 }, scale: active.def.id === 'worm' ? 0.35 : 0.42 });
    const eventHelp = {
      scavenger: `点击处理干扰客 ${active.tapsLeft} 次`,
      thief: `处理捣蛋客 · ${Math.ceil(Math.max(0, 12 - active.elapsed))}s`,
      critic: `保持冷静 · ${Math.ceil(Math.max(0, active.charge))}s`,
      worm: `拖成品交付 · 剩余 ${active.ordersLeft} 单`,
    }[active.def.id];
    if (eventHelp) {
      ctx.save();
      ctx.fillStyle = 'rgba(4,15,17,0.86)';
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(active.x - 102, active.y - 92, 204, 25, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PALETTE.text; ctx.font = '800 10px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(eventHelp, active.x, active.y - 79);
      ctx.restore();
    }
    // 普通事件仍是点击处理；特殊订单必须把包装好的成品拖到访客头上。
    if (active.def.id !== 'worm') {
      circleZone('event-active', { x: active.x, y: active.y, r: 72 }, 45, () => hitEvent());
    }
  }
  for (const p of eventState.particles) { ctx.globalAlpha = Math.max(0, 1 - p.age * 2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PALETTE.void; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, view.offsetX * view.dpr, view.offsetY * view.dpr);
  if (eventState.shake > 0) ctx.translate((Math.random() - 0.5) * eventState.shake * 2, (Math.random() - 0.5) * eventState.shake * 2);
  beginFrame(); drawBackground(); drawJelly();
  drawQueue(ctx, customers.filter((item) => item.state !== 'LEAVING'));
  drawCounterBase(ctx);
  drawPlayfieldChrome();
  drawStations(ctx, zone, actions, { stars: state.stars, menuC: state.menuC, upgradesA: state.upgradesA });
  if (stationState.product.packed && !deliveryDrag.active) {
    dragZone('deliver-product', { x: 630, y: 430, w: 284, h: 215 }, 40, { onStart: beginDelivery, onMove: moveDelivery, onEnd: endDelivery });
  }
  drawHeldProduct(ctx);
  drawCoins(); drawSlugAndRoach(); drawEvent();
}

function makeSilhouette() {
  const output = document.createElement('canvas'); output.width = 512; output.height = 256;
  const out = output.getContext('2d'); out.fillStyle = '#fff'; out.fillRect(0, 0, output.width, output.height); out.fillStyle = '#222';
  const shapes = ['meat', 'tentacle', 'sauce', 'pepper', 'fries', 'syrup', 'cup', 'maw'];
  shapes.forEach((name, index) => { const x = (index % 4) * 128 + 64; const y = Math.floor(index / 4) * 128 + 56; out.beginPath(); out.ellipse(x, y, 24 + index * 2, 38 - index, index * 0.2, 0, Math.PI * 2); out.fill(); out.fillStyle = '#555'; out.font = '14px sans-serif'; out.textAlign = 'center'; out.fillText(name, x, y + 58); out.fillStyle = '#222'; });
  return output.toDataURL('image/png');
}

async function init() {
  load();
  // 先挂载菜单与 HUD，再等待图片。这样首次打开不会出现“只有黑屏”的错觉。
  mountHud(setMuted, () => toggleGameMenu({ onHome: returnToMenu }), () => toggleGamePause());
  showMenu({ onStart: startMode, loading: true });
  // 菜单点击是合法的用户手势；在加载阶段也先启动真实主题曲，避免错过手势窗口。
  document.addEventListener('pointerdown', () => {
    if (document.querySelector('#main-menu')?.hidden) return;
    playMenuMusic();
  }, { capture: true });
  await loadAssets({ images: IMAGE_MANIFEST, audio: AUDIO_MANIFEST, anchors: 'assets/anchors.json' });
  assetsReady = true;
  setEventHooks({ onBonk: () => sfx('sfx_bonk'), onTeleport: () => sfx('sfx_thief') });
  setDayHooks({
    onSpawn: (customer) => {
      voice('voice_order_1');
      const role = CUSTOMER_ROLE_META[customer?.def?.id];
      if (role && !seenCustomerRoles.has(customer.def.id)) {
        seenCustomerRoles.add(customer.def.id);
        showHint(`新顾客：${role.label} · ${role.hint}`, 4.5);
      }
    },
    onBatchSpawn: (batch) => { if (batch.length >= 3) unlockAchievement('rush_three'); },
    onServe: ({ result }) => {
      unlockAchievement('first_service');
      if (result.perfect) unlockAchievement('perfect_service');
    },
    onTimeout: () => sfx('sfx_angry'),
    onReject: () => sfx('sfx_angry'),
    onEnd: (summary) => {
      if (summary.mode === 'stage' && summary.day >= DAY.total) markStageComplete();
      if (summary.mode === 'endless' && summary.day >= 5) unlockAchievement('endless_five');
      sfx('sfx_day_end');
      showSettle(summary, () => {
        if (summary.mode === 'stage' && summary.day >= DAY.total) showHeadline({ stars: state.stars, days: DAY.total }, { canvas, restartLabel: '返回主菜单', resetOnRestart: false, onRestart: returnToMenu });
        else showShop({}, beginDay);
      });
    },
  });
  canvas.addEventListener('pointerdown', () => unlock(), { once: true });
  bindPointer(canvas, toLogical);
  engine = createEngine({ canvas, update, render });
  window.addEventListener('resize', resize);
  resize();
  if (queuedMode) {
    // 玩家在加载阶段已经点过开始：菜单点击回调会先隐藏卡片，加载完成后直接进入营业。
    const mode = queuedMode; queuedMode = null; startMode(mode);
  } else {
    showMenu({ onStart: startMode });
    // 资源加载完成后主动尝试自动播放；若浏览器拦截，会在下一次菜单手势中重试。
    playMenuMusic();
  }

  window.__dbg = {
    coins(n) { state.coins = Number(n); }, rep(n) { state.rep = Number(n); }, day(n) { state.day = Number(n); }, star(n) { state.stars = Number(n); },
    buyAll() { state.coins = Math.max(state.coins, 99999); return buyAll(); },
    spawn(customerId) { return forceSpawn(customerId); }, event(eventId) { return triggerEvent(eventId); },
    inspector() { const item = startInspection(state.day, () => 0); if (item) spawn(item.def, nextFreeSlot(), item.order, { shopLevel: state.shopLevel }); return item; },
    ending(star) { state.stars = Number(star); showHeadline({ stars: state.stars, days: DAY.total }, { canvas, restartLabel: '返回主菜单', resetOnRestart: false, onRestart: returnToMenu }); },
    mode(mode) { return startMode(mode); }, menu: returnToMenu,
    fastDay(mul) { setDaySpeed(Number(mul)); }, bio(id) { return forceBio(id); }, silhouette: makeSilhouette,
  };
}

init().catch((error) => {
  console.error(error);
  ctx.fillStyle = PALETTE.alert; ctx.font = '700 28px sans-serif'; ctx.fillText('航站启动失败，请刷新重试', 80, 120);
});
