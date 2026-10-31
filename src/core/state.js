const SAVE_KEY = 'cosmic_shawarma_save_v1';

function fresh() {
  return {
    version: 1, day: 1, coins: 0, rep: 0, stars: 0,
    level: 1, xp: 0, nextBuffs: {},
    mode: 'stage', stageProgress: 0, stageCompleted: false,
    endlessUnlocked: false, endlessWave: 1, endlessBest: 0,
    achievements: [],
    shopLevel: 1, upgradesA: [], upgradesD: [], menuC: [],
    inspector: { pending: 1, retries: 0, nextDay: 5, usedRiddles: [] },
    stats: { revenue: 0, orders: 0, perfect: 0, maxTicket: 0, coinsCollected: 0 },
  };
}

export const state = fresh();

function replace(next) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
}

export function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!parsed || parsed.version !== 1) throw new Error('save version mismatch');
    const defaults = fresh();
    replace({
      ...defaults,
      ...parsed,
      stats: { ...defaults.stats, ...(parsed.stats || {}) },
      inspector: { ...defaults.inspector, ...(parsed.inspector || {}) },
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      upgradesA: Array.isArray(parsed.upgradesA) ? parsed.upgradesA : [],
      upgradesD: Array.isArray(parsed.upgradesD) ? parsed.upgradesD : [],
      menuC: Array.isArray(parsed.menuC) ? parsed.menuC : [],
      nextBuffs: parsed.nextBuffs && typeof parsed.nextBuffs === 'object' ? parsed.nextBuffs : {},
    });
    // 兼容上一版已完成 30 天但还没有进度字段的存档。
    if (!state.stageProgress && state.day > 1) state.stageProgress = Math.min(30, state.day - 1);
    if (state.day > 30 && state.stageProgress >= 30) {
      state.stageCompleted = true;
      state.endlessUnlocked = true;
    }
  } catch {
    replace(fresh());
  }
  return state;
}

export function reset() {
  replace(fresh());
  localStorage.removeItem(SAVE_KEY);
  return state;
}
