// Главная: «ночной Сеул» и карта линий метро с юнитами и уроками.

import { h, icon, progressRing } from '../core/dom.js';
import { state } from '../core/store.js';
import { course, units, lessons, getLine } from '../core/content.js';
import { navigate } from '../core/router.js';
import { toast, starsEl } from '../core/ui.js';
import { lessonDone, testPassed, nodeUnlocked, unitProgress, lineUnlocked, nextNodes, levelInfo, todayXP, streakActiveToday } from '../core/game.js';
import { greeting } from '../core/utils.js';

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
        h('span', { class: 'small', style: { fontWeight: 800 } }, `${tx}/${goal} XP`))),
  );
  el.insertAdjacentHTML('beforeend', skyline());
  return el;
}

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
  // хангыль — первым, пока он не пройден хотя бы наполовину
  const n = next[0];
  const unit = units.get(n.unitId);
  const t = nodeTitle(n);
  const go = () => navigate(n.type === 'test' ? `/test/${n.id}` : `/lesson/${n.id}`);
  const card = h('div', { class: 'continue-card' },
    h('div', { class: 'ci ko', style: { background: `linear-gradient(135deg, ${unit.color}, var(--accent))` } }, unit.icon),
    h('div', { class: 'grow' }, h('div', { class: 'small muted', style: { fontWeight: 700 } }, 'ПРОДОЛЖИТЬ'), h('div', { class: 'h3' }, t.title), h('div', { class: 'sub small' }, t.sub)),
    h('button', { class: 'icon-btn accent', 'aria-label': 'Начать', onclick: go }, icon('play')));
  card.addEventListener('click', (e) => { if (!e.target.closest('button')) go(); });
  const extra = next[1] ? (() => {
    const n2 = next[1]; const t2 = nodeTitle(n2); const u2 = units.get(n2.unitId);
    return h('button', { class: 'list-row mt-s', onclick: () => navigate(n2.type === 'test' ? `/test/${n2.id}` : `/lesson/${n2.id}`) },
      h('div', { class: 'lr-icon', style: { background: `color-mix(in srgb, ${u2.color} 25%, transparent)` } }, h('span', { class: 'ko' }, u2.icon)),
      h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700 } }, t2.title), h('div', { class: 'small muted' }, `${getLine(u2.lineId).title} · ${t2.sub}`)), icon('right', 'i-s'));
  })() : null;
  return h('div', null, card, extra);
}

function stopEl(n, line, currentKey) {
  const unlocked = nodeUnlocked(n);
  const done = n.type === 'lesson' ? lessonDone(n.id) : testPassed(n.id);
  const isCur = `${n.type}:${n.id}` === currentKey;
  const t = nodeTitle(n);
  let right = null;
  if (n.type === 'test') { const tp = state.progress.tests[n.id]; right = tp ? starsEl(tp.stars) : null; }
  else if (done) { const best = state.progress.lessons[n.id].best; right = h('span', { class: 'small muted' }, Math.round(best * 100) + '%'); }
  const num = n.type === 'test' ? icon('trophy', 'i-s') : !unlocked ? icon('lock', 'i-s') : done ? icon('check', 'i-s') : String(lessons.get(n.id).index + 1);
  const b = h('button', { class: `stop${done ? ' done' : ''}${!unlocked ? ' locked' : ''}${isCur ? ' current' : ''}${n.type === 'test' ? ' test' : ''}` },
    h('span', { class: 's-num' }, num),
    h('span', { class: 'grow' }, h('div', { class: 's-title' }, t.title), n.type === 'lesson' && lessons.get(n.id).goal ? h('div', { class: 's-sub' }, lessons.get(n.id).goal) : null),
    right);
  b.addEventListener('click', () => {
    if (!unlocked) { toast(n.type === 'test' ? 'Тест откроется после всех уроков юнита' : 'Сначала пройдите предыдущий урок', { icon: '🔒' }); return; }
    navigate(n.type === 'test' ? `/test/${n.id}` : `/lesson/${n.id}`);
  });
  return b;
}

const OPEN_KEY = 'hb-open-units';
function openSet() { try { return new Set(JSON.parse(sessionStorage.getItem(OPEN_KEY) || '[]')); } catch { return new Set(); } }
function saveOpen(s) { try { sessionStorage.setItem(OPEN_KEY, JSON.stringify([...s])); } catch { /* ignore */ } }

function lineSection(line, currentKeys, open) {
  const unlocked = lineUnlocked(line.id);
  const sec = h('section', { style: { '--line-color': line.color } },
    h('div', { class: 'line-head' },
      h('span', { class: 'line-badge', style: { background: line.color } }, line.num),
      h('div', { class: 'grow' }, h('div', { class: 'h2' }, line.title), h('div', { class: 'sub small' }, line.subtitle)),
      !unlocked ? h('span', { class: 'line-lock' }, icon('lock', 'i-s'), 'закрыто') : null));
  const metro = h('div', { class: 'metro' });
  for (const uid of line.units) {
    const unit = units.get(uid);
    const p = unitProgress(unit);
    const hasCurrent = currentKeys.some((k) => k.unitId === uid);
    const anyUnlocked = nodeUnlocked({ type: 'lesson', id: unit.lessons[0].id, unitId: uid });
    const isOpen = open.has(uid) || hasCurrent;
    const stops = h('div', { class: 'stops' + (isOpen ? '' : ' hidden') });
    const curKey = currentKeys.find((k) => k.unitId === uid);
    unit.lessons.forEach((l) => stops.append(stopEl({ type: 'lesson', id: l.id, unitId: uid }, line, curKey && `${curKey.type}:${curKey.id}`)));
    stops.append(stopEl({ type: 'test', id: uid, unitId: uid }, line, curKey && `${curKey.type}:${curKey.id}`));
    const card = h('button', { class: 'unit-card', 'aria-expanded': String(isOpen) },
      h('span', { class: 'u-icon ko' }, unit.icon),
      h('span', { class: 'grow' }, h('div', { class: 'u-title' }, unit.title), h('div', { class: 'u-ko ko' }, unit.ko, h('span', { class: 'muted' }, ` · ${p.done}/${p.total}`))),
      progressRing(p.ratio, { size: 40, stroke: 4, color: line.color, label: p.ratio >= 1 ? '✓' : '' }));
    card.addEventListener('click', () => {
      const nowOpen = stops.classList.toggle('hidden') === false;
      card.setAttribute('aria-expanded', String(nowOpen));
      if (nowOpen) open.add(uid); else open.delete(uid);
      saveOpen(open);
    });
    stops.append(h('button', { class: 'btn btn-ghost btn-sm', style: { alignSelf: 'flex-start' }, onclick: () => navigate(`/unit/${uid}`) },
      unit.kind === 'hangul' ? 'Буквы и слова юнита' : 'Слова, фразы и грамматика юнита', icon('right', 'i-s')));
    metro.append(h('div', { class: `unit-block${p.ratio >= 1 ? ' done' : ''}${!anyUnlocked ? ' locked' : ''}`, id: 'unit-' + uid },
      h('span', { class: 'station-dot' }), card, stops));
  }
  sec.append(metro);
  if (!unlocked && line.requires) sec.append(h('div', { class: 'tip' }, '🔒', h('span', null, `Откроется после прохождения линии «${getLine(line.requires).title}». Можно открыть всё сразу в настройках.`)));
  return sec;
}

export function mapScreen(params, query) {
  const open = openSet();
  if (query?.get('u')) open.add(query.get('u'));
  const current = nextNodes();
  const el = h('div', null,
    hero(),
    continueCard(),
    ...course.data.lines.map((line) => lineSection(line, current, open)),
    h('p', { class: 'center small muted mt-l' }, '한밤 · Ханбам — корейский с нуля до A2'));
  return {
    el,
    mounted() {
      const u = query?.get('u');
      if (u) document.getElementById('unit-' + u)?.scrollIntoView({ block: 'center' });
    },
  };
}
