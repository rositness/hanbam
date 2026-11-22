// Приветствие при первом запуске: имя, цель на день, проверка голоса.

import { h, icon } from '../core/dom.js';
import { update, state } from '../core/store.js';
import { speak, recordingCount } from '../core/tts.js';
import { mascot } from '../core/mascot.js';
import { placementView } from './placement.js';

export function onboarding(done) {
  let step = 0;
  let goal = 20;
  const root = h('div', { class: 'col', style: { minHeight: '88dvh', justifyContent: 'center' } });
  const nameInput = h('input', { class: 'text-input', placeholder: 'Ваше имя (необязательно)', maxlength: '30' });

  const steps = [
    () => h('div', { class: 'result' },
      mascot('wave', 130, 'bob'),
      h('div', { class: 'speech-bubble', style: { marginTop: '-6px' } }, '안녕! Я Бами, буду учить тебя корейскому 🐯'),
      h('div', { class: 'boot-logo ko', style: { fontSize: '48px' } }, '한밤'),
      h('div', { class: 'h1' }, 'Ханбам'),
      h('p', { class: 'sub' }, 'Корейский с нуля до разговорного уровня: хангыль, 75 уроков, 750+ слов с картинками, интервальные повторения, грамматика и живые диалоги с озвучкой носителей.'),
      h('div', { class: 'col', style: { width: '100%', textAlign: 'left' } },
        feat('한', 'Хангыль за неделю', 'Буквы, слоги, прописи и правила чтения'),
        feat('🚇', 'Путь по линиям метро', 'Каждая станция — тема из реальной жизни'),
        feat('🧠', 'Слова не забываются', 'Повторения в нужный момент')),
      next('Начать')),
    () => h('div', { class: 'col gap-l' },
      h('div', { class: 'h1' }, 'Давайте знакомиться'),
      h('p', { class: 'sub' }, 'По-корейски это звучит так: ', h('b', { class: 'ko' }, '만나서 반가워요!'), ' — «Рад(а) познакомиться!»'),
      nameInput,
      h('div', { class: 'h3 mt' }, 'Сколько заниматься в день?'),
      h('div', { class: 'col' }, [[10, 'Спокойно', '≈ 5 минут'], [20, 'Обычно', '≈ 10 минут'], [30, 'Серьёзно', '≈ 15 минут'], [50, 'Интенсив', '≈ 25 минут']].map(([v, t, d]) => {
        const b = h('button', { class: 'option' + (v === goal ? ' selected' : ''), style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } }, h('span', null, t, h('span', { class: 'opt-sub', style: { marginLeft: '8px' } }, d)), h('span', { class: 'badge soft' }, `${v} XP`));
        b.addEventListener('click', () => { goal = v; b.parentElement.querySelectorAll('.option').forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); });
        return b;
      })),
      next('Дальше')),
    () => placementView({ onFinish: () => { step++; paint(); } }),
    () => {
      const status = h('div', { class: 'sub' });
      const check = () => {
        status.textContent = recordingCount() ? 'Вы должны были услышать «안녕하세요» голосом носителя языка. Все слова и диалоги озвучены так же.' : 'Если ничего не слышно — проверьте громкость. Озвучку можно настроить в Профиль → Настройки.';
      };
      setTimeout(check, 600);
      return h('div', { class: 'col gap-l' },
        h('div', { class: 'h1' }, 'Проверим звук'),
        h('p', { class: 'sub' }, 'Все слова, фразы и диалоги озвучены естественными голосами. Включите звук и нажмите кнопку.'),
        h('button', { class: 'mic-btn', onclick: () => { speak('안녕하세요'); setTimeout(check, 800); } }, icon('volume')),
        status,
        h('div', { class: 'tip' }, '🎧', h('span', null, 'Совет: занимайтесь в наушниках и повторяйте вслух каждую фразу — так произношение ставится быстрее.')),
        next('Поехали! 가자!', true));
    },
  ];

  function feat(e, t, d) {
    return h('div', { class: 'row card' }, h('div', { class: 'ko', style: { fontSize: '28px', width: '40px', textAlign: 'center' } }, e), h('div', null, h('div', { class: 'h3' }, t), h('div', { class: 'small sub' }, d)));
  }
  function next(label, last = false) {
    return h('button', { class: 'btn btn-primary btn-block btn-lg mt', onclick: () => {
      if (step === 1) update('settings', (s) => { s.name = nameInput.value.trim(); s.dailyGoal = goal; });
      if (last) { done(); return; }
      step++; paint();
    } }, label);
  }
  function paint() {
    root.replaceChildren(h('div', { class: 'screen' }, steps[step]()));
  }
  paint();
  return root;
}

export { state };
