// Диалоги в режиме «прочитай и послушай».

import { h, icon } from '../core/dom.js';
import { dialogs, units } from '../core/content.js';
import { speak, stopSpeaking } from '../core/tts.js';
import { romShown, topbar } from '../core/ui.js';
import { markDialog, addXP } from '../core/game.js';

const COLORS = ['#ff4f9a', '#4fd8ff', '#ffc94d', '#a77bff'];

export function dialogView(d, { embedded = false, onFinish } = {}) {
  const speakers = [...new Set(d.lines.map((l) => l.who))];
  let showRu = true;
  let showRom = romShown(d.unitId);
  let slow = false;
  let playing = false;
  let stopFlag = false;
  let heardAll = false;

  const rows = d.lines.map((l, i) => {
    const si = speakers.indexOf(l.who);
    const bubble = h('div', { class: 'bubble' },
      h('div', { class: 'ko', lang: 'ko' }, l.ko),
      h('div', { class: 'rom d-rom' }, l.rom),
      h('div', { class: 'ru d-ru' }, l.ru));
    bubble.addEventListener('click', () => { stopAll(); playLine(i); });
    return {
      bubble,
      el: h('div', { class: 'bubble-row' + (si % 2 ? ' b' : '') },
        h('div', { class: 'avatar', style: { background: COLORS[si % COLORS.length] }, title: l.who }, l.who.slice(0, 1)), bubble),
    };
  });

  const apply = () => {
    rows.forEach((r) => {
      r.bubble.querySelector('.d-ru').classList.toggle('hidden', !showRu);
      r.bubble.querySelector('.d-rom').classList.toggle('hidden', !showRom);
    });
  };

  async function playLine(i) {
    rows.forEach((r) => r.bubble.classList.remove('active'));
    const r = rows[i];
    r.bubble.classList.add('active');
    r.bubble.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await speak(d.lines[i].ko, slow ? { rate: 0.6 } : {});
    r.bubble.classList.remove('active');
  }

  function stopAll() { stopFlag = true; playing = false; stopSpeaking(); playBtn.replaceChildren(icon('play'), 'Слушать'); }

  async function playAll() {
    if (playing) { stopAll(); return; }
    playing = true; stopFlag = false;
    playBtn.replaceChildren(icon('pause'), 'Пауза');
    for (let i = 0; i < d.lines.length; i++) {
      if (stopFlag) return;
      await playLine(i);
      await new Promise((res) => setTimeout(res, 450));
    }
    playing = false;
    playBtn.replaceChildren(icon('play'), 'Ещё раз');
    if (!heardAll) {
      heardAll = true;
      if (markDialog(d.id)) addXP(2, 'dialog');
    }
    if (finishBtn) finishBtn.disabled = false;
  }

  const playBtn = h('button', { class: 'btn btn-primary btn-sm' }, icon('play'), 'Слушать');
  playBtn.addEventListener('click', playAll);
  const toggle = (label, get, set) => {
    const b = h('button', { class: 'chip' + (get() ? ' active' : '') }, label);
    b.addEventListener('click', () => { set(!get()); b.classList.toggle('active', get()); apply(); });
    return b;
  };
  const controls = h('div', { class: 'dialog-controls' },
    playBtn,
    toggle('🐢', () => slow, (v) => { slow = v; }),
    toggle('RU', () => showRu, (v) => { showRu = v; }),
    toggle('ABC', () => showRom, (v) => { showRom = v; }));

  const finishBtn = embedded ? h('button', { class: 'btn btn-primary btn-block btn-lg mt', onclick: () => { stopAll(); onFinish?.(); } }, 'Завершить урок') : null;
  const skip = embedded ? h('button', { class: 'btn btn-ghost btn-block', onclick: () => { stopAll(); onFinish?.(); } }, 'Пропустить диалог') : null;
  if (finishBtn) finishBtn.disabled = true;

  apply();
  const unit = units.get(d.unitId);
  const el = h('div', { class: 'col' },
    embedded ? h('div', null, h('div', { class: 'badge soft' }, 'Диалог урока'), h('div', { class: 'h1 mt-s' }, d.title), h('div', { class: 'sub' }, 'Послушайте диалог целиком. Нажмите на реплику, чтобы повторить её.'))
      : null,
    d.scene ? h('div', { class: 'tip' }, '🎬', h('span', null, d.scene)) : null,
    h('div', { class: 'chat stagger mt-s' }, rows.map((r) => r.el)),
    controls,
    finishBtn, skip,
    !embedded && unit ? h('div', { class: 'sub center mt' }, `Юнит: ${unit.title}`) : null);
  return { el, destroy: stopAll };
}

export function dialogScreen({ id }) {
  const d = dialogs.get(id);
  if (!d) return h('div', { class: 'empty' }, 'Диалог не найден');
  const v = dialogView(d);
  return { el: h('div', null, topbar({ title: d.title, back: () => history.length > 1 ? history.back() : location.assign('#/library/dialogs') }), v.el), destroy: v.destroy };
}
