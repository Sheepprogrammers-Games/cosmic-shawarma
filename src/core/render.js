import { img, anchor as assetAnchor } from './assets.js';

export const glowCache = new Map();
export const tintCache = new Map();

function cached(name, color, kind) {
  const cache = kind === 'glow' ? glowCache : tintCache;
  const key = `${name}:${color}`;
  if (cache.has(key)) return cache.get(key);
  const source = img(name);
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = kind === 'glow' ? 'source-over' : 'source-atop';
  if (kind === 'glow') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.drawImage(source, 0, 0);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  cache.set(key, canvas);
  return canvas;
}

export function sprite(ctx, name, x, y, opt = {}) {
  const source = opt.tint ? cached(name, opt.tint, 'tint') : opt.glow ? cached(name, opt.glow, 'glow') : img(name);
  const anch = opt.anchor || assetAnchor(name);
  const scale = opt.scale ?? 1;
  ctx.save();
  ctx.globalAlpha = opt.alpha ?? 1;
  ctx.translate(x, y);
  ctx.rotate(opt.rot || 0);
  ctx.scale(opt.flipX ? -scale : scale, scale);
  ctx.drawImage(source, -source.width * anch.x, -source.height * anch.y);
  ctx.restore();
}

export function nineSlice(ctx, name, x, y, w, h, inset) {
  const source = img(name);
  const sw = source.width;
  const sh = source.height;
  const xParts = [0, inset, sw - inset, sw];
  const yParts = [0, inset, sh - inset, sh];
  const dx = [x, x + inset, x + w - inset, x + w];
  const dy = [y, y + inset, y + h - inset, y + h];
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) {
    ctx.drawImage(source, xParts[col], yParts[row], xParts[col + 1] - xParts[col], yParts[row + 1] - yParts[row], dx[col], dy[row], dx[col + 1] - dx[col], dy[row + 1] - dy[row]);
  }
}

export function text(ctx, str, x, y, opt = {}) {
  ctx.save();
  ctx.font = `${opt.font || '700'} ${opt.size || 24}px -apple-system, sans-serif`;
  ctx.fillStyle = opt.color || '#F5F0FF';
  ctx.textAlign = opt.align || 'left';
  ctx.textBaseline = opt.baseline || 'alphabetic';
  if (opt.tabular) ctx.fontVariantNumeric = 'tabular-nums';
  ctx.fillText(String(str), x, y);
  ctx.restore();
}

export function bar(ctx, x, y, w, h, ratio, colorFill, colorBg) {
  ctx.fillStyle = colorBg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = colorFill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
}
