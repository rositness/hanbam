// Сквозной автотест всего курса в Chrome без окна: node tools/e2e.mjs
//   node tools/e2e.mjs            — все уроки, итоговые тесты, истории и вывески
//   node tools/e2e.mjs u17 u18    — только уроки/тесты указанных юнитов
// Проходит каждое занятие правильными ответами (с намеренными ошибками) через tools/autoplay.js
// и сообщает, где занятие не дошло до экрана итогов или в консоли была ошибка JavaScript.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5199, CDP = 9345;
const filter = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!chrome) { console.error('Не найден Chrome/Edge'); process.exit(2); }

const server = spawn(process.execPath, [path.join(root, 'tools/serve.js'), String(PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-e2e-'));
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { browser.kill(); } catch { /* */ } try { server.kill(); } catch { /* */ } };
process.on('exit', cleanup);

let ws, id = 0; const pending = new Map(); const jsErrors = [];
for (let i = 0; i < 60 && !ws; i++) {
  try { const ctl = new AbortController(); setTimeout(() => ctl.abort(), 1000); const page = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`, { signal: ctl.signal })).json()).find((t) => t.type === 'page'); if (page) ws = new WebSocket(page.webSocketDebuggerUrl); } catch { /* ждём */ }
  await sleep(250);
}
if (!ws) { console.error('Не удалось подключиться к Chrome'); cleanup(); process.exit(2); }
if (ws.readyState !== 1) await new Promise((r) => ws.addEventListener('open', r));
console.log('Chrome запущен');
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0] || 'exception');
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const run = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: `http://localhost:${PORT}/` }); await sleep(2500);
await run(`(async () => { const st = await import('/js/core/store.js'); st.update('meta', m => { m.onboarded = true; }); st.update('settings', s => { s.unlockAll = true; s.sound = false; s.autoplay = false; s.speak = true; }); await st.flush(); return 1; })()`);
await send('Page.reload'); await sleep(2500);
console.log('Приложение загружено');

const plan = await run(`(async () => { const c = await import('/js/core/content.js'); return { lessons: [...c.lessons.keys()], units: [...c.units.keys()], stories: c.stories.map(s => s.id) }; })()`);
const match = (id) => !filter.length || filter.some((f) => id === f || id.startsWith(f + '-'));
const items = [
  ...plan.lessons.filter(match).map((x) => ({ kind: 'lesson', id: x })),
  ...plan.units.filter(match).map((x) => ({ kind: 'test', id: x })),
  ...(filter.length ? [] : plan.stories.map((x) => ({ kind: 'story', id: x }))),
  ...(filter.length ? [] : [{ kind: 'signs', id: 'signs' }]),
];

const STEP = `
const sleep = ms => new Promise(r => setTimeout(r, ms));
const m = await import('/tools/autoplay.js');
async function startButton(re) { for (let k = 0; k < 40; k++) { const b = [...document.querySelectorAll('button')].find(x => re.test(x.textContent)); if (b) return b; await sleep(150); } return null; }
`;
const scripts = {
  lesson: (x) => `(async () => { ${STEP} location.hash = '/lesson/${x}'; const b = await startButton(/Начать упражнения/); if (!b) return 'нет кнопки старта'; b.click(); await sleep(400);
    await m.autoplay({ delay: 25, wrongEvery: 7, max: 200 }); const sk = [...document.querySelectorAll('button')].find(b => /Пропустить диалог/.test(b.textContent)); if (sk) { sk.click(); await sleep(300); }
    return document.querySelector('.result') ? 'ok' : 'не дошёл до итогов (' + (window.__hbEx?.type || '?') + ')'; })()`,
  test: (x) => `(async () => { ${STEP} location.hash = '/test/${x}'; const b = await startButton(/Начать тест/); if (!b) return 'нет кнопки старта'; b.click(); await sleep(400);
    await m.autoplay({ delay: 25, wrongEvery: 9, max: 120 }); return document.querySelector('.result') ? 'ok' : 'не дошёл до итогов'; })()`,
  story: (x) => `(async () => { ${STEP} location.hash = '/story/${x}'; await sleep(900);
    for (let i = 0; i < 60; i++) { if (document.querySelector('.result')) break; const btn = document.querySelector('.session-foot .btn');
      if (btn && !btn.disabled) { btn.click(); await sleep(120); continue; } await sleep(950);
      const q = [...document.querySelectorAll('.story-q')].pop(); if (q && !q.dataset.done) for (const o of q.querySelectorAll('.option')) { o.click(); await sleep(50); if (q.dataset.done) break; } }
    return document.querySelector('.result') ? 'ok' : 'не дошла до конца'; })()`,
  signs: () => `(async () => { ${STEP} location.hash = '/review/practice?signs=1'; await sleep(1000); await m.autoplay({ delay: 25, max: 60 }); return document.querySelector('.result') ? 'ok' : 'не дошли до итогов'; })()`,
};

console.log(`Проверяю: ${items.length} занятий…`);
const fails = [];
let n = 0;
for (const it of items) {
  const before = jsErrors.length;
  let res;
  try { res = await run(scripts[it.kind](it.id)); } catch (e) { res = 'сбой: ' + e.message; }
  const errs = jsErrors.slice(before);
  n++;
  const ok = res === 'ok' && !errs.length;
  if (!ok) fails.push(`${it.kind} ${it.id}: ${res}${errs.length ? ' | JS: ' + errs.join('; ') : ''}`);
  process.stdout.write(ok ? '.' : 'F');
  if (n % 50 === 0) process.stdout.write(` ${n}\n`);
}
console.log(`\n\nГотово: ${n - fails.length}/${n} без ошибок.`);
fails.forEach((f) => console.log('✖ ' + f));
cleanup();
process.exit(fails.length ? 1 : 0);
