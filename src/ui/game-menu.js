import { dayRuntime, setPaused } from '../systems/day.js';
import { getAudioSettings, setMuted, setMusicVolume, setSfxVolume } from '../core/audio.js';

const panel = typeof document === 'undefined' ? null : document.querySelector('#game-menu-panel');
let onHome = () => {};
let openState = false;
let pausedBeforeOpen = false;
let pauseOverride = null;

if (panel) {
  panel.addEventListener('click', (event) => {
    if (event.target === panel) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openState) hide();
  });
}

function render() {
  if (!panel) return;
  const audio = getAudioSettings();
  const paused = Boolean(dayRuntime.paused);
  panel.innerHTML = `<article class="game-menu-card" role="dialog" aria-label="营业菜单">
    <header class="game-menu-head"><div><span class="game-menu-kicker">LIVE CONTROL</span><h2>营业菜单</h2></div><button class="icon-btn" id="game-menu-close" title="关闭菜单" aria-label="关闭菜单">×</button></header>
    <div class="game-menu-status"><span class="status-dot"></span><b>${paused ? '已暂停' : '营业中'}</b><small>打开菜单时会暂停顾客与倒计时</small></div>
    <button class="game-menu-pause" id="game-menu-pause" type="button">${paused ? '▶ 继续营业' : 'Ⅱ 暂停营业'}</button>
    <section class="game-menu-audio" aria-label="游戏内音量"><div class="game-menu-section-title"><span>AUDIO</span><button id="game-menu-mute" type="button">${audio.muted ? '开启声音' : '静音全部声音'}</button></div>
      <label class="setting-row"><span><b>BGM</b><output id="game-music-volume-value">${Math.round(audio.musicVolume * 100)}%</output></span><input id="game-menu-music-volume" type="range" min="0" max="1" step="0.01" value="${audio.musicVolume}" aria-label="游戏内音乐音量"></label>
      <label class="setting-row"><span><b>SFX</b><output id="game-sfx-volume-value">${Math.round(audio.sfxVolume * 100)}%</output></span><input id="game-menu-sfx-volume" type="range" min="0" max="1" step="0.01" value="${audio.sfxVolume}" aria-label="游戏内音效音量"></label>
    </section>
    <button class="game-menu-home" id="game-menu-home" type="button">⌂ 返回主页</button>
  </article>`;

  panel.querySelector('#game-menu-close').addEventListener('click', () => hide());
  panel.querySelector('#game-menu-pause').addEventListener('click', () => {
    setPaused(!dayRuntime.paused);
    pauseOverride = dayRuntime.paused;
    render();
  });
  const musicSlider = panel.querySelector('#game-menu-music-volume');
  const sfxSlider = panel.querySelector('#game-menu-sfx-volume');
  musicSlider.addEventListener('input', (event) => {
    const value = setMusicVolume(event.currentTarget.value);
    panel.querySelector('#game-music-volume-value').textContent = `${Math.round(value * 100)}%`;
  });
  sfxSlider.addEventListener('input', (event) => {
    const value = setSfxVolume(event.currentTarget.value);
    panel.querySelector('#game-sfx-volume-value').textContent = `${Math.round(value * 100)}%`;
  });
  panel.querySelector('#game-menu-mute').addEventListener('click', (event) => {
    const next = !getAudioSettings().muted;
    setMuted(next);
    event.currentTarget.textContent = next ? '开启声音' : '静音全部声音';
  });
  panel.querySelector('#game-menu-home').addEventListener('click', () => {
    hide({ resume: false });
    onHome();
  });
}

export function show(options = {}) {
  if (!panel) return;
  onHome = options.onHome || (() => {});
  pausedBeforeOpen = Boolean(dayRuntime.paused);
  pauseOverride = null;
  setPaused(true);
  openState = true;
  render();
  panel.hidden = false;
}

export function hide({ resume = true } = {}) {
  if (!panel) return;
  panel.hidden = true;
  panel.innerHTML = '';
  openState = false;
  if (resume) setPaused(pauseOverride == null ? pausedBeforeOpen : pauseOverride);
  pauseOverride = null;
}

export function toggle(options = {}) {
  if (openState) hide();
  else show(options);
}

export function togglePause() {
  const next = !dayRuntime.paused;
  setPaused(next);
  return next;
}

export const gameMenuTest = { get open() { return openState; } };
