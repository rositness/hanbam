// Истории (как Duolingo Stories): короткий рассказ, реплики появляются по одной и звучат
// голосами рассказчика и персонажей; по ходу — вопросы на понимание.

import { h, icon } from '../core/dom.js';
import { state, update } from '../core/store.js';
import { stories, units, genders } from '../core/content.js';
import { navigate } from '../core/router.js';
import { speak, stopSpeaking, prefetch } from '../core/tts.js';
import { romEl, sfx, haptic, confetti, emptyState } from '../core/ui.js';
import { lessonDone, addXP, checkAchievements } from '../core/game.js';
import { dialogVoices } from '../core/audiokey.js';
import { mascot } from '../core/mascot.js';
import { shuffle } from '../core/utils.js';

export const NARRATOR_VOICE = 'M2';
export function storyVoices(s) {
  const map = dialogVoices(s.lines.filter((l) => l.who), genders);
  map.set('', NARRATOR_VOICE);
  return map;
}

export const storyDone = (id) => !!state.progress.stories?.[id];
export function storyUnlocked(s) {
  if (state.settings.unlockAll) return true;
  const u = units.get(s.after);
  return !u || u.lessons.every((l) => lessonDone(l.id));
}
export const nextStory = () => stories.find((s) => storyUnlocked(s) && !storyDone(s.id)) || null;

// Список историй (вкладка в «Библиотеке»).
export function storiesList() {
  if (!stories.length) return emptyState('📖', 'Историй пока нет', '');
  return h('div', { class: 'col' },
    h('p', { class: 'sub' }, 'Короткие рассказы из жизни с озвучкой и вопросами на понимание. Новые истории открываются по мере прохождения курса.'),
    h('div', { class: 'list' }, stories.map((s) => {
      const open = storyUnlocked(s);
      const done = storyDone(s.id);
      return h('button', { class: 'list-row', onclick: () => open && navigate(`/story/${s.id}`), style: open ? null : { opacity: 0.6 } },
        h('div', { class: 'lr-icon', style: { fontSize: '24px' } }, open ? s.emoji : '🔒'),
        h('div', { class: 'grow' },
          h('div', { style: { fontWeight: 800 } }, s.title, ' ', h('span', { class: 'badge soft' }, s.level)),
          h('div', { class: 'small muted' }, open ? h('span', { class: 'ko' }, s.ko) : `Откроется после юнита «${units.get(s.after)?.title || s.after}»`)),
        done ? h('span', { class: 'badge ok' }, '✓') : icon('right', 'i-s'));
    })));
}

// Экран истории.
export function storyScreen({ id }) {
  const s = stories.find((x) => x.id === id);
  if (!s) return emptyState('📖', 'История не найдена', '');
  if (!storyUnlocked(s)) return emptyState('🔒', 'История пока закрыта', `Пройдите юнит «${units.get(s.after)?.title}», и она откроется.`, h('button', { class: 'btn btn-primary mt', onclick: () => navigate('/library/stories') }, 'К историям'));

  const voices = storyVoices(s);
  prefetch(s.lines.slice(0, 4).map((l) => ({ text: l.ko, voice: voices.get(l.who) })));
  const speakers = [...new Set(s.lines.map((l) => l.who).filter(Boolean))];
  const COLORS = ['#ff4f9a', '#4fd8ff', '#ffc94d'];
  let pos = 0;
  let firstTry = 0, asked = 0;
  let showRu = false;
  let destroyed = false;

  const bar = h('div', { class: 'bar' }, h('span'));
  const ruChip = h('button', { class: 'chip' }, 'RU');
  ruChip.addEventListener('click', () => { showRu = !showRu; ruChip.classList.toggle('active', showRu); feed.querySelectorAll('.st-ru').forEach((e) => e.classList.toggle('hidden', !showRu)); });
  const feed = h('div', { class: 'story-feed' });
  const nextBtn = h('button', { class: 'btn btn-primary btn-block btn-lg' }, 'Начать');
  const foot = h('div', { class: 'session-foot' }, nextBtn);
  const root = h('div', { class: 'session' },
    h('div', { class: 'session-top' }, h('button', { class: 'icon-btn plain', 'aria-label': 'Выйти', onclick: () => navigate('/library/stories') }, icon('x')), bar, ruChip),
    h('div', { class: 'story-head' }, h('div', { style: { fontSize: '56px' } }, s.emoji), h('div', { class: 'h1' }, s.title), h('div', { class: 'sub ko' }, s.ko),
      h('div', { class: 'small muted mt-s' }, 'Слушайте и читайте. Нажмите на реплику, чтобы повторить её и увидеть перевод.')),
    feed, h('div', { class: 'grow' }), foot);

  function lineEl(l) {
    const voice = voices.get(l.who);
    const ru = h('div', { class: 'st-ru ru' + (showRu ? '' : ' hidden') }, l.ru);
    const body = h('div', null, h('div', { class: 'ko st-ko', lang: 'ko' }, l.ko), romEl(l.rom, s.after), ru);
    const play = () => speak(l.ko, { voice });
    let el;
    if (!l.who) {
      el = h('div', { class: 'story-line narr' }, body);
    } else {
      const si = speakers.indexOf(l.who);
      el = h('div', { class: 'bubble-row' + (si % 2 ? ' b' : '') },
        h('div', { class: 'avatar', style: { background: COLORS[si % COLORS.length] }, title: l.who }, l.who.slice(0, 1)),
        h('div', { class: 'bubble' }, h('div', { class: 'small muted', style: { fontWeight: 800 } }, l.who), body));
    }
    el.addEventListener('click', () => { play(); ru.classList.remove('hidden'); });
    return { el, play };
  }

  function setBar() { bar.firstChild.style.width = Math.round((pos / s.lines.length) * 100) + '%'; }

  function next() {
    if (destroyed) return;
    if (pos >= s.lines.length) return finish();
    const l = s.lines[pos];
    const { el, play } = lineEl(l);
    el.classList.add('pop');
    feed.append(el);
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    play();
    pos++;
    setBar();
    prefetch(s.lines.slice(pos, pos + 2).map((x) => ({ text: x.ko, voice: voices.get(x.who) })));
    const q = s.questions.find((x) => x.after === pos);
    if (q) ask(q);
    else { nextBtn.textContent = pos >= s.lines.length ? 'Завершить' : 'Дальше'; nextBtn.disabled = false; }
  }

  function ask(q) {
    nextBtn.disabled = true;
    nextBtn.textContent = 'Ответьте на вопрос';
    asked++;
    let tries = 0;
    const opts = shuffle(q.opts.map((t, i) => ({ t, ok: i === q.a })));
    const card = h('div', { class: 'card story-q pop' }, h('div', { class: 'small', style: { fontWeight: 800, color: 'var(--accent-2)' } }, '❓ ВОПРОС'), h('div', { class: 'h3 mt-s' }, q.q));
    const list = h('div', { class: 'options mt-s' });
    opts.forEach((o) => {
      const b = h('button', { class: 'option' }, o.t);
      b.addEventListener('click', () => {
        if (card.dataset.done) return;
        tries++;
        if (o.ok) {
          card.dataset.done = '1';
          b.classList.add('correct'); sfx.ok(); haptic(10);
          if (tries === 1) firstTry++;
          nextBtn.disabled = false;
          nextBtn.textContent = pos >= s.lines.length ? 'Завершить' : 'Дальше';
        } else {
          b.classList.add('wrong', 'shake'); sfx.bad(); haptic([20, 30, 20]);
          setTimeout(() => b.classList.remove('shake'), 400);
        }
      });
      list.append(b);
    });
    card.append(list);
    setTimeout(() => { feed.append(card); card.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 900);
  }

  function finish() {
    stopSpeaking();
    const first = !storyDone(s.id);
    if (first) {
      update('progress', (p) => { p.stories = p.stories || {}; p.stories[s.id] = Date.now(); });
      update('stats', (st) => { st.stories = (st.stories || 0) + 1; });
    }
    const xp = first ? 5 + firstTry : 2;
    addXP(xp, 'story');
    checkAchievements();
    sfx.win(); confetti();
    const nx = nextStory();
    root.replaceChildren(h('div', { class: 'result' },
      mascot('wow', 120, 'pop'),
      h('div', { class: 'h1' }, 'История прочитана!'),
      h('div', { class: 'sub' }, `${s.emoji} ${s.title}`),
      h('div', { class: 'result-stats' },
        h('div', { class: 'rstat' }, h('b', null, '+' + xp), h('span', null, 'XP')),
        h('div', { class: 'rstat' }, h('b', null, `${firstTry}/${asked}`), h('span', null, 'с 1-й попытки')),
        h('div', { class: 'rstat' }, h('b', null, String(s.lines.length)), h('span', null, 'реплик'))),
      h('div', { class: 'col', style: { width: '100%', marginTop: '10px' } },
        nx ? h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => navigate(`/story/${nx.id}`) }, `Следующая: ${nx.emoji} ${nx.title}`) : null,
        h('button', { class: (nx ? 'btn btn-ghost' : 'btn btn-primary btn-lg') + ' btn-block', onclick: () => navigate('/library/stories') }, 'К списку историй'))));
  }

  nextBtn.addEventListener('click', () => { if (!nextBtn.disabled) next(); });
  setBar();
  return { el: root, destroy: () => { destroyed = true; stopSpeaking(); } };
}
