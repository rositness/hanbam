// Автотест для отладки: проходит текущую сессию упражнений правильными ответами.
// Использование в консоли браузера на странице урока (после «Начать упражнения»):
//   const m = await import('/tools/autoplay.js'); await m.autoplay({ wrongEvery: 0 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $$ = (s) => [...document.querySelectorAll(s)];
const click = (el) => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const byText = (sel, t) => $$(sel).find((e) => e.textContent.trim() === t && !e.classList.contains('used'));

export async function autoplay({ wrongEvery = 0, max = 80, log = [], delay = 120 } = {}) {
  for (let step = 0; step < max; step++) {
    await sleep(delay);
    const fb = document.querySelector('.feedback .btn');
    if (fb) { click(fb); continue; }
    const ex = window.__hbEx;
    if (!document.querySelector('.session .ex') || !ex) break;
    const wrong = wrongEvery && step % wrongEvery === wrongEvery - 1;
    log.push(ex.type);
    const check = () => click(document.querySelector('.session-foot .btn'));
    switch (ex.type) {
      case 'choice': {
        const btns = $$('.ex .option');
        click(wrong ? btns.find((b) => b.dataset.value !== ex.ans) : btns.find((b) => b.dataset.value === ex.ans));
        check(); break;
      }
      case 'fill': click(byText('.ex .tile', wrong ? ex.opts.find((o) => o !== ex.ans) : ex.ans)); check(); break;
      case 'build': {
        const order = wrong ? [...ex.answer].reverse() : ex.answer;
        for (const t of order) click($$('.build-bank .tile').find((e) => e.textContent === t && !e.classList.contains('used')));
        check(); break;
      }
      case 'match': {
        for (const [l, r] of ex.pairs) {
          click($$('.match .col:first-child .option').find((e) => e.textContent === l && !e.classList.contains('matched')));
          click($$('.match .col:last-child .option').find((e) => e.textContent === r && !e.classList.contains('matched')));
          await sleep(60);
        }
        await sleep(600); break;
      }
      case 'type': {
        click($$('.ex .btn').find((b) => /Своя клавиатура/.test(b.textContent)));
        const inp = document.querySelector('.ex input.type-field');
        inp.value = wrong ? 'ㅋㅋ' : ex.answer; inp.dispatchEvent(new Event('input', { bubbles: true }));
        check(); break;
      }
      case 'compose': {
        const parts = []; const s = ex.target.charCodeAt(0) - 0xac00;
        const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'; const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
        const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        parts.push(CHO[Math.floor(s / 588)], JUNG[Math.floor((s % 588) / 28)], JONG[s % 28]);
        for (const p of parts.filter(Boolean)) click(byText('.ex .tile', p));
        check(); break;
      }
      case 'trace': {
        const cv = document.querySelector('.trace-wrap canvas:last-child');
        const r = cv.getBoundingClientRect();
        const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: r.left + x * r.width, clientY: r.top + y * r.height }));
        for (let k = 0; k < 2; k++) {
          ev('pointerdown', 0.3, 0.3); ev('pointermove', 0.7, 0.7); ev('pointerup', 0.7, 0.7);
          check(); await sleep(80);
        }
        break;
      }
      case 'learn': check(); break;
      case 'speak': click($$('.ex .btn').find((b) => /Не могу/.test(b.textContent))); break;
      default: log.push('UNKNOWN ' + ex.type); return log;
    }
  }
  return log;
}
