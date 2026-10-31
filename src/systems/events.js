import { EVENTS, PALETTE } from '../data.js';
import { state } from '../core/state.js';

export const eventState = { active: null, shake: 0, particles: [], hooks: {} };

export function setEventHooks(hooks = {}) { eventState.hooks = hooks; }

export function triggerEvent(eventId) {
  const def = EVENTS.find((item) => item.id === eventId);
  if (!def) return null;
  eventState.active = {
    def, tapsLeft: def.taps || 3, elapsed: 0, teleportIn: def.teleportEvery || 0,
    charge: def.chargeSeconds || 0, ordersLeft: def.orders || 0, slots: def.slots || 1,
    x: 880, y: 205, resolved: false,
  };
  eventState.hooks.onStart?.(eventState.active);
  return eventState.active;
}

function rewardActive() {
  const active = eventState.active;
  if (active.def.id === 'scavenger') state.coins += Math.round(active.def.reward * 50);
  if (active.def.id === 'thief') state.coins += 120;
  if (active.def.id === 'critic') state.rep += active.def.repOnCalm;
  if (active.def.id === 'worm') state.coins += Math.round(active.def.reward * 100);
  active.resolved = true;
  eventState.hooks.onResolve?.(active, true);
}

export function hitEvent() {
  const active = eventState.active;
  if (!active || active.resolved || active.def.id === 'worm') return false;
  active.tapsLeft -= 1;
  eventState.shake = 4;
  for (let index = 0; index < 6; index += 1) eventState.particles.push({ x: active.x, y: active.y - 40, vx: (index - 2.5) * 42, vy: -100 - index * 12, age: 0, color: PALETTE.gold });
  eventState.hooks.onBonk?.(active);
  if (active.tapsLeft <= 0) rewardActive();
  return true;
}

export function serveEventOrder() {
  const active = eventState.active;
  if (!active || active.def.id !== 'worm' || active.resolved) return false;
  active.ordersLeft -= 1;
  if (active.ordersLeft <= 0) rewardActive();
  return true;
}

export function updateEvents(dt) {
  eventState.shake = Math.max(0, eventState.shake - dt * 32);
  const active = eventState.active;
  if (active && !active.resolved) {
    active.elapsed += dt;
    if (active.def.id === 'thief') {
      active.teleportIn -= dt;
      if (active.teleportIn <= 0) {
        active.x = 220 + Math.random() * 820;
        active.teleportIn = active.def.teleportEvery;
        eventState.hooks.onTeleport?.(active);
      }
      if (active.elapsed >= 12) { state.coins = Math.max(0, state.coins - active.def.fine); active.resolved = true; eventState.hooks.onResolve?.(active, false); }
    }
    if (active.def.id === 'critic') {
      active.charge -= dt;
      if (active.charge <= 0) { state.rep += active.def.repOnFail; active.resolved = true; eventState.hooks.onResolve?.(active, false); }
    }
    if (active.def.id === 'worm' && active.elapsed >= active.def.patience) { state.rep += active.def.repOnFail; active.resolved = true; eventState.hooks.onResolve?.(active, false); }
  }
  for (let index = eventState.particles.length - 1; index >= 0; index -= 1) {
    const particle = eventState.particles[index]; particle.age += dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 300 * dt;
    if (particle.age > 0.5) eventState.particles.splice(index, 1);
  }
  if (eventState.active?.resolved && eventState.active.elapsed > 1) eventState.active = null;
}

export function maybeEvent(day = state.day, rng = Math.random) {
  const available = EVENTS.filter((item) => item.fromDay <= day);
  if (!available.length || rng() > 0.18) return null;
  return triggerEvent(available[Math.floor(rng() * available.length)].id);
}
