// Повторение: карточки SRS, работа над ошибками, свободная практика.

import { h, icon } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { words, lessons } from '../core/content.js';
import { navigate } from '../core/router.js';
import { speak, stopSpeaking } from '../core/tts.js';
import { romEl, speakBtn, sfx, haptic, emptyState, confirmDialog } from '../core/ui.js';
import { dueIds, dueCount, srsCount, grade, previewInterval, formatIvl, today } from '../core/srs.js';
import { addXP } from '../core/game.js';
import { genPractice, genHangulQuiz } from '../exercises/generator.js';
import { runSession, resultView } from './session.js';
import { pl, shuffle } from '../core/utils.js';

export function reviewScreen() {
  const due = dueCount();
  const total = srsCount();
  const learned = Object.values(state.srs).filter((c) => c.ivl >= 21).length;
  const mist = state.mistakes.length;
  const card = (emoji, title, sub, btn, onClick, highlight) => h('div', { class: 'card row gap-l', style: highlight ? { borderColor: 'var(--accent)', boxShadow: 'var(--glow)' } : null },
    h('div', { style: { fontSize: '36px' } }, emoji),
    h('div', { class: 'grow' }, h('div', { class: 'h3' }, title), h('div', { class: 'sub small' }, sub)),
    h('button', { class: 'btn btn-sm ' + (highlight ? 'btn-primary' : ''), onclick: onClick }, btn));
  return h('div', null,
    h('div', { class: 'mb' }, h('div', { class: 'h1' }, 'Повторение'), h('div', { class: 'sub' }, 'Немного каждый день — и слова останутся с вами надолго.')),
    h('div', { class: 'stats-grid mb' },
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '⏰'), h('div', null, h('b', null, String(due)), h('span', null, 'к повтору'))),
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '🧠'), h('div', null, h('b', null, `${learned}/${total}`), h('span', null, 'выучено / всего')))),
    h('div', { class: 'col stagger' },
      card('🃏', 'Карточки слов', due ? `${pl(due, 'слово ждёт', 'слова ждут', 'слов ждут')} повторения` : total ? 'На сегодня всё! Можно повторить наперёд.' : 'Слова появятся после первого урока.',
        due ? 'Начать' : 'Наперёд', () => navigate('/review/srs' + (due ? '' : '?ahead=1')), due > 0),
      card('🩹', 'Работа над ошибками', mist ? `${pl(mist, 'задание', 'задания', 'заданий')} с ошибками` : 'Ошибок нет — отлично!', 'Исправить', () => navigate('/review/mistakes'), mist > 0 && !due),
      card('🎲', 'Свободная практика', '12 случайных заданий из пройденных уроков', 'Играть', () => navigate('/review/practice')),
      card('한', 'Викторина по хангылю', 'Буквы, звуки и чтение слов', 'Играть', () => navigate('/review/practice?hangul=1'))),
    h('div', { class: 'tip mt' }, '💡', h('span', null, 'Карточки работают по интервальному методу: чем лучше вы знаете слово, тем реже оно попадается. Оценивайте себя честно — так алгоритм подберёт лучшее время для повтора.')));
}

// ---------- Карточки ----------
export function srsSession(params, query) {
  let ids = dueIds(60);
  if (!ids.length && query.get('ahead')) {
    ids = Object.entries(state.srs).filter(([id]) => words.has(id)).sort((a, b) => a[1].due - b[1].due).slice(0, 20).map(([id]) => id);
  }
  if (!ids.length) {
    return h('div', null, h('div', { class: 'topbar' }, h('button', { class: 'icon-btn plain', onclick: () => navigate('/review') }, icon('x')), h('div', { class: 'title' }, 'Карточки')),
      emptyState('🌙', 'Пока нечего повторять', 'Пройдите урок — его слова попадут сюда завтра.', h('button', { class: 'btn btn-primary mt', onclick: () => navigate('/') }, 'К урокам')));
  }
  let queue = shuffle(ids);
  const totalCards = queue.length;
  let doneCount = 0, xp = 0, again = 0;
  const reverse = state.settings.reverseCards;
  const root = h('div', { class: 'session' });
  const bar = h('div', { class: 'bar' }, h('span'));
  const counter = h('div', { class: 'combo', style: { color: 'var(--text-2)' } });
  const stage = h('div', { class: 'col grow' });
  root.append(h('div', { class: 'session-top' }, h('button', { class: 'icon-btn plain', 'aria-label': 'Выйти', onclick: () => finish(true) }, icon('x')), bar, counter), stage);

  function sentenceFor(w) {
    const l = lessons.get(w.lessonId);
    return l?.sentences.find((s) => s.ko.includes(w.ko.replace(/다$/, ''))) || null;
  }

  function show() {
    if (!queue.length) return finish();
    bar.firstChild.style.width = Math.round((doneCount / totalCards) * 100) + '%';
    counter.textContent = `${doneCount}/${totalCards}`;
    const id = queue[0];
    const w = words.get(id);
    const c = state.srs[id];
    const ex = sentenceFor(w);
    const frontKo = !reverse;
    const front = h('div', { class: 'flash-face' },
      frontKo ? h('div', { class: 'ko q-ko', style: { fontSize: '42px' } }, w.ko) : h('div', { class: 'q-ru' }, w.ru),
      frontKo ? speakBtn(w.ko, { cls: '' }) : null,
      h('div', { class: 'small muted mt' }, 'Нажмите, чтобы перевернуть'));
    const back = h('div', { class: 'flash-face back' },
      h('div', { class: 'ko q-ko', style: { fontSize: '36px' } }, w.ko),
      h('span', { class: 'rom' }, w.rom),
      h('div', { class: 'q-ru' }, w.ru),
      ex ? h('div', { class: 'small sub mt-s' }, h('div', { class: 'ko' }, ex.ko), h('div', null, ex.ru)) : null,
      speakBtn(w.ko, { cls: '' }));
    const flash = h('div', { class: 'flash pop' }, h('div', { class: 'flash-inner' }, front, back));
    const grades = h('div', { class: 'grade-row hidden' },
      [['Снова', 'g-again', 0], ['Трудно', 'g-hard', 1], ['Хорошо', 'g-good', 2], ['Легко', 'g-easy', 3]].map(([label, cls, g]) =>
        h('button', { class: 'btn ' + cls, onclick: () => rate(g) }, label, h('small', null, g === 0 ? 'сейчас' : formatIvl(previewInterval(c, g))))));
    const flipBtn = h('button', { class: 'btn btn-primary btn-block btn-lg' }, 'Показать ответ');
    const flip = () => {
      if (flash.classList.contains('flipped')) return;
      flash.classList.add('flipped'); flipBtn.classList.add('hidden'); grades.classList.remove('hidden');
      speak(w.ko);
    };
    flash.addEventListener('click', flip);
    flipBtn.addEventListener('click', flip);
    function rate(g) {
      grade(id, g);
      update('stats', (s) => { s.reviews += 1; });
      queue.shift();
      if (g === 0) { again++; queue.splice(Math.min(queue.length, 3), 0, id); sfx.bad(); }
      else { doneCount++; xp += 1; sfx.ok(); }
      haptic(8);
      show();
    }
    stage.replaceChildren(flash, h('div', { class: 'grow' }), flipBtn, grades);
    if (frontKo && state.settings.autoplay) setTimeout(() => speak(w.ko), 250);
  }

  function finish(early = false) {
    stopSpeaking();
    if (xp) addXP(xp, 'review');
    if (early && !doneCount) { navigate('/review'); return; }
    root.replaceChildren(resultView({
      emoji: '🧠', title: early ? 'Перерыв' : 'Повторение завершено',
      subtitle: `${pl(doneCount, 'карточка', 'карточки', 'карточек')} повторено`,
      accuracy: doneCount ? doneCount / (doneCount + again) : 1, xp,
      stats: [[String(again), 'снова'], [String(dueCount()), 'осталось']],
      primary: h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => navigate('/review') }, 'Готово'),
    }));
  }

  show();
  return { el: root, destroy: stopSpeaking };
}

// ---------- Ошибки ----------
export function mistakesSession() {
  const list = state.mistakes.slice(0, 12);
  if (!list.length) {
    return h('div', null, h('div', { class: 'topbar' }, h('button', { class: 'icon-btn plain', onclick: () => navigate('/review') }, icon('x')), h('div', { class: 'title' }, 'Работа над ошибками')),
      emptyState('✨', 'Ошибок нет', 'Все задания, где вы ошиблись, появятся здесь.', h('button', { class: 'btn btn-primary mt', onclick: () => navigate('/') }, 'К урокам')));
  }
  const s = runSession({
    exercises: shuffle(list.map((m) => m.ex)),
    mode: 'mistakes',
    retryWrong: false,
    onExit: () => navigate('/review'),
    onDone: (r) => {
      const xp = r.correct * 2;
      addXP(xp, 'mistakes');
      return resultView({
        emoji: '🩹', title: 'Ошибки разобраны', subtitle: r.correct ? `Исправлено: ${r.correct}` : 'Попробуйте ещё раз чуть позже',
        accuracy: r.accuracy, xp, stats: [[String(state.mistakes.length), 'осталось']],
        primary: h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => navigate('/review') }, 'Готово'),
        secondary: state.mistakes.length ? h('button', { class: 'btn btn-ghost btn-block', onclick: () => navigate('/review/mistakes?r=' + Date.now()) }, 'Ещё раунд') : null,
      });
    },
  });
  return s;
}

// ---------- Практика ----------
export function practiceSession(params, query) {
  const isHangul = !!query.get('hangul');
  const exs = isHangul ? genHangulQuiz(12) : genPractice(12);
  return runSession({
    exercises: exs,
    mode: 'practice',
    retryWrong: false,
    onExit: () => navigate(isHangul ? '/hangul' : '/review'),
    onDone: (r) => {
      const xp = Math.max(2, r.correct);
      addXP(xp, 'practice');
      return resultView({
        emoji: isHangul ? '한' : '🎲', title: 'Практика завершена', accuracy: r.accuracy, xp,
        stats: [[`${r.correct}/${r.answered}`, 'верно'], [`🔥${r.maxCombo}`, 'комбо']],
        primary: h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => navigate('/review/practice' + (isHangul ? '?hangul=1&' : '?') + 'r=' + Date.now()) }, 'Ещё раунд'),
        secondary: h('button', { class: 'btn btn-ghost btn-block', onclick: () => navigate(isHangul ? '/hangul' : '/review') }, 'Готово'),
      });
    },
  });
}

export { confirmDialog, romEl, today };
