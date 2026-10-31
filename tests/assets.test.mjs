import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { test } from 'node:test';
import { ASSET_GROUPS, ASSET_SPECS, IMAGE_MANIFEST } from '../src/assets-manifest.js';
import { CUSTOMERS } from '../src/data.js';
import { clearCustomers, spawn } from '../src/entities/customer.js';

const IMAGE_DIR = new URL('../assets/images/', import.meta.url);

function assetKey(file) {
  return file.replace(/\.(?:png|jpg|svg)$/, '');
}

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), hasAlpha: [4, 6].includes(buffer[25]) || buffer.includes(Buffer.from('tRNS')) };
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), hasAlpha: false };
    }
    offset += 2 + length;
  }
  throw new Error('JPEG dimensions not found');
}

test('美术规格清单的 87 个独立素材全部存在且无额外占位文件', async () => {
  const expected = ASSET_SPECS.map(({ file }) => file).sort();
  const actual = (await readdir(IMAGE_DIR)).filter((file) => /\.(?:png|jpg|svg)$/i.test(file)).sort();
  assert.equal(expected.length, 87);
  assert.deepEqual(actual, expected);
  assert.deepEqual(Object.keys(IMAGE_MANIFEST).sort(), expected.map(assetKey).sort());
});

test('素材尺寸、透明通道和文件预算符合美术规格', async () => {
  let total = 0;
  for (const spec of ASSET_SPECS) {
    const url = new URL(`../assets/images/${spec.file}`, import.meta.url);
    const info = await stat(url);
    const buffer = await readFile(url);
    total += info.size;
    assert.ok(info.size > 128, `${spec.file} 不是有效成品素材`);
    const limitKb = spec.file.startsWith('bg_') ? 400 : 200;
    assert.ok(info.size <= limitKb * 1024, `${spec.file} 超过单文件预算`);
    if (spec.file.endsWith('.svg')) {
      const svg = buffer.toString('utf8');
      assert.match(svg, /<svg\b/);
      assert.match(svg, /<symbol\b/g);
      continue;
    }
    const dimensions = spec.file.endsWith('.png') ? pngDimensions(buffer) : jpegDimensions(buffer);
    assert.deepEqual({ width: dimensions.width, height: dimensions.height }, { width: spec.width, height: spec.height }, `${spec.file} 尺寸不符`);
    if (spec.file.endsWith('.png') && !['ui_headline.png', 'ui_landscape_hint.png'].includes(spec.file)) {
      assert.equal(dimensions.hasAlpha, true, `${spec.file} 缺少透明通道`);
    }
  }
  assert.ok(total <= 5 * 1024 * 1024, `图片总包 ${total} bytes 超过 5MB`);
});

test('所有正式素材都有同名锚点且运行时不允许占位图降级', async () => {
  const anchors = JSON.parse(await readFile(new URL('../assets/anchors.json', import.meta.url), 'utf8'));
  const expected = Object.fromEntries(ASSET_SPECS.map(({ file, anchor }) => [assetKey(file), anchor]));
  assert.deepEqual(anchors, expected);
  const loader = await readFile(new URL('../src/core/assets.js', import.meta.url), 'utf8');
  assert.doesNotMatch(loader, /makePlaceholder|dataset\.assetName/);
  assert.match(loader, /Missing required image/);
});

test('顾客、事件和评审官的每个随机外观都有独立头像素材', () => {
  assert.equal(ASSET_GROUPS.bodies.length, 3);
  const heads = new Set(ASSET_GROUPS.heads.map(({ file }) => assetKey(file)));
  const required = [
    'head_crystal_angry', 'head_crystal_neutral', 'head_crystal_happy',
    'head_plasma_angry', 'head_plasma_neutral', 'head_plasma_happy',
    'head_octopus_angry', 'head_octopus_neutral', 'head_octopus_happy',
    'head_swarm', 'head_slime', 'head_mycelian', 'head_chitin', 'head_astronaut',
    'head_worm', 'head_scavenger', 'head_thief', 'head_critic',
    'head_inspector_a', 'head_inspector_b', 'head_inspector_c',
  ];
  assert.deepEqual([...heads].sort(), required.sort());

  for (const def of CUSTOMERS) {
    const variants = [def.id, ...(def.variants || [])];
    variants.forEach((expected, index) => {
      const customer = spawn(def, 0, null, { rng: () => (index + 0.25) / variants.length });
      assert.equal(customer.headId, expected, `${def.id} 的随机外观 ${expected} 未接入`);
      const moods = ['crystal', 'plasma', 'octopus'].includes(expected) ? ['angry', 'neutral', 'happy'] : [null];
      for (const mood of moods) {
        const key = mood ? `head_${expected}_${mood}` : `head_${expected}`;
        assert.ok(heads.has(key), `${key} 不在正式素材清单`);
      }
    });
  }
  clearCustomers();
});
