import { INSPECTOR, INSPECTOR_RETRY, RIDDLES } from '../data.js';
import { save, state } from '../core/state.js';
import { makeRiddleOrder } from './orders.js';

export const inspectorRuntime = { current: null, finalStreak: 0 };

export function isInspectorDay(day = state.day) {
  return state.inspector.pending <= 3 && day >= state.inspector.nextDay;
}

export function startInspection(day = state.day, rng = Math.random) {
  if (!isInspectorDay(day)) return null;
  const target = INSPECTOR[state.inspector.pending - 1];
  const unused = RIDDLES.filter((riddle) => !state.inspector.usedRiddles.includes(riddle.id));
  const source = unused.length ? unused : RIDDLES;
  const riddle = source[Math.floor(rng() * source.length)];
  state.inspector.usedRiddles.push(riddle.id);
  inspectorRuntime.finalStreak = 0;
  inspectorRuntime.current = {
    target, riddle,
    def: { id: 'inspector_a', name: '匿名评审官', body: 'humanoid', patience: 1.2, moods: 1, variants: ['inspector_b', 'inspector_c'] },
    order: makeRiddleOrder(riddle, { stars: state.stars, menuC: state.menuC }, rng),
  };
  save();
  return inspectorRuntime.current;
}

function succeed(target) {
  state.stars = Math.max(state.stars, target.star);
  state.inspector.pending = target.star + 1;
  state.inspector.retries = 0;
  state.inspector.nextDay = INSPECTOR[target.star]?.day || 31;
  inspectorRuntime.current = null;
  save();
  return { passed: true, star: target.star, ending: target.ending || false };
}

function fail(target) {
  state.inspector.retries += 1;
  const exhausted = state.inspector.retries >= INSPECTOR_RETRY.maxRetries;
  if (exhausted && target.ending) state.inspector.nextDay = 31;
  else state.inspector.nextDay = state.day + INSPECTOR_RETRY.delayDays;
  inspectorRuntime.current = null;
  save();
  return { passed: false, star: state.stars, exhausted, ending: Boolean(target.ending) };
}

export function resolveInspection(result) {
  const current = inspectorRuntime.current;
  if (!current) return null;
  if (current.target.star === 3) return recordFinalOrder(result.S, false, false, result.riddleOk);
  const passed = result.S >= current.target.minScore && state.rep >= current.target.minRep && result.riddleOk !== false;
  return passed ? succeed(current.target) : fail(current.target);
}

export function recordFinalOrder(score, isEvent = false, timeout = false, riddleOk = true) {
  const current = inspectorRuntime.current;
  if (!current || current.target.star !== 3) return null;
  if (isEvent || timeout) return { pending: true, streak: inspectorRuntime.finalStreak };
  inspectorRuntime.finalStreak = score >= current.target.minScore && riddleOk ? inspectorRuntime.finalStreak + 1 : 0;
  if (inspectorRuntime.finalStreak >= current.target.consecutive) return succeed(current.target);
  return { pending: true, streak: inspectorRuntime.finalStreak };
}

export function failInspection() {
  return inspectorRuntime.current ? fail(inspectorRuntime.current.target) : null;
}
