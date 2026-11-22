// Генерация естественной озвучки для всего курса нейроголосами Microsoft (через msedge-tts).
// Запуск из корня проекта:  node tools/tts/generate.mjs
// Уже созданные файлы пропускаются, поэтому после добавления уроков скрипт можно просто запустить снова.
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICES, audioKey, speechText, dialogVoices, tokenize } from '../../js/core/audiokey.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

// ---------- 1. Собираем все тексты ----------
const items = new Map(); // key → { voice, text }
const add = (voice, text) => {
  const t = speechText(text);
  if (!t || !/[가-힣]/.test(t)) return;
  const key = voice + '/' + audioKey(voice, t);
  if (!items.has(key)) items.set(key, { voice, text: t, file: path.join(root, 'audio', voice, audioKey(voice, t) + '.mp3') });
};

const course = read('content/course.json');
const hangul = read('content/hangul.json');
const genders = read('content/voices.json');

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const BASE_V = ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅑ', 'ㅕ', 'ㅛ', 'ㅠ'];
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
for (const c of CHO) for (const v of BASE_V) add('F', String.fromCharCode(0xac00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28));
for (const L of hangul.letters) { add('F', L.say); if (L.name) add('F', L.name); if (L.example) add('F', L.example[0]); }
for (const r of hangul.rules) for (const e of r.examples || []) add('F', e[0]);

for (const uid of course.lines.flatMap((l) => l.units)) {
  const u = read(`content/units/${uid}.json`);
  (u.phrases || []).forEach((p) => add('F', p[0]));
  for (const l of u.lessons) {
    (l.words || []).forEach((w) => add('F', w[0]));
    for (const r of l.read || []) { add('F', r[0]); for (const ch of r[0]) add('F', ch); }
    (l.pairs || []).flat().forEach((s) => add('F', s));
    for (const s of l.sentences || []) { add('F', s[0]); tokenize(s[0]).forEach((t) => add('F', t)); }
    (l.drills || []).forEach((d) => { add('F', d.q.replace('___', d.a)); add('F', d.a); d.opts.forEach((o) => add('F', o)); });
    if (l.grammar) (l.grammar.examples || []).forEach((e) => add('F', e[0]));
    if (l.dialog) {
      const lines = l.dialog.lines.map((x) => ({ who: x[0], ko: x[1] }));
      const vm = dialogVoices(lines, genders);
      lines.forEach((x) => add(vm.get(x.who), x.ko));
    }
  }
}
// Истории: рассказчик — отдельный голос, персонажи — по полу
const NARRATOR = 'M2';
try {
  const sj = read('content/stories.json');
  for (const st of sj.stories || []) {
    const lines = st.lines.map((x) => ({ who: x[0], ko: x[1] }));
    const vm = dialogVoices(lines.filter((x) => x.who), genders);
    lines.forEach((x) => add(x.who ? vm.get(x.who) : NARRATOR, x.ko));
  }
} catch { /* историй нет */ }
// Вывески
try { for (const x of read('content/signs.json').signs || []) add('F', x[0]); } catch { /* нет вывесок */ }
// Фразы из интерфейса
['안녕하세요', '안녕하세요! 만나서 반갑습니다.', '좋아요! 잘했어요!'].forEach((t) => add('F', t));

const all = [...items.values()];
const todo = all.filter((it) => !fs.existsSync(it.file));
console.log(`Всего фраз: ${all.length}, нужно озвучить: ${todo.length}`);

// ---------- 2. Озвучиваем ----------
async function worker(queue, id) {
  let tts = null, current = null;
  const connect = async (voice) => {
    try { tts?.close(); } catch { /* ignore */ }
    tts = new MsEdgeTTS();
    await tts.setMetadata(VOICES[voice].name, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    current = voice;
  };
  while (queue.length) {
    const it = queue.shift();
    const v = VOICES[it.voice];
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        if (!tts || VOICES[current].name !== v.name) await connect(it.voice);
        const opts = {};
        if (v.pitch) opts.pitch = v.pitch;
        if (v.rate) opts.rate = v.rate;
        const { audioStream } = tts.toStream(it.text, opts);
        const chunks = [];
        await new Promise((res, rej) => {
          audioStream.on('data', (c) => chunks.push(c));
          audioStream.on('end', res);
          audioStream.on('error', rej);
        });
        const buf = Buffer.concat(chunks);
        if (buf.length < 1500) throw new Error('слишком короткий ответ');
        fs.mkdirSync(path.dirname(it.file), { recursive: true });
        fs.writeFileSync(it.file, buf);
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${todo.length}`);
        break;
      } catch (e) {
        tts = null;
        if (attempt === 4) { failed.push(it.text); console.warn(`  ✖ ${it.text}: ${e.message || e}`); }
        else await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }
  try { tts?.close(); } catch { /* ignore */ }
}

let done = 0;
const failed = [];
// Группируем по голосу, чтобы реже переподключаться.
const queue = [...todo].sort((a, b) => a.voice.localeCompare(b.voice));
await Promise.all([1, 2, 3, 4].map((i) => worker(queue, i)));

// ---------- 3. Индекс ----------
const index = { v: 1 };
for (const voice of Object.keys(VOICES)) {
  const dir = path.join(root, 'audio', voice);
  index[voice] = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, 8)).sort() : [];
}
fs.writeFileSync(path.join(root, 'audio', 'index.json'), JSON.stringify(index));
const size = Object.keys(VOICES).reduce((s, v) => s + index[v].reduce((a, h) => a + fs.statSync(path.join(root, 'audio', v, h + '.mp3')).size, 0), 0);
console.log(`Готово: озвучено ${done}, ошибок ${failed.length}. Файлов: ${Object.keys(VOICES).map((v) => v + '=' + index[v].length).join(', ')}, объём ${(size / 1048576).toFixed(1)} МБ`);
process.exit(failed.length ? 1 : 0);
