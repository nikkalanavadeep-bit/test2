/**
 * ============================================================================
 * BACKEND SERVER: server.js
 * ============================================================================
 * Entry point for Aura AI. Loads backend/.env and frontend/.env configuration,
 * initializes the Supabase database service, serves REST API endpoints, and
 * delivers client assets.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');

// 1. Explicitly load backend/.env (with fallback to root .env)
const backendEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// 2. Parse frontend/.env to serve public variables to client
const frontendEnvPath = path.resolve(__dirname, '../frontend/.env');
let frontendEnvConfig = {};
if (fs.existsSync(frontendEnvPath)) {
  try {
    const raw = fs.readFileSync(frontendEnvPath, 'utf8');
    frontendEnvConfig = dotenv.parse(raw);
  } catch (err) {
    console.warn('[Env] Notice parsing frontend/.env:', err.message);
  }
}

const { handleChatRoutes } = require('./routes/chatRoutes');
const supabaseService = require('./services/supabaseService');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=UTF-8'
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURI(urlObj.pathname);

  // 1. Client Environment Variables Endpoint (/api/config/client)
  if (req.method === 'GET' && pathname === '/api/config/client') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*'
    });
    // Safely serve frontend environment variables
    res.end(JSON.stringify({
      apiBaseUrl: frontendEnvConfig.VITE_API_BASE_URL || `http://localhost:${PORT}`,
      supabaseUrl: frontendEnvConfig.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      supabaseAnonKey: frontendEnvConfig.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
      appName: frontendEnvConfig.VITE_APP_NAME || 'AURA AI',
      appVersion: frontendEnvConfig.VITE_APP_VERSION || '2.5.0',
      defaultTheme: frontendEnvConfig.VITE_DEFAULT_THEME || 'dark',
      defaultPersona: frontendEnvConfig.VITE_DEFAULT_PERSONA || 'nexus',
      soundEnabled: frontendEnvConfig.VITE_ENABLE_SOUND !== 'false'
    }));
    return;
  }

  // 2. Backend REST API Routing (/api/*)
  if (pathname.startsWith('/api/')) {
    const handled = await handleChatRoutes(req, res, pathname);
    if (handled) return;
  }

  // 3. Serve Database Schema file (/schema.sql)
  if (pathname === '/schema.sql') {
    const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
    fs.readFile(schemaPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Schema not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(data);
    });
    return;
  }

  // 4. Frontend Static Delivery
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(FRONTEND_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '404 File Not Found', path: pathname }));
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

server.listen(PORT, async () => {
  const dbStatus = await supabaseService.getStatus();
  console.log(`=================================================`);
  console.log(`🚀 AURA AI FULL-STACK SERVER RUNNING`);
  console.log(`📡 URL:          http://localhost:${PORT}`);
  console.log(`⚡ Chat API:     http://localhost:${PORT}/api/chat`);
  console.log(`⚙️  Client Env:   http://localhost:${PORT}/api/config/client`);
  console.log(`🗄️  Supabase:     ${dbStatus.connected ? '🟢 CONNECTED' : (dbStatus.configured ? '🟡 CONFIGURED (Table check needed)' : '⚪ NOT CONFIGURED (Local fallback active)')}`);
  console.log(`📄 SQL Schema:   http://localhost:${PORT}/schema.sql`);
  console.log(`📁 Backend Env:  ${backendEnvPath}`);
  console.log(`📁 Frontend Env: ${frontendEnvPath}`);
  console.log(`=================================================`);
});
