import { DAY, PALETTE } from '../data.js';
import { getAudioSettings } from '../core/audio.js';

const hud = typeof document === 'undefined' ? null : document.querySelector('#hud');

export function mountHud(onMute = () => {}, onMenu = () => {}, onPause = () => {}) {
  if (!hud) return;
  hud.innerHTML = `<div class="hud-brand"><span class="brand-star">★</span><span>虫洞卷饼摊</span><small id="hud-mode">关卡模式</small></div><div class="hud-stats"><div class="hud-stat hud-stat-coins"><small><span class="hud-coin-mark">◈</span> 星币</small><strong id="hud-coins">000000</strong></div><div class="hud-stat"><small>口碑</small><strong id="hud-rep">000</strong></div><div class="hud-stat"><small>进度</small><strong id="hud-day">关卡 01/${DAY.total}</strong></div><div class="hud-stars" id="hud-stars" aria-label="星级"></div></div><div class="hud-time"><div class="hud-time-track"><i id="hud-time-fill"></i></div><strong id="hud-time">000</strong></div><div class="hud-actions"><button id="pause-btn" class="icon-btn" title="暂停营业" aria-label="暂停营业">Ⅱ</button><button id="menu-btn" class="icon-btn" title="营业菜单" aria-label="营业菜单">☰</button><button id="mute-btn" class="icon-btn" title="静音" aria-label="静音">♪</button></div>`;
  const muteButton = hud.querySelector('#mute-btn');
  const syncMuteButton = () => {
    const muted = getAudioSettings().muted;
    muteButton.dataset.muted = String(muted);
    muteButton.textContent = muted ? '×' : '♪';
    muteButton.title = muted ? '开启声音' : '静音';
    muteButton.setAttribute('aria-label', muteButton.title);
  };
  syncMuteButton();
  hud.querySelector('#pause-btn').addEventListener('click', () => onPause());
  hud.querySelector('#menu-btn').addEventListener('click', () => onMenu());
  muteButton.addEventListener('click', () => {
    const muted = !getAudioSettings().muted;
    onMute(muted);
    syncMuteButton();
  });
}

export function updateHud(data) {
  if (!hud) return;
  const pauseButton = hud.querySelector('#pause-btn');
  if (pauseButton) {
    const paused = Boolean(data.paused);
    pauseButton.textContent = paused ? '▶' : 'Ⅱ';
    pauseButton.title = paused ? '继续营业' : '暂停营业';
    pauseButton.setAttribute('aria-label', paused ? '继续营业' : '暂停营业');
  }
  const muteButton = hud.querySelector('#mute-btn');
  if (muteButton) {
    const muted = getAudioSettings().muted;
    muteButton.dataset.muted = String(muted);
    muteButton.textContent = muted ? '×' : '♪';
    muteButton.title = muted ? '开启声音' : '静音';
    muteButton.setAttribute('aria-label', muteButton.title);
  }
  hud.querySelector('#hud-coins').textContent = String(Math.round(data.coins)).padStart(6, '0');
  const rep = Math.max(-99, Math.min(999, Math.round(data.rep)));
  hud.querySelector('#hud-rep').textContent = rep < 0 ? `-${String(-rep).padStart(2, '0')}` : String(rep).padStart(3, '0');
  const endless = data.mode === 'endless';
  hud.querySelector('#hud-mode').textContent = endless ? '无尽模式 · 高级设备' : '关卡模式 · 30 日挑战';
  hud.querySelector('#hud-day').textContent = endless ? `波次 ${String(data.day).padStart(2, '0')}` : `关卡 ${String(data.day).padStart(2, '0')}/${DAY.total}`;
  hud.querySelector('#hud-time').textContent = String(Math.ceil(data.remaining)).padStart(3, '0');
  hud.querySelector('#hud-time-fill').style.width = `${Math.max(0, Math.min(100, data.timeRatio * 100))}%`;
  hud.querySelector('#hud-time-fill').style.background = data.timeRatio < 0.2 ? PALETTE.alert : PALETTE.neonCyan;
  hud.querySelector('#hud-stars').textContent = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
}
