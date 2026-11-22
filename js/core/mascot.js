// Маскот приложения — тигрёнок Бами (바미) с месяцем на макушке.
// Настроения: happy, wow (ликует), sad (сочувствует), think, sleep, wave (машет).

const EYES = {
  happy: '<path d="M33 52 q5 -6 10 0 M57 52 q5 -6 10 0" stroke="#2a1a3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  wow: '<path d="M32 53 q6 -8 12 0 M56 53 q6 -8 12 0" stroke="#2a1a3a" stroke-width="3.8" fill="none" stroke-linecap="round"/>',
  sad: '<ellipse cx="38" cy="53" rx="4.2" ry="5.2" fill="#2a1a3a"/><ellipse cx="62" cy="53" rx="4.2" ry="5.2" fill="#2a1a3a"/><circle cx="39.5" cy="51" r="1.5" fill="#fff"/><circle cx="63.5" cy="51" r="1.5" fill="#fff"/><path d="M31 46 l9 -3 M69 46 l-9 -3" stroke="#2a1a3a" stroke-width="3" stroke-linecap="round"/>',
  think: '<ellipse cx="38" cy="52" rx="4.2" ry="5.2" fill="#2a1a3a"/><path d="M57 53 h10" stroke="#2a1a3a" stroke-width="3.5" stroke-linecap="round"/><circle cx="39.5" cy="50" r="1.5" fill="#fff"/>',
  sleep: '<path d="M33 54 q5 4 10 0 M57 54 q5 4 10 0" stroke="#2a1a3a" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  wave: '<ellipse cx="38" cy="52" rx="4.4" ry="5.6" fill="#2a1a3a"/><ellipse cx="62" cy="52" rx="4.4" ry="5.6" fill="#2a1a3a"/><circle cx="39.8" cy="49.8" r="1.7" fill="#fff"/><circle cx="63.8" cy="49.8" r="1.7" fill="#fff"/>',
};
const MOUTH = {
  happy: '<path d="M43 69 q7 7 14 0" stroke="#2a1a3a" stroke-width="3" fill="none" stroke-linecap="round"/>',
  wow: '<path d="M42 67 q8 13 16 0 z" fill="#2a1a3a"/><path d="M45 72 q5 4 10 0" fill="#ff7a8a"/>',
  sad: '<path d="M43 73 q7 -6 14 0" stroke="#2a1a3a" stroke-width="3" fill="none" stroke-linecap="round"/>',
  think: '<path d="M45 71 h10" stroke="#2a1a3a" stroke-width="3" stroke-linecap="round"/>',
  sleep: '<ellipse cx="50" cy="71" rx="3" ry="2.5" fill="#2a1a3a"/>',
  wave: '<path d="M43 68 q7 8 14 0" stroke="#2a1a3a" stroke-width="3" fill="none" stroke-linecap="round"/>',
};
const EXTRA = {
  wow: '<path d="M10 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z M88 30 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" fill="#ffd36b"/>',
  sleep: '<text x="78" y="26" font-size="13" font-weight="800" fill="#a77bff" font-family="sans-serif">z</text><text x="87" y="16" font-size="10" font-weight="800" fill="#a77bff" font-family="sans-serif">z</text>',
  sad: '<path d="M70 60 q2 5 0 8 q-2 -3 0 -8z" fill="#4fd8ff"/>',
  think: '<circle cx="86" cy="20" r="3" fill="#a77bff" opacity=".6"/><circle cx="92" cy="10" r="4.5" fill="#a77bff" opacity=".8"/>',
  wave: '<g class="mascot-paw"><ellipse cx="86" cy="62" rx="8" ry="9" fill="#ffa53d" stroke="#e5862a" stroke-width="2"/><path d="M82 56 v5 M86 55 v5 M90 56 v5" stroke="#c96a1e" stroke-width="1.6" stroke-linecap="round"/></g>',
};

export function mascotSVG(mood = 'happy') {
  const m = EYES[mood] ? mood : 'happy';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="50" cy="96" rx="26" ry="3.5" fill="#000" opacity=".18"/>
  <circle cx="22" cy="28" r="13" fill="#ffa53d"/><circle cx="22" cy="28" r="6.5" fill="#ffc2b4"/>
  <circle cx="78" cy="28" r="13" fill="#ffa53d"/><circle cx="78" cy="28" r="6.5" fill="#ffc2b4"/>
  <ellipse cx="50" cy="56" rx="38" ry="35" fill="#ffa53d"/>
  <path d="M50 22 l-5 11 h10z M36 25 l-2 10 6 -2z M64 25 l2 10 -6 -2z" fill="#3a2440"/>
  <path d="M13 50 l10 3 -10 4z M87 50 l-10 3 10 4z M15 63 l9 1 -8 5z M85 63 l-9 1 8 5z" fill="#3a2440"/>
  <ellipse cx="50" cy="70" rx="21" ry="15" fill="#fff6ea"/>
  <ellipse cx="27" cy="64" rx="6" ry="4" fill="#ff8fa3" opacity=".55"/><ellipse cx="73" cy="64" rx="6" ry="4" fill="#ff8fa3" opacity=".55"/>
  ${EYES[m]}
  <path d="M45.5 61 q4.5 -3 9 0 q-1 4.5 -4.5 5.5 q-3.5 -1 -4.5 -5.5z" fill="#3a2440"/>
  ${MOUTH[m]}
  <path d="M58 12 a9 9 0 1 0 9 11 a7 7 0 1 1 -9 -11z" fill="#ffd36b"/>
  ${EXTRA[m] || ''}
</svg>`;
}

export function mascot(mood = 'happy', size = 96, cls = '') {
  const el = document.createElement('div');
  el.className = 'mascot ' + cls + ' mood-' + mood;
  el.style.width = el.style.height = size + 'px';
  el.innerHTML = mascotSVG(mood);
  return el;
}

// Короткие реплики маскота.
export const LINES = {
  ok: ['Отлично!', 'Супер!', '잘했어요!', 'Так держать!', 'Верно!', 'Прекрасно!', '맞아요!', 'Молодец!'],
  bad: ['Ничего страшного!', 'Почти!', 'Запомним это 💪', 'Ошибки — это нормально', 'Попробуем ещё раз позже'],
};
