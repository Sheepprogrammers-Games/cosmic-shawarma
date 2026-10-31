import { IDLE, PALETTE, SLOTS, TIMING } from '../data.js';
import { img } from '../core/assets.js';
import { sprite, text } from '../core/render.js';
import { patienceRatio } from '../entities/customer.js';
import { productHasContent } from '../entities/item.js';
import { stationState } from '../systems/stations.js';

const ORDER_ASSET = {
  meat: 'food_meat_slice', tentacle: 'food_tentacle', sauce: 'food_sauce_splat', pepper: 'food_pepper',
  syrup: 'food_syrup', fries: 'food_fries_done', soda: 'drink_soda', nova: 'drink_nova', plasma: 'drink_plasma',
};

const SLOT_COLOR = {
  meat: PALETTE.meatBest, tentacle: PALETTE.tentacle, sauce: PALETTE.sauce, pepper: PALETTE.alert,
};

const feedback = [];
const FEEDBACK_ORIGIN = {
  slice: [245, 470], meat: [350, 574], tentacle: [415, 536], sauce: [520, 536], pepper: [625, 536],
  syrup: [638, 614], fries: [932, 625], soda: [1118, 626], nova: [1173, 626], plasma: [1228, 626],
};
const FEEDBACK_ASSET = {
  slice: 'food_meat_slice', meat: 'food_meat_slice', tentacle: 'food_tentacle', sauce: 'food_sauce_splat',
  pepper: 'food_pepper', syrup: 'food_syrup', fries: 'food_fries_done', soda: 'drink_soda', nova: 'drink_nova', plasma: 'drink_plasma',
};

export const CUSTOMER_ROLE_META = {
  crystal: { label: '晶体客', hint: '偏好辣椒 · 少给饮料', color: PALETTE.sauce },
  plasma: { label: '等离子客', hint: '耐心较低 · 优先做饮料', color: PALETTE.neonCyan },
  octopus: { label: '章鱼旅客', hint: '偏好辣椒 · 小费更高', color: PALETTE.organic },
  swarm: { label: '机械蜂群', hint: '订单严格 · 不要多放配料', color: PALETTE.metal },
  slime: { label: '黏菌客', hint: '喜欢星尘糖浆', color: PALETTE.tentacle },
  astronaut: { label: '宇航员', hint: '不吃星尘芽和星云酱', color: PALETTE.gold },
};

let heldProduct = null;
let hint = null;

export function showHint(text, duration = 2.6) {
  hint = { text, until: stationState.time + duration };
}

function drawHint(ctx) {
  if (!hint) return;
  if (stationState.time >= hint.until) { hint = null; return; }
  stationLabel(ctx, hint.text, 772, 424, PALETTE.gold);
}

// 顾客在吧台后面排队，身体整段画出，由后绘制的吧台图层自然遮挡下半身。
// 裁剪只作安全网：底边压进台面内部，左右收进吧台素材的水平覆盖范围，
// 这样切口始终落在不透明的台面之后，不会在台面上方露出硬边。
// 头和身体整体下沉同一距离，保持颈部衔接；台面线落在身体约六成处，
// 腰以下由吧台遮挡，只露出头、肩和手臂。
const CUSTOMER_BODY_BASE_OFFSET = 368;
const CUSTOMER_HEAD_OFFSET = 155;
const CUSTOMER_OCCLUSION_BOTTOM = 528;
const COUNTER_COVER_LEFT = 132;
const COUNTER_COVER_RIGHT = 1150;

export function setHeldProduct(value) { heldProduct = value; }

export function drawHeldProduct(ctx) {
  if (!heldProduct?.active) return;
  drawFit(ctx, 'food_wrap_packed', heldProduct.x, heldProduct.y, 168, 112, 0.98, Math.sin(stationState.time * 8) * 0.025);
  sprite(ctx, 'fx_ring', heldProduct.x, heldProduct.y, { anchor: { x: 0.5, y: 0.5 }, scale: 0.7 + Math.sin(stationState.time * 8) * 0.06, alpha: 0.7, tint: PALETTE.gold });
}

export function stationFeedback(name) {
  const origin = FEEDBACK_ORIGIN[name];
  if (origin) feedback.push({ name, x: origin[0], y: origin[1], start: stationState.time, duration: name === 'slice' ? 0.24 : 0.38 });
  else if (['roll', 'pack', 'restock', 'reject'].includes(name)) feedback.push({ name, x: name === 'restock' ? 104 : 772, y: name === 'restock' ? 470 : 540, start: stationState.time, duration: 0.45 });
}

function feedbackPulse(name) {
  let pulse = 0;
  for (const item of feedback) {
    if (item.name !== name) continue;
    const ratio = Math.max(0, Math.min(1, (stationState.time - item.start) / item.duration));
    pulse = Math.max(pulse, 1 - ratio);
  }
  return pulse;
}

function ellipse(ctx, x, y, rx, ry, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFit(ctx, name, x, y, width, height, alpha = 1, rotation = 0) {
  const source = img(name);
  const scale = Math.min(width / source.width, height / source.height);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(source, -source.width * scale / 2, -source.height * scale / 2, source.width * scale, source.height * scale);
  ctx.restore();
}

function badge(ctx, value, x, y, color = PALETTE.neonCyan) {
  ellipse(ctx, x, y, 17, 17, PALETTE.ink, 0.96);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, value, x, y + 1, { size: 13, color: PALETTE.text, align: 'center', baseline: 'middle', tabular: true });
}

function drawAlien(ctx, customer) {
  const { x, y, def, mood, headId } = customer;
  const waiting = customer.state === 'WAITING';
  const impatience = waiting ? 1 - patienceRatio(customer) : 0;
  const float = Math.sin(customer.elapsed * 3 + customer.slotIndex) * (4 + impatience * 3);
  const lean = mood === 0 ? Math.sin(customer.elapsed * 10) * 0.035 : Math.sin(customer.elapsed * 1.7) * 0.018;
  const bodyName = `body_${def.body === 'blob' ? 'blob' : def.body === 'large' ? 'large' : 'humanoid'}`;
  const moodName = mood === 0 ? 'angry' : mood === 2 ? 'happy' : 'neutral';
  const expressive = ['crystal', 'plasma', 'octopus'].includes(headId);
  const headName = expressive ? `head_${headId}_${moodName}` : `head_${headId}`;

  const clipLeft = Math.max(COUNTER_COVER_LEFT, x - 132);
  const clipRight = Math.min(COUNTER_COVER_RIGHT, x + 132);
  ctx.save();
  ctx.beginPath();
  ctx.rect(clipLeft, 64, Math.max(0, clipRight - clipLeft), CUSTOMER_OCCLUSION_BOTTOM - 64);
  ctx.clip();
  sprite(ctx, bodyName, x, y + CUSTOMER_BODY_BASE_OFFSET + float, { anchor: { x: 0.5, y: 1 }, scale: 0.62, rot: lean });
  sprite(ctx, headName, x, y + CUSTOMER_HEAD_OFFSET + float, { anchor: { x: 0.5, y: 0.72 }, scale: headId === 'worm' ? 0.39 : 0.54, rot: lean * 1.6 });
  ctx.restore();

  if (customer.order?.riddle) {
    sprite(ctx, 'prop_notepad', x + 72, 308 + float, { anchor: { x: 0.5, y: 0.5 }, scale: 0.23, rot: Math.sin(customer.elapsed * 2) * 0.06 });
  }

  const role = CUSTOMER_ROLE_META[def.id];
  if (role) drawRoleBadge(ctx, role, x, 266 + float);
}

function drawRoleBadge(ctx, role, x, y) {
  ctx.save();
  ctx.font = '800 9px -apple-system, sans-serif';
  const width = Math.max(92, ctx.measureText(`${role.label}  ·  ${role.hint}`).width + 16);
  ctx.fillStyle = 'rgba(4,15,17,0.82)';
  ctx.strokeStyle = role.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - 11, width, 22, 5);
  ctx.fill(); ctx.stroke();
  text(ctx, `${role.label}  ·  ${role.hint}`, x, y + 1, { size: 9, color: PALETTE.text, align: 'center', baseline: 'middle' });
  ctx.restore();
}

function orderedItems(order) {
  const items = Object.entries(order.wrap)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count }));
  if (order.snack) items.push({ id: order.snack, count: 1 });
  if (order.drink) items.push({ id: order.drink, count: 1 });
  // 高等级订单最多 7 项；全部绘制，避免玩家看不到饮料/薯条而误做。
  return items;
}

function drawQuantityBadge(ctx, value, x, y) {
  ctx.save();
  ctx.fillStyle = PALETTE.ink;
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 12, y - 8, 24, 16, 4);
  ctx.fill();
  ctx.stroke();
  text(ctx, `×${value}`, x, y + 1, { size: 9, color: PALETTE.text, align: 'center', baseline: 'middle', tabular: true });
  ctx.restore();
}

// 气泡素材下方 19.4% 是指向顾客的尾巴，主体只占 80.6%，
// 所以按内容算出主体高度后要还原成整张图的绘制高度。
const BUBBLE_BODY_RATIO = 258 / 320;
const BUBBLE_CELL_W = 52;
const BUBBLE_CELL_H = 44;
const BUBBLE_TIP_Y = 172;
const BUBBLE_TOP_LIMIT = 66;

function drawOrder(ctx, customer) {
  const items = orderedItems(customer.order);
  const cols = Math.max(1, Math.min(3, items.length));
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const contentW = cols * BUBBLE_CELL_W;
  const contentH = rows * BUBBLE_CELL_H;
  const width = Math.max(96, contentW + 26);
  const height = (contentH + 16) / BUBBLE_BODY_RATIO;
  const bubbleX = customer.x - width / 2;
  const bubbleY = Math.max(BUBBLE_TOP_LIMIT, BUBBLE_TIP_Y - height);
  ctx.drawImage(img(customer.order.riddle ? 'ui_bubble_riddle' : 'ui_bubble_order'), bubbleX, bubbleY, width, height);
  const originX = bubbleX + (width - contentW) / 2 + BUBBLE_CELL_W / 2;
  const originY = bubbleY + 8 + BUBBLE_CELL_H / 2;
  items.forEach(({ id, count }, index) => {
    const x = originX + (index % cols) * BUBBLE_CELL_W;
    const y = originY + Math.floor(index / cols) * BUBBLE_CELL_H;
    ellipse(ctx, x, y, 20, 18, PALETTE.ink, 0.72);
    drawFit(ctx, ORDER_ASSET[id] || 'food_wrap_rolled', x, y, 34, 34);
    drawQuantityBadge(ctx, count, x + 16, y - 13);
  });
  return bubbleY + height;
}

function drawProductQuantityBox(ctx, product) {
  const items = Object.entries(product.wrap)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count }));
  if (product.snack) items.push({ id: product.snack, count: 1 });
  if (product.drink) items.push({ id: product.drink, count: 1 });
  if (!items.length) return;
  const cols = Math.min(5, items.length);
  const rows = Math.ceil(items.length / cols);
  const width = Math.max(170, cols * 49 + 26);
  const height = 28 + rows * 30;
  const x = 772 - width / 2;
  const y = 356;
  ctx.save();
  ctx.fillStyle = 'rgba(27,16,51,0.94)';
  ctx.strokeStyle = product.packed ? PALETTE.gold : PALETTE.neonPink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 7);
  ctx.fill();
  ctx.stroke();
  text(ctx, product.packed ? '成品袋内容' : '当前配料', x + 12, y + 13, { size: 10, color: PALETTE.textDim, baseline: 'middle' });
  items.forEach(({ id, count }, index) => {
    const cellX = x + 26 + (index % cols) * 49;
    const cellY = y + 28 + Math.floor(index / cols) * 30;
    drawFit(ctx, ORDER_ASSET[id] || 'food_wrap_rolled', cellX - 9, cellY, 23, 23);
    text(ctx, `×${count}`, cellX + 9, cellY + 1, { size: 10, color: PALETTE.text, baseline: 'middle', tabular: true });
  });
  ctx.restore();
}

function drawPatience(ctx, customer, topY = BUBBLE_TIP_Y) {
  const ratio = patienceRatio(customer);
  const x = customer.x - 70;
  const y = topY + 4;
  ctx.drawImage(img('ui_bar_patience_bg'), x, y, 140, 14);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, 140 * ratio, 14);
  ctx.clip();
  ctx.globalAlpha = ratio < 0.25 ? 0.6 + Math.sin(customer.elapsed * 12) * 0.35 : 1;
  ctx.drawImage(img('ui_bar_patience_fill'), x, y, 140, 14);
  ctx.restore();
}

// 顾客只负责显示订单与等待状态，不注册“点击出餐”热区。
// 成品必须从包装台拖动到顾客头顶，由 main.js 统一判定投递目标。
export function drawQueue(ctx, queue) {
  queue.forEach((customer) => {
    drawAlien(ctx, customer);
    const bubbleBottom = customer.order ? drawOrder(ctx, customer) : BUBBLE_TIP_Y;
    drawPatience(ctx, customer, bubbleBottom);
    if (customer.lastDelivery?.accepted === false) {
      stationLabel(ctx, customer.lastDelivery.reason || '不满意 · 请重做', customer.x, 402, PALETTE.alert);
    }
  });
}

export function drawCounterBase(ctx) {
  ctx.drawImage(img('bg_counter'), 0, 315, 1280, 405);
  ctx.fillStyle = 'rgba(156,255,240,0.05)';
  ctx.fillRect(0, 315, 1280, 3);
  ctx.fillStyle = 'rgba(11,10,31,0.18)';
  ctx.fillRect(0, 665, 1280, 55);
}

function stationLabel(ctx, label, x, y, color = PALETTE.neonCyan) {
  ctx.save();
  ctx.font = '800 12px -apple-system, sans-serif';
  const width = Math.max(54, ctx.measureText(label).width + 20);
  ctx.fillStyle = 'rgba(27,16,51,0.88)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - 13, width, 26, 5);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x, y + 1, { size: 12, color: PALETTE.text, align: 'center', baseline: 'middle' });
  ctx.restore();
}

function drawHelper(ctx, registerZone, actions) {
  const working = stationState.tasks.some((task) => task.id.startsWith('restock'));
  const bob = working ? Math.sin(stationState.time * 12) * 5 : Math.sin(stationState.time * 2) * 2;
  ellipse(ctx, 99, 557, 62, 14, PALETTE.void, 0.5);
  sprite(ctx, working ? 'arm7_work' : 'arm7_sleep', 104, 565 + bob, { anchor: { x: 0.5, y: 1 }, scale: 0.29, rot: working ? Math.sin(stationState.time * 9) * 0.035 : 0 });
  stationLabel(ctx, working ? '补货中' : 'ARM-7', 103, 383, working ? PALETTE.gold : PALETTE.neonCyan);
  registerZone('restock', { x: 36, y: 370, w: 140, h: 205 }, 24, actions.restock);
}

function drawMeat(ctx, registerZone, actions, unlocked) {
  const pulse = 0.82 + 0.18 * Math.sin(stationState.time * Math.PI * 2 / IDLE.meatVein.period);
  const stock = stationState.stock.meat || 0;
  const stateName = 'best';
  const turn = 0.94 + Math.sin(stationState.time * 1.4) * 0.06 + feedbackPulse('slice') * 0.08;
  ellipse(ctx, 245, 650, 67, 15, PALETTE.void, 0.55);
  ctx.save();
  ctx.translate(245, 650);
  ctx.scale(turn, 1);
  sprite(ctx, `food_meat_column_${stateName}`, 0, 0, { anchor: { x: 0.5, y: 1 }, scale: 0.35, alpha: pulse });
  ctx.restore();
  const meatHint = stock > 0 ? '烤肉片 · 有货即取' : stationState.meatTray.length ? '肉片待用 · 先取走' : '缺货 · 点击 ARM-7 补货';
  stationLabel(ctx, meatHint, 245, 354, stock > 0 || stationState.meatTray.length ? PALETTE.gold : PALETTE.alert);

  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(190, 668, 110, 10);
  ctx.fillStyle = stock > 0 ? PALETTE.gold : PALETTE.alert;
  ctx.fillRect(193, 671, 104 * Math.max(0, Math.min(1, stock / 3)), 4);
  text(ctx, `库存 ${stock}/3`, 245, 689, { size: 10, color: stock > 0 ? PALETTE.textDim : PALETTE.alert, align: 'center', baseline: 'middle', tabular: true });
  registerZone('slice-meat', { x: 182, y: 350, w: 126, h: 325 }, 24, actions.slice);

  ellipse(ctx, 350, 584, 53, 22, PALETTE.panel, 0.96);
  ctx.strokeStyle = PALETTE.meatBest;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(350, 579, 52, 23, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < stationState.meatTray.length; index += 1) {
    drawFit(ctx, 'food_meat_slice', 332 + index * 18, 574 - index * 3, 48, 48, 1, (index - 1) * 0.12);
  }
  badge(ctx, `${stationState.meatTray.length}`, 386, 548, PALETTE.meatBest);
  registerZone('tray-meat', { x: 304, y: 532, w: 96, h: 92 }, 25, actions.addMeat);

  if (unlocked.upgradesA?.includes('A2')) {
    sprite(ctx, 'mach_slicer', 315, 684, { anchor: { x: 0.5, y: 1 }, scale: 0.22 });
  }
}

function drawIngredientBins(ctx, registerZone, actions) {
  SLOTS.slice(1).forEach((slot, index) => {
    const x = 415 + index * 105;
    const locked = stationState.locked[slot.id];
    const amount = stationState.stock[slot.id] || 0;
    const color = SLOT_COLOR[slot.id] || PALETTE.neonCyan;
    ctx.fillStyle = PALETTE.metal;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x - 49, 505, 98, 76, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = locked ? PALETTE.panel : PALETTE.void;
    ctx.strokeStyle = locked ? PALETTE.textDim : color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 42, 498, 84, 67, 10);
    ctx.fill();
    ctx.stroke();
    if (!locked) {
      const asset = slot.id === 'sauce' ? 'food_sauce_splat' : `food_${slot.id}`;
      const bob = slot.id === 'pepper' ? Math.sin(stationState.time * 5) * IDLE.pepper.px : 0;
      const pop = feedbackPulse(slot.id);
      drawFit(ctx, asset, x, 531 + bob - pop * 7, 70 * (1 + pop * 0.08), 56 * (1 + pop * 0.08), amount ? 1 : 0.18, slot.id === 'tentacle' ? Math.sin(stationState.time * 2) * 0.08 : pop * 0.08);
      badge(ctx, amount, x + 39, 493, color);
      registerZone(`slot-${slot.id}`, { x: x - 49, y: 490, w: 98, h: 100 }, 25, () => actions.addSlot(slot.id));
    } else {
      ctx.strokeStyle = PALETTE.textDim;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, 522, 13, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillRect(x - 17, 522, 34, 26);
    }
    stationLabel(ctx, slot.name.replace('荧光', '').replace('星云', '').replace('反物质', ''), x, 606, locked ? PALETTE.textDim : color);
  });
}

function drawProductLayers(ctx, product) {
  const assets = { meat: 'food_meat_slice', tentacle: 'food_tentacle', sauce: 'food_sauce_splat', pepper: 'food_pepper', syrup: 'food_syrup' };
  const placements = [
    [-66, -6, -0.18], [-20, 8, 0.12], [31, -4, -0.08], [65, 10, 0.16],
    [-45, 25, 0.05], [8, 25, -0.12], [50, 27, 0.1],
  ];
  let placed = 0;
  for (const [id, count] of Object.entries(product.wrap)) {
    for (let n = 0; n < count; n += 1) {
      const [x, y, rotation] = placements[placed % placements.length];
      drawFit(ctx, assets[id] || 'food_meat_slice', x, y, id === 'sauce' ? 82 : 58, id === 'syrup' ? 68 : 54, 1, rotation);
      placed += 1;
    }
  }
}

function drawProduct(ctx, registerZone, actions, unlocked) {
  const product = stationState.product;
  const busy = stationState.tasks.some((task) => task.id === 'roll' || task.id === 'pack');
  const breathe = 1 + Math.sin(stationState.time * Math.PI * 2 / IDLE.dough.period) * IDLE.dough.amp;
  ellipse(ctx, 772, 558, 142, 44, PALETTE.void, 0.54);
  const ready = !busy && (productHasContent(product) || product.rolled);
  ctx.save();
  ctx.strokeStyle = busy ? PALETTE.gold : PALETTE.neonPink;
  ctx.globalAlpha = busy ? 0.5 : ready ? 0.34 + Math.sin(stationState.time * 3.4) * 0.1 : 0.16;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(772, 552, 136, 62, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const actionPop = Math.max(feedbackPulse('roll'), feedbackPulse('pack'));
  ctx.translate(772, 540 - actionPop * 7);
  ctx.scale((product.rolled ? 1 : breathe) * (1 + actionPop * 0.06), (product.rolled ? 1 : breathe) * (1 + actionPop * 0.06));
  const wrapAsset = product.packed ? 'food_wrap_packed' : product.rolled ? 'food_wrap_rolled' : 'food_wrap_open';
  if (!(product.packed && heldProduct?.active)) drawFit(ctx, wrapAsset, 0, 0, product.packed ? 250 : 272, product.packed ? 166 : 182);
  if (!product.rolled) drawProductLayers(ctx, product);
  ctx.restore();
  drawProductQuantityBox(ctx, product);

  const hasContent = productHasContent(product);
  const status = product.packed ? '拖到顾客头上' : product.rolled ? '点击包装' : hasContent ? '点击卷制' : '制作台';
  stationLabel(ctx, busy ? '处理中' : status, 772, 645, product.packed ? PALETTE.gold : PALETTE.neonPink);
  if (!busy && ((hasContent && !product.rolled) || (product.rolled && !product.packed))) {
    registerZone('product-action', { x: 630, y: 454, w: 284, h: 185 }, 26, product.rolled ? actions.pack : actions.roll);
  }

  if (unlocked.menuC.includes('C3')) {
    drawFit(ctx, 'food_syrup', 638, 614, 72, 100, product.rolled ? 0.35 : 1, Math.sin(stationState.time * 1.2) * 0.025);
    badge(ctx, '+', 661, 582, PALETTE.gold);
    if (!product.rolled) registerZone('syrup', { x: 600, y: 558, w: 80, h: 112 }, 27, actions.syrup);
  }

  if (unlocked.upgradesA?.includes('A4')) sprite(ctx, 'mach_roller', 702, 715, { anchor: { x: 0.5, y: 1 }, scale: 0.22 });
  if (unlocked.upgradesA?.includes('A6')) sprite(ctx, 'mach_wrapper', 844, 715, { anchor: { x: 0.5, y: 1 }, scale: 0.22 });
}

function drawFryer(ctx, registerZone, actions, unlocked) {
  const open = unlocked.menuC.includes('C2');
  const fryer = stationState.fryer;
  ellipse(ctx, 1000, 696, 74, 15, PALETTE.void, 0.52);
  const fryerPop = Math.max(feedbackPulse('fry'), feedbackPulse('fries'));
  sprite(ctx, 'mach_fryer', 1000, 706 - fryerPop * 5, { anchor: { x: 0.5, y: 1 }, scale: 0.29 * (1 + fryerPop * 0.04), alpha: open ? 1 : 0.28, rot: fryerPop * 0.025 });
  if (!open) {
    stationLabel(ctx, '炸锅未解锁', 1000, 515, PALETTE.textDim);
    return;
  }

  const stateColor = fryer.state === 'burnt' ? PALETTE.alert : fryer.state === 'best' ? PALETTE.gold : PALETTE.fries;
  stationLabel(ctx, fryer.state === 'idle' ? '陨石炸锅' : fryer.state === 'best' ? '现在捞起' : fryer.state === 'burnt' ? '过火了' : '油炸中', 1000, 515, stateColor);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(952, 532, 96, 9);
  ctx.fillStyle = stateColor;
  ctx.fillRect(955, 535, 90 * Math.min(1, fryer.elapsed / TIMING.fryBurntAt), 3);
  registerZone('fry-action', { x: 936, y: 512, w: 128, h: 192 }, 25, actions.fry);

  if (fryer.state !== 'idle') {
    for (let n = 0; n < 3; n += 1) {
      sprite(ctx, 'fx_smoke', 970 + n * 28, 552 - Math.sin(stationState.time * 3 + n) * 10, { anchor: { x: 0.5, y: 0.5 }, scale: 0.18 + n * 0.03, alpha: 0.22 });
    }
  }
  if (fryer.tray.length) {
    drawFit(ctx, fryer.state === 'burnt' ? 'food_fries_burnt' : 'food_fries_done', 932, 625, 82, 82);
    badge(ctx, fryer.tray.length, 959, 594, PALETTE.fries);
    registerZone('add-fries', { x: 892, y: 582, w: 82, h: 90 }, 28, actions.addFries);
  }
}

function drawDrinkMachine(ctx, registerZone, actions, unlocked) {
  const drinks = ['soda', 'nova', 'plasma'].filter((id) => unlocked.menuC.includes({ soda: 'C1', nova: 'C4', plasma: 'C6' }[id]));
  ellipse(ctx, 1175, 696, 76, 15, PALETTE.void, 0.5);
  sprite(ctx, 'mach_drink', 1175, 706, { anchor: { x: 0.5, y: 1 }, scale: 0.29, alpha: drinks.length ? 1 : 0.28 });
  stationLabel(ctx, stationState.drink.pouring ? '注液中' : drinks.length ? '反物质饮料' : '饮料未解锁', 1175, 515, stationState.drink.pouring ? PALETTE.gold : drinks.length ? PALETTE.neonCyan : PALETTE.textDim);

  drinks.forEach((id, index) => {
    const x = 1118 + index * 55;
    const active = stationState.drink.target === id;
    const bob = id === 'nova' ? Math.sin(stationState.time * 2) * 2 : 0;
    const drinkPop = feedbackPulse(id);
    drawFit(ctx, `drink_${id}`, x, 626 + bob - drinkPop * 6, 48 * (1 + drinkPop * 0.08), 72 * (1 + drinkPop * 0.08), active ? 1 : 0.92, id === 'nova' ? stationState.time * 0.06 : drinkPop * 0.06);
    if (active) {
      sprite(ctx, 'fx_streak', x, 563, { anchor: { x: 0.5, y: 0.5 }, scale: 0.28, tint: id === 'nova' ? PALETTE.gold : id === 'plasma' ? PALETTE.neonCyan : PALETTE.neonPink, rot: Math.PI / 2 });
    }
    registerZone(`drink-${id}`, { x: x - 25, y: 564, w: 50, h: 108 }, 28, () => actions.drink(id));
  });
}

function drawMaw(ctx, registerZone, actions) {
  const discardPop = feedbackPulse('discard');
  const sway = Math.sin(stationState.time * Math.PI * 2 / IDLE.maw.period) * 0.08 + discardPop * 0.08;
  const hasProduct = productHasContent(stationState.product) || stationState.product.rolled;
  ctx.save();
  // 独立的回收站外框，让交互区域与装饰保持清晰。
  ctx.fillStyle = 'rgba(11,10,31,0.78)';
  ctx.strokeStyle = hasProduct ? PALETTE.alert : PALETTE.panelLit;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(12, 584, 112, 126, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PALETTE.text; ctx.font = '900 11px -apple-system, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('回收站', 68, 601);
  ctx.fillStyle = PALETTE.textDim; ctx.font = '700 9px -apple-system, sans-serif';
  ctx.fillText(hasProduct ? '清空并重做' : '做错了也不怕', 68, 616);
  ctx.fillStyle = 'rgba(255,77,77,0.12)'; ctx.beginPath(); ctx.roundRect(24, 624, 88, 76, 10); ctx.fill();
  ctx.restore();
  ellipse(ctx, 68, 704, 48, 10, PALETTE.void, 0.55);
  sprite(ctx, `bio_maw_${stationState.maw.state}`, 68, 708 - discardPop * 5, { anchor: { x: 0.5, y: 1 }, scale: 0.24 * (1 + discardPop * 0.1), rot: sway });
  registerZone('discard', { x: 12, y: 584, w: 112, h: 126 }, 28, actions.discard);
}

function drawFeedback(ctx) {
  for (let index = feedback.length - 1; index >= 0; index -= 1) {
    const item = feedback[index];
    const ratio = (stationState.time - item.start) / item.duration;
    if (ratio >= 1) {
      feedback.splice(index, 1);
      continue;
    }
    const eased = 1 - (1 - ratio) ** 3;
    if (FEEDBACK_ASSET[item.name]) {
      const targetX = item.name === 'slice' ? 350 : 772;
      const targetY = item.name === 'slice' ? 574 : 530;
      const x = item.x + (targetX - item.x) * eased;
      const y = item.y + (targetY - item.y) * eased - Math.sin(ratio * Math.PI) * 58;
      drawFit(ctx, FEEDBACK_ASSET[item.name], x, y, 62, 62, 1 - ratio * 0.15, ratio * 0.8);
      sprite(ctx, 'fx_streak', x - 20, y + 12, { anchor: { x: 0.5, y: 0.5 }, scale: 0.28, alpha: 1 - ratio, tint: SLOT_COLOR[item.name] || PALETTE.gold, rot: Math.atan2(targetY - item.y, targetX - item.x) });
    } else {
      sprite(ctx, item.name === 'restock' ? 'fx_star' : 'fx_ring', item.x, item.y, { anchor: { x: 0.5, y: 0.5 }, scale: 0.45 + eased * 0.9, alpha: 1 - ratio, tint: item.name === 'restock' ? PALETTE.gold : PALETTE.neonPink });
    }
  }
}

export function drawStations(ctx, registerZone, actions, unlocked) {
  drawHelper(ctx, registerZone, actions);
  drawMeat(ctx, registerZone, actions, unlocked);
  drawIngredientBins(ctx, registerZone, actions);
  drawProduct(ctx, registerZone, actions, unlocked);
  drawFryer(ctx, registerZone, actions, unlocked);
  drawDrinkMachine(ctx, registerZone, actions, unlocked);
  drawMaw(ctx, registerZone, actions);
  drawFeedback(ctx);
  drawHint(ctx);
}
