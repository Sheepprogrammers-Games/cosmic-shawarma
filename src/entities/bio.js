import { BIO, IDLE, TIMING } from '../data.js';
import { state } from '../core/state.js';

let coinSequence = 0;
export const bioState = {
  time: 0,
  coins: [],
  slimeTrails: [],
  roach: null,
  roachTimer: BIO.roach.everyMin,
  roachRewards: 0,
};

export const maw = {
  frame: 'closed',
  elapsed: 0,
  feed() { this.frame = 'open'; this.elapsed = 0; return TIMING.incinerate; },
  update(dt) {
    this.elapsed += dt;
    const ratio = this.elapsed / TIMING.incinerate;
    this.frame = ratio < 0.25 ? 'open' : ratio < 0.75 ? 'chew' : 'closed';
  },
};

export const slug = {
  x: -80, y: 555, target: null, mode: 'idle',
  chase(coin, trained = false) { this.target = coin; this.mode = trained ? 'collect' : 'eat'; this.x = -80; },
};

export const jelly = {
  y: 128, glow: 1,
  update(dt) {
    this.y = 128 + Math.sin(bioState.time * Math.PI * 2 / 3) * IDLE.jelly.px;
    this.glow = 0.72 + 0.28 * Math.sin(bioState.time * BIO.jelly.bpm / 60 * Math.PI * 2);
  },
};

export const roach = {
  update(dt) {
    const item = bioState.roach;
    if (item) {
      item.x += item.speed * dt;
      if (item.x > 1360 || item.squashed) bioState.roach = null;
      return;
    }
    bioState.roachTimer -= dt;
    if (bioState.roachTimer <= 0) {
      bioState.roach = { x: -60, y: 540, speed: 1060, squashed: false };
      bioState.roachTimer = BIO.roach.everyMin + Math.random() * (BIO.roach.everyMax - BIO.roach.everyMin);
    }
  },
};

export function resetBio() {
  bioState.time = 0; bioState.coins.length = 0; bioState.slimeTrails.length = 0;
  bioState.roach = null; bioState.roachTimer = BIO.roach.everyMin; bioState.roachRewards = 0;
  slug.x = -80; slug.target = null; slug.mode = 'idle';
}

export function createCoin(value, x, y, rep = 0) {
  const preservationBonus = state.upgradesD?.includes('D1') ? 4 : 0;
  const coin = {
    id: `coin-${coinSequence += 1}`, value: Math.max(1, Math.round(value)), x, y,
    age: 0,
    life: Math.min(TIMING.coinLifeMax + preservationBonus, TIMING.coinLife + Math.max(0, rep) * TIMING.coinLifePerRep + preservationBonus),
    claimed: false,
  };
  bioState.coins.push(coin);
  return coin;
}

export function collectCoin(id, onCollect = () => {}) {
  const coin = bioState.coins.find((item) => item.id === id && !item.claimed);
  if (!coin) return false;
  coin.claimed = true;
  onCollect(coin.value, coin);
  if (slug.target === coin) { slug.target = null; slug.mode = 'retreat'; }
  return true;
}

export function squashRoach(onReward = () => {}) {
  if (!bioState.roach || bioState.roach.squashed) return false;
  bioState.roach.squashed = true;
  if (bioState.roachRewards < BIO.roach.dailyCap) {
    bioState.roachRewards += 1;
    onReward(BIO.roach.reward);
  }
  return true;
}

export function forceBio(id) {
  if (id === 'roach') bioState.roach = { x: 80, y: 540, speed: 1060, squashed: false };
  if (id === 'slug' && bioState.coins[0]) slug.chase(bioState.coins[0]);
  return id;
}

export function updateBio(dt, options = {}) {
  bioState.time += dt;
  jelly.update(dt); roach.update(dt); maw.update(dt);
  for (let index = bioState.coins.length - 1; index >= 0; index -= 1) {
    const coin = bioState.coins[index];
    if (coin.claimed) { bioState.coins.splice(index, 1); continue; }
    coin.age += dt;
    if (!slug.target && (options.autoCoin || coin.age >= coin.life)) slug.chase(coin, options.autoCoin);
  }
  if (slug.target) {
    const direction = Math.sign(slug.target.x - slug.x);
    slug.x += direction * BIO.slug.crawlSpeed * dt;
    if (Math.abs(slug.target.x - slug.x) < 8) {
      const coin = slug.target;
      if (slug.mode === 'collect') collectCoin(coin.id, options.onCollect);
      else coin.claimed = true;
      slug.target = null; slug.mode = 'retreat';
    }
    if (bioState.slimeTrails.length < 60) bioState.slimeTrails.push({ x: slug.x, y: slug.y, age: 0 });
  } else if (slug.mode === 'retreat') {
    slug.x -= BIO.slug.crawlSpeed * dt;
    if (slug.x < -80) slug.mode = 'idle';
  }
  for (let index = bioState.slimeTrails.length - 1; index >= 0; index -= 1) {
    bioState.slimeTrails[index].age += dt;
    if (bioState.slimeTrails[index].age > 1.2) bioState.slimeTrails.splice(index, 1);
  }
}
