import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

class Param { setValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} }
class Node { constructor() { this.gain = new Param(); this.frequency = new Param(); } connect() {} disconnect() {} start() {} stop() { queueMicrotask(() => this.onended?.()); } }
class AudioMock { constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; } createGain() { return new Node(); } createOscillator() { return new Node(); } async resume() { this.state = 'running'; } }
globalThis.window = { AudioContext: AudioMock };

const audio = await import('../src/core/audio.js');

test('主菜单主题曲文件存在且使用中文文件名资产', () => {
  const path = new URL('../assets/audio/银河沙威玛.mp3', import.meta.url);
  assert.equal(fs.existsSync(path), true);
  assert.ok(fs.statSync(path).size > 1000);
});

test('首次解锁后音效可播放且静音不影响调用', async () => {
  assert.equal(await audio.unlock(), true); assert.equal(audio.sfx('sfx_coin'), true);
  audio.setMuted(true); assert.equal(audio.sfx('sfx_coin'), false); audio.setMuted(false);
  assert.ok(audio.audioTest.context);
});

test('音乐与音效音量可独立调整', () => {
  assert.equal(audio.setMusicVolume(0.35), 0.35);
  assert.equal(audio.setSfxVolume(0.6), 0.6);
  assert.deepEqual(audio.getAudioSettings(), { musicVolume: 0.35, sfxVolume: 0.6, muted: false });
});

test('重复点击菜单不会重启同一首背景音乐', () => {
  assert.equal(audio.bgm('bgm_theme'), true);
  assert.equal(audio.audioTest.activeBgm, 'bgm_theme');
  assert.equal(audio.bgm('bgm_theme'), true);
  assert.equal(audio.audioTest.activeBgm, 'bgm_theme');
});

test('停止营业音乐不会留下合成器电音', () => {
  audio.stopBgm();
  assert.equal(audio.audioTest.activeBgm, null);
});

test('进入营业时不会调用合成器背景音乐', () => {
  const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /bgm\(['"]bgm_theme['"]\)/);
  assert.match(source, /function playGameplayMusic\(\)\s*\{[\s\S]*?bgm\(['"]bgm_menu['"]\)/);
});
