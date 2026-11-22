// Генератор упражнений. Контент в JSON описывает только «что учим»
// (слова, предложения, пропуски, буквы), а упражнения строятся здесь автоматически.
// Каждое упражнение — простой JSON-объект: его можно сохранить в «ошибки» и показать снова.

import { units, lessons, hangul, lessonWords, unitWords, allMainWords, lettersUpTo, emojiOf } from '../core/content.js';
import { state } from '../core/store.js';
import { shuffle, sample, distractors, uniqueBy } from '../core/utils.js';
import { decomposeSyllable, romanizeSyllable, isSyllable, CHO, JUNG } from '../core/hangul.js';
import { lessonDone } from '../core/game.js';

const reveal = (x) => ({ ko: x.ko, rom: x.rom, ru: x.ru });
export const tokenize = (ko) => ko.replace(/[.,!?~…]/g, '').split(/\s+/).filter(Boolean);

// ---------- Слова и предложения ----------
function wordPool(unit, lesson) {
  const first = lesson ? shuffle(lessonWords(lesson)) : [];
  const own = shuffle(unitWords(unit));
  const rest = shuffle(allMainWords()).slice(0, 30);
  const pool = uniqueBy([...first, ...own, ...rest], (w) => w.id);
  pool.tiers = [first, own, rest];
  return pool;
}
// Обманки: если пул упорядочен (сначала слова урока), берём по порядку, иначе — случайно.
function pickWrong(w, pool, key) {
  if (!pool.tiers) return distractors(w, pool, 3, key);
  const seen = new Set([key(w)]), out = [];
  for (const tier of pool.tiers) for (const x of shuffle(tier)) {
    const k = key(x);
    if (out.length < 3 && !seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

export function exChoiceKoRu(w, pool, unitId) {
  const opts = shuffle([w, ...pickWrong(w, pool, (x) => x.ru)]).map((x) => ({ t: x.ru, em: emojiOf(x) }));
  return { type: 'choice', key: 'kr:' + w.id, unitId, instr: 'Что это значит?', q: { ko: w.ko, rom: w.rom, audio: w.ko }, opts, ans: w.ru, reveal: reveal(w), wordId: w.id };
}
export function exChoiceRuKo(w, pool, unitId) {
  const opts = shuffle([w, ...pickWrong(w, pool, (x) => x.ko)]).map((x) => ({ t: x.ko, sub: x.rom }));
  return { type: 'choice', key: 'rk:' + w.id, unitId, instr: 'Как сказать по-корейски?', q: { ru: w.ru, emoji: emojiOf(w) }, opts, ans: w.ko, reveal: reveal(w), wordId: w.id };
}
// Карточка нового слова (без оценки): картинка, слово, звук, пример из урока.
export function exLearn(w, lesson, unitId) {
  const stem = w.ko.replace(/다$/, '');
  const ex = lesson.sentences.find((s) => s.ko.includes(stem)) || null;
  return { type: 'learn', key: 'learn:' + w.id, unitId, instr: 'Знакомьтесь!', ko: w.ko, rom: w.rom, ru: w.ru, emoji: emojiOf(w), example: ex, noMistake: true };
}
// Обратный перевод (как в English Galaxy): корейская фраза → собрать русский перевод из слов.
export const tokenizeRu = (ru) => ru.replace(/[.,!?…«»"—–:;()]/g, ' ').split(/\s+/).filter(Boolean);
export function exBuildRu(s, ruPool, unitId) {
  const answer = tokenizeRu(s.ru);
  const low = answer.map((t) => t.toLowerCase());
  const extras = distractors(null, ruPool.filter((t) => !low.includes(t.toLowerCase())), 2, (t) => t.toLowerCase());
  return {
    type: 'build', lang: 'ru', key: 'br:' + s.ko, unitId, instr: 'Переведите на русский',
    q: { ko: s.ko, rom: s.rom, audio: s.ko }, answer, tiles: shuffle([...answer, ...extras]), reveal: { ko: s.ko, rom: s.rom, ru: s.ru },
  };
}
export function exListenChoice(w, pool, unitId) {
  const opts = shuffle([w, ...pickWrong(w, pool, (x) => x.ko)]).map((x) => ({ t: x.ko, sub: x.ru }));
  return { type: 'choice', key: 'lc:' + w.id, unitId, instr: 'Что вы слышите?', q: { audio: w.ko, hideText: true }, opts, ans: w.ko, reveal: reveal(w), hideSubUntilAnswer: true, wordId: w.id };
}
export function exMatch(ws, unitId) {
  return { type: 'match', key: 'm:' + ws.map((w) => w.id).join(','), unitId, instr: 'Соедините пары', pairs: ws.map((w) => [w.ko, w.ru]) };
}
export function exFill(d, unitId) {
  const full = d.q.replace('___', d.a);
  return {
    type: 'fill', key: 'f:' + full, unitId, instr: 'Вставьте пропущенное', q: d.q, ru: d.ru, opts: shuffle(uniqueBy([d.a, ...d.opts], (x) => x)),
    ans: d.a, hint: d.hint || '', reveal: { ko: full, rom: d.rom || '', ru: d.ru },
  };
}
export function exBuild(s, extraTokens, unitId, listen = false) {
  const answer = tokenize(s.ko);
  const extras = distractors(null, extraTokens.filter((t) => !answer.includes(t)), answer.length > 4 ? 2 : 1);
  return {
    type: 'build', key: (listen ? 'lb:' : 'b:') + s.ko, unitId,
    instr: listen ? 'Соберите то, что услышали' : 'Переведите на корейский',
    q: listen ? { audio: s.ko, hideText: true } : { ru: s.ru, audio: s.ko },
    answer, tiles: shuffle([...answer, ...extras]), reveal: reveal(s),
  };
}
export function exType(w, unitId) {
  return { type: 'type', key: 't:' + w.id, unitId, instr: 'Напишите по-корейски', q: { ru: w.ru, audio: w.ko }, answer: w.ko, reveal: reveal(w), wordId: w.id };
}
export function exSpeak(s, unitId) {
  return { type: 'speak', key: 's:' + s.ko, unitId, instr: 'Скажите вслух', ko: s.ko, rom: s.rom, ru: s.ru, noMistake: true, reveal: reveal(s) };
}

const shortWords = (ws) => ws.filter((w) => [...w.ko.replace(/\s/g, '')].length <= 4 && !/[^가-힣\s]/.test(w.ko));

// Урок строится как у лучших приложений: сначала знакомство со словами небольшими порциями
// (карточка → сразу практика), потом грамматика, сборка фраз в обе стороны, письмо и речь.
export function genWordLesson(lesson, { intro = !lessonDone(lesson.id) } = {}) {
  const unit = units.get(lesson.unitId);
  const uid = unit.id;
  const W = lessonWords(lesson);
  const pool = wordPool(unit, lesson);
  const ex = [];
  const kinds = [exChoiceKoRu, exListenChoice, exChoiceRuKo];
  let k = 0;
  for (let i = 0; i < W.length; i += 3) {
    const chunk = W.slice(i, i + 3);
    if (intro) chunk.forEach((w) => ex.push(exLearn(w, lesson, uid)));
    shuffle(chunk).forEach((w) => ex.push(kinds[k++ % kinds.length](w, pool, uid)));
  }
  if (W.length >= 4) ex.push(exMatch(sample(W, Math.min(5, W.length)), uid));
  lesson.drills.forEach((d) => ex.push(exFill(d, uid)));
  const S = shuffle(lesson.sentences);
  const extra = unit.lessons.flatMap((l) => l.sentences).flatMap((s) => tokenize(s.ko));
  const ruPool = unit.lessons.flatMap((l) => l.sentences).flatMap((s) => tokenizeRu(s.ru));
  const buildable = S.filter((s) => tokenize(s.ko).length >= 2);
  const ruBuildable = S.filter((s) => { const n = tokenizeRu(s.ru).length; return n >= 2 && n <= 6; });
  buildable.slice(0, 2).forEach((s) => ex.push(exBuild(s, extra, uid)));
  ruBuildable.filter((s) => !buildable.slice(0, 2).includes(s)).slice(0, 2).forEach((s) => ex.push(exBuildRu(s, ruPool, uid)));
  if (buildable[2]) ex.push(exBuild(buildable[2], extra, uid, true));
  if (buildable[3]) ex.push(exBuild(buildable[3], extra, uid));
  const tw = shortWords(shuffle(W));
  tw.slice(0, 2).forEach((w) => ex.push(exType(w, uid)));
  const sp = S.find((s) => !buildable.slice(0, 2).includes(s)) || S[0];
  if (sp && state.settings.speak) ex.push(exSpeak(sp, uid));
  return ex;
}

// ---------- Хангыль ----------
const letterOf = (ch) => hangul.byChar.get(ch);

function exLetterSound(L, known, unitId) {
  const opts = shuffle([L, ...distractors(L, known, 3, (x) => x.rom)]).map((x) => ({ t: x.rom, sub: x.ru }));
  return { type: 'choice', key: 'hs:' + L.ch, unitId, instr: 'Как читается эта буква?', q: { ko: L.ch, big: true, audio: L.say }, opts, ans: L.rom, noRom: true, reveal: { ko: L.ch, rom: L.rom, ru: L.hint, say: L.say } };
}
function exLearnLetter(L, unitId) {
  return { type: 'learn', letter: true, key: 'learnL:' + L.ch, unitId, instr: 'Знакомьтесь!', ko: L.ch, rom: L.rom, ru: L.ru, hint: L.hint, say: L.say, name: L.name, example: L.example ? { ko: L.example[0], rom: L.example[1], ru: L.example[2] } : null, noMistake: true };
}
function exLetterListen(L, known, unitId) {
  const opts = shuffle([L, ...distractors(L, known, 3, (x) => x.ch)]).map((x) => ({ t: x.ch, big: true }));
  return { type: 'choice', key: 'hl:' + L.ch, unitId, instr: 'Какую букву вы слышите?', q: { audio: L.say, hideText: true }, opts, ans: L.ch, reveal: { ko: L.ch, rom: L.rom, ru: L.hint, say: L.say } };
}
function exRead(r, pool, unitId) {
  const opts = shuffle([r, ...distractors(r, pool, 3, (x) => x.rom)]).map((x) => ({ t: x.rom }));
  return { type: 'choice', key: 'hr:' + r.ko, unitId, instr: 'Прочитайте слово', q: { ko: r.ko, audio: r.ko, audioAfter: true }, opts, ans: r.rom, noRom: true, reveal: r };
}
function exReadListen(r, pool, unitId) {
  const opts = shuffle([r, ...distractors(r, pool, 3, (x) => x.ko)]).map((x) => ({ t: x.ko }));
  return { type: 'choice', key: 'hw:' + r.ko, unitId, instr: 'Какое слово прозвучало?', q: { audio: r.ko, hideText: true }, opts, ans: r.ko, reveal: r };
}
function exPron(r, pool, unitId) {
  const ans = `[${r.pron}]`;
  let wrong = (r.wrong || []).map((w) => `[${w}]`);
  if (r.pron !== r.ko) wrong.unshift(`[${r.ko}]`);
  wrong = uniqueBy(wrong.filter((w) => w !== ans), (x) => x);
  if (wrong.length < 2) wrong.push(...distractors(ans, pool.filter((x) => x.pron).map((x) => `[${x.pron}]`).filter((x) => !wrong.includes(x)), 2 - wrong.length));
  const opts = shuffle([ans, ...wrong.slice(0, 3)]).map((t) => ({ t }));
  return { type: 'choice', key: 'hp:' + r.ko, unitId, instr: 'Как это произносится?', q: { ko: r.ko, audio: r.ko, audioAfter: true }, opts, ans, noRom: true, reveal: { ko: `${r.ko} → [${r.pron}]`, rom: r.rom, ru: r.ru } };
}
function exTrace(L, unitId) {
  return { type: 'trace', key: 'tr:' + L.ch, unitId, instr: 'Обведите букву', ch: L.ch, rom: L.rom, name: L.name, say: L.say, strokesHint: L.strokes || '', noMistake: true };
}
function exCompose(syl, known, unitId) {
  const d = decomposeSyllable(syl);
  const parts = [d.cho, d.jung, d.jong].filter(Boolean);
  const pool = known.map((x) => x.ch).filter((c) => !parts.includes(c) && (CHO.includes(c) || JUNG.includes(c)));
  const tiles = shuffle([...parts, ...sample(pool, 3)]);
  return { type: 'compose', key: 'hc:' + syl, unitId, instr: 'Соберите слог', target: syl, rom: romanizeSyllable(syl), tiles, reveal: { ko: syl, rom: romanizeSyllable(syl), ru: parts.join(' + ') } };
}
function exMinimal(group, unitId) {
  const target = group[Math.floor(Math.random() * group.length)];
  return { type: 'choice', key: 'hm:' + target, unitId, instr: 'Что прозвучало?', q: { audio: target, hideText: true }, opts: group.map((t) => ({ t, big: true })), ans: target, reveal: { ko: target, rom: romanizeSyllable(target), ru: 'Обычный, придыхательный и напряжённый звуки' } };
}

function syllablesFor(lesson, letters) {
  const set = new Set(letters);
  const out = [];
  for (const r of lesson.read) for (const ch of r.ko) {
    if (!isSyllable(ch)) continue;
    const d = decomposeSyllable(ch);
    if (set.has(d.cho) || set.has(d.jung) || (d.jong && set.has(d.jong))) out.push(ch);
  }
  return [...new Set(out)];
}

export function genHangulLesson(lesson, { intro = !lessonDone(lesson.id) } = {}) {
  const uid = lesson.unitId;
  const L = lesson.letters.map(letterOf).filter(Boolean);
  const known = lettersUpTo(lesson.id).map(letterOf).filter(Boolean);
  const knownSame = (l) => known.filter((k) => k.type === l.type);
  const reads = lesson.read;
  const readPool = uniqueBy([...reads, ...[...lessons.values()].filter((x) => x.kind === 'hangul').flatMap((x) => x.read)], (x) => x.ko);
  const ex = [];
  // Каждая новая буква: карточка-знакомство, затем сразу вопрос на её звук.
  (intro ? L : shuffle(L)).forEach((l) => {
    if (intro) ex.push(exLearnLetter(l, uid));
    ex.push(exLetterSound(l, knownSame(l).length >= 4 ? knownSame(l) : known, uid));
  });
  shuffle(L).slice(0, 4).forEach((l) => ex.push(exLetterListen(l, knownSame(l).length >= 4 ? knownSame(l) : known, uid)));
  lesson.pairs.forEach((g) => ex.push(exMinimal(g, uid)));
  L.slice(0, 2).forEach((l) => ex.push(exTrace(l, uid)));
  sample(syllablesFor(lesson, lesson.letters), 2).forEach((s) => ex.push(exCompose(s, known, uid)));
  // В уроках без новых букв (правила чтения) упражнений на чтение больше.
  const many = !L.length;
  shuffle(reads.filter((r) => r.pron)).slice(0, many ? 8 : 5).forEach((r) => ex.push(exPron(r, readPool, uid)));
  shuffle(reads.filter((r) => !r.pron)).slice(0, many ? 6 : 3).forEach((r) => ex.push(exRead(r, readPool, uid)));
  shuffle(reads).slice(0, 2).forEach((r) => ex.push(exReadListen(r, readPool, uid)));
  return ex;
}

export const genLesson = (lesson) => (lesson.kind === 'hangul' ? genHangulLesson(lesson) : genWordLesson(lesson));

// ---------- Итоговый тест юнита ----------
export function genUnitTest(unit) {
  if (unit.kind === 'hangul') {
    const all = unit.lessons.flatMap((l) => genHangulLesson(l, { intro: false })).filter((e) => e.type !== 'trace');
    return markTest(sample(all, 15));
  }
  const uid = unit.id;
  const W = shuffle(unitWords(unit));
  const pool = wordPool(unit);
  const ex = [];
  W.slice(0, 2).forEach((w) => ex.push(exChoiceKoRu(w, pool, uid)));
  W.slice(2, 4).forEach((w) => ex.push(exChoiceRuKo(w, pool, uid)));
  W.slice(4, 6).forEach((w) => ex.push(exListenChoice(w, pool, uid)));
  ex.push(exMatch(W.slice(6, 11), uid));
  sample(unit.lessons.flatMap((l) => l.drills), 3).forEach((d) => ex.push(exFill(d, uid)));
  const S = shuffle(unit.lessons.flatMap((l) => l.sentences).filter((s) => tokenize(s.ko).length >= 2));
  const extra = S.flatMap((s) => tokenize(s.ko));
  S.slice(0, 3).forEach((s) => ex.push(exBuild(s, extra, uid)));
  if (S[3]) ex.push(exBuild(S[3], extra, uid, true));
  shortWords(W.slice(11)).slice(0, 2).forEach((w) => ex.push(exType(w, uid)));
  return markTest(ex);
}
const markTest = (ex) => ex.map((e) => ({ ...e, test: true }));

// ---------- Свободная практика ----------
export function genPractice(n = 12) {
  const done = [...lessons.values()].filter((l) => lessonDone(l.id) && l.kind !== 'hangul');
  const src = done.length ? done : [[...lessons.values()].find((l) => l.kind !== 'hangul')];
  const all = shuffle(src).slice(0, 6).flatMap((l) => genWordLesson(l, { intro: false })).filter((e) => e.type !== 'speak' || state.settings.speak);
  return sample(all, n);
}

export function genHangulQuiz(n = 12) {
  const done = [...lessons.values()].filter((l) => l.kind === 'hangul' && lessonDone(l.id));
  const src = done.length ? done : [...lessons.values()].filter((l) => l.kind === 'hangul').slice(0, 3);
  const all = src.flatMap((l) => genHangulLesson(l, { intro: false })).filter((e) => e.type !== 'trace');
  return sample(all, n);
}

// ---------- Тренировка одной грамматической темы ----------
export function genGrammarPractice(lesson) {
  const unit = units.get(lesson.unitId);
  const uid = unit.id;
  const extra = unit.lessons.flatMap((l) => l.sentences).flatMap((s) => tokenize(s.ko));
  const ruPool = unit.lessons.flatMap((l) => l.sentences).flatMap((s) => tokenizeRu(s.ru));
  const S = shuffle(lesson.sentences).filter((s) => tokenize(s.ko).length >= 2);
  const ex = [
    ...lesson.drills.map((d) => exFill(d, uid)),
    ...S.slice(0, 3).map((s) => exBuild(s, extra, uid)),
    ...S.slice(3, 5).filter((s) => tokenizeRu(s.ru).length <= 6).map((s) => exBuildRu(s, ruPool, uid)),
  ];
  // примеры из объяснения — тоже на сборку
  (lesson.grammar?.examples || []).filter((e) => !e.ko.includes('→') && tokenize(e.ko).length >= 2).slice(0, 2)
    .forEach((e) => ex.push(exBuild(e, extra, uid, true)));
  return shuffle(ex);
}
