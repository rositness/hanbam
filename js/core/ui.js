// Общие элементы интерфейса: тосты, модальные окна, конфетти, звуки, романизация.

import { h, icon, clear } from './dom.js';
import { state } from './store.js';
import { bindSpeakButton } from './tts.js';
import { unitOrder, course } from './content.js';

const overlay = () => document.getElementById('overlay-root');

// ---------- Тосты ----------
let toastBox = null;
export function toast(text, { icon: ic = '✨', ms = 2600 } = {}) {
  if (!toastBox) { toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' }); document.body.append(toastBox); }
  const t = h('div', { class: 'toast' }, h('span', { class: 't-icon' }, ic), h('span', null, text));
  toastBox.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}

// ---------- Модальные окна ----------
export function openSheet(content, { centered = false, onClose, dismissable = true } = {}) {
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, centered ? null : h('div', { class: 'sheet-handle' }), content);
  const bd = h('div', { class: 'backdrop' + (centered ? ' centered' : '') }, sheet);
  const close = () => {
    bd.style.transition = 'opacity .2s'; bd.style.opacity = '0';
    setTimeout(() => bd.remove(), 200);
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
  if (dismissable) bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
  document.addEventListener('keydown', onKey);
  overlay().append(bd);
  return { close, el: sheet };
}

export function confirmDialog({ title, text, ok = 'Да', cancel = 'Отмена', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const s = openSheet(h('div', { class: 'col gap-l' },
      h('div', { class: 'h2' }, title),
      text ? h('p', { class: 'sub' }, text) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn grow', onclick: () => s.close() }, cancel),
        h('button', { class: 'btn grow ' + (danger ? 'btn-bad' : 'btn-primary'), onclick: () => { result = true; s.close(); } }, ok)),
    ), { centered: true, onClose: () => resolve(result) });
  });
}

// ---------- Звуки (синтез, без файлов) ----------
let actx = null;
function ctx() {
  if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, start, dur, type = 'sine', gain = 0.08) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}
export const sfx = {
  ok() { if (!state.settings.sound) return; tone(660, 0, 0.12, 'sine'); tone(990, 0.09, 0.22, 'sine'); },
  bad() { if (!state.settings.sound) return; tone(200, 0, 0.22, 'triangle', 0.09); tone(150, 0.1, 0.25, 'triangle', 0.07); },
  tap() { if (!state.settings.sound) return; tone(520, 0, 0.05, 'sine', 0.03); },
  win() { if (!state.settings.sound) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'sine', 0.07)); },
  level() { if (!state.settings.sound) return; [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.35, 'triangle', 0.06)); },
};
export function haptic(pattern = 12) { if (state.settings.haptics && navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* ignore */ } } }

// ---------- Конфетти ----------
export function confetti(count = 120) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = h('canvas', { class: 'confetti' });
  document.body.append(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const colors = ['#ff4f9a', '#4fd8ff', '#ffc94d', '#a77bff', '#33d69f'];
  const parts = Array.from({ length: count }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let frame = 0;
  (function loop() {
    c.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c;
      c.globalAlpha = Math.max(0, 1 - frame / 140);
      c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
    }
    if (++frame < 140) requestAnimationFrame(loop); else cv.remove();
  })();
}

// ---------- Романизация ----------
// auto: показываем всегда в ранних юнитах, дальше — по тапу.
export function romShown(unitId) {
  const mode = state.settings.rom;
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  const order = unitOrder();
  const limit = order.indexOf(course.data?.romanizationAutoUntil || 'u04');
  const idx = order.indexOf(unitId);
  return idx === -1 || idx <= limit;
}

export function romEl(text, unitId, cls = '') {
  if (!text) return null;
  const el = h('span', { class: 'rom ' + cls }, text);
  if (!romShown(unitId)) {
    el.classList.add('concealed');
    el.title = 'Нажмите, чтобы увидеть латиницу';
    el.addEventListener('click', (e) => { e.stopPropagation(); el.classList.remove('concealed'); el.title = ''; }, { once: true });
  }
  return el;
}

export function speakBtn(text, { cls = 'sm', rate } = {}) {
  const b = h('button', { class: 'icon-btn ' + cls, 'aria-label': 'Озвучить' }, icon('volume', 'i-s'));
  return bindSpeakButton(b, text, rate ? { rate } : {});
}

export function topbar({ title, back, right }) {
  return h('div', { class: 'topbar' },
    back ? h('button', { class: 'icon-btn plain', 'aria-label': 'Назад', onclick: typeof back === 'function' ? back : () => history.back() }, icon('left')) : null,
    h('div', { class: 'title' }, title),
    right || null);
}

export function starsEl(n, max = 3) {
  const s = h('span', { class: 'stars', 'aria-label': `${n} из ${max} звёзд` });
  for (let i = 0; i < max; i++) s.append(h('span', { class: i < n ? '' : 'off' }, '★'));
  return s;
}

export function emptyState(emoji, title, text, action) {
  return h('div', { class: 'empty' }, h('div', { class: 'e-icon' }, emoji), h('div', { class: 'h3' }, title), text ? h('p', { class: 'sub mt-s' }, text) : null, action || null);
}

export { clear };
