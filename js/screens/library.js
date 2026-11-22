// Библиотека: словарь, грамматика, диалоги, разговорник.

import { h, icon } from '../core/dom.js';
import { words, grammar, dialogs, units, unitOrder, phrases } from '../core/content.js';
import { navigate } from '../core/router.js';
import { topbar, speakBtn, romEl, toast } from '../core/ui.js';
import { state } from '../core/store.js';
import { strength, addWords, formatIvl, today } from '../core/srs.js';
import { grammarBox } from './lesson.js';
import { normalize } from '../core/hangul.js';

const TABS = [['words', 'Словарь'], ['grammar', 'Грамматика'], ['dialogs', 'Диалоги'], ['phrases', 'Фразы']];
const unitName = (id) => units.get(id)?.title || '';

function wordsTab() {
  let q = '';
  let filter = 'all';
  let limit = 60;
  const listEl = h('div', { class: 'word-list' });
  const count = h('div', { class: 'small muted' });
  const input = h('input', { type: 'search', placeholder: 'Поиск: 사랑, sarang или любовь', 'aria-label': 'Поиск по словарю' });
  input.addEventListener('input', () => { q = normalize(input.value); limit = 60; paint(); });
  const unitSel = h('select', { class: 'select', 'aria-label': 'Юнит' },
    h('option', { value: 'all' }, 'Все юниты'),
    h('option', { value: 'srs' }, 'В повторении'),
    unitOrder().map((id) => h('option', { value: id }, unitName(id))));
  unitSel.addEventListener('change', () => { filter = unitSel.value; limit = 60; paint(); });
  const more = h('button', { class: 'btn btn-outline btn-block' }, 'Показать ещё');
  more.addEventListener('click', () => { limit += 100; paint(); });

  function row(w) {
    const st = strength(w.id);
    const card = state.srs[w.id];
    const add = !card && !w.hangulOnly ? h('button', { class: 'icon-btn sm plain', 'aria-label': 'Добавить в повторение', title: 'Добавить в повторение', onclick: (e) => {
      addWords([w.id]); toast('Слово добавлено в повторение', { icon: '🧠' }); e.currentTarget.remove();
    } }, '+') : null;
    return h('div', { class: 'word-row' },
      speakBtn(w.ko),
      h('div', { class: 'grow' }, h('div', { class: 'ko', lang: 'ko' }, w.ko), h('span', { class: 'rom' }, w.rom)),
      h('div', { style: { textAlign: 'right', maxWidth: '46%' } }, h('div', { class: 'ru' }, w.ru), card ? h('div', { class: 'small muted' }, card.due <= today() ? 'повторить сегодня' : 'через ' + formatIvl(card.due - today())) : null),
      st ? h('span', { class: 'srs-dot l' + st, title: 'Уровень знания' }) : add);
  }

  function paint() {
    let list = [...words.values()];
    if (filter === 'srs') list = list.filter((w) => state.srs[w.id]);
    else if (filter !== 'all') list = list.filter((w) => w.unitId === filter);
    if (q) list = list.filter((w) => normalize(w.ko).includes(q) || normalize(w.rom).replace(/-/g, '').includes(q.replace(/-/g, '')) || normalize(w.ru).includes(q));
    count.textContent = `${list.length} ${list.length % 10 === 1 && list.length % 100 !== 11 ? 'слово' : [2, 3, 4].includes(list.length % 10) && ![12, 13, 14].includes(list.length % 100) ? 'слова' : 'слов'}`;
    listEl.replaceChildren(...list.slice(0, limit).map(row));
    if (!list.length) listEl.append(h('div', { class: 'empty' }, h('div', { class: 'e-icon' }, '🔍'), 'Ничего не нашлось'));
    more.classList.toggle('hidden', list.length <= limit);
  }
  paint();
  return h('div', { class: 'col' },
    h('div', { class: 'search' }, icon('search', 'i-s'), input),
    h('div', { class: 'row between' }, count, unitSel),
    h('div', { class: 'small muted' }, 'Цвет точки — насколько хорошо вы знаете слово: 🔴 новое → 🟢 выучено.'),
    listEl, more);
}

function grouped(items, render) {
  const out = h('div', { class: 'col' });
  for (const uid of unitOrder()) {
    const xs = items.filter((x) => x.unitId === uid);
    if (!xs.length) continue;
    out.append(h('div', { class: 'section-title' }, `${units.get(uid).icon} ${unitName(uid)}`), h('div', { class: 'list' }, xs.map(render)));
  }
  return out;
}

const grammarTab = () => grouped(grammar, (g) => h('button', { class: 'list-row', onclick: () => navigate(`/grammar/${g.id}`) },
  h('div', { class: 'lr-icon' }, '📐'), h('div', { class: 'grow', style: { fontWeight: 700 } }, g.title), icon('right', 'i-s')));

const dialogsTab = () => grouped([...dialogs.values()], (d) => h('button', { class: 'list-row', onclick: () => navigate(`/dialog/${d.id}`) },
  h('div', { class: 'lr-icon' }, state.progress.dialogs[d.id] ? '✅' : '💬'),
  h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700 } }, d.title), h('div', { class: 'small muted' }, `${d.lines.length} реплик`)), icon('right', 'i-s')));

const phrasesTab = () => grouped(phrases, (p) => h('div', { class: 'word-row' }, speakBtn(p.ko),
  h('div', { class: 'grow' }, h('div', { class: 'ko', lang: 'ko' }, p.ko), romEl(p.rom, p.unitId)), h('div', { class: 'ru', style: { textAlign: 'right', maxWidth: '45%' } }, p.ru)));

export function libraryScreen({ tab = 'words' }) {
  const views = { words: wordsTab, grammar: grammarTab, dialogs: dialogsTab, phrases: phrasesTab };
  return h('div', null,
    h('div', { class: 'mb' }, h('div', { class: 'h1' }, 'Библиотека'), h('div', { class: 'sub' }, `${words.size} слов · ${grammar.length} тем грамматики · ${dialogs.size} диалогов · ${phrases.length} фраз`)),
    h('div', { class: 'segmented mb' }, TABS.map(([id, label]) => h('button', { class: id === tab ? 'active' : '', onclick: () => navigate('/library/' + id) }, label))),
    (views[tab] || wordsTab)());
}

export function grammarDetail({ id }) {
  const g = grammar.find((x) => x.id === id);
  if (!g) return h('div', { class: 'empty' }, 'Тема не найдена');
  const i = grammar.indexOf(g);
  const prev = grammar[i - 1], next = grammar[i + 1];
  return h('div', null,
    topbar({ title: 'Грамматика', back: () => navigate('/library/grammar') }),
    h('div', { class: 'small muted mb-s' }, unitName(g.unitId)),
    grammarBox(g, g.unitId),
    h('div', { class: 'row mt' },
      prev ? h('button', { class: 'btn grow', onclick: () => navigate(`/grammar/${prev.id}`) }, icon('left', 'i-s'), 'Назад') : h('span', { class: 'grow' }),
      next ? h('button', { class: 'btn grow', onclick: () => navigate(`/grammar/${next.id}`) }, 'Дальше', icon('right', 'i-s')) : h('span', { class: 'grow' })));
}
