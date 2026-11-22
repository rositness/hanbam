// Озвучка.
// 1) Основной путь — готовые записи нейроголосов (папка audio/, создаются tools/tts/generate.mjs):
//    звучат как носитель языка и работают офлайн после первого прослушивания.
// 2) Запасной путь — синтез речи браузера (Web Speech API, ko-KR), если записи нет.

import { state } from './store.js';
import { VOICES, audioKey, speechText } from './audiokey.js';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let sysVoices = [];
let index = null;            // { F: Set<hash>, M: Set<hash>, … }
let seq = 0;                 // номер текущего воспроизведения
let keepAlive = null;
const player = new Audio();
player.preload = 'auto';
const blobs = new Map();     // url → objectURL (небольшой LRU)

export const ttsSupported = true;

// ---------- Инициализация ----------
function refreshSystem() {
  if (!synth) return;
  sysVoices = synth.getVoices().filter((v) => /^ko([-_]|$)/i.test(v.lang));
}

export async function initTTS() {
  if (synth) {
    refreshSystem();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', refreshSystem);
    else synth.onvoiceschanged = refreshSystem;
  }
  try {
    const r = await fetch('audio/index.json');
    if (r.ok) {
      const j = await r.json();
      index = {};
      for (const v of Object.keys(VOICES)) index[v] = new Set(j[v] || []);
    }
  } catch { index = null; }
  // iOS разрешает звук только после первого касания — «разблокируем» плеер тишиной.
  const unlock = () => {
    player.src = silentWav();
    player.play().then(() => player.pause()).catch(() => {});
    document.removeEventListener('pointerdown', unlock, true);
  };
  document.addEventListener('pointerdown', unlock, true);
}

function silentWav() {
  const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export const neuralAvailable = () => !!index && state.settings.voiceMode !== 'system';
export const hasRecording = (text, voice = 'F') => !!index?.[voice]?.has(audioKey(voice, text));
export const recordingCount = () => (index ? Object.values(index).reduce((s, x) => s + x.size, 0) : 0);
export function koreanVoices() { refreshSystem(); return sysVoices; }
export function hasKoreanVoice() { refreshSystem(); return sysVoices.length > 0 || !!index; }

// ---------- Воспроизведение ----------
async function blobUrl(url) {
  if (blobs.has(url)) { const u = blobs.get(url); blobs.delete(url); blobs.set(url, u); return u; }
  const r = await fetch(url);
  if (!r.ok) throw new Error('нет записи');
  const u = URL.createObjectURL(await r.blob());
  blobs.set(url, u);
  if (blobs.size > 120) { const [k, old] = blobs.entries().next().value; blobs.delete(k); URL.revokeObjectURL(old); }
  return u;
}

const SLOW = 0.72;
const speedFactor = () => Math.min(1.4, Math.max(0.6, (state.settings.rate || 0.9) / 0.9));

/**
 * Произнести корейский текст.
 * opts.voice — 'F' | 'F2' | 'M' | 'M2' (для диалогов), opts.rate < 0.8 — медленно.
 */
export function speak(text, opts = {}) {
  const { onstart, onend } = opts;
  const voice = VOICES[opts.voice] ? opts.voice : 'F';
  const t = speechText(text);
  stopSpeaking();
  const my = ++seq;
  return new Promise((resolve) => {
    if (!t) { onend?.(); resolve(false); return; }
    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      clearInterval(keepAlive);
      onend?.();
      resolve(ok);
    };
    const slow = opts.rate != null && opts.rate < 0.8;

    const useSystem = () => {
      if (my !== seq) return done(false);
      systemSpeak(t, slow ? 0.55 : (state.settings.rate || 0.9), voice, onstart, done);
    };

    if (neuralAvailable() && index[voice]?.has(audioKey(voice, t))) {
      blobUrl(`audio/${voice}/${audioKey(voice, t)}.mp3`).then((u) => {
        if (my !== seq) return done(false);
        player.src = u;
        player.preservesPitch = true;
        player.playbackRate = slow ? SLOW : speedFactor();
        player.onended = () => done(true);
        player.onerror = () => useSystem();
        player.play().then(() => onstart?.()).catch(() => useSystem());
      }).catch(useSystem);
    } else useSystem();
  });
}

function pickSystemVoice(voice) {
  if (!sysVoices.length) refreshSystem();
  const pref = state.settings.voice;
  const male = voice.startsWith('M');
  return sysVoices.find((v) => v.voiceURI === pref)
    || (male && sysVoices.find((v) => /injoon|male|남/i.test(v.name)))
    || sysVoices.find((v) => /google/i.test(v.name))
    || sysVoices.find((v) => /yuna|heami|sunhi|seoyeon/i.test(v.name))
    || sysVoices[0] || null;
}

function systemSpeak(t, rate, voice, onstart, done) {
  if (!synth) { done(false); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'ko-KR';
  const v = pickSystemVoice(voice);
  if (v) u.voice = v;
  u.rate = rate;
  u.pitch = voice === 'F2' ? 0.9 : 1;
  u.onstart = () => onstart?.();
  u.onend = () => done(true);
  u.onerror = () => done(false);
  keepAlive = setInterval(() => { if (synth.speaking && !synth.paused) { synth.pause(); synth.resume(); } }, 10000);
  setTimeout(() => done(true), 4000 + t.length * 450 / (rate || 1));
  synth.speak(u);
}

export function stopSpeaking() {
  seq++;
  try { player.pause(); } catch { /* ignore */ }
  player.onended = null;
  if (synth) synth.cancel();
  clearInterval(keepAlive);
}
export const isSpeaking = () => !player.paused || !!(synth && synth.speaking);

// Кнопка-динамик: подсвечивается, пока звучит.
export function bindSpeakButton(btn, getText, opts = {}) {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = typeof getText === 'function' ? getText() : getText;
    btn.classList.add('playing');
    speak(text, { ...opts, onend: () => btn.classList.remove('playing') });
  });
  return btn;
}

// ---------- Загрузка всей озвучки для офлайна ----------
export async function downloadAllAudio(onProgress) {
  if (!index) return { done: 0, total: 0 };
  const urls = [];
  for (const [v, set] of Object.entries(index)) for (const h of set) urls.push(`audio/${v}/${h}.mp3`);
  let done = 0, failed = 0;
  const queue = [...urls];
  const cache = 'caches' in window ? await caches.open('hanbam-audio') : null;
  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      try {
        if (cache && await cache.match(u)) { done++; continue; }
        const r = await fetch(u);
        if (!r.ok) throw new Error();
        if (cache) await cache.put(u, r.clone());
        done++;
      } catch { failed++; }
      onProgress?.(done + failed, urls.length);
    }
  }
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  return { done, failed, total: urls.length };
}

export async function audioCachedCount() {
  if (!('caches' in window)) return 0;
  try { return (await (await caches.open('hanbam-audio')).keys()).length; } catch { return 0; }
}
