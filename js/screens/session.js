// Прохождение набора упражнений: прогресс, проверка, разбор ошибок, повтор неверных.

import { h, icon, progressRing as progressRingEl } from '../core/dom.js';
import { state } from '../core/store.js';
import { renderExercise } from '../exercises/render.js';
import { romEl, sfx, haptic, confirmDialog, speakBtn, confetti } from '../core/ui.js';
import { speak, stopSpeaking } from '../core/tts.js';
import { addMistake, fixMistake, countAnswer } from '../core/game.js';
import { pick } from '../core/utils.js';

const PRAISE = ['Отлично!', 'Верно!', 'Супер!', 'Так держать!', '잘했어요!', 'Прекрасно!', '맞아요!'];

/**
 * @param {object} o
 * @param {Array} o.exercises
 * @param {'lesson'|'test'|'mistakes'|'practice'} o.mode
 * @param {(r) => Node|void} o.onDone — результат; может вернуть экран итогов
 * @param {() => void} o.onExit
 */
export function runSession({ exercises, mode = 'lesson', onDone, onExit, retryWrong = mode !== 'test' }) {
  const queue = exercises.map((ex, i) => ({ ex, i, retry: false }));
  const total = exercises.length;
  const done = new Set();
  let pos = 0, answered = 0, correct = 0, combo = 0, maxCombo = 0;
  let current = null, feedback = null, locked = false;
  const wrong = [];
  const started = Date.now();

  const bar = h('div', { class: 'bar' }, h('span'));
  const comboEl = h('div', { class: 'combo' });
  const exit = h('button', { class: 'icon-btn plain', 'aria-label': 'Выйти' }, icon('x'));
  exit.addEventListener('click', async () => {
    if (answered === 0 || await confirmDialog({ title: 'Выйти?', text: 'Прогресс этого занятия не сохранится.', ok: 'Выйти', cancel: 'Остаться', danger: true })) {
      teardown(); onExit?.();
    }
  });
  const stage = h('div', { class: 'grow', style: { display: 'flex', flexDirection: 'column' } });
  const checkBtn = h('button', { class: 'btn btn-primary btn-block btn-lg', disabled: true }, 'Проверить');
  const foot = h('div', { class: 'session-foot' }, checkBtn);
  const root = h('div', { class: 'session' }, h('div', { class: 'session-top' }, exit, bar, comboEl), stage, foot);

  const setBar = () => { bar.firstChild.style.width = Math.round((done.size / total) * 100) + '%'; };

  const api = {
    ready(v) { if (!locked) checkBtn.disabled = !v; },
    finish(res) { handle(res); },
  };

  function show() {
    if (current?.destroy) current.destroy();
    feedback?.remove(); feedback = null;
    stopSpeaking();
    if (pos >= queue.length) return finish();
    locked = false;
    const item = queue[pos];
    const ex = item.ex;
    checkBtn.disabled = true;
    checkBtn.textContent = 'Проверить';
    const needsCheck = !['match', 'speak'].includes(ex.type);
    foot.classList.toggle('hidden', !needsCheck);
    current = renderExercise(ex, api);
    window.__hbEx = ex; // для отладки и автотестов
    const wrap = h('div', { class: 'ex' },
      h('div', { class: 'ex-instr' }, item.retry ? h('span', { class: 'badge soft', style: { marginRight: '8px' } }, 'ещё раз') : null, ex.instr),
      current.el);
    stage.replaceChildren(wrap);
  }

  checkBtn.addEventListener('click', () => {
    if (locked || !current?.check) return;
    const res = current.check();
    if (res?.retry) { checkBtn.disabled = true; return; }
    handle(res);
  });

  function handle(res) {
    if (locked) return;
    locked = true;
    const item = queue[pos];
    const ex = item.ex;
    stage.querySelector('.ex')?.classList.add('locked-ui');
    if (res.skipped) { done.add(item.i); setBar(); pos++; setTimeout(show, 150); return; }
    if (!item.retry) { answered++; if (res.correct) correct++; countAnswer(res.correct); }
    if (res.correct) {
      combo++; maxCombo = Math.max(maxCombo, combo);
      done.add(item.i);
      if (mode === 'mistakes' && ex.key) fixMistake(ex.key);
      if (!res.silentOk) sfx.ok();
      haptic(10);
      if (combo >= 3) { comboEl.textContent = `🔥 ×${combo}`; comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump'); }
      if (state.settings.autoplay && ex.reveal?.ko && ['build', 'fill', 'type'].includes(ex.type)) speak(ex.reveal.ko.replace(/ → .*/, ''));
    } else {
      combo = 0; comboEl.textContent = '';
      sfx.bad(); haptic([25, 40, 25]);
      wrong.push(ex);
      if (mode !== 'mistakes') addMistake(ex);
      if (retryWrong && !item.retry) queue.push({ ex, i: item.i, retry: true });
      else done.add(item.i);
    }
    setBar();
    showFeedback(res, ex);
  }

  function showFeedback(res, ex) {
    const ok = res.correct;
    const next = h('button', { class: 'btn btn-block btn-lg ' + (ok ? 'btn-ok' : 'btn-bad') }, ok ? 'Дальше' : 'Понятно');
    const rv = ex.reveal;
    const showAnswer = rv && (!ok || ['build', 'listenBuild', 'fill', 'type'].includes(ex.type) || ex.q?.hideText);
    feedback = h('div', { class: 'feedback ' + (ok ? 'ok' : 'bad'), role: 'status' },
      h('div', { class: 'feedback-inner' },
        h('div', { class: 'fb-title' }, icon(ok ? 'check' : 'x'), ok ? pick(PRAISE) : 'Неверно'),
        showAnswer ? h('div', { class: 'row' },
          rv.ko && /[가-힣]/.test(rv.ko) ? speakBtn(rv.ko.replace(/ → .*/, '').replace(/ — .*/, '')) : null,
          h('div', { class: 'grow' },
            !ok ? h('div', { class: 'fb-note' }, 'Правильный ответ:') : null,
            h('div', { class: 'fb-answer ko', lang: 'ko' }, rv.ko),
            rv.rom ? h('div', { class: 'rom' }, rv.rom) : null,
            rv.ru ? h('div', { class: 'fb-note' }, rv.ru) : null)) : null,
        !ok && ex.type === 'choice' && !showAnswer ? h('div', { class: 'fb-answer' }, ex.ans) : null,
        res.note ? h('div', { class: 'fb-note' }, res.note) : null,
        !ok && ex.hint ? h('div', { class: 'fb-note' }, '💡 ' + ex.hint) : null,
        next));
    next.addEventListener('click', () => { pos++; show(); });
    document.body.append(feedback);
    setTimeout(() => next.focus({ preventScroll: true }), 50);
  }

  function finish() {
    teardown();
    const accuracy = answered ? correct / answered : 1;
    const out = onDone?.({ accuracy, correct, answered, maxCombo, wrong, ms: Date.now() - started });
    if (out instanceof Node) root.replaceChildren(out);
  }

  const onKey = (e) => {
    if (e.key !== 'Enter') return;
    if (feedback) { e.preventDefault(); feedback.querySelector('.btn')?.click(); }
    else if (!checkBtn.disabled && !foot.classList.contains('hidden')) { e.preventDefault(); checkBtn.click(); }
  };
  document.addEventListener('keydown', onKey);
  function teardown() {
    document.removeEventListener('keydown', onKey);
    feedback?.remove(); feedback = null;
    if (current?.destroy) current.destroy();
    stopSpeaking();
  }

  setBar();
  show();
  return { el: root, destroy: teardown };
}

// ---------- Экран итогов ----------
export function resultView({ emoji = '🎉', title, subtitle, accuracy, xp, stats = [], primary, secondary, celebrate = true }) {
  if (celebrate) { sfx.win(); setTimeout(() => confetti(), 150); }
  const xpEl = h('b', null, '+0');
  let n = 0;
  const step = Math.max(1, Math.ceil(xp / 25));
  const timer = setInterval(() => { n = Math.min(xp, n + step); xpEl.textContent = '+' + n; if (n >= xp) clearInterval(timer); }, 40);
  return h('div', { class: 'result' },
    h('div', { class: 'trophy' }, emoji),
    h('div', { class: 'h1' }, title),
    subtitle ? h('div', { class: 'sub' }, subtitle) : null,
    progressRingEl(accuracy, { size: 132, stroke: 12, label: h('div', null, h('div', { style: { fontSize: '30px' } }, Math.round(accuracy * 100) + '%'), h('div', { class: 'small muted' }, 'точность')) }),
    h('div', { class: 'result-stats' },
      h('div', { class: 'rstat' }, xpEl, h('span', null, 'XP')),
      ...stats.map(([v, label]) => h('div', { class: 'rstat' }, h('b', null, v), h('span', null, label)))),
    h('div', { class: 'col', style: { width: '100%', marginTop: '10px' } }, primary, secondary || null));
}

export { romEl };
