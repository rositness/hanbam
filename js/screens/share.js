// «Поделиться успехом»: рисуем карточку со статистикой и отправляем через системное меню
// (или скачиваем картинку, если браузер не умеет делиться файлами).

import { state } from '../core/store.js';
import { lessons } from '../core/content.js';
import { levelInfo, lessonDone } from '../core/game.js';
import { srsCount } from '../core/srs.js';
import { mascotSVG } from '../core/mascot.js';
import { toast } from '../core/ui.js';

const APP_URL = 'https://rositness.github.io/hanbam/';

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

export async function renderShareCard() {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  try { await Promise.all([document.fonts.load('800 60px Manrope'), document.fonts.load('900 60px "Noto Sans KR"', '한밤')]); } catch { /* системные шрифты */ }

  // Ночное небо
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120d33'); g.addColorStop(0.55, '#2a1757'); g.addColorStop(1, '#4a1a63');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.15})`; c.beginPath(); c.arc((i * 397 + 53) % W, (i * 613 + 29) % 760, 1.5 + (i % 3), 0, Math.PI * 2); c.fill(); }
  // Город
  c.fillStyle = '#100b2c';
  [[0, 160, 120], [110, 230, 90], [190, 130, 110], [290, 260, 80], [360, 180, 120], [700, 200, 110], [800, 280, 80], [870, 150, 120], [980, 240, 100]].forEach(([x, hh, w]) => c.fillRect(x, H - hh, w, hh));
  c.fillRect(530, H - 420, 14, 300); c.fillRect(512, H - 380, 50, 22); c.beginPath(); c.moveTo(380, H); c.quadraticCurveTo(537, H - 240, 700, H); c.fill();
  c.fillStyle = '#ffd36b';
  for (let i = 0; i < 90; i++) { const x = (i * 53) % W, y = H - 40 - ((i * 37) % 200); if ((x + y) % 3 === 0) c.fillRect(x, y, 10, 14); }

  // Маскот
  const m = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mascotSVG('wow')));
  c.drawImage(m, W / 2 - 150, 90, 300, 300);

  c.textAlign = 'center';
  c.fillStyle = '#fff';
  c.font = '900 64px "Noto Sans KR", sans-serif';
  c.fillText('한밤 · Ханбам', W / 2, 470);
  c.font = '600 34px Manrope, sans-serif';
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.fillText(`${state.settings.name || 'Я'} учу корейский язык`, W / 2, 525);

  // Плитки статистики
  const lv = levelInfo();
  const done = [...lessons.keys()].filter(lessonDone).length;
  const tiles = [
    ['🔥', String(state.stats.streak.count), 'дней подряд'],
    ['⭐', `Ур. ${lv.level}`, lv.title],
    ['🧠', String(srsCount()), 'слов изучаю'],
    ['📚', `${done}/${lessons.size}`, 'уроков'],
  ];
  tiles.forEach(([em, val, label], i) => {
    const x = 90 + (i % 2) * 465, y = 580 + Math.floor(i / 2) * 230, w = 435, hh = 200;
    roundRect(c, x, y, w, hh, 36); c.fillStyle = 'rgba(255,255,255,.1)'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 3; c.stroke();
    c.textAlign = 'left';
    c.fillStyle = '#fff'; c.font = '72px sans-serif'; c.fillText(em, x + 34, y + 125);
    c.fillStyle = '#fff'; c.font = '800 66px Manrope, sans-serif'; c.fillText(val, x + 140, y + 105);
    c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '600 30px Manrope, sans-serif'; c.fillText(label, x + 142, y + 152);
  });
  // Призыв
  c.textAlign = 'center';
  roundRect(c, 140, 1060, W - 280, 96, 48);
  const bg = c.createLinearGradient(140, 0, W - 140, 0);
  bg.addColorStop(0, '#ff4f9a'); bg.addColorStop(0.55, '#a77bff'); bg.addColorStop(1, '#4fd8ff');
  c.fillStyle = bg; c.fill();
  c.fillStyle = '#fff'; c.font = '800 38px Manrope, sans-serif';
  c.fillText('Учи со мной! 같이 공부해요!', W / 2, 1122);
  c.font = '600 28px Manrope, sans-serif'; c.fillStyle = 'rgba(255,255,255,.85)';
  c.fillText(APP_URL.replace('https://', ''), W / 2, 1200);
  return cv;
}

export async function shareProgress() {
  const cv = await renderShareCard();
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'hanbam.png', { type: 'image/png' });
  const text = `Учу корейский в «Ханбам» 🐯 Присоединяйся: ${APP_URL}`;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'Ханбам' }); return; }
    if (navigator.share) { await navigator.share({ text, url: APP_URL, title: 'Ханбам' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'hanbam-progress.png';
  document.body.append(a); a.click(); a.remove();
  try { await navigator.clipboard.writeText(text); toast('Картинка сохранена, ссылка скопирована', { icon: '📤' }); } catch { toast('Картинка сохранена', { icon: '📤' }); }
}
