// LOCAL DEVELOPMENT ONLY — not used in production.
// Vercel deploys this project as a static site (index.html + assets).
// To run locally: node server.js
// To deploy: push to GitHub main branch — Vercel handles everything.

const http = require('http');
const fs = require('fs');
const path = require('path');

const base = path.resolve('C:/Users/user/Documents/My Builds and Softwares/Pojects/ToolsAI/build-your-own-chatgpt');
const MIME = {
  html: 'text/html', css: 'text/css', js: 'application/javascript', json: 'application/json',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', ico: 'image/x-icon', gif: 'image/gif',
  woff: 'font/woff', woff2: 'font/woff2', txt: 'text/plain', xml: 'application/xml'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(base, urlPath === '/' ? 'index.html' : urlPath.slice(1));
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end('Not found: ' + fp); return; }
    const ext = path.extname(fp).slice(1);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(d);
  });
}).listen(3333, () => process.stdout.write('Server on 3333\n'));