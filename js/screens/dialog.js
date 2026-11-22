// Диалоги: «прочитай и послушай» (у каждого персонажа свой голос) и ролевая игра.

import { h, icon } from '../core/dom.js';
import { dialogs, units, genders } from '../core/content.js';
import { speak, stopSpeaking, prefetch } from '../core/tts.js';
import { romShown, topbar, toast, sfx } from '../core/ui.js';
import { markDialog, addXP } from '../core/game.js';
import { dialogVoices } from '../core/audiokey.js';
import { canRecognize, listen, stopListening } from '../core/speech.js';
import { similarity } from '../core/hangul.js';
import { update } from '../core/store.js';

const COLORS = ['#ff4f9a', '#4fd8ff', '#ffc94d', '#a77bff'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function dialogView(d, { embedded = false, onFinish } = {}) {
  const speakers = [...new Set(d.lines.map((l) => l.who))];
  const voices = dialogVoices(d.lines, genders);
  let showRu = true;
  let showRom = romShown(d.unitId);
  let slow = false;
  let playing = false;
  let stopFlag = false;
  let heardAll = false;
  let role = null;           // ролевая игра: за кого говорит пользователь

  const rows = d.lines.map((l, i) => {
    const si = speakers.indexOf(l.who);
    const koEl = h('div', { class: 'ko', lang: 'ko' }, l.ko);
    const bubble = h('div', { class: 'bubble' }, koEl, h('div', { class: 'rom d-rom' }, l.rom), h('div', { class: 'ru d-ru' }, l.ru));
    bubble.addEventListener('click', () => { if (role) return; stopAll(); playLine(i); });
    return {
      bubble, koEl,
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
    await speak(d.lines[i].ko, { voice: voices.get(d.lines[i].who), ...(slow ? { rate: 0.6 } : {}) });
    r.bubble.classList.remove('active');
  }

  function stopAll() { stopFlag = true; playing = false; stopSpeaking(); stopListening(); playBtn.replaceChildren(icon('play'), 'Слушать'); }

  function heard() {
    if (heardAll) return;
    heardAll = true;
    if (markDialog(d.id)) addXP(2, 'dialog');
    if (finishBtn) finishBtn.disabled = false;
  }

  async function playAll() {
    if (playing) { stopAll(); return; }
    exitRole();
    playing = true; stopFlag = false;
    playBtn.replaceChildren(icon('pause'), 'Пауза');
    for (let i = 0; i < d.lines.length; i++) {
      if (stopFlag) return;
      await playLine(i);
      await sleep(380);
    }
    playing = false;
    playBtn.replaceChildren(icon('play'), 'Ещё раз');
    heard();
  }

  // ---------- Ролевая игра ----------
  function exitRole() {
    role = null;
    rows.forEach((r) => { r.el.classList.remove('hidden'); r.bubble.classList.remove('mine-pending'); r.koEl.style.filter = ''; r.bubble.querySelector('.d-rom').style.filter = ''; r.bubble.querySelector('.role-actions')?.remove(); r.bubble.querySelector('.score')?.remove(); });
    roleBtn.classList.remove('active');
  }

  function pickRole() {
    stopAll();
    if (role) { exitRole(); return; }
    const box = h('div', { class: 'card col', style: { borderColor: 'var(--accent-2)' } },
      h('div', { class: 'h3' }, '🎭 За кого будете говорить?'),
      h('div', { class: 'sub small' }, 'Собеседник говорит сам, а вашу реплику подскажет перевод. Скажите её вслух' + (canRecognize ? ' — приложение проверит произношение.' : ', затем сравните с образцом.')),
      h('div', { class: 'role-pick' }, speakers.map((sp, i) => h('button', { class: 'option', onclick: () => { box.remove(); runRole(sp); } },
        h('span', { class: 'avatar', style: { background: COLORS[i % COLORS.length], margin: '0 auto 4px' } }, sp.slice(0, 1)), h('span', { class: 'ko' }, sp)))));
    chat.before(box);
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async function runRole(sp) {
    role = sp; stopFlag = false;
    roleBtn.classList.add('active');
    rows.forEach((r) => r.el.classList.add('hidden'));
    let total = 0, sum = 0;
    for (let i = 0; i < d.lines.length; i++) {
      if (stopFlag || role !== sp) return;
      const r = rows[i];
      r.el.classList.remove('hidden');
      if (d.lines[i].who !== sp) { await playLine(i); await sleep(300); continue; }
      // Реплика пользователя
      r.bubble.classList.add('mine-pending');
      r.koEl.style.filter = 'blur(7px)';
      r.bubble.querySelector('.d-rom').style.filter = 'blur(6px)';
      r.bubble.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const score = await new Promise((resolve) => {
        const actions = h('div', { class: 'role-actions' });
        const reveal = (pct) => { actions.remove(); r.koEl.style.filter = ''; r.bubble.querySelector('.d-rom').style.filter = ''; r.bubble.classList.remove('mine-pending'); resolve(pct); };
        if (canRecognize) {
          const mic = h('button', { class: 'btn btn-primary btn-sm' }, icon('mic', 'i-s'), 'Сказать');
          mic.addEventListener('click', async () => {
            mic.disabled = true; mic.lastChild.textContent = 'Слушаю…';
            try {
              const alts = await listen({ lang: 'ko-KR' });
              const best = Math.max(0, ...alts.map((a) => similarity(a, d.lines[i].ko)));
              const pct = Math.round(best * 100);
              r.bubble.append(h('div', { class: 'score', style: { color: pct >= 70 ? 'var(--ok)' : 'var(--gold)' } }, alts.length ? `Совпадение ${pct}% ${pct >= 70 ? '— отлично!' : '— послушайте образец'}` : 'Не расслышал — послушайте образец'));
              if (pct >= 70) { sfx.ok(); update('stats', (s) => { s.speakOk += 1; }); }
              reveal(pct);
            } catch { mic.disabled = false; mic.lastChild.textContent = 'Сказать'; toast('Микрофон недоступен — нажмите «Показать»', { icon: '🎤' }); }
          });
          actions.append(mic);
        }
        actions.append(h('button', { class: 'btn btn-sm', onclick: () => reveal(null) }, icon('eye', 'i-s'), 'Показать'));
        r.bubble.append(actions);
      });
      if (score != null) { total++; sum += score; }
      await playLine(i); // образец произношения
      await sleep(250);
    }
    if (role === sp) {
      heard();
      sfx.win();
      toast(total ? `Ролевая игра пройдена! Среднее совпадение ${Math.round(sum / total)}%` : 'Ролевая игра пройдена!', { icon: '🎭', ms: 3500 });
      role = null; roleBtn.classList.remove('active');
    }
  }

  const playBtn = h('button', { class: 'btn btn-primary btn-sm' }, icon('play'), 'Слушать');
  playBtn.addEventListener('click', playAll);
  const roleBtn = h('button', { class: 'chip', title: 'Ролевая игра' }, '🎭');
  roleBtn.addEventListener('click', pickRole);
  const toggle = (label, get, set) => {
    const b = h('button', { class: 'chip' + (get() ? ' active' : '') }, label);
    b.addEventListener('click', () => { set(!get()); b.classList.toggle('active', get()); apply(); });
    return b;
  };
  const controls = h('div', { class: 'dialog-controls' },
    playBtn, roleBtn,
    toggle('🐢', () => slow, (v) => { slow = v; }),
    toggle('RU', () => showRu, (v) => { showRu = v; }),
    toggle('ABC', () => showRom, (v) => { showRom = v; }));

  const finishBtn = embedded ? h('button', { class: 'btn btn-primary btn-block btn-lg mt', onclick: () => { stopAll(); onFinish?.(); } }, 'Завершить урок') : null;
  const skip = embedded ? h('button', { class: 'btn btn-ghost btn-block', onclick: () => { stopAll(); onFinish?.(); } }, 'Пропустить диалог') : null;
  if (finishBtn) finishBtn.disabled = true;

  apply();
  prefetch(d.lines.map((l) => ({ text: l.ko, voice: voices.get(l.who) })));
  const chat = h('div', { class: 'chat stagger mt-s' }, rows.map((r) => r.el));
  const unit = units.get(d.unitId);
  const el = h('div', { class: 'col' },
    embedded ? h('div', null, h('div', { class: 'badge soft' }, 'Диалог урока'), h('div', { class: 'h1 mt-s' }, d.title),
      h('div', { class: 'sub' }, 'Послушайте диалог целиком (▶). Нажмите на реплику, чтобы повторить её, или попробуйте ролевую игру 🎭.')) : null,
    d.scene ? h('div', { class: 'tip' }, '🎬', h('span', null, d.scene)) : null,
    chat,
    controls,
    finishBtn, skip,
    !embedded && unit ? h('div', { class: 'sub center mt' }, `Юнит: ${unit.title}`) : null);
  return { el, destroy: stopAll };
}

export function dialogScreen({ id }) {
  const d = dialogs.get(id);
  if (!d) return h('div', { class: 'empty' }, 'Диалог не найден');
  const v = dialogView(d);
  return { el: h('div', null, topbar({ title: d.title, back: () => (history.length > 1 ? history.back() : location.assign('#/library/dialogs')) }), v.el), destroy: v.destroy };
}
