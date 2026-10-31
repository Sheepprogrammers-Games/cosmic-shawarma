import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('游戏内菜单提供暂停、音量和返回主页控件', () => {
  const menu = fs.readFileSync(new URL('../src/ui/game-menu.js', import.meta.url), 'utf8');
  const hud = fs.readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  for (const id of ['game-menu-pause', 'game-menu-music-volume', 'game-menu-sfx-volume', 'game-menu-home']) {
    assert.match(menu, new RegExp(`id=\\"${id}\\"`), `${id} 缺失`);
  }
  assert.match(hud, /id="pause-btn"/);
  assert.match(hud, /id="menu-btn"/);
});
