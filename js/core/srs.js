// Интервальные повторения (упрощённый SM-2).
// Оценки: 0 — «Снова», 1 — «Трудно», 2 — «Хорошо», 3 — «Легко».

import { state, update } from './store.js';
import { words } from './content.js';

export function today(d = new Date()) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

export function addWords(ids) {
  let added = 0;
  update('srs', (srs) => {
    const t = today();
    for (const id of ids) {
      if (!srs[id] && words.has(id)) {
        srs[id] = { due: t + 1, ivl: 0, ease: 2.5, reps: 0, lapses: 0, added: t };
        added++;
      }
    }
  });
  return added;
}

export function previewInterval(card, g) { return schedule({ ...card }, g).ivl; }

function schedule(c, g) {
  if (g === 0) {
    c.reps = 0; c.lapses = (c.lapses || 0) + 1; c.ivl = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
    return c;
  }
  if (c.reps === 0) c.ivl = g === 3 ? 4 : g === 2 ? 1 : 1;
  else if (c.reps === 1) c.ivl = g === 3 ? 7 : g === 2 ? 3 : 2;
  else c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * (g === 1 ? 1.2 : g === 2 ? c.ease : c.ease * 1.3)));
  c.ease = Math.max(1.3, c.ease + (g === 1 ? -0.15 : g === 3 ? 0.15 : 0));
  c.reps += 1;
  return c;
}

export function grade(id, g) {
  update('srs', (srs) => {
    const c = srs[id];
    if (!c) return;
    schedule(c, g);
    c.due = today() + c.ivl;
    c.last = today();
  });
}

export function dueIds(limit = 50) {
  const t = today();
  return Object.entries(state.srs)
    .filter(([id, c]) => c.due <= t && words.has(id))
    .sort((a, b) => a[1].due - b[1].due || a[1].ease - b[1].ease)
    .slice(0, limit)
    .map(([id]) => id);
}

export const dueCount = () => dueIds(999).length;
export const srsCount = () => Object.keys(state.srs).length;

// Уровень знания слова 0..4 — для цветной точки в словаре.
export function strength(id) {
  const c = state.srs[id];
  if (!c) return 0;
  if (c.ivl >= 21) return 4;
  if (c.ivl >= 7) return 3;
  if (c.ivl >= 2) return 2;
  return 1;
}

export function formatIvl(d) {
  if (d <= 0) return 'сегодня';
  if (d === 1) return '1 дн';
  if (d < 30) return d + ' дн';
  if (d < 365) return Math.round(d / 30) + ' мес';
  return Math.round(d / 365) + ' г';
}
