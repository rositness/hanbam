// Прописывание буквы пальцем по образцу.
// Оценка: какая доля образца покрыта штрихами и сколько штрихов попало мимо.

import { h } from '../core/dom.js';

const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export function traceCanvas(ch, { onStroke } = {}) {
  const wrap = h('div', { class: 'trace-wrap' }, h('div', { class: 'trace-grid' }));
  const guide = h('canvas', { 'aria-hidden': 'true' });
  const draw = h('canvas', { 'aria-label': `Поле для прописи буквы ${ch}` });
  wrap.append(guide, draw);
  let strokes = [];
  let cur = null;
  let size = 300;
  let dpr = 1;

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function layout() {
    size = wrap.clientWidth || 300;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [guide, draw]) { c.width = size * dpr; c.height = size * dpr; }
    paintGuide();
    paintStrokes();
  }

  function glyph(ctx, s, mode) {
    ctx.font = `400 ${s * 0.72}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = s * 0.53;
    if (mode === 'fill') ctx.fillText(ch, s / 2, y);
    else { ctx.lineJoin = 'round'; ctx.strokeText(ch, s / 2, y); ctx.fillText(ch, s / 2, y); }
  }

  function paintGuide() {
    const ctx = guide.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = css('--surface-3') || '#333';
    glyph(ctx, size, 'fill');
  }

  function paintStrokes() {
    const ctx = draw.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.06;
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#ff4f9a'); grad.addColorStop(1, '#4fd8ff');
    ctx.strokeStyle = grad;
    for (const s of strokes) strokePath(ctx, s);
  }

  function strokePath(ctx, pts) {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * size, pts[0][1] * size);
    if (pts.length === 1) ctx.lineTo(pts[0][0] * size + 0.1, pts[0][1] * size + 0.1);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * size, pts[i][1] * size);
    ctx.stroke();
  }

  const pos = (e) => {
    const r = draw.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  draw.addEventListener('pointerdown', (e) => {
    draw.setPointerCapture(e.pointerId);
    cur = [pos(e)]; strokes.push(cur); paintStrokes();
  });
  draw.addEventListener('pointermove', (e) => {
    if (!cur) return;
    cur.push(pos(e)); paintStrokes();
  });
  const end = () => { if (cur) { cur = null; onStroke?.(strokes.length); } };
  draw.addEventListener('pointerup', end);
  draw.addEventListener('pointercancel', end);

  // Оценка на уменьшенной сетке 96×96.
  function score() {
    const N = 96;
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c.getContext('2d', { willReadFrequently: true }); };
    const t = mk(), tWide = mk(), u = mk();
    t.fillStyle = '#000'; glyph(t, N, 'fill');
    tWide.fillStyle = '#000'; tWide.strokeStyle = '#000'; tWide.lineWidth = N * 0.11; glyph(tWide, N, 'wide');
    u.strokeStyle = '#000'; u.lineCap = 'round'; u.lineJoin = 'round'; u.lineWidth = N * 0.075;
    const sz = size; size = N; strokes.forEach((s) => strokePath(u, s)); size = sz;
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
  if (document.fonts?.load) document.fonts.load(`400 40px "Noto Sans KR"`, ch).then(() => layout()).catch(() => {});

  return {
    el: wrap,
    clear() { strokes = []; paintStrokes(); onStroke?.(0); },
    score,
    hasInk: () => strokes.length > 0,
    destroy() { ro.disconnect(); },
  };
}
