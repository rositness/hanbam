// Отрисовка упражнений. Каждый рендерер получает описание упражнения и api сессии:
//   api.ready(bool)   — включить/выключить кнопку «Проверить»
//   api.finish(res)   — упражнение само завершилось (сопоставление, речь, пропись)
// и возвращает { el, check?(): res, destroy?() }.
// res = { correct, note?, skipped? }

import { h, icon, richText } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { speak, bindSpeakButton, stopSpeaking } from '../core/tts.js';
import { romEl, sfx, haptic } from '../core/ui.js';
import { hasHangul, normalize, compact, similarity, compose, CHO, JUNG, JONG } from '../core/hangul.js';
import { canRecognize, listen, stopListening } from '../core/speech.js';
import { koreanKeyboard } from './keyboard.js';
import { traceCanvas } from './trace.js';
import { shuffle } from '../core/utils.js';

const autoplay = () => state.settings.autoplay;

function listenBig(text, auto = true) {
  const main = bindSpeakButton(h('button', { class: 'icon-btn accent', 'aria-label': 'Прослушать' }, icon('volume')), text);
  const slow = bindSpeakButton(h('button', { class: 'icon-btn slow', 'aria-label': 'Медленно' }, icon('turtle')), text, { rate: 0.55 });
  if (auto) setTimeout(() => main.click(), 350);
  return h('div', { class: 'listen-big' }, main, slow);
}

function question(q, ex) {
  if (!q) return null;
  if (q.hideText) return listenBig(q.audio, true);
  if (q.sign) return h('div', { class: 'sign-stage' }, h('div', { class: 'sign sign-' + (q.signStyle || 'info'), lang: 'ko' }, h('span', { class: 'ko' }, q.sign)));
  if (q.ko) {
    const sp = q.audio && !q.audioAfter ? bindSpeakButton(h('button', { class: 'icon-btn', 'aria-label': 'Озвучить' }, icon('volume')), q.audio) : null;
    if (sp && autoplay()) setTimeout(() => sp.click(), 300);
    return h('div', { class: 'q-card' + (q.big ? ' center' : ''), style: q.big ? { justifyContent: 'center', flexDirection: 'column' } : null },
      sp,
      h('div', { class: 'grow', style: q.big ? { textAlign: 'center' } : null },
        h('div', { class: 'ko q-ko' + (q.big ? ' xl' : ''), lang: 'ko' }, q.ko),
        ex.noRom ? null : romEl(q.rom, ex.unitId)));
  }
  const sp = q.audio && q.showAudio ? bindSpeakButton(h('button', { class: 'icon-btn' }, icon('volume')), q.audio) : null;
  return h('div', { class: 'q-card' }, sp, q.emoji ? h('span', { class: 'q-emoji' }, q.emoji) : null, h('div', { class: 'q-ru grow' }, q.ru));
}

// ---------- Выбор ответа ----------
function choice(ex, api) {
  let selected = null;
  const isKo = ex.opts.some((o) => hasHangul(o.t));
  const withEm = ex.opts.filter((o) => o.em).length >= 3;
  const two = ex.opts.length === 4 && (withEm || ex.opts.every((o) => [...o.t].length <= (isKo ? 8 : 14)));
  const grid = h('div', { class: 'options' + (two ? ' two' : '') });
  const btns = ex.opts.map((o) => {
    const showSub = o.sub && !ex.hideSubUntilAnswer && (!isKo || !o.sub || romAllowed(ex));
    const b = h('button', { class: 'option' + (withEm ? ' has-emoji' : ''), type: 'button' },
      withEm ? h('span', { class: 'emoji' }, o.em || '💬') : null,
      h('span', { class: (hasHangul(o.t) ? 'ko' : '') , lang: hasHangul(o.t) ? 'ko' : null, style: o.big ? { fontSize: '34px' } : null }, o.t),
      showSub ? h('span', { class: 'opt-sub' + (isKo ? ' rom-sub' : '') }, o.sub) : null,
      ex.hideSubUntilAnswer && o.sub ? h('span', { class: 'opt-sub hidden', dataset: { later: '1' } }, o.sub) : null);
    b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      selected = o.t;
      sfx.tap();
      if (isKo && !ex.q.hideText && o.t.length < 30) speak(o.t);
      api.ready(true);
    });
    b.dataset.value = o.t;
    return b;
  });
  grid.append(...btns);
  const el = h('div', { class: 'ex-body' }, question(ex.q, ex), grid);
  return {
    el,
    check() {
      const correct = selected === ex.ans;
      btns.forEach((b) => {
        if (b.dataset.value === ex.ans) b.classList.add('correct');
        else if (b.dataset.value === selected) b.classList.add('wrong');
        else b.classList.add('dim');
        b.querySelectorAll('[data-later]').forEach((s) => s.classList.remove('hidden'));
      });
      if (!correct) grid.querySelector('.wrong')?.classList.add('shake');
      if (ex.q.audioAfter && ex.q.audio) speak(ex.q.audio);
      return { correct };
    },
  };
}
// латиница под корейскими вариантами — только там, где она вообще показывается
function romAllowed(ex) { const r = romEl('x', ex.unitId); return !r.classList.contains('concealed'); }

// ---------- Сопоставление ----------
function match(ex, api) {
  let mistakes = 0, left = null, right = null, matched = 0;
  const L = shuffle(ex.pairs.map((p, i) => ({ t: p[0], i })));
  const R = shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
  const colL = h('div', { class: 'col' }), colR = h('div', { class: 'col' });
  const mk = (item, side) => {
    const b = h('button', { class: 'option', type: 'button' }, h('span', { class: side === 'L' ? 'ko' : '', lang: side === 'L' ? 'ko' : null }, item.t));
    b.addEventListener('click', () => {
      if (side === 'L') { left?.el.classList.remove('selected'); left = { el: b, i: item.i }; speak(item.t); }
      else { right?.el.classList.remove('selected'); right = { el: b, i: item.i }; }
      b.classList.add('selected');
      if (left && right) {
        if (left.i === right.i) {
          sfx.ok(); haptic(8);
          [left.el, right.el].forEach((x) => { x.classList.remove('selected'); x.classList.add('correct', 'matched'); });
          matched++;
          if (matched === ex.pairs.length) setTimeout(() => api.finish({ correct: mistakes <= 1, note: mistakes ? `Ошибок: ${mistakes}` : '' , silentOk: true }), 450);
        } else {
          mistakes++; sfx.bad(); haptic([20, 30, 20]);
          const a = left.el, c = right.el;
          [a, c].forEach((x) => { x.classList.remove('selected'); x.classList.add('wrong', 'shake'); });
          setTimeout(() => [a, c].forEach((x) => x.classList.remove('wrong', 'shake')), 450);
        }
        left = right = null;
      }
    });
    return b;
  };
  L.forEach((x) => colL.append(mk(x, 'L')));
  R.forEach((x) => colR.append(mk(x, 'R')));
  return { el: h('div', { class: 'ex-body' }, h('div', { class: 'match' }, colL, colR)) };
}

// ---------- Сборка предложения ----------
function build(ex, api) {
  const chosen = [];
  const answerBox = h('div', { class: 'build-answer' });
  const bank = h('div', { class: 'build-bank' });
  const ru = ex.lang === 'ru';
  const tileCls = ru ? 'tile' : 'tile ko';
  const tiles = ex.tiles.map((t, idx) => {
    const b = h('button', { class: tileCls, type: 'button', lang: ru ? 'ru' : 'ko' }, t);
    b.addEventListener('click', () => {
      sfx.tap();
      b.classList.add('used');
      const copy = h('button', { class: tileCls, type: 'button', lang: ru ? 'ru' : 'ko' }, t);
      const entry = { idx, t, el: copy };
      copy.addEventListener('click', () => {
        chosen.splice(chosen.indexOf(entry), 1);
        copy.remove(); b.classList.remove('used');
        refresh();
      });
      chosen.push(entry);
      answerBox.append(copy);
      if (!ru && chosen.length <= 6) speak(t);
      refresh();
    });
    return b;
  });
  const refresh = () => { answerBox.classList.toggle('filled', chosen.length > 0); api.ready(chosen.length > 0); };
  bank.append(...tiles);
  return {
    el: h('div', { class: 'ex-body' }, question(ex.q, ex), answerBox, bank),
    check() {
      const got = compact(chosen.map((c) => c.t).join(' ')).toLowerCase();
      const want = compact(ex.answer.join(' ')).toLowerCase();
      const correct = got === want;
      answerBox.style.borderColor = correct ? 'var(--ok)' : 'var(--bad)';
      if (!correct) answerBox.classList.add('shake');
      return { correct };
    },
  };
}

// ---------- Пропуск ----------
function fill(ex, api) {
  let selected = null;
  const [before, after] = ex.q.split('___');
  const blank = h('span', { class: 'blank ko' }, ' ');
  const sentence = h('div', { class: 'fill-sentence ko', lang: 'ko' }, before, blank, after || '');
  const opts = h('div', { class: 'build-bank' });
  const btns = ex.opts.map((o) => {
    const b = h('button', { class: 'tile ko', type: 'button', lang: 'ko' }, o);
    b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('used'));
      b.classList.add('used');
      selected = o; blank.textContent = o; blank.classList.add('filled');
      sfx.tap(); api.ready(true);
    });
    return b;
  });
  opts.append(...btns);
  return {
    el: h('div', { class: 'ex-body' },
      h('div', { class: 'q-card', style: { flexDirection: 'column', alignItems: 'flex-start', gap: '6px' } }, sentence, h('div', { class: 'sub' }, ex.ru)),
      opts,
      ex.hint ? h('div', { class: 'tip' }, '💡', h('span', null, ex.hint)) : null),
    check() {
      const correct = selected === ex.ans;
      blank.style.color = correct ? 'var(--ok)' : 'var(--bad)';
      blank.style.borderColor = correct ? 'var(--ok)' : 'var(--bad)';
      if (!correct) sentence.classList.add('shake');
      return { correct };
    },
  };
}

// ---------- Ввод с клавиатуры ----------
function typeEx(ex, api) {
  let text = '';
  let native = false;
  const display = h('div', { class: 'type-field ko', lang: 'ko' });
  const nativeInput = h('input', { class: 'type-field ko hidden', lang: 'ko', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Введите хангылем…' });
  const paint = () => {
    display.replaceChildren(text ? h('span', null, text) : h('span', { class: 'placeholder' }, 'Наберите ответ на клавиатуре ниже'), h('span', { class: 'caret' }));
    api.ready(text.trim().length > 0);
  };
  const kb = koreanKeyboard({ onChange: (t) => { text = t; paint(); } });
  nativeInput.addEventListener('input', () => { text = nativeInput.value; api.ready(text.trim().length > 0); });
  const toggle = h('button', { class: 'btn btn-sm btn-ghost', type: 'button' }, icon('keyboard', 'i-s'), 'Своя клавиатура');
  toggle.addEventListener('click', () => {
    native = !native;
    nativeInput.classList.toggle('hidden', !native);
    display.classList.toggle('hidden', native);
    kb.el.classList.toggle('hidden', native);
    toggle.lastChild.textContent = native ? 'Экранная клавиатура' : 'Своя клавиатура';
    if (native) { nativeInput.value = text; nativeInput.focus(); }
    else { kb.clear(); text = ''; paint(); }
  });
  const hintLen = [...ex.answer.replace(/\s/g, '')].length;
  paint();
  return {
    el: h('div', { class: 'ex-body' },
      question({ ...ex.q, showAudio: true }, ex),
      h('div', { class: 'sub' }, `Подсказка: ${hintLen} ${hintLen === 1 ? 'слог' : hintLen < 5 ? 'слога' : 'слогов'}`),
      display, nativeInput, kb.el, h('div', { class: 'center' }, toggle)),
    check() {
      const got = compact(text), want = compact(ex.answer);
      const alts = (ex.accept || []).map(compact);
      if (got === want || alts.includes(got)) return { correct: true };
      const sim = similarity(text, ex.answer);
      if (sim >= 0.85 && [...want].length >= 3) return { correct: true, note: `Почти! Небольшая опечатка: правильно «${ex.answer}».` };
      (native ? nativeInput : display).classList.add('shake');
      return { correct: false, note: text ? `Ваш ответ: ${text}` : '' };
    },
    destroy() { kb.destroy(); },
  };
}

// ---------- Проговаривание ----------
function speakEx(ex, api) {
  let tries = 0;
  const status = h('div', { class: 'heard sub' }, canRecognize ? 'Нажмите на микрофон и произнесите фразу' : 'Прослушайте и повторите вслух несколько раз');
  const play = bindSpeakButton(h('button', { class: 'icon-btn', 'aria-label': 'Прослушать' }, icon('volume')), ex.ko);
  const slow = bindSpeakButton(h('button', { class: 'icon-btn', 'aria-label': 'Медленно' }, icon('turtle')), ex.ko, { rate: 0.55 });
  if (autoplay()) setTimeout(() => play.click(), 300);
  const card = h('div', { class: 'q-card', style: { flexDirection: 'column', alignItems: 'stretch' } },
    h('div', { class: 'ko q-ko', lang: 'ko' }, ex.ko), romEl(ex.rom, ex.unitId), h('div', { class: 'sub' }, ex.ru),
    h('div', { class: 'row mt-s' }, play, slow));
  const skip = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
    stopListening();
    api.finish({ correct: true, skipped: true });
  } }, 'Не могу говорить сейчас');
  const body = h('div', { class: 'ex-body' }, card);
  if (canRecognize) {
    const mic = h('button', { class: 'mic-btn', type: 'button', 'aria-label': 'Говорить' }, icon('mic'));
    mic.addEventListener('click', async () => {
      if (mic.classList.contains('listening')) { stopListening(); return; }
      stopSpeaking();
      mic.classList.add('listening');
      status.textContent = 'Слушаю…';
      try {
        const alts = await listen({ lang: 'ko-KR' });
        mic.classList.remove('listening');
        if (!alts.length) { status.textContent = 'Ничего не услышал. Попробуйте ещё раз, чуть громче.'; return; }
        const best = alts.map((a) => ({ a, s: similarity(a, ex.ko) })).sort((x, y) => y.s - x.s)[0];
        const pct = Math.round(best.s * 100);
        tries++;
        status.replaceChildren(h('div', null, 'Распознано: ', h('b', { class: 'ko' }, best.a)), h('div', null, `Совпадение: ${pct}%`));
        if (best.s >= 0.7) {
          update('stats', (s) => { s.speakOk += 1; });
          api.finish({ correct: true, note: `Произношение: ${pct}% совпадения` });
        } else if (tries >= 3) {
          api.finish({ correct: true, skipped: true });
        } else status.append(h('div', null, 'Попробуйте ещё раз — послушайте образец медленно.'));
      } catch (e) {
        mic.classList.remove('listening');
        status.textContent = e.message === 'not-allowed' ? 'Нет доступа к микрофону. Разрешите его в настройках браузера.' : 'Распознавание недоступно. Повторите фразу вслух и нажмите «Готово».';
        body.append(selfCheck());
      }
    });
    body.append(mic, status, h('div', { class: 'center' }, skip));
  } else {
    body.append(status, selfCheck(), h('div', { class: 'center' }, skip));
  }
  function selfCheck() {
    return h('button', { class: 'btn btn-outline btn-block', type: 'button', onclick: () => { update('stats', (s) => { s.speakOk += 1; }); api.finish({ correct: true, note: 'Отлично! Продолжайте проговаривать вслух.' }); } }, icon('check', 'i-s'), 'Готово, я повторил(а)');
  }
  return { el: body, destroy() { stopListening(); } };
}

// ---------- Пропись ----------
function trace(ex, api) {
  let attempts = 0;
  const score = h('div', { class: 'trace-score sub' }, ex.strokesHint ? `Порядок черт: ${ex.strokesHint}` : 'Пишите сверху вниз и слева направо');
  const tc = traceCanvas(ex.ch, { onStroke: (n) => api.ready(n > 0) });
  setTimeout(() => tc.animate(), 500); // сначала показываем, как пишется буква
  const say = bindSpeakButton(h('button', { class: 'icon-btn' }, icon('volume')), ex.say || ex.ch);
  return {
    el: h('div', { class: 'ex-body' },
      h('div', { class: 'row center', style: { justifyContent: 'center' } }, say, h('div', null, h('b', { class: 'ko', style: { fontSize: '22px' } }, ex.ch), ' · ', h('span', { class: 'rom', style: { display: 'inline' } }, ex.rom), ex.name ? h('span', { class: 'sub' }, ` · ${ex.name}`) : null)),
      tc.el, score,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        tc.hasStrokes ? h('button', { class: 'btn btn-sm', type: 'button', onclick: () => tc.animate() }, icon('play', 'i-s'), 'Показать порядок') : null,
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => tc.clear() }, icon('refresh', 'i-s'), 'Стереть'))),
    check() {
      const r = tc.score();
      attempts++;
      if (r.ok) { update('stats', (s) => { s.traceOk += 1; }); return { correct: true, note: `Точность ${r.value}%` }; }
      if (attempts >= 2) return { correct: true, skipped: false, note: 'Засчитано. Потренируйтесь ещё во вкладке «Хангыль → Прописи».' };
      score.textContent = r.coverage < 0.55 ? 'Обведите букву полностью и попробуйте ещё раз' : 'Старайтесь не выходить за контур';
      tc.clear();
      tc.animate();
      return { retry: true };
    },
    destroy() { tc.destroy(); },
  };
}

// ---------- Сборка слога ----------
function composeEx(ex, api) {
  let cho = '', jung = '', jong = '';
  const preview = h('div', { class: 'ko big-letter', lang: 'ko', style: { fontSize: '92px', minHeight: '100px', color: 'var(--accent-2)' } }, '?');
  const parts = h('div', { class: 'sub center' }, ' ');
  const tiles = ex.tiles.map((t) => {
    const b = h('button', { class: 'tile ko', type: 'button', lang: 'ko', style: { fontSize: '26px', minWidth: '56px' } }, t);
    b.addEventListener('click', () => {
      sfx.tap();
      if (JUNG.includes(t)) { if (!jung) jung = t; else return; }
      else if (!cho && CHO.includes(t)) cho = t;
      else if (cho && jung && !jong && JONG.includes(t)) jong = t;
      else return;
      b.classList.add('used');
      paint();
    });
    return b;
  });
  const reset = () => { cho = jung = jong = ''; tiles.forEach((b) => b.classList.remove('used')); paint(); };
  function paint() {
    const syl = cho && jung ? compose(cho, jung, jong) : (cho || '') + (jung || '') || '?';
    preview.textContent = syl;
    parts.textContent = [cho, jung, jong].filter(Boolean).join(' + ') || 'Нажимайте на буквы: согласная → гласная → (патчим)';
    api.ready(!!(cho && jung));
    if (cho && jung) speak(syl);
  }
  paint();
  return {
    el: h('div', { class: 'ex-body' },
      h('div', { class: 'q-card', style: { justifyContent: 'center' } }, h('div', { class: 'center' }, h('div', { class: 'sub' }, 'Слог, который звучит как'), h('div', { class: 'q-ru', style: { color: 'var(--accent-2)' } }, ex.rom))),
      preview, parts,
      h('div', { class: 'build-bank' }, tiles),
      h('div', { class: 'center' }, h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: reset }, icon('refresh', 'i-s'), 'Сначала'))),
    check() {
      const got = compose(cho, jung, jong);
      const correct = got === ex.target;
      preview.style.color = correct ? 'var(--ok)' : 'var(--bad)';
      if (!correct) preview.classList.add('shake');
      return { correct };
    },
  };
}

// ---------- Новое слово / новая буква ----------
function learn(ex, api) {
  const say = ex.say || ex.ko;
  const play = bindSpeakButton(h('button', { class: 'icon-btn accent', 'aria-label': 'Прослушать' }, icon('volume')), say);
  const slow = bindSpeakButton(h('button', { class: 'icon-btn', 'aria-label': 'Медленно' }, icon('turtle')), say, { rate: 0.55 });
  setTimeout(() => play.click(), 350);
  api.ready(true);
  const exm = ex.example;
  const card = h('div', { class: 'learn-card' },
    h('span', { class: 'badge gold lc-badge' }, ex.letter ? 'НОВАЯ БУКВА' : 'НОВОЕ СЛОВО'),
    ex.letter ? null : h('div', { class: 'lc-emoji' }, ex.emoji || '✨'),
    h('div', { class: 'lc-ko ko', lang: 'ko', style: ex.letter ? { fontSize: '96px' } : null }, ex.ko),
    h('span', { class: 'rom', style: { fontSize: '17px' } }, ex.rom),
    h('div', { class: 'lc-ru' }, ex.letter ? '«' + ex.ru + '»' : ex.ru),
    ex.hint ? h('div', { class: 'lc-hint', html: richText(ex.hint) }) : null,
    ex.name ? h('div', { class: 'lc-hint' }, 'Название буквы: ', h('b', { class: 'ko' }, ex.name)) : null,
    h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '6px' } }, play, slow),
    exm ? h('div', { class: 'lc-example' }, h('div', { class: 'row' },
      bindSpeakButton(h('button', { class: 'icon-btn sm' }, icon('volume', 'i-s')), exm.ko),
      h('div', { class: 'grow' }, h('div', { class: 'ko', style: { fontWeight: 600 } }, exm.ko), h('div', { class: 'small sub' }, exm.ru)))) : null);
  return { el: h('div', { class: 'ex-body' }, card), check: () => ({ correct: true, learn: true }) };
}

const RENDERERS = { learn,  choice, match, build, fill, type: typeEx, speak: speakEx, trace, compose: composeEx };

export function renderExercise(ex, api) {
  const r = RENDERERS[ex.type];
  if (!r) throw new Error('Неизвестный тип упражнения: ' + ex.type);
  return r(ex, api);
}

export const autoCheckTypes = new Set(['match', 'speak']);
export { normalize };
