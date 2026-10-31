import { EXTRAS, RIDDLES, SCORING } from '../data.js';

const clamp = (min, max, value) => Math.max(min, Math.min(max, value));

function riddleResult(order, product) {
  if (!order.riddle) return true;
  const rule = order.riddleRule || RIDDLES.find((item) => item.id === order.riddle);
  if (!rule) return true;
  const wrap = product.wrap || {};
  if (Object.entries(rule.need || {}).some(([key, count]) => (wrap[key] || 0) < count)) return false;
  if ((rule.forbid || []).some((key) => (wrap[key] || 0) > 0)) return false;
  if (rule.needDrink && product.drink !== rule.needDrink) return false;
  const kinds = Object.values(wrap).filter((count) => count > 0).length;
  return !(rule.maxKinds && kinds > rule.maxKinds);
}

export function scoreOrder(order, product, patienceLeftRatio, opt = {}) {
  const expectedWrap = order.wrap || {};
  const actualWrap = product.wrap || {};
  let missing = 0;
  let extra = 0;
  // 遍历并集：旧实现只遍历订单字段，隐藏字段的多放配料会被漏算。
  for (const key of new Set([...Object.keys(expectedWrap), ...Object.keys(actualWrap)])) {
    missing += Math.max(0, (expectedWrap[key] || 0) - (actualWrap[key] || 0));
    extra += Math.max(0, (actualWrap[key] || 0) - (expectedWrap[key] || 0));
  }
  if (order.snack !== product.snack) {
    if (order.snack) missing += 1;
    if (product.snack) extra += 1;
  }
  if (order.drink !== product.drink) {
    if (order.drink) missing += 1;
    if (product.drink) extra += 1;
  }
  const A = Number(Math.max(0, 1 - missing * SCORING.missingPenalty - extra * SCORING.extraPenalty).toFixed(2));
  const W = clamp(0, 1, patienceLeftRatio);
  const heats = [...(product.heats || [])];
  if (product.snack === 'fries') heats.push(product.friesBest ? SCORING.friesBestBonus : 1);
  const H = heats.length ? heats.reduce((sum, quality) => sum + quality, 0) / heats.length : 1;
  const S = Number(clamp(0, 1, SCORING.wA * A + SCORING.wW * W + SCORING.wH * H).toFixed(4));
  const tip = SCORING.tipMin + SCORING.tipRange * S;
  const repDelta = Math.round(SCORING.repBase + SCORING.repRange * S);
  const perfect = S >= SCORING.perfectAt;
  const syrupMul = (actualWrap.syrup || 0) > 0 ? 1 + EXTRAS.syrup.bonus : 1;
  const income = order.basePrice * (opt.shopPriceMul || 1) * (opt.starMul || 1) * (opt.customerPriceMul || 1) * tip * (perfect ? 1 + SCORING.perfectBonus : 1) * syrupMul;
  return {
    S, A, W, H, tip, repDelta, perfect, income,
    missing,
    extra,
    ingredientExact: missing === 0 && extra === 0,
    riddleOk: riddleResult(order, product),
  };
}
