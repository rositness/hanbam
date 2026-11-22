// Простой локальный сервер без зависимостей: node tools/serve.js [порт]
// Открывает приложение на http://localhost:5173 и в локальной сети (для теста с телефона).
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2]) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Не найдено'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, () => {
  console.log(`Ханбам: http://localhost:${port}`);
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) {
    if (i.family === 'IPv4' && !i.internal) console.log(`В локальной сети: http://${i.address}:${port}`);
  }
});
