import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
const calls = [];
const menuAudio = {
  paused: true,
  loop: false,
  volume: 0,
  currentTime: 0,
  play() {
    calls.push('play');
    this.paused = false;
    return Promise.resolve();
  },
  pause() {
    calls.push('pause');
    this.paused = true;
  },
};

globalThis.localStorage = {
  getItem: (key) => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, value),
};
globalThis.document = {
  querySelector: (selector) => selector === '#menu-theme-audio' ? menuAudio : null,
};

const audio = await import('../src/core/audio.js?html-track-test=1');

test('主题曲无需等待 WebAudio 解锁即可同步播放且重复调用不重播', async () => {
  assert.equal(audio.bgm('bgm_menu'), true);
  await Promise.resolve();
  assert.equal(calls.filter((item) => item === 'play').length, 1);
  assert.equal(audio.bgm('bgm_menu'), true);
  assert.equal(calls.filter((item) => item === 'play').length, 1);
  assert.equal(audio.audioTest.activeBgm, 'bgm_menu');
});
