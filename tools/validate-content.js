// Проверка контента: node tools/validate-content.js
// Ищет ошибки структуры, опечатки в романизации, случайные иероглифы и считает объём курса.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'content');
const errors = [];
const warns = [];
const err = (where, msg) => errors.push(`✖ ${where}: ${msg}`);
const warn = (where, msg) => warns.push(`⚠ ${where}: ${msg}`);

const HANGUL = /[가-힣]/;
const HAN_CHARS = /[一-鿿㐀-䶿]/;          // китайские иероглифы — почти всегда опечатка
const ROM_OK = /^[a-z0-9 ,.!?'"\-–—→:;()/]+$/i;              // романизация — только латиница
const RU_BAD = /[Ͱ-Ͽ]/;                            // греческие буквы вместо русских/латинских

function load(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { err(path.relative(root, file), 'JSON: ' + e.message); return null; }
}

function checkTriple(where, t, { needHangul = true } = {}) {
  if (!Array.isArray(t) || t.length < 3) return err(where, 'ожидался массив [корейский, романизация, перевод]');
  const [ko, rom, ru] = t;
  if (needHangul && !HANGUL.test(ko)) err(where, `нет хангыля: «${ko}»`);
  if (HAN_CHARS.test(ko + ru)) err(where, `китайский иероглиф: «${ko}» / «${ru}»`);
  if (!rom || !ROM_OK.test(rom)) err(where, `странная романизация: «${rom}»`);
  if (RU_BAD.test(rom + ru)) err(where, `греческие символы: «${rom}» / «${ru}»`);
  if (!ru) err(where, 'нет перевода');
  if (/[a-z]/i.test(ko)) warn(where, `латиница в корейском тексте: «${ko}»`);
}

const course = load(path.join(root, 'course.json'));
const hangul = load(path.join(root, 'hangul.json'));
const letters = new Set(hangul.letters.map((l) => l.ch));
const rules = new Set(hangul.rules.map((r) => r.id));
const voices = load(path.join(root, 'voices.json')) || { M: [], F: [] };
const known = new Set([...(voices.M || []), ...(voices.F || [])]);

const lessonIds = new Set();
const words = new Map();
let nLessons = 0, nDialogs = 0, nLines = 0, nPhrases = 0, nSentences = 0, nGrammar = 0, nDrills = 0, nRead = 0;

for (const line of course.lines) {
  for (const uid of line.units) {
    const file = path.join(root, 'units', uid + '.json');
    if (!fs.existsSync(file)) { err(uid, 'файл юнита не найден'); continue; }
    const u = load(file);
    if (!u) continue;
    if (u.id !== uid) err(uid, `id в файле «${u.id}» не совпадает с именем файла`);
    if (!u.lessons?.length) err(uid, 'нет уроков');
    (u.phrases || []).forEach((p, i) => { checkTriple(`${uid} фраза ${i + 1}`, p); nPhrases++; });
    for (const l of u.lessons || []) {
      const W = `${uid}/${l.id}`;
      nLessons++;
      if (lessonIds.has(l.id)) err(W, 'повтор id урока');
      lessonIds.add(l.id);
      if (!l.title) err(W, 'нет названия');
      if (u.kind === 'hangul') {
        (l.letters || []).forEach((c) => { if (!letters.has(c)) err(W, `неизвестная буква ${c}`); });
        (l.rules || []).forEach((r) => { if (!rules.has(r)) err(W, `неизвестное правило ${r}`); });
        (l.read || []).forEach((r, i) => { checkTriple(`${W} чтение ${i + 1}`, r); nRead++; });
        continue;
      }
      if (!l.words?.length) warn(W, 'нет слов');
      for (const w of l.words || []) {
        checkTriple(`${W} слово ${w[0]}`, w);
        const id = w[3] || w[0];
        if (words.has(id) && words.get(id).ru !== w[2]) warn(W, `слово «${id}» уже есть с другим переводом («${words.get(id).ru}» vs «${w[2]}») — добавьте 4-й элемент id`);
        if (!words.has(id)) words.set(id, { ru: w[2], where: W });
      }
      (l.sentences || []).forEach((s, i) => { checkTriple(`${W} предложение ${i + 1}`, s); nSentences++; });
      if ((l.sentences || []).length < 4) warn(W, 'меньше 4 предложений — мало упражнений на сборку');
      for (const [i, d] of (l.drills || []).entries()) {
        nDrills++;
        const D = `${W} пропуск ${i + 1}`;
        if ((d.q.match(/___/g) || []).length !== 1) err(D, 'в q должен быть ровно один пропуск ___');
        if (!d.a || !d.opts?.length) err(D, 'нужны a и opts');
        if (d.opts?.includes(d.a)) warn(D, 'правильный ответ продублирован в opts');
        if (!d.ru) err(D, 'нет перевода');
        if (HAN_CHARS.test(d.q + d.a + d.opts.join(''))) err(D, 'китайский иероглиф');
      }
      if (l.grammar) {
        nGrammar++;
        if (!l.grammar.title || !l.grammar.body?.length) err(W, 'грамматика без заголовка или текста');
        (l.grammar.examples || []).forEach((e, i) => checkTriple(`${W} пример ${i + 1}`, e));
        if (HAN_CHARS.test(JSON.stringify(l.grammar))) err(W, 'китайский иероглиф в грамматике');
      }
      if (l.dialog) {
        nDialogs++;
        for (const [i, ln] of l.dialog.lines.entries()) {
          nLines++;
          if (ln.length !== 4) err(`${W} диалог ${i + 1}`, 'реплика: [кто, корейский, романизация, перевод]');
          else checkTriple(`${W} диалог ${i + 1}`, ln.slice(1));
          if (!known.has(ln[0])) warn(W, `персонаж «${ln[0]}» не указан в content/voices.json — будет женский голос`);
        }
      } else warn(W, 'нет диалога');
    }
  }
}

console.log(`\nКурс: ${nLessons} уроков, ${words.size} слов (без уроков хангыля), ${nRead} слов для чтения в хангыле,`);
console.log(`      ${nGrammar} тем грамматики, ${nDialogs} диалогов (${nLines} реплик), ${nPhrases} фраз разговорника,`);
console.log(`      ${nSentences} предложений, ${nDrills} упражнений на пропуск.\n`);
warns.forEach((w) => console.log(w));
errors.forEach((e) => console.log(e));
console.log(errors.length ? `\nОшибок: ${errors.length}` : '\n✔ Ошибок нет');
process.exit(errors.length ? 1 : 0);
