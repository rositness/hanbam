// Профиль (уровень, серия, статистика, достижения) и настройки.

import { h, icon, progressRing } from '../core/dom.js';
import { state, update, exportData, importData, resetAll } from '../core/store.js';
import { lessons, words, dialogs } from '../core/content.js';
import { navigate } from '../core/router.js';
import { topbar, toast, confirmDialog, openSheet } from '../core/ui.js';
import { levelInfo, todayXP, ACHIEVEMENTS, lessonDone } from '../core/game.js';
import { srsCount, today } from '../core/srs.js';
import { koreanVoices, speak, ttsSupported } from '../core/tts.js';
import { canRecognize } from '../core/speech.js';
import { downloadJSON } from '../core/utils.js';

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function profileScreen() {
  const lv = levelInfo();
  const s = state.stats;
  const goal = state.settings.dailyGoal;
  const t = today();
  const hist = [...Array(7)].map((_, i) => t - 6 + i).map((d) => ({ d, xp: s.history[d] || 0 }));
  const maxXP = Math.max(goal, ...hist.map((x) => x.xp));
  const totalLessons = lessons.size;
  const done = [...lessons.keys()].filter(lessonDone).length;
  const acc = s.answers ? Math.round((s.correct / s.answers) * 100) : 0;
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;

  return h('div', null,
    h('div', { class: 'row between mb' }, h('div', { class: 'h1' }, 'Профиль'),
      h('button', { class: 'icon-btn', 'aria-label': 'Настройки', onclick: () => navigate('/settings') }, icon('settings'))),
    h('div', { class: 'card col' },
      h('div', { class: 'profile-head' },
        h('div', { class: 'lvl-avatar' }, String(lv.level)),
        h('div', { class: 'grow' },
          h('div', { class: 'h2' }, state.settings.name || 'Ученик'),
          h('div', { class: 'sub' }, `${lv.title} · `, h('span', { class: 'ko' }, lv.titleKo)),
          h('div', { class: 'row mt-s' }, h('div', { class: 'bar grow' }, h('span', { style: { width: Math.round(lv.ratio * 100) + '%' } })), h('span', { class: 'small muted' }, `${s.xp - lv.from}/${lv.to - lv.from}`)))),
    ),
    h('div', { class: 'stats-grid mt' },
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '🔥'), h('div', null, h('b', null, String(s.streak.count)), h('span', null, `серия · рекорд ${s.streak.best}`))),
      h('div', { class: 'stat-box' }, progressRing(Math.min(1, todayXP() / goal), { size: 44, stroke: 5, label: '' }), h('div', null, h('b', null, `${todayXP()}/${goal}`), h('span', null, 'XP сегодня'))),
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '⭐'), h('div', null, h('b', null, String(s.xp)), h('span', null, 'всего XP'))),
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '🧊'), h('div', null, h('b', null, String(s.streak.freezes)), h('span', null, 'заморозки (макс. 2)')))),
    h('div', { class: 'section-title' }, 'Неделя'),
    h('div', { class: 'card' },
      h('div', { class: 'week' }, hist.map((x) => h('div', { class: 'day' + (x.d === t ? ' today' : '') },
        h('div', { class: 'small muted', style: { fontSize: '10px' } }, x.xp ? String(x.xp) : ''),
        h('div', { class: 'col-bar' + (x.xp >= goal ? ' met' : ''), style: { height: Math.max(4, (x.xp / maxXP) * 80) + 'px' } }),
        h('span', null, DAYS[new Date(x.d * 86400000).getUTCDay()])))),
      h('div', { class: 'small muted center mt-s' }, `Цель: ${goal} XP в день`)),
    h('div', { class: 'section-title' }, 'Статистика'),
    h('div', { class: 'stats-grid' },
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '📚'), h('div', null, h('b', null, `${done}/${totalLessons}`), h('span', null, 'уроков'))),
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '🧠'), h('div', null, h('b', null, `${srsCount()}`), h('span', null, `слов из ${[...words.values()].filter((w) => !w.hangulOnly).length}`))),
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '🎯'), h('div', null, h('b', null, acc + '%'), h('span', null, 'точность'))),
      h('div', { class: 'stat-box' }, h('span', { class: 'sb-icon' }, '💬'), h('div', null, h('b', null, `${s.dialogs}/${dialogs.size}`), h('span', null, 'диалогов')))),
    h('div', { class: 'section-title' }, `Достижения · ${got}/${ACHIEVEMENTS.length}`),
    h('div', { class: 'ach-grid' }, ACHIEVEMENTS.map((a) => h('div', { class: 'ach' + (s.achievements[a.id] ? ' got' : ''), title: a.desc },
      h('div', { class: 'ach-icon ko' }, a.icon), h('div', { class: 'ach-t' }, a.title), h('div', { class: 'ach-d' }, a.desc)))),
    h('div', { class: 'section-title' }, 'Прогресс'),
    h('div', { class: 'row' },
      h('button', { class: 'btn grow', onclick: doExport }, icon('download', 'i-s'), 'Экспорт'),
      h('button', { class: 'btn grow', onclick: doImport }, icon('upload', 'i-s'), 'Импорт')),
    h('p', { class: 'small muted center mt' }, 'Прогресс хранится только на этом устройстве. Сохраните файл, чтобы перенести его на другой телефон.'));
}

function doExport() {
  const d = new Date();
  downloadJSON(exportData(), `hanbam-progress-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`);
  toast('Файл прогресса сохранён', { icon: '💾' });
}

function doImport() {
  const input = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  input.addEventListener('change', async () => {
    const f = input.files[0];
    input.remove();
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const ok = await confirmDialog({ title: 'Заменить прогресс?', text: 'Текущий прогресс на этом устройстве будет заменён данными из файла.', ok: 'Заменить', danger: true });
      if (!ok) return;
      await importData(obj);
      toast('Прогресс загружен', { icon: '✅' });
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast(e.message || 'Не удалось прочитать файл', { icon: '⚠️' });
    }
  });
  document.body.append(input);
  input.click();
}

// ---------- Настройки ----------
function setting(title, desc, control) {
  return h('div', { class: 'setting' }, h('div', { class: 'st-text' }, h('div', { class: 'st-title' }, title), desc ? h('div', { class: 'st-desc' }, desc) : null), control);
}
function toggle(key) {
  const input = h('input', { type: 'checkbox' });
  input.checked = !!state.settings[key];
  input.addEventListener('change', () => update('settings', (s) => { s[key] = input.checked; }));
  return h('label', { class: 'switch' }, input, h('span'));
}
function segmented(key, options) {
  const wrap = h('div', { class: 'segmented', style: { marginTop: '8px' } });
  const btns = options.map(([v, label]) => {
    const b = h('button', { class: state.settings[key] === v ? 'active' : '' }, label);
    b.addEventListener('click', () => { update('settings', (s) => { s[key] = v; }); btns.forEach((x) => x.classList.remove('active')); b.classList.add('active'); });
    return b;
  });
  wrap.append(...btns);
  return wrap;
}

export function settingsScreen() {
  const nameInput = h('input', { class: 'text-input', value: state.settings.name, placeholder: 'Как к вам обращаться?', maxlength: '30' });
  nameInput.addEventListener('change', () => update('settings', (s) => { s.name = nameInput.value.trim(); }));

  const voices = koreanVoices();
  const voiceSel = h('select', { class: 'select', 'aria-label': 'Голос' },
    h('option', { value: '' }, voices.length ? 'Автовыбор' : 'Нет корейского голоса'),
    voices.map((v) => h('option', { value: v.voiceURI }, v.name)));
  voiceSel.value = state.settings.voice;
  voiceSel.addEventListener('change', () => update('settings', (s) => { s.voice = voiceSel.value; }));

  const rateLabel = h('span', { class: 'small muted' }, `×${state.settings.rate.toFixed(2)}`);
  const rate = h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.05', value: String(state.settings.rate), style: { width: '140px' } });
  rate.addEventListener('input', () => { rateLabel.textContent = `×${Number(rate.value).toFixed(2)}`; });
  rate.addEventListener('change', () => update('settings', (s) => { s.rate = Number(rate.value); }));

  return h('div', null,
    topbar({ title: 'Настройки', back: () => navigate('/profile') }),
    h('div', { class: 'card', style: { padding: '4px 0' } },
      h('div', { class: 'setting', style: { flexDirection: 'column', alignItems: 'stretch' } }, h('div', { class: 'st-title' }, 'Имя'), nameInput),
      h('div', { class: 'setting', style: { flexDirection: 'column', alignItems: 'stretch' } }, h('div', { class: 'st-title' }, 'Тема'),
        segmented('theme', [['system', 'Как в системе'], ['dark', 'Тёмная'], ['light', 'Светлая']])),
      h('div', { class: 'setting', style: { flexDirection: 'column', alignItems: 'stretch' } }, h('div', { class: 'st-title' }, 'Латиница (романизация)'),
        h('div', { class: 'st-desc' }, '«Постепенно»: видна в первых юнитах, дальше — по нажатию.'),
        segmented('rom', [['auto', 'Постепенно'], ['always', 'Всегда'], ['never', 'По нажатию']])),
      h('div', { class: 'setting', style: { flexDirection: 'column', alignItems: 'stretch' } }, h('div', { class: 'st-title' }, 'Цель на день'),
        segmented('dailyGoal', [[10, '10 XP'], [20, '20 XP'], [30, '30 XP'], [50, '50 XP']]))),

    h('div', { class: 'section-title' }, 'Звук и речь'),
    h('div', { class: 'card', style: { padding: '4px 0' } },
      setting('Голос', ttsSupported ? (voices.length ? `Найдено корейских голосов: ${voices.length}` : 'Установите корейский голос — см. подсказку ниже') : 'Браузер не поддерживает озвучку', voiceSel),
      setting('Скорость речи', null, h('div', { class: 'row' }, rate, rateLabel)),
      setting('Проверить голос', null, h('button', { class: 'btn btn-sm', onclick: () => speak('안녕하세요! 만나서 반갑습니다.') }, icon('volume', 'i-s'), 'Тест')),
      setting('Автоозвучка', 'Проигрывать слова в упражнениях автоматически', toggle('autoplay')),
      setting('Упражнения «Скажи вслух»', canRecognize ? 'Распознавание речи доступно' : 'В этом браузере — режим самопроверки', toggle('speak')),
      setting('Звуки интерфейса', null, toggle('sound')),
      setting('Вибрация', null, toggle('haptics'))),
    !voices.length ? h('div', { class: 'tip mt' }, '🔈', h('div', null,
      h('b', null, 'Как установить корейский голос'),
      h('div', { class: 'small' }, 'Android: Настройки → Система → Язык → Синтез речи → Google → установить «Корейский». iPhone: голос уже встроен (Yuna). Windows: Параметры → Время и язык → Речь → Добавить голоса → Корейский. Затем перезапустите браузер.'))) : null,

    h('div', { class: 'section-title' }, 'Обучение'),
    h('div', { class: 'card', style: { padding: '4px 0' } },
      setting('Обратные карточки', 'В повторении сначала показывать перевод', toggle('reverseCards')),
      setting('Открыть все уроки', 'Для тех, кто уже что-то знает', toggle('unlockAll'))),

    h('div', { class: 'section-title' }, 'Данные'),
    h('div', { class: 'card', style: { padding: '4px 0' } },
      setting('Экспорт прогресса', 'Сохранить файл .json', h('button', { class: 'btn btn-sm', onclick: doExport }, icon('download', 'i-s'))),
      setting('Импорт прогресса', 'Загрузить из файла', h('button', { class: 'btn btn-sm', onclick: doImport }, icon('upload', 'i-s'))),
      setting('Сбросить всё', 'Удалить весь прогресс на этом устройстве', h('button', { class: 'btn btn-sm btn-bad', onclick: async () => {
        if (await confirmDialog({ title: 'Удалить весь прогресс?', text: 'Уроки, слова, серия и достижения будут удалены без возможности восстановления. Сначала можно сделать экспорт.', ok: 'Удалить', danger: true })) {
          await resetAll(); location.hash = '/'; location.reload();
        }
      } }, icon('trash', 'i-s')))),
    h('p', { class: 'small muted center mt-l' }, '한밤 · Ханбам v1.0 · работает без интернета'),
    h('div', { class: 'center' }, h('button', { class: 'btn btn-ghost btn-sm', onclick: showInstallHelp }, 'Как установить на телефон')));
}

export function showInstallHelp() {
  openSheet(h('div', { class: 'col' },
    h('div', { class: 'h2' }, 'Установка на телефон'),
    h('div', { class: 'card' }, h('b', null, 'iPhone (Safari)'), h('p', { class: 'small sub mt-s' }, 'Кнопка «Поделиться» → «На экран «Домой»» → «Добавить».')),
    h('div', { class: 'card' }, h('b', null, 'Android (Chrome)'), h('p', { class: 'small sub mt-s' }, 'Меню ⋮ → «Установить приложение» или «Добавить на главный экран».')),
    h('p', { class: 'small muted' }, 'После установки приложение открывается как обычное и работает без интернета.')));
}
