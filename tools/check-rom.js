// Аудит романизации: node tools/check-rom.js
// Строит латиницу по официальной системе RR с основными правилами произношения
// (связывание, назализация, ассимиляция ㄹ, ㅎ, палатализация) и сравнивает с латиницей в контенте.
// Расхождения — кандидаты на проверку (часть из них — допустимые исключения, например вставка ㄴ).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', 'content');

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const R_CHO = { 'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt', 'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's', 'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch', 'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h' };
const R_JUNG = { 'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo', 'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa', 'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo', 'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui', 'ㅣ': 'i' };
// Представитель конечного звука
const REP = { 'ㄱ': 'ㄱ', 'ㄲ': 'ㄱ', 'ㄳ': 'ㄱ', 'ㄺ': 'ㄱ', 'ㅋ': 'ㄱ', 'ㄴ': 'ㄴ', 'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ', 'ㄷ': 'ㄷ', 'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅎ': 'ㄷ', 'ㄹ': 'ㄹ', 'ㄼ': 'ㄹ', 'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㅀ': 'ㄹ', 'ㄻ': 'ㅁ', 'ㅁ': 'ㅁ', 'ㅂ': 'ㅂ', 'ㅍ': 'ㅂ', 'ㅄ': 'ㅂ', 'ㄿ': 'ㅂ', 'ㅇ': 'ㅇ', '': '' };
const R_FIN = { 'ㄱ': 'k', 'ㄴ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅇ': 'ng', '': '' };
const SPLIT = { 'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'] };
const ASP = { 'ㄱ': 'ㅋ', 'ㄷ': 'ㅌ', 'ㅂ': 'ㅍ', 'ㅈ': 'ㅊ' };

function decompose(word) {
  return [...word].map((ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return null;
    return { l: CHO[Math.floor(c / 588)], v: JUNG[Math.floor((c % 588) / 28)], t: JONG[c % 28] };
  });
}

function romanizeWord(word) {
  const s = decompose(word);
  if (s.some((x) => !x)) return null;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1];
    let t = a.t;
    if (!t) continue;
    // ㅎ в конце слога
    if (t === 'ㅎ' || t === 'ㄶ' || t === 'ㅀ') {
      const keep = t === 'ㅎ' ? '' : SPLIT[t][0];
      if (ASP[b.l]) { b.l = ASP[b.l]; a.t = keep; continue; }
      if (b.l === 'ㅇ') { a.t = keep; if (keep) { b.l = keep; a.t = ''; } continue; }
      if (b.l === 'ㄴ' && t === 'ㅎ') { a.t = 'ㄴ'; continue; }
      if (b.l === 'ㅅ' && t === 'ㅎ') { a.t = ''; b.l = 'ㅆ'; continue; }
      if (b.l === 'ㅊ' && t === 'ㅎ') { a.t = ''; continue; }
      a.t = keep || 'ㄷ'; t = a.t;
    }
    // ㄱ ㄷ ㅂ ㅈ + ㅎ → придыхательный
    if (b.l === 'ㅎ' && ['ㄱ', 'ㄷ', 'ㅂ', 'ㅈ', 'ㅅ'].includes(REP[t] === 'ㄷ' ? 'ㄷ' : REP[t])) {
      const r = REP[t];
      if (SPLIT[t]) { a.t = SPLIT[t][0]; } else a.t = '';
      b.l = ASP[r] || 'ㅌ';
      continue;
    }
    // палатализация
    if ((t === 'ㄷ' || t === 'ㅌ') && b.l === 'ㅇ' && b.v === 'ㅣ') { a.t = ''; b.l = t === 'ㄷ' ? 'ㅈ' : 'ㅊ'; continue; }
    // связывание
    if (b.l === 'ㅇ') {
      if (t === 'ㅇ') continue;
      if (SPLIT[t]) { a.t = SPLIT[t][0]; b.l = SPLIT[t][1]; }
      else { a.t = ''; b.l = t; }
      continue;
    }
    const r = REP[t];
    // ㄹ-ассимиляция
    if ((r === 'ㄴ' && b.l === 'ㄹ') || (r === 'ㄹ' && b.l === 'ㄴ')) { a.t = 'ㄹ'; b.l = 'ㄹ'; continue; }
    if ((r === 'ㅁ' || r === 'ㅇ') && b.l === 'ㄹ') { a.t = r; b.l = 'ㄴ'; continue; }
    if ((r === 'ㄱ' || r === 'ㅂ') && b.l === 'ㄹ') { a.t = r === 'ㄱ' ? 'ㅇ' : 'ㅁ'; b.l = 'ㄴ'; continue; }
    // назализация
    if (b.l === 'ㄴ' || b.l === 'ㅁ') {
      if (r === 'ㄱ') { a.t = 'ㅇ'; continue; }
      if (r === 'ㄷ') { a.t = 'ㄴ'; continue; }
      if (r === 'ㅂ') { a.t = 'ㅁ'; continue; }
    }
    if (t === 'ㄺ' && b.l === 'ㄱ') { a.t = 'ㄹ'; continue; }
    a.t = SPLIT[t] ? (['ㄺ', 'ㄻ', 'ㄿ'].includes(t) ? SPLIT[t][1] : SPLIT[t][0]) : t;
  }
  let out = '';
  s.forEach((x, i) => {
    let l = R_CHO[x.l];
    if (x.l === 'ㄹ' && i > 0 && s[i - 1].t === 'ㄹ') l = 'l';
    out += l + R_JUNG[x.v];
    let t = x.t;
    if (SPLIT[t]) t = ['ㄺ', 'ㄻ', 'ㄿ'].includes(t) ? SPLIT[t][1] : SPLIT[t][0];
    out += R_FIN[REP[t]];
  });
  return out;
}

function romanize(text) {
  return text.split(/(\s+|[.,!?~…'"]+)/).map((w) => (/[가-힣]/.test(w) ? (romanizeWord(w) ?? w) : w)).join('');
}
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

const items = [];
const course = JSON.parse(fs.readFileSync(path.join(root, 'course.json'), 'utf8'));
for (const uid of course.lines.flatMap((l) => l.units)) {
  const u = JSON.parse(fs.readFileSync(path.join(root, 'units', uid + '.json'), 'utf8'));
  const push = (where, ko, rom) => items.push({ where: `${uid} ${where}`, ko, rom });
  (u.phrases || []).forEach((p) => push('фраза', p[0], p[1]));
  for (const l of u.lessons) {
    (l.words || []).forEach((w) => push(l.id, w[0], w[1]));
    (l.read || []).forEach((r) => push(l.id, r[0], r[1]));
    (l.sentences || []).forEach((s) => push(l.id, s[0], s[1]));
    if (l.grammar) (l.grammar.examples || []).forEach((e) => { if (!e[0].includes('→')) push(l.id + ' пример', e[0], e[1]); });
    if (l.dialog) l.dialog.lines.forEach((x) => push(l.id + ' диалог', x[1], x[2]));
  }
}
// Законные исключения: вставка ㄴ (십육 [심뉵], 지하철역 [지하철력]), в существительных
// придыхание после ㄱ/ㄷ/ㅂ не отражается (식후 sikhu), 맛없다 [마덥따] — отдельная морфема.
const EXCEPT = ['맛없다', '십육', '지하철역', '식후', '집안일', '다운로드', '붙였'];
// Истории
try {
  const sj = JSON.parse(fs.readFileSync(path.join(root, 'stories.json'), 'utf8'));
  for (const st of sj.stories) st.lines.forEach((l) => items.push({ where: 'история ' + st.id, ko: l[1], rom: l[2] }));
} catch { /* нет историй */ }
let bad = 0;
for (const it of items) {
  const auto = romanize(it.ko);
  if (EXCEPT.some((e) => it.ko.includes(e))) continue;
  if (norm(auto) !== norm(it.rom)) { bad++; console.log(`${it.where}\n  ${it.ko}\n  в контенте: ${it.rom}\n  по правилам: ${auto}`); }
}
console.log(`\nПроверено: ${items.length}, расхождений: ${bad}`);
