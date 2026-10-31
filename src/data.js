export const LOGICAL = { w: 1280, h: 720 };

export const PALETTE = {
  ink: '#1B1033', void: '#0B0A1F', panel: '#2A1B4D', panelLit: '#3D2A6B',
  neonPink: '#FF3D9A', neonCyan: '#22E0D6', gold: '#FFC93C', alert: '#FF4D4D',
  meatRaw: '#C24E3A', meatBest: '#E8743F', meatBurnt: '#5E2A1E',
  dough: '#E9D8A6', tentacle: '#7CFF5C', sauce: '#A15CFF', fries: '#F2B341',
  syrup: '#FFE08A', vein: '#9CFFF0', organic: '#D4568C',
  metal: '#8A93B5', text: '#F5F0FF', textDim: '#A79BC8',
};

// 外星生物。全部挂在已有机制上，不新增玩法。
export const BIO = {
  maw: { name: '回收机器人', role: 'recycle', frames: ['closed', 'open', 'chew'], cycle: 1.0 },
  slug: { name: '星尘清洁员', role: 'coinEater', crawlSpeed: 140 },
  jelly: { name: '气囊水母', role: 'ambientLight', bpm: 112 },
  roach: { name: '星门小虫', role: 'ambientTap', everyMin: 20, everyMax: 40, dailyCap: 3, reward: 1 },
};

// 食材与生物的 idle 活性。周期单位秒，幅度单位见 kind。
export const IDLE = {
  dough: { kind: 'breathe', period: 2.4, amp: 0.04 },
  meatVein: { kind: 'pulse', period: 1.6 },
  meatSlice: { kind: 'twitch', duration: 0.2, deg: 8 },
  tentacle: { kind: 'wriggle', duration: 2.0, deg: 10 },
  sauce: { kind: 'drift', count: 8 },
  pepper: { kind: 'hover', px: 3 },
  syrupDrop: { kind: 'lowGrav', duration: 1.5 },
  soda: { kind: 'bubbleDown' },
  nova: { kind: 'spin', period: 4.0 },
  plasma: { kind: 'arc', minGap: 0.4, maxGap: 1.6 },
  maw: { kind: 'sway', period: 3.0, deg: 5 },
  jelly: { kind: 'float', px: 8 },
};

// 备料区四个固定槽位。slot 3/4 由星级与菜单解锁开启。
export const SLOTS = [
  { id: 'meat', slot: 1, name: '烤肉片', unlock: null, stock: 3, heat: true },
  { id: 'tentacle', slot: 2, name: '星尘芽', unlock: null, stock: 10, heat: false },
  { id: 'sauce', slot: 3, name: '星云酱', unlock: 'star1', stock: 10, heat: false },
  { id: 'pepper', slot: 4, name: '反物质辣椒', unlock: 'C5', stock: 10, heat: false },
];

// 薯条来自炸锅暂存盘，糖浆是卷制台旁的可选加料，二者不占备料槽。
export const EXTRAS = {
  fries: { name: '陨石薯条', unlock: 'C2', heat: true },
  syrup: { name: '星尘糖浆', unlock: 'C3', heat: false, bonus: 0.10 },
};

export const DRINKS = [
  { id: 'soda', name: '反物质气泡水', unlock: 'C1', price: 5 },
  { id: 'nova', name: '超新星浓缩汁', unlock: 'C4', price: 5 },
  { id: 'plasma', name: '等离子奶昔', unlock: 'C6', price: 5 },
];

export const PRICE = { wrap: 6, perIngredient: 2, snack: 4, drink: 5, syrup: 3 };

// 工位时序，单位秒。肉柱周期仅用于装饰性脉动，切片不再判定火候。
export const TIMING = {
  meatCyclePeriod: 4.0,
  // 旧版调用仍保留这两个字段，但烤肉现在只检查库存数量。
  bestWindow: 0.35,
  bestWindowUpgraded: 0.55,
  sliceTrayCap: 3,
  restock: 1.5,
  roll: 0.6,
  pack: 0.5,
  incinerate: 1.0,
  fryCook: 8.0, fryBestUntil: 11.0, fryBurntAt: 14.0, fryTrayCap: 2,
  pour: 1.2, pourOverflowAt: 2.4,
  coinLife: 8.0, coinLifePerRep: 0.05, coinLifeMax: 14.0,
  autoRestock: { 1: 6.0, 2: 4.0, 3: 2.0 },
};

// variants 是纯外观变体：只换头部素材，行为数据完全复用宿主，零新增逻辑。
export const CUSTOMERS = [
  { id: 'crystal', name: '硅基晶体人', body: 'humanoid', patience: 1.4, moods: 3, prefer: ['pepper'], avoid: ['drink'], variants: ['chitin'] },
  { id: 'plasma', name: '等离子发光体', body: 'humanoid', patience: 0.65, moods: 3, prefer: ['drink'], penaltyOnTimeout: 5 },
  { id: 'octopus', name: '章鱼星际旅客', body: 'humanoid', patience: 0.9, moods: 3, prefer: ['pepper'], priceMul: 1.4 },
  { id: 'swarm', name: '机械蜂群', body: 'humanoid', patience: 0.85, moods: 1, strictExtra: true },
  { id: 'slime', name: '黏菌集群', body: 'blob', patience: 1.3, moods: 1, prefer: ['syrup'], variants: ['mycelian'] },
  { id: 'astronaut', name: '人类宇航员', body: 'humanoid', patience: 1.0, moods: 1, avoid: ['tentacle', 'sauce'] },
];

export const PATIENCE_BASE = 18.0;
export const PATIENCE_PER_SHOP_LV = 0.15;

// 订单配料种类数随天数变化。
export const ORDER_COMPLEXITY = [
  { fromDay: 1, min: 1, max: 2, drinkChance: 0.15, snackChance: 0.00 },
  { fromDay: 5, min: 2, max: 3, drinkChance: 0.35, snackChance: 0.20 },
  { fromDay: 15, min: 2, max: 4, drinkChance: 0.55, snackChance: 0.35 },
  { fromDay: 20, min: 2, max: 4, drinkChance: 0.70, snackChance: 0.45 },
];

export const SCORING = {
  wA: 0.40, wW: 0.40, wH: 0.20,
  missingPenalty: 0.34, extraPenalty: 0.25,
  friesBestBonus: 1.15,
  tipMin: 0.5, tipRange: 1.5,
  repBase: -6, repRange: 16,
  perfectAt: 0.97, perfectBonus: 0.50,
  timeoutRep: -5,
  acceptAt: 0.75,
};

export const DAY = { total: 30, baseSeconds: 32, perDay: 1, perShopLevel: 4, maxSeconds: 55 };

export const UPGRADES_A = [
  { id: 'A1', name: 'ARM-7 培训 Lv1', cost: 200, effect: 'autoRestock:1' },
  { id: 'A2', name: '自动切肉机', cost: 450, effect: 'autoSlice' },
  { id: 'A3', name: 'ARM-7 快速补给', cost: 600, effect: 'fastMeatRestock' },
  { id: 'A4', name: '自动卷饼机', cost: 900, effect: 'autoRoll' },
  { id: 'A5', name: 'ARM-7 培训 Lv2', cost: 1200, effect: 'autoRestock:2', requires: 'A1' },
  { id: 'A6', name: '自动包装机', cost: 1600, effect: 'autoPack' },
  { id: 'A7', name: '自动炸锅', cost: 2200, effect: 'autoFry', requires: 'C2' },
  { id: 'A8', name: '自动饮料机', cost: 2800, effect: 'autoPour', requires: 'C1' },
  { id: 'A9', name: 'ARM-7 培训 Lv3', cost: 3600, effect: 'autoRestock:3', requires: 'A5' },
  { id: 'A10', name: '清扫机器人改装', cost: 5000, effect: 'autoCoin' },
];

export const UPGRADES_B = [
  { level: 1, name: '折叠摊位', cost: 0, priceMul: 1.0, queueCap: 3 },
  { level: 2, name: '霓虹灯箱摊', cost: 1800, priceMul: 1.5, queueCap: 4 },
  { level: 3, name: '悬浮舱餐厅', cost: 4500, priceMul: 2.2, queueCap: 5 },
  { level: 4, name: '三星大厅', cost: 9000, priceMul: 3.0, queueCap: 5 },
];

export const UPGRADES_C = [
  { id: 'C1', name: '反物质气泡水', cost: 200, unlocks: 'drink:soda' },
  { id: 'C2', name: '陨石薯条', cost: 900, unlocks: 'extra:fries' },
  { id: 'C3', name: '星尘糖浆', cost: 1400, unlocks: 'extra:syrup' },
  { id: 'C4', name: '超新星浓缩汁', cost: 2000, unlocks: 'drink:nova' },
  { id: 'C5', name: '反物质辣椒', cost: 3000, unlocks: 'slot:pepper' },
  { id: 'C6', name: '等离子奶昔', cost: 4000, unlocks: 'drink:plasma' },
  { id: 'C7', name: '双柱豪华卷', cost: 6000, unlocks: 'deluxe' },
];

// 关卡通关后在无尽模式中解锁的高级设备。它们仍然需要手动购买，
// 只扩展经营上限，不替玩家完成出餐拖拽。
export const UPGRADES_D = [
  { id: 'D1', name: '量子保鲜舱', cost: 2500, effect: '星币停留时间 +4 秒' },
  { id: 'D2', name: '引力扩容台', cost: 4000, effect: '队列上限 +1' },
  { id: 'D3', name: '相位包装器', cost: 6000, effect: '包装耗时 -30%' },
];

export const EVENTS = [
  { id: 'scavenger', fromDay: 3, taps: 3, reward: 1.5, blocksSlot: true },
  { id: 'thief', fromDay: 8, taps: 5, teleportEvery: 2.0, fine: 200 },
  { id: 'critic', fromDay: 12, chargeSeconds: 12, repOnFail: -15, repOnCalm: 5 },
  { id: 'worm', fromDay: 18, orders: 5, patience: 45, slots: 2, reward: 6.0, repOnFail: -20 },
];

export const INSPECTOR = [
  { star: 1, day: 5, minScore: 0.80, minRep: 30, starMul: 1.5, unlocks: 'slot:sauce' },
  { star: 2, day: 15, minScore: 0.88, minRep: 90, starMul: 2.5, unlocks: 'tier2' },
  { star: 3, day: 30, minScore: 0.90, minRep: 0, starMul: 4.0, consecutive: 3, ending: true },
];

export const RIDDLES = [
  { id: 'volcano', need: { pepper: 2 }, art: 'riddle_volcano' },
  { id: 'earth', forbid: ['tentacle', 'sauce'], art: 'riddle_earth' },
  { id: 'nova', need: { syrup: 1 }, needDrink: 'nova', art: 'riddle_nova' },
  { id: 'frost', needDrink: 'plasma', art: 'riddle_frost' },
  { id: 'triple', need: { meat: 3 }, art: 'riddle_triple' },
  { id: 'plain', need: { meat: 1 }, maxKinds: 1, art: 'riddle_plain' },
];

export const INSPECTOR_RETRY = { delayDays: 3, maxRetries: 2 };
