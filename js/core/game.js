// Прогресс, открытие уроков, XP, уровни, серии, достижения и «работа над ошибками».

import { state, update } from './store.js';
import { emit } from './bus.js';
import { course, units, lessons, nodesOf, getLine, dialogs } from './content.js';
import { today, srsCount } from './srs.js';

// ---------- Прогресс и замки ----------
export const lessonDone = (id) => !!state.progress.lessons[id]?.done;
export const testPassed = (unitId) => !!state.progress.tests[unitId]?.passed;
export const nodeDone = (n) => (n.type === 'lesson' ? lessonDone(n.id) : testPassed(n.id));

export function lineComplete(lineId) { return nodesOf(lineId).every(nodeDone); }

export function lineUnlocked(lineId) {
  if (state.settings.unlockAll) return true;
  const line = getLine(lineId);
  return !line.requires || lineComplete(line.requires);
}

export function nodeUnlocked(n) {
  if (state.settings.unlockAll) return true;
  const unit = units.get(n.unitId);
  if (!lineUnlocked(unit.lineId)) return false;
  const nodes = nodesOf(unit.lineId);
  const i = nodes.findIndex((x) => x.type === n.type && x.id === n.id);
  if (i <= 0) return true;
  // урок открыт, если пройден предыдущий узел; тест — когда пройдены все уроки юнита
  if (n.type === 'test') return unit.lessons.every((l) => lessonDone(l.id));
  return nodeDone(nodes[i - 1]) || nodeDone(n);
}

export const lessonUnlocked = (id) => nodeUnlocked({ type: 'lesson', id, unitId: lessons.get(id).unitId });
export const testUnlocked = (unitId) => nodeUnlocked({ type: 'test', id: unitId, unitId });

export function unitProgress(unit) {
  const total = unit.lessons.length + 1;
  const done = unit.lessons.filter((l) => lessonDone(l.id)).length + (testPassed(unit.id) ? 1 : 0);
  return { done, total, ratio: done / total };
}

// Следующий шаг для кнопки «Продолжить»: сначала линия 1, если хангыль пройден наполовину — предлагаем то, что начато.
export function nextNodes() {
  const out = [];
  for (const line of course.data.lines) {
    if (!lineUnlocked(line.id)) continue;
    const n = nodesOf(line.id).find((x) => !nodeDone(x) && nodeUnlocked(x));
    if (n) out.push(n);
  }
  return out;
}

export function recordLesson(id, accuracy) {
  let first = false;
  update('progress', (p) => {
    const cur = p.lessons[id] || { done: false, best: 0, times: 0 };
    first = !cur.done;
    p.lessons[id] = { done: true, best: Math.max(cur.best, accuracy), times: cur.times + 1, last: Date.now() };
  });
  update('stats', (s) => { s.lessons += first ? 1 : 0; if (accuracy >= 1) s.perfect += 1; });
  return first;
}

export function testStars(acc) { return acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.6 ? 1 : 0; }

export function recordTest(unitId, accuracy) {
  const stars = testStars(accuracy);
  let firstPass = false;
  update('progress', (p) => {
    const cur = p.tests[unitId] || { best: 0, stars: 0, passed: false, times: 0 };
    firstPass = !cur.passed && stars > 0;
    p.tests[unitId] = { best: Math.max(cur.best, accuracy), stars: Math.max(cur.stars, stars), passed: cur.passed || stars > 0, times: cur.times + 1 };
  });
  update('stats', (s) => { if (firstPass) s.tests += 1; if (stars === 3) s.threeStars += 1; });
  return { stars, firstPass };
}

export function markDialog(id) {
  if (state.progress.dialogs[id]) return false;
  update('progress', (p) => { p.dialogs[id] = true; });
  update('stats', (s) => { s.dialogs += 1; });
  return true;
}

// ---------- Уровни ----------
const TITLES = [
  [1, 'Турист', '관광객'], [3, 'Новичок', '초보자'], [5, 'Ученик', '학생'], [8, 'Путешественник', '여행자'],
  [12, 'Знаток', '전문가'], [16, 'Сеульчанин', '서울 사람'], [22, 'Мастер', '달인'],
];
export const xpForLevel = (n) => 50 * (n - 1) + 25 * (n - 1) * (n - 2) / 2; // суммарный XP для уровня n
export function levelInfo(xp = state.stats.xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  const from = xpForLevel(n), to = xpForLevel(n + 1);
  const t = [...TITLES].reverse().find(([lv]) => n >= lv);
  return { level: n, from, to, ratio: (xp - from) / (to - from), title: t[1], titleKo: t[2] };
}

// ---------- Серия дней ----------
export function checkStreakOnOpen() {
  const s = state.stats.streak;
  if (s.last == null) return;
  const gap = today() - s.last;
  if (gap <= 1) return;
  const missed = gap - 1;
  if (missed <= s.freezes) {
    update('stats', (st) => { st.streak.freezes -= missed; st.streak.last = today() - 1; });
    emit('toast', { icon: '🧊', text: missed === 1 ? 'Заморозка сохранила вашу серию!' : `Заморозки сохранили серию (${missed})` });
  } else {
    update('stats', (st) => { st.streak.count = 0; });
  }
}

export const todayXP = () => state.stats.history[today()] || 0;
export const streakActiveToday = () => state.stats.streak.last === today();

export function addXP(amount, reason = '') {
  if (amount <= 0) return;
  const before = levelInfo();
  const goal = state.settings.dailyGoal;
  const t = today();
  const hadGoal = todayXP() >= goal;
  let streakUp = false;
  update('stats', (s) => {
    s.xp += amount;
    s.history[t] = (s.history[t] || 0) + amount;
    if (s.streak.last !== t) {
      s.streak.count = s.streak.last === t - 1 ? s.streak.count + 1 : 1;
      s.streak.last = t;
      s.streak.best = Math.max(s.streak.best, s.streak.count);
      streakUp = true;
      if (s.streak.count % 7 === 0 && s.streak.freezes < 2) {
        s.streak.freezes += 1;
        emit('toast', { icon: '🧊', text: 'Неделя подряд! +1 заморозка серии' });
      }
    }
    const hr = new Date().getHours();
    if (hr >= 23 || hr < 4) s.night += 1;
    // история не должна расти бесконечно: храним 120 дней
    const keys = Object.keys(s.history);
    if (keys.length > 120) keys.sort((a, b) => a - b).slice(0, keys.length - 120).forEach((k) => delete s.history[k]);
  });
  emit('xp', { amount, reason });
  if (streakUp) emit('streak', { count: state.stats.streak.count });
  if (!hadGoal && todayXP() >= goal) emit('goal', { goal });
  const after = levelInfo();
  if (after.level > before.level) emit('levelup', after);
  checkAchievements();
}

export function countAnswer(correct) {
  update('stats', (s) => { s.answers += 1; if (correct) s.correct += 1; });
}

// ---------- Достижения ----------
const allLessonIds = () => [...lessons.keys()];
const hangulIds = () => [...lessons.values()].filter((l) => l.kind === 'hangul').map((l) => l.id);
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🎉', title: 'Первый шаг', desc: 'Пройти первый урок', test: (s) => s.lessons >= 1 },
  { id: 'hangul', icon: '한', title: 'Читаю хангыль', desc: 'Пройти все уроки хангыля', test: () => hangulIds().every(lessonDone) },
  { id: 'l10', icon: '📚', title: 'Десятка', desc: '10 уроков', test: (s) => s.lessons >= 10 },
  { id: 'l30', icon: '🎒', title: 'Прилежный', desc: '30 уроков', test: (s) => s.lessons >= 30 },
  { id: 'lall', icon: '👑', title: 'Выпускник', desc: 'Все уроки курса', test: () => allLessonIds().every(lessonDone) },
  { id: 'p1', icon: '💎', title: 'Без ошибок', desc: 'Урок на 100%', test: (s) => s.perfect >= 1 },
  { id: 'p10', icon: '💠', title: 'Перфекционист', desc: '10 уроков без ошибок', test: (s) => s.perfect >= 10 },
  { id: 's3', icon: '🔥', title: 'Разогрев', desc: 'Серия 3 дня', test: (s) => s.streak.best >= 3 },
  { id: 's7', icon: '⚡', title: 'Неделя', desc: 'Серия 7 дней', test: (s) => s.streak.best >= 7 },
  { id: 's30', icon: '🌋', title: 'Месяц огня', desc: 'Серия 30 дней', test: (s) => s.streak.best >= 30 },
  { id: 'x500', icon: '⭐', title: '500 XP', desc: 'Набрать 500 XP', test: (s) => s.xp >= 500 },
  { id: 'x2000', icon: '🌟', title: '2000 XP', desc: 'Набрать 2000 XP', test: (s) => s.xp >= 2000 },
  { id: 'w50', icon: '🧠', title: 'Копилка слов', desc: '50 слов в повторении', test: () => srsCount() >= 50 },
  { id: 'w200', icon: '🗂️', title: 'Словарный запас', desc: '200 слов в повторении', test: () => srsCount() >= 200 },
  { id: 'r100', icon: '🔁', title: 'Повторение — мать учения', desc: '100 повторений карточек', test: (s) => s.reviews >= 100 },
  { id: 'sp10', icon: '🎤', title: 'Голос', desc: '10 фраз вслух', test: (s) => s.speakOk >= 10 },
  { id: 'tr20', icon: '✍️', title: 'Каллиграф', desc: 'Прописать 20 букв', test: (s) => s.traceOk >= 20 },
  { id: 't3', icon: '🏆', title: 'Отличник', desc: 'Тест юнита на 3 звезды', test: (s) => s.threeStars >= 1 },
  { id: 't5', icon: '🎯', title: 'Экзаменатор', desc: 'Сдать 5 тестов', test: (s) => s.tests >= 5 },
  { id: 'f20', icon: '🩹', title: 'Работа над ошибками', desc: 'Исправить 20 ошибок', test: (s) => s.fixed >= 20 },
  { id: 'd10', icon: '💬', title: 'Собеседник', desc: 'Прослушать 10 диалогов', test: (s) => s.dialogs >= 10 },
  { id: 'night', icon: '🌙', title: 'Ночной Сеул', desc: 'Заниматься после 23:00', test: (s) => s.night >= 1 },
];

export function checkAchievements() {
  const s = state.stats;
  const fresh = ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.test(s));
  if (!fresh.length) return;
  update('stats', (st) => { fresh.forEach((a) => { st.achievements[a.id] = Date.now(); }); });
  fresh.forEach((a, i) => setTimeout(() => emit('achievement', a), 400 + i * 900));
}

// ---------- Ошибки ----------
export function mistakeKey(ex) { return ex.key || (ex.type + ':' + JSON.stringify(ex.ans ?? ex.answer ?? ex.target ?? '')); }

export function addMistake(ex) {
  if (!ex || ex.noMistake) return;
  const key = mistakeKey(ex);
  update('mistakes', (list) => {
    const m = list.find((x) => x.key === key);
    if (m) { m.count += 1; m.last = Date.now(); }
    else list.unshift({ key, ex: { ...ex, key }, count: 1, last: Date.now() });
    if (list.length > 150) list.length = 150;
  });
}

export function fixMistake(key) {
  let removed = false;
  update('mistakes', (list) => {
    const i = list.findIndex((x) => x.key === key);
    if (i >= 0) { list.splice(i, 1); removed = true; }
  });
  if (removed) update('stats', (s) => { s.fixed += 1; });
  return removed;
}

export const dialogCount = () => dialogs.size;
