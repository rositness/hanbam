// Тест на уровень: для тех, кто уже знает хангыль или основы (A1).
// Успешная проверка отмечает пройденными соответствующие уроки и открывает следующую часть курса.

import { h, icon } from '../core/dom.js';
import { update } from '../core/store.js';
import { course, units, lessons } from '../core/content.js';
import { genHangulLesson, genWordLesson } from '../exercises/generator.js';
import { runSession } from './session.js';
import { mascot } from '../core/mascot.js';
import { sample } from '../core/utils.js';
import { sfx, confetti } from '../core/ui.js';
import { navigate } from '../core/router.js';

const LEVELS = {
  hangul: { title: 'Хангыль', need: 0.8, lines: ['L0'], count: 12, text: 'Буквы, звуки и чтение слов' },
  a1: { title: 'Хангыль и основы A1', need: 0.75, lines: ['L0', 'L1'], count: 16, text: 'Слова, фразы и грамматика линии 1', from: 'L1' },
  a2: { title: 'Уровень A2', need: 0.75, lines: ['L0', 'L1', 'L2'], count: 18, text: 'Грамматика и слова линии 2', from: 'L2' },
};

function genPlacement(level) {
  if (level === 'hangul') {
    const hl = [...lessons.values()].filter((l) => l.kind === 'hangul');
    return sample(hl.flatMap((l) => genHangulLesson(l, { intro: false })).filter((e) => e.type === 'choice'), LEVELS.hangul.count);
  }
  const l1 = course.data.lines.find((l) => l.id === LEVELS[level].from);
  const ws = l1.units.flatMap((u) => units.get(u).lessons).flatMap((l) => genWordLesson(l, { intro: false }))
    .filter((e) => ['choice', 'fill', 'build'].includes(e.type));
  return sample(ws, LEVELS[level].count);
}

function markLines(lineIds) {
  update('progress', (p) => {
    for (const line of course.data.lines.filter((l) => lineIds.includes(l.id))) {
      for (const uid of line.units) {
        for (const l of units.get(uid).lessons) if (!p.lessons[l.id]?.done) p.lessons[l.id] = { done: true, best: 0, times: 0, placed: true };
        if (!p.tests[uid]?.passed) p.tests[uid] = { best: 0, stars: 0, passed: true, times: 0, placed: true };
      }
    }
  });
}

/** Экран выбора уровня и проверки. onFinish(resultText) вызывается в конце. */
export function placementView({ onFinish, allowSkip = true } = {}) {
  const root = h('div');
  const pick = () => root.replaceChildren(h('div', { class: 'col gap-l' },
    h('div', { class: 'mascot-row' }, mascot('think', 90, 'pop'), h('div', { class: 'speech-bubble' }, 'Что ты уже знаешь? Можно начать с нуля или проверить себя и пропустить знакомое.')),
    h('div', { class: 'h1' }, 'Ваш уровень'),
    h('div', { class: 'col' },
      choice('🌱', 'Начинаю с нуля', 'Сначала выучим алфавит хангыль', () => onFinish?.('')),
      choice('한', 'Знаю хангыль', 'Короткая проверка: 12 вопросов', () => start('hangul')),
      choice('🗣️', 'Знаю основы (A1)', 'Проверка: 16 вопросов по линии 1', () => start('a1')),
      choice('🎓', 'Уже говорю (A2)', 'Проверка: 18 вопросов по линии 2', () => start('a2'))),
    allowSkip ? null : h('button', { class: 'btn btn-ghost', onclick: () => onFinish?.('') }, 'Назад')));

  function choice(em, title, sub, fn) {
    return h('button', { class: 'option', style: { flexDirection: 'row', alignItems: 'center', gap: '14px' }, onclick: fn },
      h('span', { class: 'ko', style: { fontSize: '30px', width: '40px', textAlign: 'center' } }, em),
      h('span', { style: { textAlign: 'left' } }, h('div', null, title), h('div', { class: 'opt-sub' }, sub)));
  }

  function start(level) {
    const L = LEVELS[level];
    const s = runSession({
      exercises: genPlacement(level),
      mode: 'test',
      retryWrong: false,
      onExit: pick,
      onDone: (r) => {
        const passed = r.accuracy >= L.need;
        if (passed) { markLines(L.lines); sfx.win(); confetti(); }
        return h('div', { class: 'result' },
          mascot(passed ? 'wow' : 'happy', 120, 'pop'),
          h('div', { class: 'h1' }, passed ? 'Отлично!' : 'Хорошее начало'),
          h('div', { class: 'h2' }, `${Math.round(r.accuracy * 100)}% правильных ответов`),
          h('p', { class: 'sub' }, passed
            ? (level === 'hangul' ? 'Хангыль засчитан — можно сразу начинать линию 1 (A1). Буквы всегда можно повторить во вкладке «Хангыль».' : level === 'a1' ? 'Хангыль и линия 1 засчитаны — открыта линия 2 (A2). Пройденные уроки можно повторить в любой момент.' : 'Линии 0–2 засчитаны — открыта линия 3 «Жизнь в Корее». Пройденные уроки можно повторить в любой момент.')
            : `Для зачёта нужно ${Math.round(L.need * 100)}%. Начнём с ${level === 'hangul' ? 'алфавита' : level === 'a1' ? 'начала линии 1' : 'начала линии 2 — или попробуйте тест A1'} — первые уроки пройдут быстро.`),
          h('button', { class: 'btn btn-primary btn-block btn-lg mt', onclick: () => onFinish?.(passed ? L.title : '') }, 'Продолжить', icon('right')));
      },
    });
    root.replaceChildren(s.el);
  }

  pick();
  return root;
}

// Отдельный экран (из настроек).
export function placementScreen() {
  return placementView({ allowSkip: false, onFinish: () => navigate('/') });
}
