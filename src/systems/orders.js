import { DRINKS, EXTRAS, ORDER_COMPLEXITY, PRICE, RIDDLES, SLOTS } from '../data.js';

const WRAP_KEYS = ['meat', 'tentacle', 'sauce', 'pepper', 'fries', 'syrup'];

function has(unlocked, id) {
  if (Array.isArray(unlocked)) return unlocked.includes(id);
  if (unlocked instanceof Set) return unlocked.has(id);
  return Boolean(unlocked?.menuC?.includes(id) || unlocked?.[id] || (id === 'star1' && unlocked?.stars >= 1));
}

function complexity(day) {
  return ORDER_COMPLEXITY.filter((row) => row.fromDay <= day).at(-1);
}

function pickWeighted(items, weights, rng) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = rng() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return index;
  }
  return items.length - 1;
}

function unlockedIngredients(unlocked) {
  return SLOTS.filter((slot) => !slot.unlock || has(unlocked, slot.unlock)).map((slot) => slot.id);
}

function priceOf(wrap, snack, drink) {
  const ingredientCount = WRAP_KEYS.reduce((sum, key) => sum + wrap[key], 0);
  return PRICE.wrap + ingredientCount * PRICE.perIngredient + (snack ? PRICE.snack : 0) + (drink ? PRICE.drink : 0) + wrap.syrup * PRICE.syrup;
}

export function makeOrder(day, customerDef, unlocked = {}, rng = Math.random) {
  const curve = complexity(day);
  const wrap = Object.fromEntries(WRAP_KEYS.map((key) => [key, 0]));
  const pool = unlockedIngredients(unlocked);
  const kinds = Math.min(pool.length, curve.min + Math.floor(rng() * (curve.max - curve.min + 1)));
  const available = [...pool];
  for (let count = 0; count < kinds; count += 1) {
    const weights = available.map((id) => customerDef.prefer?.includes(id) ? 2.5 : customerDef.avoid?.includes(id) ? 0.25 : 1);
    const picked = pickWeighted(available, weights, rng);
    wrap[available[picked]] = has(unlocked, 'C7') && available[picked] === 'meat' && rng() < 0.28 ? 2 : 1;
    available.splice(picked, 1);
  }
  if (has(unlocked, EXTRAS.syrup.unlock) && rng() < 0.24) wrap.syrup = 1;
  const snack = has(unlocked, EXTRAS.fries.unlock) && rng() < curve.snackChance ? 'fries' : null;
  const drinks = DRINKS.filter((drink) => has(unlocked, drink.unlock));
  const drinkChance = customerDef.avoid?.includes('drink') ? curve.drinkChance * 0.25 : customerDef.prefer?.includes('drink') ? Math.min(1, curve.drinkChance * 1.6) : curve.drinkChance;
  const drink = drinks.length && rng() < drinkChance ? drinks[Math.floor(rng() * drinks.length)].id : null;
  return {
    id: `o${day}-${Math.floor(rng() * 1e9).toString(36)}`,
    wrap, snack, drink, riddle: null,
    basePrice: priceOf(wrap, snack, drink),
  };
}

export function makeRiddleOrder(riddleDef, unlocked = {}, rng = Math.random) {
  const rule = typeof riddleDef === 'string' ? RIDDLES.find((entry) => entry.id === riddleDef) : riddleDef;
  const wrap = Object.fromEntries(WRAP_KEYS.map((key) => [key, 0]));
  for (const [key, value] of Object.entries(rule.need || {})) wrap[key] = value;
  if (!Object.values(wrap).some(Boolean) && rule.id !== 'earth') wrap.meat = 1;
  const drink = rule.needDrink || null;
  return {
    id: `r-${rule.id}-${Math.floor(rng() * 1e9).toString(36)}`,
    wrap, snack: null, drink, riddle: rule.id, riddleRule: rule,
    basePrice: priceOf(wrap, null, drink),
  };
}
