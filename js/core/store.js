// Состояние приложения и его сохранение.
// Все данные пользователя живут в нескольких разделах; каждый хранится отдельным ключом.

import { kvGet, kvSet, kvClear } from './db.js';

export const SCHEMA_VERSION = 1;
const SECTIONS = ['settings', 'progress', 'srs', 'mistakes', 'stats', 'meta'];

export function defaults() {
  return {
    settings: {
      name: '',
      theme: 'system',       // system | dark | light
      rom: 'auto',           // auto | always | never
      rate: 0.9,             // скорость речи
      voiceMode: 'neural',   // neural — записи нейроголосов, system — голос устройства
      voice: '',             // voiceURI системного корейского голоса
      dailyGoal: 20,         // XP в день
      sound: true,
      haptics: true,
      speak: true,           // упражнения на произношение
      autoplay: true,        // автоозвучка в упражнениях
      unlockAll: false,
      reverseCards: false,   // карточки «русский → корейский»
      textScale: 1,          // 1 — обычный текст, 1.15 — крупный
    },
    progress: {
      lessons: {},           // id → { done, best, times, last }
      tests: {},             // unitId → { best, stars, passed, times }
      dialogs: {},           // dialogId → true (прослушан)
    },
    srs: {},                 // wordId → карточка
    mistakes: [],            // [{ key, ex, count, last }]
    stats: {
      xp: 0,
      lessons: 0,
      perfect: 0,
      reviews: 0,
      speakOk: 0,
      traceOk: 0,
      tests: 0,
      threeStars: 0,
      fixed: 0,
      dialogs: 0,
      answers: 0,
      correct: 0,
      night: 0,
      history: {},           // номер дня → XP
      streak: { count: 0, last: null, best: 0, freezes: 0 },
      achievements: {},      // id → timestamp
    },
    meta: { version: SCHEMA_VERSION, created: Date.now(), onboarded: false },
  };
}

export const state = defaults();
const dirty = new Set();
const listeners = new Set();
let timer = null;

function merge(base, value) {
  if (Array.isArray(base)) return Array.isArray(value) ? value : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) out[k] = k in base ? merge(base[k], value[k]) : value[k];
    }
    return out;
  }
  return value === undefined ? base : value;
}

export async function loadState() {
  const d = defaults();
  for (const key of SECTIONS) {
    const v = await kvGet(key);
    state[key] = v === undefined ? d[key] : merge(d[key], v);
  }
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function update(section, fn) {
  const r = fn(state[section]);
  if (r !== undefined) state[section] = r;
  dirty.add(section);
  scheduleSave();
  listeners.forEach((l) => l(section));
}

function scheduleSave() {
  clearTimeout(timer);
  timer = setTimeout(flush, 400);
}

export async function flush() {
  clearTimeout(timer);
  const keys = [...dirty];
  dirty.clear();
  await Promise.all(keys.map((k) => kvSet(k, state[k])));
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('pagehide', () => flush());

// ---------- Экспорт / импорт ----------
export function exportData() {
  const data = { app: 'hanbam', version: SCHEMA_VERSION, exported: new Date().toISOString() };
  for (const k of SECTIONS) data[k] = state[k];
  return data;
}

export async function importData(obj) {
  if (!obj || obj.app !== 'hanbam') throw new Error('Это не файл прогресса «Ханбам».');
  const d = defaults();
  for (const k of SECTIONS) {
    if (k in obj) state[k] = merge(d[k], obj[k]);
    dirty.add(k);
  }
  state.meta.onboarded = true;
  dirty.add('meta');
  await flush();
}

export async function resetAll() {
  await kvClear();
  const d = defaults();
  for (const k of SECTIONS) state[k] = d[k];
}
