// Урок: теория → упражнения → диалог → итоги. И итоговый тест юнита.

import { h, icon, richText } from '../core/dom.js';
import { state } from '../core/store.js';
import { lessons, units, hangul, lessonWords } from '../core/content.js';
import { navigate } from '../core/router.js';
import { romEl, speakBtn, toast } from '../core/ui.js';
import { genLesson, genUnitTest } from '../exercises/generator.js';
import { runSession, resultView, streakView } from './session.js';
import { dialogView } from './dialog.js';
import { recordLesson, recordTest, addXP, lessonUnlocked, testUnlocked, todayXP, levelInfo, streakActiveToday } from '../core/game.js';
import { emojiOf } from '../core/content.js';
import { sceneEl } from '../core/scenes.js';
import { addWords } from '../core/srs.js';
import { pl } from '../core/utils.js';

const close = (unitId) => navigate(unitId ? `/?u=${unitId}` : '/');

function lockedView(text, unitId) {
  return h('div', { class: 'empty' }, h('div', { class: 'e-icon' }, '🔒'), h('div', { class: 'h3' }, 'Пока закрыто'), h('p', { class: 'sub mt-s' }, text),
    h('button', { class: 'btn btn-primary mt', onclick: () => close(unitId) }, 'К карте'));
}

export function wordRow(w, unitId) {
  return h('div', { class: 'word-row' }, speakBtn(w.ko),
    h('div', { class: 'grow' }, h('div', { class: 'ko', lang: 'ko' }, w.ko), romEl(w.rom, unitId)),
    h('div', { class: 'ru', style: { textAlign: 'right', maxWidth: '45%' } }, w.ru));
}

export function grammarBox(g, unitId) {
  return h('div', { class: 'grammar-box' },
    h('h3', null, '📐 ', g.title),
    ...g.body.map((p) => h('p', { html: richText(p) })),
    g.examples.length ? h('div', { class: 'mt-s' }, ...g.examples.map((e) => h('div', { class: 'ex-line' }, speakBtn(e.ko),
      h('div', { class: 'grow' }, h('div', { class: 'ko', lang: 'ko' }, e.ko), romEl(e.rom, unitId), h('div', { class: 'ru' }, e.ru))))) : null,
    g.note ? h('div', { class: 'note', html: richText(g.note) }) : null);
}

function letterTile(L) {
  const b = h('button', { class: 'letter big', type: 'button' },
    h('span', { class: 'ko', lang: 'ko' }, L.ch), h('span', { class: 'lr' }, L.rom), h('span', { class: 'small muted' }, L.ru));
  b.addEventListener('click', () => import('../core/tts.js').then((m) => m.speak(L.say)));
  return b;
}

function ruleBox(rule) {
  return h('div', { class: 'grammar-box' },
    h('h3', null, '📖 ', rule.title),
    ...rule.body.map((p) => h('p', { html: richText(p) })),
    ...(rule.examples || []).map((e) => h('div', { class: 'rule-ex' },
      h('div', { class: 'ko', lang: 'ko' }, e[0]), h('span', { class: 'arrow' }, '→'),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 'ko', lang: 'ko', style: { color: 'var(--accent-2)' } }, `[${e[1]}]`), h('div', { class: 'small muted' }, `${e[2]} · ${e[3]}`)), speakBtn(e[0])))));
}

function theoryView(lesson, onStart) {
  const unit = units.get(lesson.unitId);
  const parts = [];
  if (lesson.kind === 'hangul') {
    lesson.theory.forEach((p) => parts.push(h('p', { class: 'sub', html: richText(p) })));
    const L = lesson.letters.map((c) => hangul.byChar.get(c)).filter(Boolean);
    if (L.length) {
      parts.push(h('div', { class: 'section-title' }, 'Новые буквы — нажмите, чтобы услышать'));
      parts.push(h('div', { class: 'letter-grid', style: { gridTemplateColumns: `repeat(${Math.min(4, L.length)}, 1fr)` } }, L.map(letterTile)));
      parts.push(h('div', { class: 'list' }, L.map((x) => h('div', { class: 'small sub' }, h('b', { class: 'ko' }, x.ch), ' — ', x.hint))));
    }
    lesson.rules.forEach((rid) => { const r = hangul.rules.find((x) => x.id === rid); if (r) parts.push(ruleBox(r)); });
    if (lesson.read.length) {
      parts.push(h('div', { class: 'section-title' }, 'Читаем слова'));
      parts.push(h('div', { class: 'word-list' }, lesson.read.map((r) => h('div', { class: 'word-row' }, speakBtn(r.ko),
        h('div', { class: 'grow' }, h('div', { class: 'ko', lang: 'ko' }, r.ko, r.pron ? h('span', { class: 'small', style: { color: 'var(--accent-2)', marginLeft: '8px' } }, `[${r.pron}]`) : null), h('span', { class: 'rom' }, r.rom)),
        h('div', { class: 'ru', style: { textAlign: 'right', maxWidth: '45%' } }, r.ru)))));
    }
  } else {
    if (lesson.grammar) parts.push(grammarBox(lesson.grammar, unit.id));
    const W = lessonWords(lesson);
    if (W.length) {
      parts.push(h('div', { class: 'section-title' }, `В уроке ${W.length} новых слов — познакомимся с каждым`));
      parts.push(h('div', { class: 'lesson-chips' }, W.map((w) => h('button', { class: 'chip', onclick: () => import('../core/tts.js').then((m) => m.speak(w.ko)) },
        emojiOf(w) || '•', ' ', h('span', { class: 'ko' }, w.ko), h('span', { class: 'muted', style: { fontWeight: 500 } }, ' — ' + w.ru.split(' (')[0].split(';')[0])))));
    }
  }
  return h('div', { class: 'col' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn plain', 'aria-label': 'Закрыть', onclick: () => close(unit.id) }, icon('x')),
      h('div', { class: 'title' }, h('span', { class: 'sub' }, `${unit.title} · урок ${lesson.index + 1}`))),
    h('div', { class: 'lesson-hero', style: { '--line-color': unit.color } },
      h('div', { class: 'grow' }, h('div', { class: 'lh-step' }, `Урок ${lesson.index + 1} из ${unit.lessons.length}`), h('div', { class: 'h1' }, lesson.title), lesson.goal ? h('div', { class: 'sub mt-s' }, '🎯 ', lesson.goal) : null),
      sceneEl(unit, 96)),
    h('div', { class: 'theory stagger' }, parts),
    h('div', { class: 'session-foot' }, h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: onStart }, 'Начать упражнения', icon('right'))));
}

export function lessonScreen({ id }) {
  const lesson = lessons.get(id);
  if (!lesson) return h('div', { class: 'empty' }, 'Урок не найден');
  if (!lessonUnlocked(id)) return lockedView('Сначала пройдите предыдущие уроки этой линии.', lesson.unitId);
  const root = h('div');
  let session = null;

  const start = () => {
    session = runSession({
      exercises: genLesson(lesson),
      mode: 'lesson',
      onExit: () => close(lesson.unitId),
      onDone: (r) => {
        const first = recordLesson(id, r.accuracy);
        let xp = 10 + Math.round(r.accuracy * 5) + (r.accuracy >= 1 ? 5 : 0) + Math.floor(r.maxCombo / 5);
        if (!first) xp = Math.max(3, Math.round(xp / 2));
        const newWords = lesson.kind === 'hangul' ? 0 : addWords(lesson.words);
        const streakWasActive = streakActiveToday();
        addXP(xp, 'lesson');
        const afterResult = () => {
          if (!streakWasActive && streakActiveToday()) { root.replaceChildren(streakView(state.stats.streak.count, state.stats.history, () => close(lesson.unitId))); window.scrollTo({ top: 0 }); }
          else close(lesson.unitId);
        };
        const result = () => resultView({ unit: units.get(lesson.unitId),
          emoji: r.accuracy >= 1 ? '💎' : r.accuracy >= 0.8 ? '🎉' : '👍',
          title: r.accuracy >= 1 ? 'Идеально!' : 'Урок пройден!',
          subtitle: lesson.title,
          accuracy: r.accuracy, xp,
          stats: [[`${todayXP()}/${state.settings.dailyGoal}`, 'цель дня'], newWords ? [String(newWords), 'новых слов'] : [`🔥${state.stats.streak.count}`, 'серия']],
          primary: h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: afterResult }, 'Продолжить'),
          secondary: r.wrong.length ? h('button', { class: 'btn btn-ghost btn-block', onclick: () => navigate('/review/mistakes') }, `Разобрать ошибки (${r.wrong.length})`) : null,
          extra: lesson.kind === 'hangul' ? null : h('div', { style: { width: '100%', textAlign: 'left' } },
            h('div', { class: 'section-title', style: { marginTop: '8px' } }, newWords ? '🧠 Новые слова — уже в повторении' : 'Слова урока'),
            h('div', { class: 'lesson-chips' }, lessonWords(lesson).map((w) => h('button', { class: 'chip', onclick: () => import('../core/tts.js').then((m) => m.speak(w.ko)) },
              emojiOf(w) || '•', ' ', h('span', { class: 'ko' }, w.ko), h('span', { class: 'muted', style: { fontWeight: 500 } }, ' ' + w.ru.split(' (')[0].split(';')[0]))))),
        });
        if (lesson.dialog) {
          const dv = dialogView(lesson.dialog, {
            embedded: true,
            onFinish: () => { root.replaceChildren(result()); window.scrollTo({ top: 0 }); },
          });
          window.scrollTo({ top: 0 });
          return dv.el;
        }
        return result();
      },
    });
    root.replaceChildren(session.el);
    window.scrollTo({ top: 0 });
  };

  root.append(theoryView(lesson, start));
  return { el: root, destroy: () => session?.destroy() };
}

export function testScreen({ id }) {
  const unit = units.get(id);
  if (!unit) return h('div', { class: 'empty' }, 'Тест не найден');
  if (!testUnlocked(id)) return lockedView('Тест откроется, когда вы пройдёте все уроки юнита.', id);
  const root = h('div');
  let session = null;
  const best = state.progress.tests[id];
  const start = () => {
    session = runSession({
      exercises: genUnitTest(unit),
      mode: 'test',
      onExit: () => close(id),
      onDone: (r) => {
        const { stars, firstPass } = recordTest(id, r.accuracy);
        const xp = stars ? 20 + stars * 5 + (firstPass ? 0 : -10) : 5;
        addXP(Math.max(5, xp), 'test');
        return resultView({ unit,
          emoji: stars === 3 ? '🏆' : stars ? '🎖️' : '📘',
          title: stars ? 'Тест сдан!' : 'Почти получилось',
          subtitle: stars ? `${unit.title}` : 'Нужно 60% правильных ответов. Повторите уроки и попробуйте снова.',
          accuracy: r.accuracy, xp: Math.max(5, xp), celebrate: stars > 0,
          stats: [['★'.repeat(stars) || '—', 'звёзды'], [`${r.correct}/${r.answered}`, 'верно']],
          primary: h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => close(id) }, stars ? 'Дальше' : 'К урокам'),
          secondary: !stars || stars < 3 ? h('button', { class: 'btn btn-ghost btn-block', onclick: () => { session.destroy(); start(); } }, 'Пройти ещё раз') : null,
        });
      },
    });
    root.replaceChildren(session.el);
  };
  root.append(h('div', { class: 'col' },
    h('div', { class: 'topbar' }, h('button', { class: 'icon-btn plain', 'aria-label': 'Закрыть', onclick: () => close(id) }, icon('x')), h('div', { class: 'title' }, 'Итоговый тест')),
    h('div', { class: 'result', style: { paddingTop: '10px' } },
      h('div', { class: 'trophy' }, '🏁'),
      h('div', { class: 'h1' }, unit.title),
      h('p', { class: 'sub' }, `${pl(unit.lessons.length, 'урок', 'урока', 'уроков')} в одном тесте. Без подсказок и повторов: для зачёта нужно 60%, для трёх звёзд — 90%.`),
      best ? h('div', { class: 'chip' }, 'Лучший результат: ', Math.round(best.best * 100) + '%') : null,
      h('button', { class: 'btn btn-primary btn-block btn-lg mt', onclick: start }, 'Начать тест'))));
  return { el: root, destroy: () => session?.destroy() };
}

export { toast, levelInfo };
