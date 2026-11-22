// Страница юнита: уроки, тест, слова, грамматика, диалоги и разговорник.

import { h, icon, progressRing } from '../core/dom.js';
import { units, getLine, unitWords, hangul } from '../core/content.js';
import { navigate } from '../core/router.js';
import { topbar, speakBtn, romEl, starsEl, toast } from '../core/ui.js';
import { state } from '../core/store.js';
import { lessonDone, nodeUnlocked, unitProgress } from '../core/game.js';
import { wordRow, grammarBox } from './lesson.js';
import { sceneEl } from '../core/scenes.js';

export function unitScreen({ id }) {
  const unit = units.get(id);
  if (!unit) return h('div', { class: 'empty' }, 'Юнит не найден');
  const line = getLine(unit.lineId);
  const p = unitProgress(unit);
  const el = h('div', { style: { '--line-color': unit.color } },
    topbar({ title: line.title, back: () => navigate(`/?u=${id}`) }),
    h('div', { class: 'card row gap-l', style: { background: `linear-gradient(135deg, color-mix(in srgb, ${unit.color} 22%, var(--surface)), var(--surface))` } },
      sceneEl(unit, 76),
      h('div', { class: 'grow' }, h('div', { class: 'h2' }, unit.title), h('div', { class: 'ko sub' }, unit.ko), unit.description ? h('div', { class: 'small sub mt-s' }, unit.description) : null),
      progressRing(p.ratio, { size: 54, stroke: 5, color: unit.color, label: `${p.done}/${p.total}` })),
    h('div', { class: 'section-title' }, 'Уроки'),
    h('div', { class: 'list' },
      unit.lessons.map((l) => {
        const open = nodeUnlocked({ type: 'lesson', id: l.id, unitId: id });
        return h('button', { class: 'list-row', onclick: () => open ? navigate(`/lesson/${l.id}`) : toast('Сначала пройдите предыдущий урок', { icon: '🔒' }) },
          h('div', { class: 'lr-icon' }, lessonDone(l.id) ? '✅' : open ? String(l.index + 1) : '🔒'),
          h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700 } }, l.title), h('div', { class: 'small muted' }, l.goal)), icon('right', 'i-s'));
      }),
      h('button', { class: 'list-row', onclick: () => navigate(`/test/${id}`) },
        h('div', { class: 'lr-icon' }, '🏁'), h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700 } }, 'Итоговый тест'), h('div', { class: 'small muted' }, 'Проверка всего юнита')),
        state.progress.tests[id] ? starsEl(state.progress.tests[id].stars) : icon('right', 'i-s'))),
  );

  if (unit.kind === 'hangul') {
    const L = [...new Set(unit.lessons.flatMap((l) => l.letters))].map((c) => hangul.byChar.get(c)).filter(Boolean);
    if (L.length) {
      el.append(h('div', { class: 'section-title' }, 'Буквы юнита'),
        h('div', { class: 'letter-grid' }, L.map((x) => h('button', { class: 'letter', onclick: () => navigate('/hangul?l=' + encodeURIComponent(x.ch)) }, h('span', { class: 'ko' }, x.ch), h('span', { class: 'lr' }, x.rom)))));
    }
    const reads = unit.lessons.flatMap((l) => l.read);
    el.append(h('div', { class: 'section-title' }, `Слова для чтения · ${reads.length}`),
      h('div', { class: 'word-list' }, reads.map((r) => h('div', { class: 'word-row' }, speakBtn(r.ko), h('div', { class: 'grow' }, h('div', { class: 'ko' }, r.ko, r.pron ? h('span', { class: 'small', style: { color: 'var(--accent-2)', marginLeft: '6px' } }, `[${r.pron}]`) : null), h('span', { class: 'rom' }, r.rom)), h('div', { class: 'ru' }, r.ru)))));
    return el;
  }

  const gs = unit.lessons.map((l) => l.grammar).filter(Boolean);
  if (gs.length) {
    el.append(h('div', { class: 'section-title' }, 'Грамматика'), h('div', { class: 'list' }, gs.map((g) => h('button', { class: 'list-row', onclick: () => navigate(`/grammar/${g.id}`) }, h('div', { class: 'lr-icon' }, '📐'), h('div', { class: 'grow', style: { fontWeight: 700 } }, g.title), icon('right', 'i-s')))));
  }
  const ds = unit.lessons.map((l) => l.dialog).filter(Boolean);
  if (ds.length) {
    el.append(h('div', { class: 'section-title' }, 'Диалоги'), h('div', { class: 'list' }, ds.map((d) => h('button', { class: 'list-row', onclick: () => navigate(`/dialog/${d.id}`) }, h('div', { class: 'lr-icon' }, state.progress.dialogs[d.id] ? '✅' : '💬'), h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700 } }, d.title), h('div', { class: 'small muted' }, `${d.lines.length} реплик`)), icon('right', 'i-s')))));
  }
  if (unit.phrases.length) {
    el.append(h('div', { class: 'section-title' }, 'Разговорник'), h('div', { class: 'word-list' }, unit.phrases.map((ph) => wordRow({ ...ph }, id))));
  }
  const W = unitWords(unit);
  el.append(h('div', { class: 'section-title' }, `Слова юнита · ${W.length}`), h('div', { class: 'word-list' }, W.map((w) => wordRow(w, id))));
  return el;
}

export { grammarBox, romEl };
