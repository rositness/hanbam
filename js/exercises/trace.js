// Прописывание буквы пальцем по образцу.
// Для всех 40 букв образец строится из штрихов (js/core/strokes.js): видны номера черт,
// а кнопка «Показать порядок» анимирует написание. Оценка — доля покрытого образца
// и доля штрихов, попавших в контур.

import { h } from '../core/dom.js';
import { STROKES } from '../core/strokes.js';

const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const PAD = 0.1; // поля внутри квадрата

export function traceCanvas(ch, { onStroke } = {}) {
  const strokes = STROKES[ch] || null;
  const wrap = h('div', { class: 'trace-wrap' }, h('div', { class: 'trace-grid' }));
  const guide = h('canvas', { 'aria-hidden': 'true' });
  const anim = h('canvas', { 'aria-hidden': 'true' });
  const draw = h('canvas', { 'aria-label': `Поле для прописи буквы ${ch}` });
  wrap.append(guide, anim, draw);
  let user = [];
  let cur = null;
  let size = 300;
  let dpr = 1;
  let raf = 0;

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const P = (x, s) => (PAD + (x / 100) * (1 - 2 * PAD)) * s; // координата образца → пиксели

  function layout() {
    size = wrap.clientWidth || 300;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [guide, anim, draw]) { c.width = size * dpr; c.height = size * dpr; }
    paintGuide();
    paintUser();
  }

  function pathStroke(ctx, pts, s, upto = 1) {
    // upto — какая доля штриха нарисована (для анимации)
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let left = total * upto;
    ctx.beginPath();
    ctx.moveTo(P(pts[0][0], s), P(pts[0][1], s));
    let end = pts[0];
    for (let i = 1; i < pts.length && left > 0; i++) {
      const k = Math.min(1, left / seg[i - 1]);
      end = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
      ctx.lineTo(P(end[0], s), P(end[1], s));
      left -= seg[i - 1];
    }
    ctx.stroke();
    return end;
  }

  function glyph(ctx, s, width) {
    if (strokes) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * width;
      strokes.forEach((st) => pathStroke(ctx, st, s));
    } else {
      ctx.font = `400 ${s * 0.72}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (width > 0.15) { ctx.lineWidth = s * (width - 0.1); ctx.lineJoin = 'round'; ctx.strokeText(ch, s / 2, s * 0.53); }
      ctx.fillText(ch, s / 2, s * 0.53);
    }
  }

  function paintGuide() {
    const ctx = guide.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = ctx.strokeStyle = css('--surface-3') || '#333';
    glyph(ctx, size, 0.12);
    if (strokes) {
      // номера черт у начала каждого штриха
      strokes.forEach((st, i) => {
        const [x, y] = st[0];
        const nx = P(x, size), ny = P(y, size);
        ctx.fillStyle = css('--accent') || '#ff4f9a';
        ctx.beginPath(); ctx.arc(nx, ny, size * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `800 ${size * 0.045}px Manrope, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), nx, ny + 1);
      });
    }
  }

  function userStyle(ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.065;
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#ff4f9a'); g.addColorStop(1, '#4fd8ff');
    ctx.strokeStyle = g;
  }

  function paintUser() {
    const ctx = draw.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    userStyle(ctx);
    for (const s of user) rawPath(ctx, s, size);
  }

  function rawPath(ctx, pts, s) {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
    if (pts.length === 1) ctx.lineTo(pts[0][0] * s + 0.1, pts[0][1] * s + 0.1);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * s, pts[i][1] * s);
    ctx.stroke();
  }

  // Анимация порядка черт.
  function animate() {
    if (!strokes) return Promise.resolve();
    cancelAnimationFrame(raf);
    const ctx = anim.getContext('2d');
    const per = 650;
    const start = performance.now();
    return new Promise((resolve) => {
      const frame = (t) => {
        const el = t - start;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.07;
        ctx.strokeStyle = css('--accent-2') || '#4fd8ff';
        let tip = null;
        strokes.forEach((st, i) => {
          const k = Math.max(0, Math.min(1, (el - i * per) / (per - 120)));
          if (k <= 0) return;
          const e = pathStroke(ctx, st, size, k);
          if (k < 1) tip = e;
        });
        if (tip) { // «перо» на кончике текущего штриха
          ctx.fillStyle = css('--accent') || '#ff4f9a';
          ctx.beginPath(); ctx.arc(P(tip[0], size), P(tip[1], size), size * 0.035, 0, Math.PI * 2); ctx.fill();
        }
        if (el < strokes.length * per + 500) raf = requestAnimationFrame(frame);
        else { ctx.clearRect(0, 0, size, size); resolve(); }
      };
      raf = requestAnimationFrame(frame);
    });
  }

  const pos = (e) => {
    const r = draw.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  draw.addEventListener('pointerdown', (e) => {
    draw.setPointerCapture?.(e.pointerId);
    cur = [pos(e)]; user.push(cur); paintUser();
  });
  draw.addEventListener('pointermove', (e) => { if (!cur) return; cur.push(pos(e)); paintUser(); });
  const end = () => { if (cur) { cur = null; onStroke?.(user.length); } };
  draw.addEventListener('pointerup', end);
  draw.addEventListener('pointercancel', end);

  // Оценка на уменьшенной сетке 96×96.
  function score() {
    const N = 96;
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c.getContext('2d', { willReadFrequently: true }); };
    const t = mk(), tWide = mk(), u = mk();
    t.fillStyle = t.strokeStyle = '#000'; glyph(t, N, 0.1);
    tWide.fillStyle = tWide.strokeStyle = '#000'; glyph(tWide, N, 0.22);
    u.strokeStyle = '#000'; u.lineCap = 'round'; u.lineJoin = 'round'; u.lineWidth = N * 0.075;
    user.forEach((s) => rawPath(u, s, N));
    const T = t.getImageData(0, 0, N, N).data, TW = tWide.getImageData(0, 0, N, N).data, U = u.getImageData(0, 0, N, N).data;
    let tCount = 0, covered = 0, uCount = 0, inside = 0;
    for (let i = 3; i < T.length; i += 4) {
      const ti = T[i] > 100, ui = U[i] > 100;
      if (ti) { tCount++; if (ui) covered++; }
      if (ui) { uCount++; if (TW[i] > 60) inside++; }
    }
    const coverage = tCount ? covered / tCount : 0;
    const precision = uCount ? inside / uCount : 0;
    return { coverage, precision, ok: coverage >= 0.55 && precision >= 0.6, value: Math.round(Math.min(coverage / 0.8, 1) * Math.min(precision / 0.85, 1) * 100) };
  }

  const ro = new ResizeObserver(() => layout());
  ro.observe(wrap);
  if (!strokes && document.fonts?.load) document.fonts.load(`400 40px "Noto Sans KR"`, ch).then(() => layout()).catch(() => {});

  return {
    el: wrap,
    clear() { user = []; paintUser(); onStroke?.(0); },
    score,
    animate,
    hasStrokes: !!strokes,
    hasInk: () => user.length > 0,
    destroy() { ro.disconnect(); cancelAnimationFrame(raf); },
  };
}
