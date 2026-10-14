/**
 * ============================================================================
 * BACKEND ROUTER: chatRoutes.js
 * ============================================================================
 * REST API endpoints for conversation generation, persona retrieval,
 * and Supabase database synchronization.
 */

const { processChatMessage, getPersonas } = require('../services/botService');
const supabaseService = require('../services/supabaseService');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let bodyRaw = '';
    req.on('data', chunk => {
      bodyRaw += chunk;
      if (bodyRaw.length > 2e6) req.destroy(); // 2MB max
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(bodyRaw || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function handleChatRoutes(req, res, pathname) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  // 1. GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    const dbStatus = await supabaseService.getStatus();
    sendJson(res, 200, {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      database: {
        provider: 'Supabase PostgreSQL',
        configured: dbStatus.configured,
        connected: dbStatus.connected,
        url: dbStatus.url,
        error: dbStatus.error
      }
    });
    return true;
  }

  // 2. GET /api/supabase/status
  if (req.method === 'GET' && pathname === '/api/supabase/status') {
    const status = await supabaseService.getStatus();
    sendJson(res, 200, status);
    return true;
  }

  // 3. POST /api/supabase/config
  if (req.method === 'POST' && pathname === '/api/supabase/config') {
    try {
      const body = await parseJsonBody(req);
      const ok = supabaseService.initClient(body.url, body.key);
      const test = await supabaseService.testConnection();
      sendJson(res, 200, {
        success: ok && test.connected,
        connected: test.connected,
        error: test.error
      });
    } catch (e) {
      sendJson(res, 400, { success: false, error: e.message });
    }
    return true;
  }

  // 4. GET /api/personas
  if (req.method === 'GET' && pathname === '/api/personas') {
    sendJson(res, 200, {
      personas: getPersonas()
    });
    return true;
  }

  // 5. GET /api/conversations
  if (req.method === 'GET' && pathname === '/api/conversations') {
    try {
      const conversations = await supabaseService.getConversations();
      sendJson(res, 200, { success: true, conversations });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 6. POST /api/conversations
  if (req.method === 'POST' && pathname === '/api/conversations') {
    try {
      const body = await parseJsonBody(req);
      const saved = await supabaseService.saveConversation(body);
      sendJson(res, 200, { success: true, conversation: saved });
    } catch (err) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return true;
  }

  // 7. DELETE /api/conversations/:id
  const deleteConvMatch = pathname.match(/^\/api\/conversations\/([^/]+)$/);
  if (req.method === 'DELETE' && deleteConvMatch) {
    try {
      const id = decodeURIComponent(deleteConvMatch[1]);
      await supabaseService.deleteConversation(id);
      sendJson(res, 200, { success: true, deletedId: id });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 8. GET /api/conversations/:id/messages
  const getMsgsMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
  if (req.method === 'GET' && getMsgsMatch) {
    try {
      const convId = decodeURIComponent(getMsgsMatch[1]);
      const messages = await supabaseService.getMessages(convId);
      sendJson(res, 200, { success: true, conversationId: convId, messages });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return true;
  }

  // 9. POST /api/chat (Intelligence + Automatic Supabase Logging)
  if (req.method === 'POST' && pathname === '/api/chat') {
    try {
      const body = await parseJsonBody(req);
      if (!body.message || typeof body.message !== 'string') {
        sendJson(res, 400, { error: 'Missing required field "message".' });
        return true;
      }

      const convId = body.conversationId || `chat_${Date.now()}`;

      // Save conversation header
      await supabaseService.saveConversation({
        id: convId,
        title: body.title || (body.message.length > 34 ? body.message.substring(0, 34) + '...' : body.message),
        persona: body.persona || 'nexus'
      });

      // Save user message to Supabase
      const userMsgId = body.userMessageId || `msg_${Date.now()}`;
      await supabaseService.saveMessage({
        id: userMsgId,
        conversationId: convId,
        role: 'user',
        content: body.message
      });

      // Process reply via botService
      const result = await processChatMessage({
        message: body.message,
        persona: body.persona || 'nexus',
        history: body.history || [],
        mode: body.mode || 'simulated',
        apiKey: body.apiKey || ''
      });

      // Save assistant reply to Supabase
      const botMsgId = `msg_${Date.now() + 1}`;
      await supabaseService.saveMessage({
        id: botMsgId,
        conversationId: convId,
        role: 'assistant',
        content: result.reply,
        durationMs: result.durationMs,
        tokens: result.approxTokens
      });

      sendJson(res, 200, {
        success: true,
        data: {
          ...result,
          conversationId: convId,
          botMessageId: botMsgId
        }
      });
    } catch (err) {
      console.error('API Error in /api/chat:', err);
      sendJson(res, 500, {
        success: false,
        error: err.message || 'Internal Server Error'
      });
    }
    return true;
  }

  return false;
}

module.exports = {
  handleChatRoutes
};
