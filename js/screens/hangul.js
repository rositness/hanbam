// Раздел «Хангыль»: таблица букв, конструктор слогов, прописи, правила чтения.

import { h, icon, richText } from '../core/dom.js';
import { hangul } from '../core/content.js';
import { navigate } from '../core/router.js';
import { speak } from '../core/tts.js';
import { openSheet, speakBtn, toast, sfx } from '../core/ui.js';
import { update } from '../core/store.js';
import { compose, romanizeSyllable, CHO, JUNG, JONG } from '../core/hangul.js';
import { traceCanvas } from '../exercises/trace.js';

const TABS = [['letters', 'Буквы'], ['syllables', 'Слоги'], ['write', 'Прописи'], ['rules', 'Чтение']];

export function letterSheet(L) {
  const tc = traceCanvas(L.ch);
  const score = h('div', { class: 'trace-score sub' }, L.strokes ? `Порядок черт: ${L.strokes}` : 'Обведите букву пальцем');
  const content = h('div', { class: 'col' },
    h('div', { class: 'row' },
      h('div', { class: 'ko', style: { fontSize: '72px', fontWeight: 600, lineHeight: 1 } }, L.ch),
      h('div', { class: 'grow' },
        h('div', { class: 'h2' }, h('span', { class: 'rom', style: { display: 'inline', fontSize: '22px' } }, L.rom), ' · «', L.ru, '»'),
        L.name ? h('div', { class: 'sub' }, 'Название: ', h('b', { class: 'ko' }, L.name), L.nameRom ? ` (${L.nameRom})` : '') : null),
      speakBtn(L.say, { cls: '' })),
    h('p', { html: richText(L.hint) }),
    L.example ? h('div', { class: 'word-row' }, speakBtn(L.example[0]), h('div', { class: 'grow' }, h('div', { class: 'ko' }, L.example[0]), h('span', { class: 'rom' }, L.example[1])), h('div', { class: 'ru' }, L.example[2])) : null,
    h('div', { class: 'section-title' }, 'Пропись'),
    tc.el, score,
    h('div', { class: 'row' },
      h('button', { class: 'btn grow', onclick: () => tc.animate() }, icon('play', 'i-s'), 'Порядок'),
      h('button', { class: 'btn grow', onclick: () => { tc.clear(); score.textContent = 'Обведите букву пальцем'; } }, icon('refresh', 'i-s'), 'Стереть'),
      h('button', { class: 'btn btn-primary grow', onclick: () => {
        if (!tc.hasInk()) return;
        const r = tc.score();
        if (r.ok) { sfx.ok(); update('stats', (s) => { s.traceOk += 1; }); score.textContent = `Отлично! Точность ${r.value}%`; }
        else { sfx.bad(); score.textContent = r.coverage < 0.55 ? 'Обведите букву полностью' : 'Старайтесь не выходить за контур'; }
      } }, icon('check', 'i-s'), 'Проверить')));
  speak(L.say);
  const s = openSheet(content, { onClose: () => tc.destroy() });
  return s;
}

function lettersTab() {
  const out = h('div', { class: 'col gap-l' });
  for (const g of hangul.groups) {
    out.append(h('div', null,
      h('div', { class: 'section-title' }, g.title),
      g.note ? h('p', { class: 'small sub' }, g.note) : null,
      h('div', { class: 'letter-grid' }, g.letters.map((ch) => {
        const L = hangul.byChar.get(ch);
        return h('button', { class: 'letter', onclick: () => letterSheet(L), 'aria-label': `${ch}, ${L.rom}` }, h('span', { class: 'ko' }, ch), h('span', { class: 'lr' }, L.rom));
      }))));
  }
  return out;
}

function syllablesTab() {
  let c = 'ㅎ', v = 'ㅏ', f = 'ㄴ';
  const big = h('div', { class: 'ko big-letter', style: { color: 'var(--text)' } });
  const rom = h('div', { class: 'h2 center', style: { color: 'var(--accent-2)' } });
  const formula = h('div', { class: 'sub center' });
  const play = h('button', { class: 'btn btn-primary' }, icon('volume', 'i-s'), 'Послушать');
  const table = h('div', { class: 'options two', style: { gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' } });
  play.addEventListener('click', () => speak(cur()));
  const cur = () => compose(c, v, f);
  const chipsRow = (list, get, set, allowEmpty) => {
    const row = h('div', { class: 'row wrap gap-s' });
    const all = allowEmpty ? ['', ...list] : list;
    const btns = all.map((x) => {
      const b = h('button', { class: 'chip ko' + (get() === x ? ' active' : ''), style: { fontSize: '18px', minWidth: '42px', justifyContent: 'center' } }, x || '—');
      b.addEventListener('click', () => { set(x); btns.forEach((y) => y.classList.remove('active')); b.classList.add('active'); paint(true); });
      return b;
    });
    row.append(...btns);
    return row;
  };
  const finals = JONG.filter((x) => x && !['ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ'].includes(x));
  function paint(say) {
    const s = cur();
    big.textContent = s;
    rom.textContent = romanizeSyllable(s);
    formula.textContent = [c, v, f].filter(Boolean).join(' + ') + ' = ' + s;
    table.replaceChildren(...['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅑ', 'ㅕ', 'ㅛ', 'ㅠ'].map((vv) => {
      const sy = compose(c, vv, '');
      return h('button', { class: 'option', style: { minHeight: '52px', padding: '4px' }, onclick: () => speak(sy) }, h('span', { class: 'ko', style: { fontSize: '22px' } }, sy), h('span', { class: 'opt-sub' }, romanizeSyllable(sy)));
    }));
    if (say) speak(s);
  }
  paint(false);
  return h('div', { class: 'col' },
    h('div', { class: 'card center' }, big, rom, formula, h('div', { class: 'mt-s' }, play)),
    h('div', { class: 'section-title' }, '1. Начальная согласная'), chipsRow(CHO, () => c, (x) => { c = x; }),
    h('div', { class: 'section-title' }, '2. Гласная'), chipsRow(JUNG, () => v, (x) => { v = x; }),
    h('div', { class: 'section-title' }, '3. Патчим (необязательно)'), chipsRow(finals, () => f, (x) => { f = x; }, true),
    h('div', { class: 'section-title' }, 'Эта согласная со всеми базовыми гласными'), table);
}

function writeTab() {
  const order = hangul.groups.flatMap((g) => g.letters);
  let i = 0;
  const holder = h('div');
  const head = h('div', { class: 'row between' });
  let tc = null;
  const score = h('div', { class: 'trace-score sub' });
  function show() {
    tc?.destroy();
    const L = hangul.byChar.get(order[i]);
    tc = traceCanvas(L.ch);
    score.textContent = L.strokes ? `Порядок черт: ${L.strokes}` : 'Пишите сверху вниз и слева направо';
    head.replaceChildren(
      h('button', { class: 'icon-btn', 'aria-label': 'Предыдущая', onclick: () => { i = (i - 1 + order.length) % order.length; show(); } }, icon('left')),
      h('div', { class: 'center' }, h('div', { class: 'h2 ko' }, L.ch, ' ', h('span', { class: 'rom', style: { display: 'inline' } }, L.rom)), h('div', { class: 'small muted' }, `${i + 1} из ${order.length}`)),
      h('button', { class: 'icon-btn', 'aria-label': 'Следующая', onclick: () => { i = (i + 1) % order.length; show(); } }, icon('right')));
    holder.replaceChildren(tc.el);
    speak(L.say);
    setTimeout(() => tc.animate(), 400);
  }
  show();
  return h('div', { class: 'col' }, head, holder, score,
    h('div', { class: 'row' },
      h('button', { class: 'btn grow', onclick: () => tc.animate() }, icon('play', 'i-s'), 'Порядок'),
      h('button', { class: 'btn grow', onclick: () => tc.clear() }, icon('refresh', 'i-s'), 'Стереть'),
      h('button', { class: 'btn btn-primary grow', onclick: () => {
        if (!tc.hasInk()) { toast('Сначала обведите букву', { icon: '✍️' }); return; }
        const r = tc.score();
        if (r.ok) { sfx.ok(); update('stats', (s) => { s.traceOk += 1; }); score.textContent = `Отлично! Точность ${r.value}%`; setTimeout(() => { i = (i + 1) % order.length; show(); }, 900); }
        else { sfx.bad(); score.textContent = r.coverage < 0.55 ? 'Обведите букву полностью' : 'Старайтесь не выходить за контур'; }
      } }, icon('check', 'i-s'), 'Проверить')),
    h('div', { class: 'tip' }, '💡', h('span', null, 'Цифры на образце — порядок черт, кнопка «Порядок» показывает его анимацией. Общее правило: сверху вниз и слева направо, круг ㅇ — против часовой стрелки, начиная сверху.')));
}

function rulesTab() {
  return h('div', { class: 'col gap-l' }, hangul.rules.map((r) => h('div', { class: 'grammar-box' },
    h('h3', null, '📖 ', r.title),
    ...r.body.map((p) => h('p', { html: richText(p) })),
    ...(r.examples || []).map((e) => h('div', { class: 'rule-ex' },
      h('div', { class: 'ko' }, e[0]), h('span', { class: 'arrow' }, '→'),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 'ko', style: { color: 'var(--accent-2)' } }, `[${e[1]}]`), h('div', { class: 'small muted' }, `${e[2]} · ${e[3]}`)), speakBtn(e[0])))))));
}

export function hangulScreen({ tab = 'letters' }, query) {
  const views = { letters: lettersTab, syllables: syllablesTab, write: writeTab, rules: rulesTab };
  const view = (views[tab] || lettersTab)();
  const el = h('div', null,
    h('div', { class: 'row between mb' },
      h('div', null, h('div', { class: 'h1' }, 'Хангыль ', h('span', { class: 'ko grad-text' }, '한글')), h('div', { class: 'sub' }, '40 букв, из которых складываются все слоги')),
      h('button', { class: 'btn btn-primary btn-sm', onclick: () => navigate('/review/practice?hangul=1') }, icon('bolt', 'i-s'), 'Викторина')),
    h('div', { class: 'segmented mb' }, TABS.map(([id, label]) => h('button', { class: id === tab ? 'active' : '', onclick: () => navigate(id === 'letters' ? '/hangul' : '/hangul/' + id) }, label))),
    view);
  const l = query?.get('l');
  return { el, mounted() { if (l && hangul.byChar.get(l)) letterSheet(hangul.byChar.get(l)); } };
}
