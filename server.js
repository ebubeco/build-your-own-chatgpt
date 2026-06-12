const http = require('http');
const fs = require('fs');
const path = require('path');

const base = path.resolve('C:/Users/user/Documents/My Builds and Softwares/Pojects/ToolsAI/build-your-own-chatgpt');
const MIME = { html: 'text/html', css: 'text/css', js: 'application/javascript', json: 'application/json' };

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