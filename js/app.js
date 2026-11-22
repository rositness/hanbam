// Точка входа: загрузка данных, маршруты, нижняя навигация, глобальные события.

import { h, icon, clear } from './core/dom.js';
import { state, loadState, update, subscribe } from './core/store.js';
import { requestPersistence } from './core/db.js';
import { loadContent } from './core/content.js';
import { route, fallback, resolve, navigate, currentPath } from './core/router.js';
import { initTTS } from './core/tts.js';
import { on } from './core/bus.js';
import { toast, openSheet, sfx, confetti } from './core/ui.js';
import { checkStreakOnOpen, checkAchievements } from './core/game.js';
import { dueCount } from './core/srs.js';

import { mapScreen } from './screens/map.js';
import { unitScreen } from './screens/unit.js';
import { lessonScreen, testScreen } from './screens/lesson.js';
import { hangulScreen } from './screens/hangul.js';
import { libraryScreen, grammarDetail } from './screens/library.js';
import { dialogScreen } from './screens/dialog.js';
import { reviewScreen, srsSession, mistakesSession, practiceSession } from './screens/review.js';
import { profileScreen, settingsScreen } from './screens/profile.js';
import { onboarding } from './screens/onboarding.js';
import { placementScreen } from './screens/placement.js';

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');
let cleanup = null;

// ---------- Тема ----------
export function applyTheme() {
  const pref = state.settings.theme;
  const t = pref === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : pref;
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#f5f3fc' : '#0b0a1a');
  try { localStorage.setItem('hb-theme', pref); } catch { /* ignore */ }
}
matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);

// ---------- Маршруты ----------
const TAB = { tab: true };
route('/', mapScreen, { ...TAB, tabId: 'map' });
route('/unit/:id', unitScreen, { ...TAB, tabId: 'map' });
route('/lesson/:id', lessonScreen);
route('/test/:id', testScreen);
route('/hangul', hangulScreen, { ...TAB, tabId: 'hangul' });
route('/hangul/:tab', hangulScreen, { ...TAB, tabId: 'hangul' });
route('/library', libraryScreen, { ...TAB, tabId: 'library' });
route('/library/:tab', libraryScreen, { ...TAB, tabId: 'library' });
route('/grammar/:id', grammarDetail, { ...TAB, tabId: 'library' });
route('/dialog/:id', dialogScreen, { tabId: 'library' });
route('/review', reviewScreen, { ...TAB, tabId: 'review' });
route('/review/srs', srsSession);
route('/review/mistakes', mistakesSession);
route('/review/practice', practiceSession);
route('/profile', profileScreen, { ...TAB, tabId: 'profile' });
route('/settings', settingsScreen, { ...TAB, tabId: 'profile' });
route('/placement', placementScreen);
fallback(mapScreen);

const TABS = [
  { id: 'map', href: '/', label: 'Путь', icon: 'map' },
  { id: 'hangul', href: '/hangul', label: 'Хангыль', ko: '한' },
  { id: 'review', href: '/review', label: 'Повтор', icon: 'repeat' },
  { id: 'library', href: '/library', label: 'Библиотека', icon: 'book' },
  { id: 'profile', href: '/profile', label: 'Профиль', icon: 'user' },
];

function renderTabbar(activeId) {
  clear(tabbar);
  const inner = h('div', { class: 'tabbar-inner' });
  const due = dueCount() + (state.mistakes.length ? 1 : 0);
  for (const t of TABS) {
    inner.append(h('button', {
      class: 'tab' + (t.id === activeId ? ' active' : ''),
      'aria-current': t.id === activeId ? 'page' : null,
      onclick: () => navigate(t.href),
    },
    t.ko ? h('span', { class: 'i tab-ko ko' }, t.ko) : icon(t.icon),
    h('span', null, t.label),
    t.id === 'review' && due > 0 ? h('span', { class: 'badge' }, String(Math.min(99, dueCount() || state.mistakes.length))) : null));
  }
  tabbar.append(inner);
}

async function render() {
  const r = resolve();
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  const showTabs = !!r.opts.tab;
  tabbar.classList.toggle('hide', !showTabs);
  app.classList.toggle('no-tabs', !showTabs);
  if (showTabs) renderTabbar(r.opts.tabId);

  const token = ++renderSeq;
  let started = false;
  const doRender = async () => {
    if (started || token !== renderSeq) return; // уже отрисовано или пользователь ушёл дальше
    started = true;
    let out;
    try {
      out = await r.handler(r.params, r.query);
    } catch (e) {
      console.error(e);
      out = h('div', { class: 'empty' }, h('div', { class: 'e-icon' }, '😵'), h('div', { class: 'h3' }, 'Что-то пошло не так'), h('p', { class: 'sub' }, String(e.message || e)),
        h('button', { class: 'btn btn-primary mt', onclick: () => navigate('/') }, 'На главную'));
    }
    if (token !== renderSeq) { try { out?.destroy?.(); } catch { /* ignore */ } return; }
    const el = out instanceof Node ? out : out.el;
    cleanup = out && out.destroy ? out.destroy : null;
    clear(app).append(el);
    el.classList?.add('screen');
    if (!r.query.get('keep')) window.scrollTo({ top: 0 });
    out?.mounted?.();
  };
  // Анимация перехода — только для видимой вкладки: в фоновой браузер не рисует кадры и переход «зависает».
  if (document.startViewTransition && document.visibilityState === 'visible' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const t = document.startViewTransition(doRender);
    // Если быстро перейти на другой экран, браузер отменяет анимацию — это нормально.
    t.ready.catch(() => {});
    t.finished.catch(() => {});
    t.updateCallbackDone.catch(() => {});
    // Страховка: если браузер не начал анимацию (например, вкладка не отрисовывается), рисуем сразу.
    setTimeout(() => { if (!started) { try { t.skipTransition(); } catch { /* ignore */ } doRender(); } }, 400);
  } else await doRender();
}
let renderSeq = 0;

// ---------- Глобальные события ----------
function wireEvents() {
  on('toast', ({ icon: ic, text }) => toast(text, { icon: ic }));
  on('achievement', (a) => { sfx.win(); toast(`Достижение: ${a.title}`, { icon: a.icon, ms: 3600 }); });
  on('goal', () => { toast('Дневная цель выполнена!', { icon: '🎯', ms: 3200 }); });
  let levelSheet = null;
  on('levelup', (lv) => {
    setTimeout(() => {
      levelSheet?.close(); // несколько уровней подряд — показываем одно окно с последним
      sfx.level(); confetti(160);
      const s = levelSheet = openSheet(h('div', { class: 'col center', style: { alignItems: 'center', gap: '12px' } },
        h('div', { class: 'lvl-avatar pop', style: { width: '96px', height: '96px', fontSize: '40px' } }, String(lv.level)),
        h('div', { class: 'h1' }, 'Новый уровень!'),
        h('div', { class: 'sub' }, `Теперь вы — ${lv.title} · `, h('span', { class: 'ko' }, lv.titleKo)),
        h('button', { class: 'btn btn-primary btn-block btn-lg mt', onclick: () => s.close() }, '좋아요! Отлично')), { centered: true, onClose: () => { if (levelSheet === s) levelSheet = null; } });
    }, 900);
  });
  subscribe((section) => {
    if ((section === 'srs' || section === 'mistakes') && !tabbar.classList.contains('hide')) renderTabbar(resolve().opts.tabId);
    if (section === 'settings') applyTheme();
  });
  window.addEventListener('hashchange', () => { try { sessionStorage.setItem('hb-nav', '1'); } catch { /* ignore */ } render(); });
}

// ---------- Service worker ----------
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // При локальной разработке кэш мешает видеть правки. Включить: localStorage.setItem('hb-sw', '1').
  let devOff = false;
  try { devOff = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('hb-sw') !== '1'; } catch { /* ignore */ }
  if (devOff) { navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())); return; }
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const t = h('button', { class: 'btn btn-sm btn-primary', onclick: () => { nw.postMessage('skipWaiting'); } }, 'Обновить');
          toast(h('span', { class: 'row' }, 'Доступна новая версия', t), { icon: '🚀', ms: 12000 });
        }
      });
    });
  }).catch(() => { /* офлайн-режим недоступен */ });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

// ---------- Запуск ----------
async function boot() {
  try {
    await loadState();
    applyTheme();
    await loadContent();
  } catch (e) {
    console.error(e);
    clear(app).append(h('div', { class: 'empty' }, h('div', { class: 'e-icon' }, '📡'), h('div', { class: 'h3' }, 'Не удалось загрузить уроки'),
      h('p', { class: 'sub' }, location.protocol === 'file:' ? 'Откройте приложение через локальный сервер (см. README), а не двойным кликом по файлу.' : String(e.message || e)),
      h('button', { class: 'btn btn-primary mt', onclick: () => location.reload() }, 'Повторить')));
    return;
  }
  initTTS();
  requestPersistence();
  checkStreakOnOpen();
  checkAchievements();
  wireEvents();
  registerSW();
  if (!state.meta.onboarded) {
    tabbar.classList.add('hide');
    clear(app).append(onboarding(() => { update('meta', (m) => { m.onboarded = true; }); render(); }));
    return;
  }
  render();
}

boot();

export { navigate, currentPath };
