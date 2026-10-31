import { DAY } from '../data.js';
import { state } from '../core/state.js';
import { setPaused } from '../systems/day.js';
import { getAudioSettings, setMuted, setMusicVolume, setSfxVolume } from '../core/audio.js';

const panel = typeof document === 'undefined' ? null : document.querySelector('#main-menu');
let startHandler = () => {};
let loading = false;

function stageLevel() {
  return Math.max(1, Math.min(DAY.total, state.day > DAY.total ? 1 : state.day));
}

function render() {
  const progress = Math.max(0, Math.min(DAY.total, state.stageProgress || 0));
  const endless = Boolean(state.endlessUnlocked);
  const audio = getAudioSettings();
  const stageButton = state.stageCompleted ? '重玩 30 日关卡' : progress ? `继续第 ${stageLevel()} 关` : '开始第一天';
  panel.innerHTML = `<article class="main-menu-card menu-shell${loading ? ' is-loading' : ''}"><img class="menu-background" src="assets/images/bg_shop_lv1.jpg" alt="" aria-hidden="true"><header class="menu-identity"><span>STARPORT // 03</span><h1>虫洞卷饼摊</h1><p>COSMIC SHAWARMA</p></header>
    <section class="menu-panel">
      <div class="menu-terminal-head"><span class="status-dot"></span><span>${loading ? 'KITCHEN BOOTING' : 'SYSTEM ONLINE'}</span><i>03-A</i></div>
      <header class="menu-heading"><small>营业控制台</small><h1>开始营业</h1></header>
      <section class="mode-select" aria-label="选择模式">
        <button class="mode-card mode-stage" id="menu-stage" ${loading ? 'disabled' : ''}>
          <span class="mode-icon">★</span><span><b>${stageButton}</b><small>关卡模式 · 30 天三星挑战</small></span><em>进入 →</em>
        </button>
        <button class="mode-card mode-endless" id="menu-endless" ${endless && !loading ? '' : 'disabled'}>
          <span class="mode-icon">∞</span><span><b>无尽模式</b><small>${endless ? `已解锁 · 最高波次 ${state.endlessBest || 0}` : '完成 30 天后解锁'}</small></span><em>${endless ? '进入 →' : '锁定'}</em>
        </button>
      </section>
      <div class="menu-run-meta"><span>DAY <b>${progress}/${DAY.total}</b></span><span>${state.coins || 0} ◈</span><span>${state.stars || 0}/3 ★</span></div>
      <p class="menu-disclosure">本作含 AI 辅助生成的美术与音乐，已由作者编辑整合。</p>
      <section class="menu-audio-dock" aria-label="音频设置"><header><span>AUDIO</span><button id="menu-mute" type="button">${audio.muted ? 'UNMUTE' : 'MUTE'}</button></header><label class="setting-row"><span><b>BGM</b><output id="music-volume-value">${Math.round(audio.musicVolume * 100)}%</output></span><input id="menu-music-volume" type="range" min="0" max="1" step="0.01" value="${audio.musicVolume}" aria-label="音乐音量"></label><label class="setting-row"><span><b>SFX</b><output id="sfx-volume-value">${Math.round(audio.sfxVolume * 100)}%</output></span><input id="menu-sfx-volume" type="range" min="0" max="1" step="0.01" value="${audio.sfxVolume}" aria-label="音效音量"></label></section>
    </section>
  </article>`;
  panel.querySelector('#menu-stage').addEventListener('click', () => { hide(); startHandler('stage'); });
  panel.querySelector('#menu-endless').addEventListener('click', () => { if (endless) { hide(); startHandler('endless'); } });
  const musicSlider = panel.querySelector('#menu-music-volume');
  const sfxSlider = panel.querySelector('#menu-sfx-volume');
  musicSlider.addEventListener('input', (event) => { const value = setMusicVolume(event.currentTarget.value); panel.querySelector('#music-volume-value').textContent = `${Math.round(value * 100)}%`; });
  sfxSlider.addEventListener('input', (event) => { const value = setSfxVolume(event.currentTarget.value); panel.querySelector('#sfx-volume-value').textContent = `${Math.round(value * 100)}%`; });
  panel.querySelector('#menu-mute').addEventListener('click', (event) => { const next = !getAudioSettings().muted; setMuted(next); event.currentTarget.textContent = next ? '开启声音' : '静音全部声音'; });
}

export function show(options = {}) {
  if (!panel) return;
  startHandler = options.onStart || (() => {});
  loading = Boolean(options.loading);
  document.body.classList.add('menu-page');
  setPaused(true);
  render();
  panel.hidden = false;
}

export function hide() {
  if (!panel) return;
  panel.hidden = true;
  panel.innerHTML = '';
  document.body.classList.remove('menu-page');
  setPaused(false);
}
