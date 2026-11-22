// Задания дня: каждый день три задания из набора; прогресс считается от «снимка»
// статистики на начало дня. За задание — XP, за все три — сундук с бонусом.

import { state, update } from './store.js';
import { today } from './srs.js';
import { emit } from './bus.js';
import { stories } from './content.js';

const POOL = [
  { id: 'xp', icon: '⭐', title: (n) => `Заработайте ${n} XP`, target: () => Math.max(30, Math.round(state.settings.dailyGoal * 1.5 / 10) * 10), value: (d) => state.stats.history[today()] || 0 },
  { id: 'runs', icon: '📚', title: (n) => `Пройдите ${n} урока`, target: () => 2, value: (d) => (state.stats.lessonRuns || 0) - d.base.lessonRuns },
  { id: 'perfect', icon: '💎', title: () => 'Пройдите урок без ошибок', target: () => 1, value: (d) => state.stats.perfect - d.base.perfect },
  { id: 'reviews', icon: '🃏', title: (n) => `Повторите ${n} карточек`, target: () => 10, value: (d) => state.stats.reviews - d.base.reviews },
  { id: 'story', icon: '📖', title: () => 'Прочитайте историю', target: () => 1, value: (d) => (state.stats.stories || 0) - d.base.stories, available: () => stories.length > 0 },
  { id: 'speak', icon: '🎤', title: (n) => `Скажите вслух ${n} фразы`, target: () => 3, value: (d) => state.stats.speakOk - d.base.speakOk },
  { id: 'combo', icon: '🔥', title: (n) => `Ответьте верно ${n} раз подряд`, target: () => 8, value: (d) => d.combo || 0 },
];

function ensureDay() {
  const t = today();
  if (state.stats.qday?.day === t) return state.stats.qday;
  update('stats', (s) => {
    s.qday = {
      day: t, combo: 0, claimed: {}, notified: {}, chest: false,
      base: { lessonRuns: s.lessonRuns || 0, perfect: s.perfect, reviews: s.reviews, speakOk: s.speakOk, stories: s.stories || 0 },
    };
  });
  return state.stats.qday;
}

// Выбор трёх заданий на день — одинаковый весь день, разный по дням.
function pickIds(day) {
  const pool = POOL.filter((q) => !q.available || q.available());
  const ids = [];
  let seed = (day * 2654435761) >>> 0;
  const rest = [...pool];
  // задание на XP есть всегда — оно связано с целью дня
  ids.push('xp'); rest.splice(rest.findIndex((q) => q.id === 'xp'), 1);
  while (ids.length < 3 && rest.length) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    ids.push(rest.splice(seed % rest.length, 1)[0].id);
  }
  return ids;
}

export function todaysQuests() {
  const d = ensureDay();
  return pickIds(d.day).map((id) => {
    const q = POOL.find((x) => x.id === id);
    const target = q.target();
    const value = Math.max(0, Math.min(target, q.value(d)));
    return { id, icon: q.icon, title: q.title(target), target, value, done: value >= target, claimed: !!d.claimed[id] };
  });
}

export const QUEST_XP = 10;
export const CHEST_XP = 15;

export function claimQuest(id, addXP) {
  const q = todaysQuests().find((x) => x.id === id);
  if (!q || !q.done || q.claimed) return 0;
  update('stats', (s) => { s.qday.claimed[id] = true; s.questsDone = (s.questsDone || 0) + 1; });
  addXP(QUEST_XP, 'quest');
  return QUEST_XP;
}

export function claimChest(addXP) {
  const qs = todaysQuests();
  if (state.stats.qday.chest || !qs.every((q) => q.claimed)) return 0;
  update('stats', (s) => { s.qday.chest = true; });
  addXP(CHEST_XP, 'chest');
  return CHEST_XP;
}

export const chestReady = () => !state.stats.qday?.chest && todaysQuests().every((q) => q.claimed);
export const questsToClaim = () => todaysQuests().filter((q) => q.done && !q.claimed).length;

export function noteCombo(c) {
  const d = ensureDay();
  if (c > (d.combo || 0)) update('stats', (s) => { s.qday.combo = c; });
}

// Сообщаем о только что выполненных заданиях (вызывается после получения XP).
export function notifyQuests() {
  const d = ensureDay();
  for (const q of todaysQuests()) {
    if (q.done && !d.notified[q.id]) {
      update('stats', (s) => { s.qday.notified[q.id] = true; });
      emit('toast', { icon: '🎯', text: `Задание дня выполнено: ${q.title}. Заберите награду на главной!` });
    }
  }
}
