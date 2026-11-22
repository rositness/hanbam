// Иллюстрации юнитов для карты и экрана урока: маленькие «сцены» в стиле «Сеул ночью».
// Каждая сцена — SVG 140×140 на светящемся круге цвета юнита, с лёгкой анимацией
// (классы sc-* в css/game.css; при «уменьшить движение» анимации выключаются).
// В JSON юнита можно указать "scene": "<имя>", иначе сцена берётся из списка ниже.

const BY_UNIT = {
  h1: 'hangul', h2: 'hangul', h3: 'hangul', h4: 'hangul', h5: 'hangul',
  u01: 'gate', u02: 'balloons', u03: 'house', u04: 'ramen', u05: 'clock', u06: 'tower', u07: 'shop',
  u08: 'subway', u09: 'sunrise', u10: 'guitar', u11: 'weather', u12: 'books', u13: 'health', u14: 'hearts',
  u15: 'calendar', u16: 'plane', u17: 'apartment', u18: 'lanterns', u19: 'phone', u20: 'bank',
};
const FALLBACK = ['tower', 'lanterns', 'gate', 'sunrise', 'house'];

const INK = '#2a1d4f';       // контур
const WIN = '#ffd66b';       // тёплый свет окон

const S = {
  hangul: (c, u) => `
    <g class="sc-bob">
      <rect x="34" y="30" width="72" height="80" rx="10" fill="#fff6e4" stroke="${INK}" stroke-width="3"/>
      <rect x="34" y="30" width="72" height="12" rx="6" fill="${c}" stroke="${INK}" stroke-width="3"/>
      <rect x="34" y="98" width="72" height="12" rx="6" fill="${c}" stroke="${INK}" stroke-width="3"/>
      <text x="70" y="84" text-anchor="middle" font-size="40" font-weight="900" fill="${INK}" font-family="'Noto Sans KR', system-ui, sans-serif">${esc(u?.icon || '한')}</text>
    </g>
    <g class="sc-sway" style="transform-origin:112px 104px">
      <rect x="108" y="54" width="8" height="46" rx="3" fill="#b07a4a" stroke="${INK}" stroke-width="2.5" transform="rotate(18 112 77)"/>
      <path d="M100 100 q6 14 14 4 q-4 -6 -6 -10z" fill="${INK}" transform="rotate(18 112 77)"/>
    </g>`,

  gate: (c) => `
    <rect x="38" y="62" width="9" height="52" fill="#c0392b" stroke="${INK}" stroke-width="3"/>
    <rect x="93" y="62" width="9" height="52" fill="#c0392b" stroke="${INK}" stroke-width="3"/>
    <rect x="34" y="58" width="72" height="9" fill="#2f9e8f" stroke="${INK}" stroke-width="3"/>
    <path d="M18 52 Q70 34 122 52 L114 60 Q70 46 26 60Z" fill="#3b2a66" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 46 Q70 26 110 46" fill="none" stroke="${c}" stroke-width="3"/>
    <g class="sc-sway" style="transform-origin:56px 67px">${lantern(56, 74, '#ff6b6b')}</g>
    <g class="sc-sway d2" style="transform-origin:84px 67px">${lantern(84, 74, '#ff6b6b')}</g>`,

  balloons: () => `
    ${balloon(46, 50, '#ff6b9a', '1', 'sc-bob')}
    ${balloon(72, 40, '#4dabf7', '2', 'sc-bob d2')}
    ${balloon(98, 52, '#ffd43b', '3', 'sc-bob d3')}`,

  house: (c) => `
    <path d="M36 70 h68 v42 h-68z" fill="#f4e3c8" stroke="${INK}" stroke-width="3"/>
    <path d="M22 72 Q70 40 118 72 L110 76 Q70 52 30 76Z" fill="#3b2a66" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="46" y="82" width="16" height="16" rx="2" fill="${WIN}" stroke="${INK}" stroke-width="2.5" class="sc-glow"/>
    <rect x="78" y="82" width="16" height="30" rx="2" fill="#a0522d" stroke="${INK}" stroke-width="2.5"/>
    <path d="M54 82 v16 M46 90 h16" stroke="${INK}" stroke-width="2"/>
    <rect x="92" y="44" width="9" height="18" fill="#8d6e63" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="97" cy="36" r="5" fill="#fff" opacity=".5" class="sc-steam"/>
    <circle cx="102" cy="28" r="4" fill="#fff" opacity=".4" class="sc-steam d2"/>
    <circle cx="30" cy="40" r="3" fill="${c}" class="sc-twinkle"/>`,

  ramen: (c) => `
    <path d="M58 44 q-8 -10 0 -20 q8 -10 0 -18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6" class="sc-steam"/>
    <path d="M78 46 q-8 -10 0 -20 q8 -10 0 -18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5" class="sc-steam d2"/>
    <rect x="82" y="22" width="5" height="62" rx="2" fill="#c8a165" stroke="${INK}" stroke-width="2" transform="rotate(22 84 53)"/>
    <rect x="94" y="22" width="5" height="62" rx="2" fill="#c8a165" stroke="${INK}" stroke-width="2" transform="rotate(30 96 53)"/>
    <ellipse cx="70" cy="70" rx="44" ry="10" fill="#ffcf70" stroke="${INK}" stroke-width="3"/>
    <path d="M40 70 q8 -6 16 0 q8 6 16 0 q8 -6 16 0 q8 6 12 0" fill="none" stroke="#fff3c4" stroke-width="3"/>
    <circle cx="56" cy="68" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="56" cy="68" r="3" fill="#ffb300"/>
    <path d="M78 64 l10 0 l-2 6 l-8 0z" fill="#ff8a80" stroke="${INK}" stroke-width="2"/>
    <path d="M26 70 Q30 110 70 112 Q110 110 114 70Z" fill="${c}" stroke="${INK}" stroke-width="3"/>
    <path d="M40 90 h60" stroke="#fff" stroke-width="3" opacity=".5" stroke-dasharray="6 6"/>`,

  clock: (c) => `
    <circle cx="70" cy="70" r="40" fill="#fff8ec" stroke="${INK}" stroke-width="4"/>
    <circle cx="70" cy="70" r="33" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="2 15.3"/>
    <rect x="68" y="44" width="4" height="28" rx="2" fill="${INK}" class="sc-spin slow" style="transform-origin:70px 70px"/>
    <rect x="68.5" y="38" width="3" height="34" rx="1.5" fill="#ff6b6b" class="sc-spin" style="transform-origin:70px 70px"/>
    <circle cx="70" cy="70" r="4.5" fill="${INK}"/>
    <path d="M38 34 l-10 -8 M102 34 l10 -8" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="30" cy="30" r="8" fill="${c}" stroke="${INK}" stroke-width="3"/><circle cx="110" cy="30" r="8" fill="${c}" stroke="${INK}" stroke-width="3"/>`,

  tower: (c) => `
    <path d="M14 118 Q70 66 126 118Z" fill="#2f6f5e" stroke="${INK}" stroke-width="3"/>
    <rect x="66" y="40" width="8" height="52" fill="#e9e4ff" stroke="${INK}" stroke-width="2.5"/>
    <path d="M58 52 h24 l-3 10 h-18z" fill="#c9bcff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="61" y="54" width="18" height="4" fill="${WIN}" class="sc-glow"/>
    <rect x="68.5" y="18" width="3" height="22" fill="#e9e4ff" stroke="${INK}" stroke-width="2"/>
    <circle cx="70" cy="16" r="4" fill="#ff4f9a" class="sc-blink"/>
    <path d="M62 92 h16 l4 8 h-24z" fill="#c9bcff" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="36" cy="104" r="2" fill="${WIN}" class="sc-twinkle"/><circle cx="100" cy="100" r="2" fill="${WIN}" class="sc-twinkle d2"/><circle cx="50" cy="96" r="2" fill="${WIN}" class="sc-twinkle d3"/>
    <circle cx="112" cy="34" r="9" fill="#fff6d6"/><circle cx="116" cy="31" r="8" fill="${c}" opacity=".35"/>`,

  shop: (c) => `
    <g class="sc-bob">
      <path d="M30 56 h44 l4 56 h-52z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M42 56 q0 -18 10 -18 q10 0 10 18" fill="none" stroke="${INK}" stroke-width="3.5"/>
      <text x="52" y="94" text-anchor="middle" font-size="22" font-weight="900" fill="#fff">₩</text>
    </g>
    <g class="sc-bob d2">
      <path d="M68 70 h40 l3 42 h-46z" fill="#ffd43b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M79 70 q0 -14 9 -14 q9 0 9 14" fill="none" stroke="${INK}" stroke-width="3.5"/>
      <path d="M80 90 l6 6 l10 -12" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    ${sparkle(26, 36, 'sc-twinkle')}${sparkle(114, 50, 'sc-twinkle d2')}`,

  subway: (c) => `
    <rect x="6" y="104" width="128" height="5" rx="2" fill="${INK}" opacity=".6"/>
    <g class="sc-drive">
      <rect x="26" y="52" width="92" height="50" rx="14" fill="#e9eefc" stroke="${INK}" stroke-width="3"/>
      <rect x="26" y="84" width="92" height="7" fill="${c}"/>
      <rect x="36" y="60" width="18" height="16" rx="3" fill="#8fd3ff" stroke="${INK}" stroke-width="2.5"/>
      <rect x="60" y="60" width="18" height="16" rx="3" fill="#8fd3ff" stroke="${INK}" stroke-width="2.5"/>
      <rect x="84" y="60" width="26" height="22" rx="4" fill="#8fd3ff" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="44" cy="104" r="6" fill="${INK}"/><circle cx="100" cy="104" r="6" fill="${INK}"/>
      <circle cx="112" cy="92" r="3" fill="${WIN}" class="sc-glow"/>
    </g>`,

  sunrise: (c) => `
    <circle cx="70" cy="80" r="26" fill="#ffb347" class="sc-rise"/>
    <path d="M70 40 v-10 M42 52 l-7 -7 M98 52 l7 -7" stroke="#ffd36b" stroke-width="4" stroke-linecap="round" class="sc-twinkle"/>
    <path d="M10 114 L48 70 L70 92 L96 62 L132 114Z" fill="#5b4a9b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M48 70 l-8 10 l8 -3 l7 4z M96 62 l-9 11 l9 -3 l8 4z" fill="#fff"/>
    <path d="M14 114 h112" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,

  guitar: (c) => `
    <g transform="rotate(-28 70 76)">
      <rect x="66" y="16" width="8" height="52" fill="#8d5a3b" stroke="${INK}" stroke-width="2.5"/>
      <rect x="63" y="10" width="14" height="12" rx="3" fill="${INK}"/>
      <path d="M70 62 c-20 0 -26 12 -20 22 c-10 6 -8 26 20 26 c28 0 30 -20 20 -26 c6 -10 0 -22 -20 -22z" fill="${c}" stroke="${INK}" stroke-width="3"/>
      <circle cx="70" cy="84" r="7" fill="${INK}"/>
      <path d="M68 22 v80 M72 22 v80" stroke="#fff" stroke-width="1" opacity=".8"/>
    </g>
    <g class="sc-float"><path d="M104 46 v-18 l12 -4 v18" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="101" cy="46" r="4" fill="${INK}"/><circle cx="113" cy="42" r="4" fill="${INK}"/></g>
    <g class="sc-float d2"><path d="M30 40 v-16" stroke="${INK}" stroke-width="3"/><circle cx="27" cy="40" r="4.5" fill="${INK}"/></g>`,

  weather: (c) => `
    <g class="sc-spin slow" style="transform-origin:92px 44px">
      <circle cx="92" cy="44" r="16" fill="#ffd43b" stroke="${INK}" stroke-width="3"/>
      <path d="M92 18 v-6 M92 76 v-6 M66 44 h-6 M124 44 h-6 M74 26 l-4 -4 M114 66 l-4 -4 M110 26 l4 -4 M74 62 l-4 4" stroke="#ffd43b" stroke-width="4" stroke-linecap="round"/>
    </g>
    <path d="M30 86 a16 16 0 0 1 8 -30 a22 22 0 0 1 42 -2 a14 14 0 0 1 18 32z" fill="#f1f3ff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 96 l-4 10 M62 96 l-4 10 M82 96 l-4 10" stroke="${c}" stroke-width="4" stroke-linecap="round" class="sc-rain"/>
    <path d="M52 104 l-4 10 M72 104 l-4 10" stroke="${c}" stroke-width="4" stroke-linecap="round" class="sc-rain d2"/>`,

  books: (c) => `
    <rect x="30" y="92" width="80" height="16" rx="3" fill="${c}" stroke="${INK}" stroke-width="3"/>
    <rect x="36" y="76" width="70" height="16" rx="3" fill="#ffd43b" stroke="${INK}" stroke-width="3"/>
    <rect x="28" y="60" width="76" height="16" rx="3" fill="#69db7c" stroke="${INK}" stroke-width="3"/>
    <path d="M40 100 h50 M46 84 h44 M38 68 h50" stroke="#fff" stroke-width="2.5" opacity=".7"/>
    <g class="sc-bob">
      <path d="M44 44 L72 32 L100 44 L72 56Z" fill="${INK}"/>
      <path d="M56 49 v10 q16 8 32 0 v-10" fill="${INK}"/>
      <path d="M100 44 v14" stroke="#ffd43b" stroke-width="3"/><circle cx="100" cy="60" r="3.5" fill="#ffd43b"/>
    </g>`,

  health: (c) => `
    <path d="M70 112 C20 82 22 40 48 38 C60 37 66 46 70 52 C74 46 80 37 92 38 C118 40 120 82 70 112Z" fill="#ff6b81" stroke="${INK}" stroke-width="3" class="sc-beat"/>
    <path d="M18 74 h28 l8 -16 l10 30 l8 -20 l6 6 h44" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="sc-pulse"/>
    <rect x="98" y="16" width="26" height="26" rx="7" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M111 22 v14 M104 29 h14" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,

  hearts: (c) => `
    ${face(52, 74, 26, '#ffd43b', 'smile', 'sc-bob')}
    ${face(98, 62, 18, c, 'wow', 'sc-bob d2')}
    <path d="M30 34 c-6 -6 -14 2 0 12 c14 -10 6 -18 0 -12z" fill="#ff6b81" class="sc-float"/>
    <path d="M110 100 c-5 -5 -12 2 0 10 c12 -8 5 -15 0 -10z" fill="#ff6b81" class="sc-float d2"/>`,

  calendar: (c) => `
    <g class="sc-bob">
      <rect x="28" y="34" width="84" height="78" rx="10" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <path d="M28 44 a10 10 0 0 1 10 -10 h64 a10 10 0 0 1 10 10 v12 h-84z" fill="${c}" stroke="${INK}" stroke-width="3"/>
      <rect x="44" y="24" width="6" height="18" rx="3" fill="${INK}"/><rect x="90" y="24" width="6" height="18" rx="3" fill="${INK}"/>
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((k) => `<rect x="${38 + k * 17}" y="${64 + r * 11}" width="10" height="6" rx="2" fill="${r === 2 && k === 2 ? '#ff6b81' : '#d9d3f5'}"/>`).join('')).join('')}
      <circle cx="77" cy="89" r="9" fill="none" stroke="#ff6b81" stroke-width="3"/>
    </g>`,

  plane: (c) => `
    <path d="M14 100 a12 12 0 0 1 14 -18 a16 16 0 0 1 30 4 a10 10 0 0 1 4 14z" fill="#f1f3ff" opacity=".9" class="sc-drift"/>
    <path d="M84 112 a10 10 0 0 1 12 -14 a14 14 0 0 1 26 4 a8 8 0 0 1 2 10z" fill="#f1f3ff" opacity=".7" class="sc-drift d2"/>
    <g class="sc-fly">
      <path d="M22 64 Q70 52 118 50 Q126 52 118 58 Q70 66 26 70z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M62 60 L82 30 L92 32 L80 58z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M64 66 L76 88 L86 86 L80 64z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M24 66 L18 50 L28 50 L36 64z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="96" cy="56" r="2.5" fill="#8fd3ff"/><circle cx="86" cy="57" r="2.5" fill="#8fd3ff"/><circle cx="106" cy="55" r="2.5" fill="#8fd3ff"/>
    </g>`,

  apartment: (c) => `
    <rect x="30" y="30" width="48" height="84" rx="3" fill="#4b3c86" stroke="${INK}" stroke-width="3"/>
    <rect x="82" y="56" width="34" height="58" rx="3" fill="${c}" stroke="${INK}" stroke-width="3"/>
    ${[0, 1, 2, 3, 4, 5].map((r) => [0, 1, 2].map((k) => `<rect x="${37 + k * 13}" y="${38 + r * 12}" width="8" height="7" rx="1.5" fill="${WIN}" ${(r * 3 + k) % 4 === 1 ? 'opacity=".25"' : `class="sc-glow${(r + k) % 3 ? '' : ' d2'}"`}/>`).join('')).join('')}
    ${[0, 1, 2].map((r) => [0, 1].map((k) => `<rect x="${89 + k * 12}" y="${64 + r * 14}" width="8" height="8" rx="1.5" fill="#fff" opacity="${(r + k) % 2 ? '.9' : '.35'}"/>`).join('')).join('')}
    <rect x="48" y="102" width="12" height="12" fill="${INK}"/>`,

  lanterns: () => `
    <path d="M6 30 Q70 56 134 30" fill="none" stroke="${INK}" stroke-width="2.5"/>
    <g class="sc-sway" style="transform-origin:30px 40px">${lantern(30, 48, '#ff6b6b')}</g>
    <g class="sc-sway d2" style="transform-origin:56px 47px">${lantern(56, 56, '#ffa94d')}</g>
    <g class="sc-sway d3" style="transform-origin:84px 47px">${lantern(84, 56, '#ff6b9a')}</g>
    <g class="sc-sway" style="transform-origin:110px 40px">${lantern(110, 48, '#ffd43b')}</g>
    <path d="M40 112 q30 -18 60 0" fill="none" stroke="#ff6b9a" stroke-width="3" opacity=".6"/>
    ${sparkle(70, 96, 'sc-twinkle')}`,

  phone: (c) => `
    <rect x="40" y="22" width="56" height="98" rx="12" fill="${INK}"/>
    <rect x="45" y="32" width="46" height="76" rx="5" fill="#eef1ff"/>
    <rect x="51" y="40" width="26" height="10" rx="5" fill="#d9d3f5" class="sc-pop"/>
    <rect x="61" y="56" width="26" height="10" rx="5" fill="${c}" class="sc-pop d2"/>
    <rect x="51" y="72" width="20" height="10" rx="5" fill="#d9d3f5" class="sc-pop d3"/>
    <circle cx="68" cy="114" r="2.5" fill="#fff"/>
    <g class="sc-bob d2"><path d="M98 34 h28 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-18 l-8 7 v-7 h-2 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6z" fill="#ff6b81" stroke="${INK}" stroke-width="2.5"/>
    <path d="M112 41 c-3 -3 -8 1 0 7 c8 -6 3 -10 0 -7z" fill="#fff"/></g>`,

  bank: (c) => `
    <g class="sc-drop"><circle cx="76" cy="26" r="9" fill="#ffd43b" stroke="${INK}" stroke-width="2.5"/><text x="76" y="30.5" text-anchor="middle" font-size="12" font-weight="900" fill="${INK}">₩</text></g>
    <ellipse cx="68" cy="80" rx="42" ry="30" fill="${c}" stroke="${INK}" stroke-width="3"/>
    <rect x="64" y="52" width="22" height="5" rx="2.5" fill="${INK}"/>
    <ellipse cx="108" cy="80" rx="9" ry="10" fill="${c}" stroke="${INK}" stroke-width="3"/>
    <circle cx="106" cy="78" r="1.8" fill="${INK}"/><circle cx="111" cy="78" r="1.8" fill="${INK}"/>
    <circle cx="90" cy="68" r="3" fill="${INK}"/>
    <path d="M44 56 l-6 -12 l14 6z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="42" y="104" width="10" height="10" rx="3" fill="${c}" stroke="${INK}" stroke-width="3"/>
    <rect x="80" y="104" width="10" height="10" rx="3" fill="${c}" stroke="${INK}" stroke-width="3"/>
    <path d="M26 78 q-10 -4 -6 -12" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
};

function esc(s) { return String(s).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch])); }

function lantern(x, y, color) {
  return `<path d="M${x} ${y - 7} v-6" stroke="${INK}" stroke-width="2"/>
    <rect x="${x - 7}" y="${y - 9}" width="14" height="4" rx="1.5" fill="${INK}"/>
    <ellipse cx="${x}" cy="${y + 6}" rx="11" ry="13" fill="${color}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M${x} ${y - 6} v25" stroke="${INK}" stroke-width="1.2" opacity=".35"/>
    <ellipse cx="${x - 3}" cy="${y + 2}" rx="3" ry="5" fill="#fff" opacity=".35"/>
    <rect x="${x - 6}" y="${y + 17}" width="12" height="4" rx="1.5" fill="${INK}"/>
    <path d="M${x} ${y + 21} v7" stroke="${color}" stroke-width="2.5"/>`;
}

function balloon(x, y, color, label, cls) {
  return `<g class="${cls}"><path d="M${x} ${y + 24} q-6 20 4 50" fill="none" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="${x}" cy="${y}" rx="17" ry="21" fill="${color}" stroke="${INK}" stroke-width="3"/>
    <path d="M${x - 4} ${y + 21} h8 l-4 5z" fill="${color}" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="${x - 7}" cy="${y - 8}" rx="4" ry="6" fill="#fff" opacity=".4"/>
    <text x="${x}" y="${y + 7}" text-anchor="middle" font-size="20" font-weight="900" fill="#fff" stroke="${INK}" stroke-width="1" paint-order="stroke">${label}</text></g>`;
}

function face(x, y, r, color, mood, cls) {
  const mouth = mood === 'wow'
    ? `<ellipse cx="${x}" cy="${y + r * 0.35}" rx="${r * 0.18}" ry="${r * 0.24}" fill="${INK}"/>`
    : `<path d="M${x - r * 0.42} ${y + r * 0.2} q${r * 0.42} ${r * 0.45} ${r * 0.84} 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  return `<g class="${cls}"><circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="${INK}" stroke-width="3"/>
    <circle cx="${x - r * 0.35}" cy="${y - r * 0.15}" r="${r * 0.1 + 1}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.15}" r="${r * 0.1 + 1}" fill="${INK}"/>
    <circle cx="${x - r * 0.58}" cy="${y + r * 0.2}" r="${r * 0.14}" fill="#ff6b81" opacity=".6"/><circle cx="${x + r * 0.58}" cy="${y + r * 0.2}" r="${r * 0.14}" fill="#ff6b81" opacity=".6"/>
    ${mouth}</g>`;
}

function sparkle(x, y, cls) {
  return `<path class="${cls}" d="M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2}Z" fill="#fff6c4"/>`;
}

export function sceneName(unit) {
  return unit.scene && S[unit.scene] ? unit.scene : BY_UNIT[unit.id] || FALLBACK[(unit.order || 0) % FALLBACK.length];
}

// SVG-строка сцены юнита. opts.locked — приглушённая версия без анимации.
export function sceneSVG(unit, { cls = '', locked = false } = {}) {
  const c = unit.color || '#9775fa';
  const body = S[sceneName(unit)](c, unit);
  return `<svg class="scene ${cls}${locked ? ' locked' : ''}" viewBox="0 0 140 140" aria-hidden="true" focusable="false">
    <circle cx="70" cy="72" r="60" fill="${c}" opacity=".16"/>
    <circle cx="70" cy="72" r="44" fill="${c}" opacity=".12"/>
    <ellipse cx="70" cy="122" rx="50" ry="7" fill="${c}" opacity=".25"/>
    ${body}
  </svg>`;
}

// Готовый элемент со сценой заданного размера.
export function sceneEl(unit, size = 96, cls = '') {
  const el = document.createElement('span');
  el.className = 'scene-box ' + cls;
  el.style.width = el.style.height = size + 'px';
  el.innerHTML = sceneSVG(unit);
  return el;
}
