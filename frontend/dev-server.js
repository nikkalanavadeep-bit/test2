/**
 * ============================================================================
 * FRONTEND DEV SERVER: dev-server.js
 * ============================================================================
 * Dedicated lightweight frontend development server running on port 5173.
 * Serves the frontend client assets and seamlessly proxies /api/* requests
 * to the backend server running on port 3000.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const BACKEND_TARGET = process.env.BACKEND_URL || 'http://localhost:3000';
const STATIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURI(urlObj.pathname);

  // 1. Proxy API & Schema requests to Backend Server (:3000)
  if (pathname.startsWith('/api/') || pathname === '/schema.sql') {
    const backendUrl = new URL(req.url, BACKEND_TARGET);
    const proxyReq = http.request(backendUrl, {
      method: req.method,
      headers: { ...req.headers, host: backendUrl.host }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.warn(`[Proxy Error] Backend at ${BACKEND_TARGET} unreachable:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Gateway: Backend server on port 3000 is not reachable.',
        details: 'Make sure your backend is running: cd backend && npm start'
      }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. Serve static frontend files
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(STATIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`💻 AURA AI FRONTEND DEV SERVER RUNNING`);
  console.log(`🌐 Local URL:  http://localhost:${PORT}`);
  console.log(`🔄 API Proxy:  Forwarding /api/* -> ${BACKEND_TARGET}`);
  console.log(`=================================================`);
});
