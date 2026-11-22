// Экранная корейская клавиатура (стандартная двухрядная раскладка 두벌식).
// Слоги собираются автоматически: ㅎ + ㅏ + ㄴ → 한.

import { h, icon } from '../core/dom.js';
import { composeKeys } from '../core/hangul.js';
import { sfx, haptic } from '../core/ui.js';

const ROWS = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
];
const SHIFT = { 'ㅂ': 'ㅃ', 'ㅈ': 'ㅉ', 'ㄷ': 'ㄸ', 'ㄱ': 'ㄲ', 'ㅅ': 'ㅆ', 'ㅐ': 'ㅒ', 'ㅔ': 'ㅖ' };
// Физическая клавиатура (QWERTY → чамо) для компьютера.
const QWERTY = { q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ', a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ', z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ', Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ' };

export function koreanKeyboard({ onChange }) {
  let keys = [];
  let shift = false;
  const keyEls = [];
  const emit = () => onChange(composeKeys(keys));
  const press = (j) => {
    keys.push(j);
    if (shift) { shift = false; paint(); }
    sfx.tap(); haptic(6);
    emit();
  };
  const backspace = () => { keys.pop(); haptic(6); emit(); };
  const paint = () => {
    keyEls.forEach(({ el, base }) => { el.textContent = shift && SHIFT[base] ? SHIFT[base] : base; });
    shiftBtn.classList.toggle('on', shift);
  };
  const shiftBtn = h('button', { class: 'key wide', type: 'button', 'aria-label': 'Shift', onclick: () => { shift = !shift; paint(); } }, '⇧');
  const el = h('div', { class: 'kbd', role: 'group', 'aria-label': 'Корейская клавиатура' });
  ROWS.forEach((row, ri) => {
    const r = h('div', { class: 'kbd-row' });
    if (ri === 2) r.append(shiftBtn);
    row.forEach((base) => {
      const k = h('button', { class: 'key ko', type: 'button', onpointerdown: (e) => { e.preventDefault(); press(shift && SHIFT[base] ? SHIFT[base] : base); } }, base);
      keyEls.push({ el: k, base });
      r.append(k);
    });
    if (ri === 2) r.append(h('button', { class: 'key wide', type: 'button', 'aria-label': 'Стереть', onpointerdown: (e) => { e.preventDefault(); backspace(); } }, icon('backspace', 'i-s')));
    el.append(r);
  });
  el.append(h('div', { class: 'kbd-row' }, h('button', { class: 'key space', type: 'button', onpointerdown: (e) => { e.preventDefault(); press(' '); } }, 'пробел')));

  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (e.key === ' ') { e.preventDefault(); press(' '); return; }
    const j = QWERTY[e.key] || QWERTY[e.key.toLowerCase()];
    if (j && e.key.length === 1) { e.preventDefault(); keys.push(e.shiftKey && SHIFT[QWERTY[e.key.toLowerCase()]] ? SHIFT[QWERTY[e.key.toLowerCase()]] : j); emit(); }
    else if (/^[가-힣ㄱ-ㆎ]$/.test(e.key)) { e.preventDefault(); keys.push(e.key); emit(); }
  };
  document.addEventListener('keydown', onKey);

  return {
    el,
    clear() { keys = []; emit(); },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}
