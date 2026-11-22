// Работа с хангылем: разбор и сборка слогов, набор с экранной клавиатуры,
// сравнение ответов и романизация отдельных слогов.

export const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
export const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const BASE = 0xac00;
const VOWEL_COMBO = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
const FINAL_COMBO = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
const SPLIT = {};
for (const [k, v] of Object.entries({ ...VOWEL_COMBO, ...FINAL_COMBO })) SPLIT[v] = [...k];

export const isSyllable = (ch) => { const c = ch.charCodeAt(0); return c >= BASE && c <= 0xd7a3; };
export const isVowel = (j) => JUNG.includes(j);
export const isConsonant = (j) => CHO.includes(j) || (JONG.includes(j) && j !== '');
export const hasHangul = (s) => /[가-힣ㄱ-ㆎ]/.test(s);

export function compose(cho, jung, jong = '') {
  const l = CHO.indexOf(cho), v = JUNG.indexOf(jung), t = JONG.indexOf(jong);
  if (l < 0 || v < 0 || t < 0) return null;
  return String.fromCharCode(BASE + (l * 21 + v) * 28 + t);
}

export function decomposeSyllable(ch) {
  if (!isSyllable(ch)) return null;
  const i = ch.charCodeAt(0) - BASE;
  return { cho: CHO[Math.floor(i / 588)], jung: JUNG[Math.floor((i % 588) / 28)], jong: JONG[i % 28] };
}

// Строка → массив базовых чамо (составные гласные и патчимы раскладываются).
export function toJamo(str) {
  const out = [];
  for (const ch of str) {
    const d = decomposeSyllable(ch);
    if (d) {
      out.push(d.cho);
      out.push(...(SPLIT[d.jung] || [d.jung]));
      if (d.jong) out.push(...(SPLIT[d.jong] || [d.jong]));
    } else out.push(...(SPLIT[ch] || [ch]));
  }
  return out;
}

// Сборка текста из последовательности нажатий клавиш (базовые чамо и пробелы).
// Работает как стандартный автомат двухрядной раскладки.
export function composeKeys(keys) {
  let out = '';
  let L = '', V = '', T = '';
  const flush = () => {
    if (L && V) out += compose(L, V, T);
    else out += L + V;
    L = V = T = '';
  };
  for (const k of keys) {
    if (!k || k === ' ' || (!isVowel(k) && !CHO.includes(k))) { flush(); out += k || ''; continue; }
    if (isVowel(k)) {
      if (L && V && T) {
        const parts = SPLIT[T];
        let nextL;
        if (parts) { T = parts[0]; nextL = parts[1]; }
        else { nextL = T; T = ''; }
        flush();
        L = nextL; V = k;
      } else if (V) {
        const combo = VOWEL_COMBO[V + k];
        if (combo && !T) V = combo;
        else { flush(); V = k; }
      } else {
        V = k; // либо после согласной, либо одиночная гласная
      }
    } else { // согласная
      if (L && V && !T) {
        if (JONG.includes(k)) T = k;
        else { flush(); L = k; }
      } else if (L && V && T) {
        const combo = FINAL_COMBO[T + k];
        if (combo) T = combo;
        else { flush(); L = k; }
      } else if (!L && V) {
        flush(); L = k;
      } else if (L && !V) {
        flush(); L = k;
      } else {
        L = k;
      }
    }
  }
  flush();
  return out;
}

// Убираем пунктуацию и лишние пробелы, приводим к одному виду.
export function normalize(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.,!?~…·"'«»“”()\[\]:;\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export const compact = (s) => normalize(s).replace(/\s/g, '');

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Похожесть 0..1 на уровне букв (чамо) — устойчиво к мелким опечаткам.
export function similarity(a, b) {
  const ja = toJamo(compact(a)), jb = toJamo(compact(b));
  const max = Math.max(ja.length, jb.length);
  if (!max) return 1;
  return 1 - levenshtein(ja, jb) / max;
}

// ---------- Романизация одиночного слога (без правил ассимиляции) ----------
const R_CHO = { 'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt', 'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's', 'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch', 'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h' };
const R_JUNG = { 'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo', 'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa', 'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo', 'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui', 'ㅣ': 'i' };
const R_JONG = { '': '', 'ㄱ': 'k', 'ㄲ': 'k', 'ㄳ': 'k', 'ㄴ': 'n', 'ㄵ': 'n', 'ㄶ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㄺ': 'k', 'ㄻ': 'm', 'ㄼ': 'l', 'ㄽ': 'l', 'ㄾ': 'l', 'ㄿ': 'p', 'ㅀ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅄ': 'p', 'ㅅ': 't', 'ㅆ': 't', 'ㅇ': 'ng', 'ㅈ': 't', 'ㅊ': 't', 'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 't' };

export function romanizeSyllable(ch) {
  const d = decomposeSyllable(ch);
  if (!d) return ch;
  return R_CHO[d.cho] + R_JUNG[d.jung] + R_JONG[d.jong];
}
