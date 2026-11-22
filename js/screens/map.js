// Главная: «ночной Сеул» и игровой путь по линиям метро.

import { h, icon } from '../core/dom.js';
import { state } from '../core/store.js';
import { course, units, lessons, getLine, allMainWords, emojiOf } from '../core/content.js';
import { navigate } from '../core/router.js';
import { toast, starsEl, openSheet } from '../core/ui.js';
import { lessonDone, testPassed, nodeUnlocked, unitProgress, lineUnlocked, nextNodes, levelInfo, todayXP, streakActiveToday } from '../core/game.js';
import { greeting } from '../core/utils.js';
import { mascot } from '../core/mascot.js';
import { dueCount, today, addWords } from '../core/srs.js';
import { speakBtn, romEl } from '../core/ui.js';
import { shouldOfferInstall, canPrompt, promptInstall, dismissInstall, isIOS } from '../core/install.js';
import { showInstallHelp } from './profile.js';
import { nextStory } from './stories.js';

// Карточки под «Продолжить»: повторение, установка приложения, слово дня.
function homeCards() {
  const box = h('div', { class: 'home-cards' });
  const due = dueCount();
  if (due > 0) {
    box.append(h('button', { class: 'home-card review', onclick: () => navigate('/review/srs') },
      h('span', { class: 'hc-icon' }, '🧠'),
      h('span', { class: 'grow' }, h('div', { style: { fontWeight: 800 } }, `Пора повторить: ${due} ${due % 10 === 1 && due % 100 !== 11 ? 'слово' : [2, 3, 4].includes(due % 10) && ![12, 13, 14].includes(due % 100) ? 'слова' : 'слов'}`),
        h('div', { class: 'small muted' }, 'Пара минут — и слова не забудутся')),
      icon('right', 'i-s')));
  }
  if (shouldOfferInstall()) {
    const card = h('div', { class: 'home-card install' },
      h('span', { class: 'hc-icon' }, '📲'),
      h('span', { class: 'grow' }, h('div', { style: { fontWeight: 800 } }, 'Установите на телефон'), h('div', { class: 'small muted' }, 'Иконка на экране, работает без интернета')),
      h('button', { class: 'btn btn-sm btn-primary', onclick: async () => {
        if (canPrompt()) { if (await promptInstall()) card.remove(); } else showInstallHelp();
      } }, isIOS() && !canPrompt() ? 'Как?' : 'Установить'),
      h('button', { class: 'icon-btn sm plain', 'aria-label': 'Скрыть', onclick: () => { dismissInstall(); card.remove(); } }, icon('x', 'i-s')));
    box.append(card);
  }
  const st = nextStory();
  if (st) {
    box.append(h('button', { class: 'home-card', onclick: () => navigate(`/story/${st.id}`) },
      h('span', { class: 'hc-icon', style: { background: 'color-mix(in srgb, var(--accent-3) 20%, transparent)' } }, st.emoji),
      h('span', { class: 'grow' }, h('div', { class: 'small muted', style: { fontWeight: 800 } }, '📖 НОВАЯ ИСТОРИЯ'), h('div', { style: { fontWeight: 800 } }, st.title)),
      icon('right', 'i-s')));
  }
  // Слово дня — одно и то же весь день, каждый день новое.
  // Берём слова из пройденных юнитов и ближайшего следующего — без «спойлеров» далёких тем.
  let reach = units.get('u02')?.order ?? 0;
  for (const u of units.values()) if (u.lessons.some((l) => lessonDone(l.id))) reach = Math.max(reach, u.order + 1);
  const pool = allMainWords().filter((w) => emojiOf(w) && units.get(w.unitId).order <= reach);
  if (pool.length) {
    const w = pool[(today() * 7919) % pool.length];
    const inSrs = !!state.srs[w.id];
    const add = inSrs ? null : h('button', { class: 'btn btn-sm', onclick: (e) => { addWords([w.id]); e.currentTarget.replaceWith(h('span', { class: 'small muted' }, '✓ в повторении')); } }, '+ В повторение');
    box.append(h('div', { class: 'wotd' },
      h('div', { class: 'row' },
        h('div', { class: 'grow' }, h('div', { class: 'wotd-label' }, '✨ СЛОВО ДНЯ'),
          h('div', { class: 'wotd-ko ko' }, w.ko), h('span', { class: 'rom' }, w.rom), h('div', { class: 'sub' }, w.ru)),
        h('div', { class: 'col', style: { alignItems: 'center', gap: '6px' } }, h('span', { class: 'wotd-emoji' }, emojiOf(w)), speakBtn(w.ko))),
      add ? h('div', { class: 'mt-s' }, add) : null));
  }
  return box;
}

function skyline() {
  // Силуэт ночного города с телебашней на холме и светящимися окнами.
  const b = [[0, 46, 34], [30, 62, 26], [52, 38, 30], [78, 70, 22], [96, 52, 30], [124, 30, 26], [146, 58, 34], [176, 44, 24], [196, 76, 28],
    [252, 50, 30], [278, 66, 24], [298, 40, 32], [326, 58, 26], [348, 34, 28], [372, 64, 30], [398, 48, 26], [420, 72, 30], [446, 42, 34]];
  let s = '<svg class="hero-skyline" viewBox="0 0 480 90" preserveAspectRatio="none" aria-hidden="true">';
  s += '<path d="M200 90 Q236 40 272 90Z" fill="var(--skyline)" opacity=".9"/>';
  s += '<rect x="234" y="18" width="4" height="40" fill="var(--skyline)"/><rect x="229" y="28" width="14" height="7" rx="3" fill="var(--skyline)"/><circle cx="236" cy="16" r="2.5" fill="#ff4f9a"><animate attributeName="opacity" values="1;.2;1" dur="2s" repeatCount="indefinite"/></circle>';
  for (const [x, hgt, w] of b) {
    s += `<rect x="${x}" y="${90 - hgt}" width="${w}" height="${hgt}" fill="var(--skyline)"/>`;
    for (let yy = 90 - hgt + 6; yy < 84; yy += 9) for (let xx = x + 5; xx < x + w - 4; xx += 7) {
      if ((xx * 7 + yy * 3) % 5 < 2) s += `<rect x="${xx}" y="${yy}" width="3" height="4" fill="var(--window)" opacity="${0.45 + ((xx + yy) % 3) * 0.2}"/>`;
    }
  }
  return s + '</svg>';
}

function hero() {
  const lv = levelInfo();
  const goal = state.settings.dailyGoal;
  const tx = todayXP();
  const sky = h('div', { class: 'sky', 'aria-hidden': 'true' });
  for (let i = 0; i < 18; i++) sky.append(h('span', { style: { left: (i * 53 % 100) + '%', top: (i * 37 % 55) + '%', animationDelay: (i % 5) * 0.6 + 's' } }));
  const el = h('section', { class: 'hero' },
    sky,
    h('div', { class: 'hero-top' },
      h('button', { class: 'stat-pill', onclick: () => navigate('/profile'), 'aria-label': 'Уровень' }, icon('star', 'i-s'), `Ур. ${lv.level}`),
      h('div', { class: 'row gap-s' },
        h('div', { class: 'stat-pill', title: 'Серия дней' }, icon('flame', 'i-s ' + (streakActiveToday() ? 'flame' : 'flame dim')), String(state.stats.streak.count)),
        state.stats.streak.freezes ? h('div', { class: 'stat-pill', title: 'Заморозки серии' }, '🧊', String(state.stats.streak.freezes)) : null)),
    h('div', { class: 'hero-greet' },
      h('div', { class: 'sub ko' }, '안녕하세요!'),
      h('div', { class: 'h1' }, `${greeting()}${state.settings.name ? ', ' + state.settings.name : ''}`),
      h('div', { class: 'row mt-s', style: { maxWidth: '320px' } },
        h('div', { class: 'bar grow', style: { background: 'rgba(255,255,255,.18)' } }, h('span', { style: { width: Math.min(100, (tx / goal) * 100) + '%' } })),
        h('span', { class: 'small', style: { fontWeight: 800 } }, tx >= goal ? '🎯 цель дня!' : `${tx}/${goal} XP`))),
  );
  el.insertAdjacentHTML('beforeend', skyline());
  return el;
}

const nodeHref = (n) => (n.type === 'test' ? `/test/${n.id}` : `/lesson/${n.id}`);

function nodeTitle(n) {
  if (n.type === 'test') return { title: 'Итоговый тест', sub: units.get(n.unitId).title };
  const l = lessons.get(n.id);
  return { title: l.title, sub: `${units.get(l.unitId).title} · урок ${l.index + 1}` };
}

function continueCard() {
  const next = nextNodes();
  if (!next.length) {
    return h('div', { class: 'continue-card' }, h('div', { class: 'ci', style: { background: 'var(--grad)' } }, '🏆'),
      h('div', { class: 'grow' }, h('div', { class: 'h3' }, 'Курс пройден!'), h('div', { class: 'sub' }, 'Повторяйте слова, чтобы не забыть.')),
      h('button', { class: 'btn btn-primary btn-sm', onclick: () => navigate('/review') }, 'Повтор'));
  }
  const n = next[0];
  const unit = units.get(n.unitId);
  const t = nodeTitle(n);
  const go = () => navigate(nodeHref(n));
  const card = h('div', { class: 'continue-card' },
    h('div', { class: 'ci ko', style: { background: `linear-gradient(135deg, ${unit.color}, var(--accent))` } }, unit.icon),
    h('div', { class: 'grow' }, h('div', { class: 'small muted', style: { fontWeight: 800, letterSpacing: '.06em' } }, 'ПРОДОЛЖИТЬ'), h('div', { class: 'h3' }, t.title), h('div', { class: 'sub small' }, t.sub)),
    h('button', { class: 'icon-btn accent', 'aria-label': 'Начать', onclick: go }, icon('play')));
  card.addEventListener('click', (e) => { if (!e.target.closest('button')) go(); });
  const extra = next[1] ? (() => {
    const n2 = next[1]; const t2 = nodeTitle(n2); const u2 = units.get(n2.unitId);
    return h('button', { class: 'list-row mt-s', onclick: () => navigate(nodeHref(n2)) },
      h('div', { class: 'lr-icon', style: { background: `color-mix(in srgb, ${u2.color} 25%, transparent)` } }, h('span', { class: 'ko' }, u2.icon)),
      h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700 } }, t2.title), h('div', { class: 'small muted' }, `${getLine(u2.lineId).title} · ${t2.sub}`)), icon('right', 'i-s'));
  })() : null;
  return h('div', null, card, extra);
}

// Нижний лист с информацией об уроке.
function nodeSheet(n, unit) {
  const unlocked = nodeUnlocked(n);
  const done = n.type === 'lesson' ? lessonDone(n.id) : testPassed(n.id);
  const t = nodeTitle(n);
  const l = n.type === 'lesson' ? lessons.get(n.id) : null;
  const tp = n.type === 'test' ? state.progress.tests[n.id] : null;
  const best = l && state.progress.lessons[n.id]?.best;
  const xp = n.type === 'test' ? 35 : done ? 8 : 18;
  let s = null;
  const content = h('div', { class: 'col gap-l' },
    h('div', { class: 'lesson-sheet-head' },
      h('div', { class: 'lesson-sheet-icon ko', style: { background: unlocked ? `linear-gradient(135deg, ${unit.color}, var(--accent))` : 'var(--surface-3)' } },
        n.type === 'test' ? '🏆' : unlocked ? (done ? '✓' : String(l.index + 1)) : '🔒'),
      h('div', { class: 'grow' },
        h('div', { class: 'small muted', style: { fontWeight: 800 } }, n.type === 'test' ? unit.title.toUpperCase() : `УРОК ${l.index + 1} · ${unit.title.toUpperCase()}`),
        h('div', { class: 'h2' }, t.title),
        l?.goal ? h('div', { class: 'sub' }, '🎯 ', l.goal) : null)),
    h('div', { class: 'row wrap gap-s' },
      unlocked ? h('span', { class: 'xp-pill' }, `+${xp} XP`) : null,
      best ? h('span', { class: 'chip' }, `Лучший результат: ${Math.round(best * 100)}%`) : null,
      tp ? starsEl(tp.stars) : null,
      l && l.kind !== 'hangul' && l.words.length ? h('span', { class: 'chip' }, `📚 ${l.words.length} слов`) : null,
      l?.dialog ? h('span', { class: 'chip' }, '💬 диалог') : null),
    unlocked
      ? h('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => { s.close(); navigate(nodeHref(n)); } }, done ? 'Пройти ещё раз' : 'Начать', icon('right'))
      : h('div', { class: 'tip' }, '🔒', h('span', null, n.type === 'test' ? 'Тест откроется, когда вы пройдёте все уроки этого юнита.' : 'Сначала пройдите предыдущий урок. Если вы уже что-то знаете — включите «Открыть все уроки» в настройках.')));
  s = openSheet(content);
}

const OFFSETS = [0, 48, 70, 48, 0, -48, -70, -48];

function unitSection(unit, line, number, current, offsetStart) {
  const p = unitProgress(unit);
  const firstOpen = nodeUnlocked({ type: 'lesson', id: unit.lessons[0].id, unitId: unit.id });
  const section = h('section', { class: 'path-unit', id: 'unit-' + unit.id, style: { '--line-color': line.color } });
  section.append(h('button', { class: 'unit-banner' + (firstOpen ? '' : ' locked'), onclick: () => navigate(`/unit/${unit.id}`) },
    h('div', { class: 'grow' },
      h('div', { class: 'ub-label' }, unit.kind === 'hangul' ? `Хангыль · часть ${number}` : `Юнит ${number} · ${p.done}/${p.total}`),
      h('div', { class: 'ub-title' }, unit.title),
      h('div', { class: 'ub-ko ko' }, unit.ko)),
    h('span', { class: 'ub-btn', 'aria-label': 'Слова и грамматика юнита' }, icon('book'))));

  const path = h('div', { class: 'path' });
  const nodes = [...unit.lessons.map((l) => ({ type: 'lesson', id: l.id, unitId: unit.id })), { type: 'test', id: unit.id, unitId: unit.id }];
  nodes.forEach((n, i) => {
    const off = OFFSETS[(offsetStart + i) % OFFSETS.length];
    const unlocked = nodeUnlocked(n);
    const done = n.type === 'lesson' ? lessonDone(n.id) : testPassed(n.id);
    const isCur = current && current.type === n.type && current.id === n.id;
    const l = n.type === 'lesson' ? lessons.get(n.id) : null;
    const tp = n.type === 'test' ? state.progress.tests[n.id] : null;
    let inner;
    if (n.type === 'test') inner = tp?.passed ? '👑' : icon('trophy');
    else if (!unlocked) inner = icon('lock');
    else if (done) inner = icon('check');
    else inner = icon('star');
    const btn = h('button', {
      class: `path-node${n.type === 'test' ? ' test' : ''}${!unlocked ? ' locked' : done ? ' done' : ''}${isCur ? ' current' : ''}`,
      'aria-label': nodeTitle(n).title,
      onclick: () => nodeSheet(n, unit),
    }, inner);
    const wrap = h('div', { class: 'path-node-wrap' + (unlocked ? '' : ' locked'), style: { transform: `translateX(${off}px)` } },
      isCur ? h('div', { class: 'start-bubble' }, done ? 'ПОВТОРИТЬ' : 'НАЧАТЬ') : null,
      btn,
      h('div', { class: 'node-label' }, n.type === 'test' ? (tp ? starsEl(tp.stars) : 'Итоговый тест') : l.title));
    if (isCur) {
      const m = mascot('wave', 84, 'bob path-mascot');
      m.style[off > 0 ? 'right' : 'left'] = 'calc(100% + 16px)';
      wrap.append(m);
    }
    path.append(wrap);
  });
  section.append(path);
  return section;
}

function lineSection(line, currentByLine) {
  const unlocked = lineUnlocked(line.id);
  const sec = h('section', { style: { '--line-color': line.color } },
    h('div', { class: 'line-title' },
      h('span', { class: 'metro-badge' }, line.num),
      h('div', { class: 'grow' }, h('div', { class: 'h2' }, line.title), h('div', { class: 'sub small' }, line.subtitle)),
      !unlocked ? h('span', { class: 'line-lock' }, icon('lock', 'i-s'), 'закрыто') : null));
  if (!unlocked && line.requires) sec.append(h('div', { class: 'tip mt-s' }, '🔒', h('span', null, `Откроется после линии «${getLine(line.requires).title}». Можно открыть всё сразу в настройках.`)));
  let offset = 0;
  line.units.forEach((uid, i) => {
    const unit = units.get(uid);
    sec.append(unitSection(unit, line, i + 1, currentByLine, offset));
    offset += unit.lessons.length + 1;
  });
  return sec;
}

export function mapScreen(params, query) {
  const current = nextNodes();
  const curFor = (lineId) => current.find((n) => units.get(n.unitId).lineId === lineId);
  const el = h('div', null,
    hero(),
    continueCard(),
    homeCards(),
    ...course.data.lines.map((line) => lineSection(line, curFor(line.id))),
    h('div', { class: 'center mt-l' }, mascot('sleep', 70), h('p', { class: 'small muted' }, '한밤 · Ханбам — корейский с нуля до A2')));
  return {
    el,
    mounted() {
      const u = query?.get('u');
      if (u) document.getElementById('unit-' + u)?.scrollIntoView({ block: 'start' });
    },
  };
}

export { toast };
