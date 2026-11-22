// Иконки приложения с маскотом Бами: node tools/make-icons.mjs
// Рисует SVG-иконку и PNG нужных размеров через установленный Chrome (headless, без зависимостей).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mascotSVG } from '../js/core/mascot.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'icons');

// mascotSVG рисует в квадрате 100×100 — вкладываем его в иконку.
function iconSVG({ rounded = true, scale = 0.78 } = {}) {
  const inner = mascotSVG('happy').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const s = 512, m = s * scale, off = (s - m) / 2;
  const city = [[20, 380, 70], [80, 340, 55], [130, 400, 60], [330, 360, 60], [385, 330, 50], [430, 395, 80]]
    .map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${512 - y}" fill="#120d33"/>`).join('');
  const stars = [[70, 90], [140, 60], [420, 80], [460, 150], [60, 200], [250, 40]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${3 + (i % 2) * 2}" fill="#fff" opacity=".8"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><clipPath id="clip"><rect width="512" height="512" ${rounded ? 'rx="112"' : ''}/></clipPath><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1446"/><stop offset=".6" stop-color="#2a1757"/><stop offset="1" stop-color="#5a1f6e"/></linearGradient></defs>
  <g clip-path="url(#clip)"><rect width="512" height="512" fill="url(#bg)"/>
  ${stars}${city}
  <g transform="translate(${off} ${off + 10}) scale(${m / 100})">${inner}</g></g>
</svg>`;
}

fs.writeFileSync(path.join(out, 'icon.svg'), iconSVG());

// PNG через встроенный в Chrome режим --screenshot (headless, без зависимостей)
const chromes = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const chrome = chromes.find((p) => fs.existsSync(p));
if (!chrome) { console.log('Chrome не найден — создан только icon.svg'); process.exit(0); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-icons-'));

function png(file, size, opts) {
  const html = path.join(tmp, file + '.html');
  fs.writeFileSync(html, `<html><body style="margin:0;background:transparent">${iconSVG(opts).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${path.join(tmp, 'p')}`,
    '--default-background-color=00000000', `--window-size=${size},${size}`, `--screenshot=${path.join(out, file)}`, 'file:///' + html.replace(/\\/g, '/')], { timeout: 30000 });
  console.log(file, r.status === 0 ? 'OK' : 'ошибка ' + (r.error?.message || r.status));
}
png('icon-192.png', 192, {});
png('icon-512.png', 512, {});
png('apple-touch-icon.png', 180, { rounded: false });
png('icon-maskable-512.png', 512, { rounded: false, scale: 0.6 });
console.log('Иконки готовы');
