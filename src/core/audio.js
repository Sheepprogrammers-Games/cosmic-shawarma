import { buf } from './assets.js';

let context = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let muted = false;
let musicVolume = 0.72;
let sfxVolume = 1;
const gainPool = [];
const music = [];
const decodedTracks = new Map();
let musicToken = 0;
let activeBgmName = null;
const menuAudio = typeof document === 'undefined' ? null : document.querySelector('#menu-theme-audio');
const AUDIO_PREFS_KEY = 'cosmic_shawarma_audio_v1';

try {
  const saved = JSON.parse(localStorage.getItem(AUDIO_PREFS_KEY));
  if (saved && Number.isFinite(saved.musicVolume)) musicVolume = Math.max(0, Math.min(1, saved.musicVolume));
  if (saved && Number.isFinite(saved.sfxVolume)) sfxVolume = Math.max(0, Math.min(1, saved.sfxVolume));
  if (saved && typeof saved.muted === 'boolean') muted = saved.muted;
} catch {}

function persistAudioPrefs() {
  try { localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify({ musicVolume, sfxVolume, muted })); } catch {}
}

const TONES = {
  sfx_slice: 260, sfx_add: 360, sfx_roll: 460, sfx_pack: 560, sfx_serve: 720,
  sfx_coin: 880, sfx_bonk: 150, sfx_deny: 110, sfx_perfect: 1040, sfx_upgrade: 640,
  sfx_maw_chew: 92, sfx_maw_burp: 72, sfx_slug: 130, sfx_roach: 510, sfx_squish: 84,
  sfx_pepper_pop: 760, sfx_tentacle: 220, sfx_burnt: 170, sfx_pour: 310,
};

function ensureGain() {
  const gain = gainPool.pop() || context.createGain();
  gain.connect(sfxBus || master);
  return gain;
}

export async function unlock() {
  if (!context) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    context = new Audio();
    master = context.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(context.destination);
    musicBus = context.createGain(); musicBus.gain.value = musicVolume; musicBus.connect(master);
    sfxBus = context.createGain(); sfxBus.gain.value = sfxVolume; sfxBus.connect(master);
  }
  if (context.state === 'suspended') await context.resume();
  return true;
}

export function sfx(name, { pitch = 1, gain = 1 } = {}) {
  if (!context || muted) return false;
  const amp = ensureGain();
  const osc = context.createOscillator();
  const start = context.currentTime;
  osc.type = name.includes('maw') || name.includes('slug') ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime((TONES[name] || 420) * pitch, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, (TONES[name] || 420) * pitch * 0.72), start + 0.12);
  amp.gain.setValueAtTime(Math.min(0.32, 0.18 * gain), start);
  amp.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
  osc.connect(amp); osc.start(start); osc.stop(start + 0.16);
  osc.onended = () => { osc.disconnect(); amp.disconnect(); if (gainPool.length < 16) gainPool.push(amp); };
  return true;
}

export function voice(name, pitchRange = [-4, 4]) {
  const semitone = pitchRange[0] + Math.random() * (pitchRange[1] - pitchRange[0]);
  return sfx(name, { pitch: 2 ** (semitone / 12), gain: 0.8 });
}

export function bgm(name, { loop = true } = {}) {
  // 真实主题曲使用 HTMLAudioElement；它必须能在点击回调的同步调用栈里
  // play()，否则浏览器会把异步 unlock().then(...) 视为非用户手势而拦截。
  if (name === 'bgm_menu') {
    if (muted) return false;
    // 菜单上的任意点击都会冒泡到 document；同一首音乐不能因为点击按钮而重播。
    if (activeBgmName === name) {
      // 浏览器可能在切页/锁屏后把 HTML 音频暂停；恢复播放即可，不能把进度重置。
      if (menuAudio && menuAudio.paused) resumeHtmlTrack(menuAudio, musicToken);
      return loop;
    }
    // 页面上的 <audio autoplay> 可能已经在播放；接管它时不要先 pause+reset，
    // 否则玩家第一次点击菜单就会听到歌曲从头重播。
    const preserveHtmlTrack = menuAudio && !menuAudio.paused;
    if (!preserveHtmlTrack) stopBgm();
    activeBgmName = name;
    const token = musicToken;
    const started = startHtmlTrack(token, loop);
    if (!started && token === musicToken) activeBgmName = null;
    return started;
  }
  if (!context || muted) return false;
  if (activeBgmName === name) return loop;
  stopBgm();
  activeBgmName = name;
  const token = musicToken;
  const raw = buf(name);
  if (raw && typeof context.decodeAudioData === 'function') {
    const cached = decodedTracks.get(name);
    if (cached) {
      startTrack(cached, token, loop);
    } else {
      // 复制 ArrayBuffer，避免 decodeAudioData 在部分浏览器中转移底层内存。
      context.decodeAudioData(raw.slice(0)).then((decoded) => {
        decodedTracks.set(name, decoded);
        if (token === musicToken && !muted) startTrack(decoded, token, loop);
      }).catch(() => {
        // 音乐解码失败时静默降级到原有合成器，不影响玩法。
        if (token === musicToken) startSynth(name, loop);
      });
    }
    return loop;
  }
  return startSynth(name, loop);
}

function startHtmlTrack(token, loop) {
  let element = menuAudio;
  if (!element && typeof Audio !== 'undefined') {
    element = new Audio('assets/audio/银河沙威玛.mp3');
    element.preload = 'auto';
  }
  if (!element || token !== musicToken || muted) return false;
  element.loop = loop;
  element.volume = musicVolume;
  const handle = { stop() { element.pause(); element.currentTime = 0; } };
  music.push(handle);
  try {
    const playResult = element.play();
    // autoplay 被浏览器拦截时释放 active 标记，让下一次真实用户点击可以重试。
    playResult?.catch?.(() => {
      if (token !== musicToken) return;
      const index = music.indexOf(handle);
      if (index >= 0) music.splice(index, 1);
      activeBgmName = null;
    });
  } catch {
    if (token === musicToken) {
      const index = music.indexOf(handle);
      if (index >= 0) music.splice(index, 1);
      activeBgmName = null;
    }
    return false;
  }
  return true;
}

function resumeHtmlTrack(element, token) {
  try {
    const playResult = element.play();
    playResult?.catch?.(() => { if (token === musicToken) activeBgmName = null; });
  } catch {
    if (token === musicToken) activeBgmName = null;
  }
}

function startTrack(buffer, token, loop) {
  if (!context || token !== musicToken || muted) return false;
  const gain = context.createGain();
  gain.gain.value = 0.28;
  gain.connect(musicBus || master);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.connect(gain);
  source.start();
  music.push(source, gain);
  return true;
}

function startSynth(name, loop) {
  const gain = context.createGain(); gain.gain.value = 0.035; gain.connect(musicBus || master);
  for (const [index, ratio] of [1, 1.5, 2].entries()) {
    const osc = context.createOscillator(); osc.type = index === 0 ? 'sine' : 'triangle'; osc.frequency.value = (name === 'bgm_star' ? 220 : 146.83) * ratio; osc.connect(gain); osc.start(); music.push(osc);
  }
  music.push(gain);
  return loop;
}

export function stopBgm() {
  musicToken += 1;
  activeBgmName = null;
  for (const node of music.splice(0)) { try { node.stop?.(); node.disconnect?.(); } catch {} }
  // autoplay 可能在脚本接管前就启动了 HTML 音频；即使它尚未登记到 music，也要明确停止。
  if (menuAudio) {
    try { menuAudio.pause(); menuAudio.currentTime = 0; } catch {}
  }
}

export function setMuted(value) {
  muted = Boolean(value);
  if (master && context) master.gain.setTargetAtTime(muted ? 0 : 0.7, context.currentTime, 0.02);
  if (menuAudio) menuAudio.volume = muted ? 0 : musicVolume;
  persistAudioPrefs();
}

export function setMusicVolume(value) {
  musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
  if (musicBus && context) musicBus.gain.setTargetAtTime(musicVolume, context.currentTime, 0.02);
  if (menuAudio) menuAudio.volume = muted ? 0 : musicVolume;
  persistAudioPrefs();
  return musicVolume;
}

export function setSfxVolume(value) {
  sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
  if (sfxBus && context) sfxBus.gain.setTargetAtTime(sfxVolume, context.currentTime, 0.02);
  persistAudioPrefs();
  return sfxVolume;
}

export function getAudioSettings() { return { musicVolume, sfxVolume, muted }; }

export const audioTest = { get context() { return context; }, gainPool, getAudioSettings, get activeBgm() { return activeBgmName; } };
