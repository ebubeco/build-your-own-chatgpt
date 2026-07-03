// LOCAL DEVELOPMENT ONLY — not used in production.
// Vercel deploys this project as a static site (index.html + assets).
// To run locally: node server.js
// To deploy: push to GitHub main branch — Vercel handles everything.

const http = require('http');
const fs = require('fs');
const path = require('path');

// __dirname is the project root (this file lives at the repo root), so this
// works on any machine/CI runner instead of a hardcoded absolute path.
const base = __dirname;
const PORT = parseInt(process.env.PORT, 10) || 3333;
const MIME = {
  html: 'text/html', css: 'text/css', js: 'application/javascript', json: 'application/json',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', ico: 'image/x-icon', gif: 'image/gif',
  woff: 'font/woff', woff2: 'font/woff2', txt: 'text/plain', xml: 'application/xml'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(base, urlPath === '/' ? 'index.html' : urlPath.slice(1));
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404, { 'Connection': 'close' }); res.end('Not found: ' + fp); return; }
    const ext = path.extname(fp).slice(1);
    // Explicitly close each connection instead of leaving it open for
    // keep-alive reuse. Under rapid, many-connection test/CI workloads
    // (e.g. a smoke test opening a fresh browser context per case), sockets
    // that are never actually reused can accumulate server-side until new
    // connections start hanging. This is dev/test tooling only -- Vercel
    // serves the real site in production.
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', 'Connection': 'close' });
    res.end(d);
  });
});
server.keepAliveTimeout = 0;
server.listen(PORT, () => process.stdout.write('Server on ' + PORT + '\n'));