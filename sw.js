// Service worker: офлайн-режим.
// При изменении кода увеличьте VERSION — пользователи увидят «Доступна новая версия».
const VERSION = 'v1.3.0';
const CACHE = 'hanbam-' + VERSION;
const FONT_CACHE = 'hanbam-fonts';
const AUDIO_CACHE = 'hanbam-audio';   // записи озвучки не удаляются при обновлении версии

const CORE = [
  './', 'index.html', 'manifest.json', 'css/app.css', 'css/game.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'js/app.js',
  'js/core/audiokey.js', 'js/core/bus.js', 'js/core/content.js', 'js/core/db.js', 'js/core/dom.js', 'js/core/game.js', 'js/core/hangul.js',
  'js/core/mascot.js', 'js/core/strokes.js', 'js/core/router.js', 'js/core/speech.js', 'js/core/srs.js', 'js/core/store.js', 'js/core/tts.js', 'js/core/ui.js', 'js/core/utils.js',
  'js/exercises/generator.js', 'js/exercises/keyboard.js', 'js/exercises/render.js', 'js/exercises/trace.js',
  'js/screens/dialog.js', 'js/screens/hangul.js', 'js/screens/lesson.js', 'js/screens/library.js', 'js/screens/map.js',
  'js/screens/onboarding.js', 'js/screens/placement.js', 'js/screens/profile.js', 'js/screens/review.js', 'js/screens/session.js', 'js/screens/share.js', 'js/screens/unit.js',
  'content/course.json', 'content/hangul.json', 'content/voices.json', 'content/emoji.json', 'audio/index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
    // Файлы юнитов берём из course.json — список не нужно поддерживать вручную.
    try {
      const course = await (await fetch('content/course.json', { cache: 'reload' })).json();
      const units = course.lines.flatMap((l) => l.units).map((id) => `content/units/${id}.json`);
      await cache.addAll(units.map((u) => new Request(u, { cache: 'reload' })));
    } catch (e) { /* догрузим при первом обращении */ }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [CACHE, FONT_CACHE, AUDIO_CACHE];
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('hanbam-') && !keep.includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

async function cacheFirst(cacheName, req) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') c.put(req, res.clone());
    return res;
  } catch {
    return new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Шрифты Google: кэш навсегда.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(FONT_CACHE, req));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Записи озвучки не меняются: берём из кэша, иначе скачиваем и запоминаем.
  if (url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(cacheFirst(AUDIO_CACHE, new Request(url.href)));
    return;
  }

  // Свои файлы: сразу из кэша, в фоне обновляем (stale-while-revalidate).
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? 'index.html' : req;
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { event.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? cache.match('index.html') : new Response('Нет сети', { status: 503 }));
  })());
});
