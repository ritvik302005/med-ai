const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'dist');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function sendFile(res, target) {
  fs.readFile(target, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(target).toLowerCase();
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const candidate = path.join(root, relativePath);

    if (!candidate.startsWith(root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(candidate, (error, stats) => {
      if (!error && stats.isFile()) {
        sendFile(res, candidate);
        return;
      }

      sendFile(res, path.join(root, 'index.html'));
    });
  })
  .listen(port, host, () => {
    console.log(`static-preview:${host}:${port}`);
  });
