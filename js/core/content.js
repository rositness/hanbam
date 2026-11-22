// Загрузка и индексация контента из JSON-файлов в /content.
// Компактный формат JSON (массивы) разворачивается здесь в удобные объекты.

export const course = { data: null };
export const hangul = { letters: [], byChar: new Map(), rules: [], groups: [] };
export const units = new Map();
export const lessons = new Map();
export const words = new Map();       // id → слово
export const grammar = [];            // все грамматические темы
export const dialogs = new Map();     // id → диалог
export const phrases = [];            // разговорник
export const genders = { M: [], F: [] }; // пол участников диалогов (для голосов)
export const emoji = new Map();       // слово → картинка-эмодзи
// Принимает слово-объект (сначала ищем по id — для омонимов) или строку.
export const stories = [];           // истории для чтения
export const emojiOf = (w) => (typeof w === 'string' ? emoji.get(w) : emoji.get(w.id) || (w.id === w.ko || String(w.id).startsWith('h:') ? emoji.get(w.ko) : '')) || '';
const lineNodes = new Map();          // lineId → [узлы]

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Не удалось загрузить ${url}: ${r.status}`);
  return r.json();
}

const triple = (a) => ({ ko: a[0], rom: a[1] || '', ru: a[2] || '' });

export async function loadContent() {
  course.data = await getJSON('content/course.json');
  const hj = await getJSON('content/hangul.json');
  hangul.letters = hj.letters;
  hangul.rules = hj.rules || [];
  hangul.groups = hj.groups || [];
  hangul.letters.forEach((l) => hangul.byChar.set(l.ch, l));
  const [vj, ej, sj] = await Promise.all([getJSON('content/voices.json').catch(() => ({})), getJSON('content/emoji.json').catch(() => ({})), getJSON('content/stories.json').catch(() => ({ stories: [] }))]);
  stories.length = 0;
  for (const st of sj.stories || []) stories.push({ ...st, lines: st.lines.map((l) => ({ who: l[0], ko: l[1], rom: l[2], ru: l[3] })), questions: st.questions || [] });
  genders.M = vj.M || []; genders.F = vj.F || [];
  for (const [k, v] of Object.entries(ej)) if (!k.startsWith('_')) emoji.set(k, v);

  const ids = course.data.lines.flatMap((l) => l.units);
  const results = await Promise.allSettled(ids.map((id) => getJSON(`content/units/${id}.json`)));
  const files = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') files[ids[i]] = r.value;
    else console.warn('Юнит не загружен:', ids[i], r.reason);
  });
  // Юниты, которые не удалось загрузить, просто не показываем.
  for (const line of course.data.lines) line.units = line.units.filter((u) => files[u]);
  course.data.lines = course.data.lines.filter((l) => l.units.length);
  let order = 0;
  for (const line of course.data.lines) {
    const nodes = [];
    for (const uid of line.units) {
      const raw = files[uid];
      const unit = normalizeUnit(raw, line, order++);
      units.set(unit.id, unit);
      unit.lessons.forEach((l) => nodes.push({ type: 'lesson', id: l.id, unitId: unit.id }));
      nodes.push({ type: 'test', id: unit.id, unitId: unit.id });
    }
    lineNodes.set(line.id, nodes);
  }
}

function normalizeUnit(raw, line, order) {
  const unit = {
    id: raw.id, kind: raw.kind || 'words', title: raw.title, ko: raw.ko || '', icon: raw.icon || '•',
    description: raw.description || '', lineId: line.id, color: line.color, order,
    lessons: [], phrases: (raw.phrases || []).map(triple),
  };
  unit.phrases.forEach((p) => phrases.push({ ...p, unitId: unit.id }));
  raw.lessons.forEach((rl, i) => {
    const lesson = {
      id: rl.id, title: rl.title, goal: rl.goal || '', index: i, unitId: unit.id, kind: unit.kind,
      theory: rl.theory || [],
      letters: rl.letters || [],
      rules: rl.rules || [],
      pairs: rl.pairs || [],
      read: (rl.read || []).map((a) => ({ ...triple(a), pron: a[3] || '', wrong: a[4] || [] })),
      words: [],
      sentences: (rl.sentences || []).map(triple),
      drills: rl.drills || [],
      grammar: null,
      dialog: null,
    };
    for (const w of rl.words || []) {
      const id = w[3] || w[0];
      if (!words.has(id)) words.set(id, { id, ko: w[0], rom: w[1], ru: w[2], unitId: unit.id, lessonId: lesson.id });
      if (!w[3]) words.delete('h:' + w[0]); // то же слово из уроков хангыля больше не дублируем
      lesson.words.push(id);
    }
    if (unit.kind === 'hangul') {
      for (const r of lesson.read) {
        const id = 'h:' + r.ko;
        if (!words.has(r.ko) && !words.has(id)) words.set(id, { id, ko: r.ko, rom: r.rom, ru: r.ru, unitId: unit.id, lessonId: lesson.id, hangulOnly: true });
      }
    }
    if (rl.grammar) {
      lesson.grammar = {
        id: rl.grammar.id || 'g-' + lesson.id, title: rl.grammar.title, body: rl.grammar.body || [],
        examples: (rl.grammar.examples || []).map(triple), note: rl.grammar.note || '',
        unitId: unit.id, lessonId: lesson.id,
      };
      grammar.push(lesson.grammar);
    }
    if (rl.dialog) {
      lesson.dialog = {
        id: 'd-' + lesson.id, title: rl.dialog.title, scene: rl.dialog.scene || '', unitId: unit.id, lessonId: lesson.id,
        lines: rl.dialog.lines.map((l) => ({ who: l[0], ko: l[1], rom: l[2], ru: l[3] })),
      };
      dialogs.set(lesson.dialog.id, lesson.dialog);
    }
    lessons.set(lesson.id, lesson);
    unit.lessons.push(lesson);
  });
  return unit;
}

export function unitOrder() { return course.data ? course.data.lines.flatMap((l) => l.units) : []; }
export const getLine = (id) => course.data.lines.find((l) => l.id === id);
export const nodesOf = (lineId) => lineNodes.get(lineId) || [];
export const unitWords = (unit) => [...new Set(unit.lessons.flatMap((l) => l.words))].map((id) => words.get(id));
export const lessonWords = (lesson) => lesson.words.map((id) => words.get(id)).filter(Boolean);
export const allMainWords = () => [...words.values()].filter((w) => !w.hangulOnly);

// Буквы, изученные к данному уроку хангыля включительно (для дистракторов).
export function lettersUpTo(lessonId) {
  const out = [];
  for (const uid of getLine('L0').units) {
    for (const l of units.get(uid).lessons) {
      out.push(...l.letters);
      if (l.id === lessonId) return [...new Set(out)];
    }
  }
  return [...new Set(out)];
}
