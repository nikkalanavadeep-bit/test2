/**
 * ============================================================================
 * FRONTEND CONTROLLER: app.js
 * ============================================================================
 * Handles UI interactions, DOM updates, Markdown parsing, localStorage,
 * Web Speech APIs, Supabase cloud synchronization, and backend API routing.
 */

import { ApiClient } from './api.js';
import { SoundEngine } from './audio.js';
import { ENV, loadClientEnv } from './env.js';

// --------------------------------------------------------------------------
// 1. Client State & LocalStorage
// --------------------------------------------------------------------------
const STORAGE_KEYS = {
  CHATS: 'aura_chats_v3',
  CURRENT_CHAT_ID: 'aura_current_chat_id_v3',
  SETTINGS: 'aura_settings_v3',
  PERSONA: 'aura_active_persona_v3',
  THEME: 'aura_theme_v3'
};

const defaultSettings = {
  intelligenceMode: 'simulated',
  geminiApiKey: '',
  typingSpeed: 'natural',
  autoSpeech: false,
  soundEnabled: true
};

const AppState = {
  chats: [],
  currentChatId: null,
  activePersona: 'nexus',
  personas: {},
  settings: { ...defaultSettings },
  theme: 'dark',
  isGenerating: false,
  recognition: null,
  isRecording: false,
  backendConnected: false,
  supabase: {
    configured: false,
    connected: false,
    url: null,
    error: null
  }
};

// --------------------------------------------------------------------------
// 2. Markdown & Code Parser
// --------------------------------------------------------------------------
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightSyntax(code, lang) {
  let escaped = escapeHtml(code);
  escaped = escaped.replace(
    /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|async|await|try|catch|def|public|private|static|new|interface|type)\b/g,
    '<span class="token-keyword">$1</span>'
  );
  escaped = escaped.replace(/(["'`].*?["'`])/g, '<span class="token-string">$1</span>');
  escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');
  escaped = escaped.replace(/(\/\/.*?$|#.*?$)/gm, '<span class="token-comment">$1</span>');
  return escaped;
}

function renderMarkdown(rawText) {
  if (!rawText) return '';

  let html = rawText;

  // 1. Fenced Code Blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const displayLang = lang ? lang.trim() : 'code';
    const highlighted = highlightSyntax(code.trim(), displayLang);
    const escapedRaw = escapeHtml(code.trim());
    return `
      <div class="code-container">
        <div class="code-header">
          <span class="code-lang">${displayLang}</span>
          <button class="copy-code-btn" data-code="${escapedRaw}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
        <div class="code-body">
          <pre><code>${highlighted}</code></pre>
        </div>
      </div>
    `;
  });

  // 2. Inline code
  html = html.replace(/`([^`]+)`/g, (match, code) => `<code>${escapeHtml(code)}</code>`);

  // 3. Blockquotes
  html = html.replace(/^>\s*(.*?)$/gm, '<blockquote>$1</blockquote>');

  // 4. Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 5. Unordered List Items
  html = html.replace(/^[\*\-]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 6. Numbered Lists
  html = html.replace(/^\d+\.\s+(.*)$/gm, '<li class="num-item">$1</li>');

  // 7. Paragraphs
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<div class="code-container"') || p.startsWith('<ul>') || p.startsWith('<blockquote>')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

// --------------------------------------------------------------------------
// 3. Speech APIs
// --------------------------------------------------------------------------
function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      AppState.isRecording = true;
      document.getElementById('voiceBtn')?.classList.add('recording');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      const input = document.getElementById('messageInput');
      if (input) {
        input.value = transcript;
        handleInputChange();
      }
    };

    recognition.onerror = () => stopRecording();
    recognition.onend = () => stopRecording();
    AppState.recognition = recognition;
  }
}

function toggleVoice() {
  if (!AppState.recognition) {
    alert('Speech recognition is not supported in this browser.');
    return;
  }
  if (AppState.isRecording) {
    AppState.recognition.stop();
    stopRecording();
  } else {
    try {
      AppState.recognition.start();
    } catch (e) {
      console.warn('Speech start error:', e);
    }
  }
}

function stopRecording() {
  AppState.isRecording = false;
  document.getElementById('voiceBtn')?.classList.remove('recording');
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const clean = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~#>]/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

// --------------------------------------------------------------------------
// 4. Supabase Status & Cloud Sync Logic
// --------------------------------------------------------------------------
async function syncSupabaseStatus() {
  try {
    const status = await ApiClient.getSupabaseStatus();
    AppState.supabase = status;

    const pill = document.getElementById('dbStatusPill');
    const text = document.getElementById('dbStatusText');
    const badge = document.getElementById('modalSupabaseBadge');

    if (status.connected) {
      if (pill) {
        pill.className = 'db-status-pill connected';
        pill.title = `Supabase Connected: ${status.url}`;
      }
      if (text) text.textContent = 'Supabase Connected';
      if (badge) {
        badge.className = 'supabase-badge connected';
        badge.textContent = 'Connected ✓';
      }
    } else if (status.configured) {
      if (pill) {
        pill.className = 'db-status-pill warning';
        pill.title = status.error || 'Configured but database table verification pending';
      }
      if (text) text.textContent = 'Supabase: Table Check';
      if (badge) {
        badge.className = 'supabase-badge';
        badge.textContent = 'Table Check Needed';
      }
    } else {
      if (pill) {
        pill.className = 'db-status-pill';
        pill.title = 'Running on Local Fallback (Click Settings to connect Supabase)';
      }
      if (text) text.textContent = 'Local Database (Offline)';
      if (badge) {
        badge.className = 'supabase-badge';
        badge.textContent = 'Not Connected';
      }
    }
  } catch (e) {
    console.warn('Failed to sync Supabase status:', e);
  }
}

async function loadCloudConversations() {
  try {
    const cloudChats = await ApiClient.fetchConversations();
    if (Array.isArray(cloudChats) && cloudChats.length > 0) {
      // Merge with local state
      cloudChats.forEach(cc => {
        const existing = AppState.chats.find(c => c.id === cc.id);
        if (!existing) {
          AppState.chats.push({
            id: cc.id,
            title: cc.title,
            persona: cc.persona,
            createdAt: cc.created_at,
            messages: []
          });
        }
      });
      saveState();
      renderSidebarHistory();
    }
  } catch (e) {
    console.debug('Cloud fetch bypassed:', e);
  }
}

// --------------------------------------------------------------------------
// 5. State Management
// --------------------------------------------------------------------------
function loadState() {
  try {
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    AppState.chats = chats ? JSON.parse(chats) : [];

    const curId = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT_ID);
    AppState.currentChatId = curId || null;

    const sets = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (sets) AppState.settings = { ...defaultSettings, ...JSON.parse(sets) };

    const persona = localStorage.getItem(STORAGE_KEYS.PERSONA);
    if (persona) AppState.activePersona = persona;

    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (theme) AppState.theme = theme;

    SoundEngine.enabled = AppState.settings.soundEnabled;
  } catch (e) {
    console.error('State load error:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(AppState.chats));
    localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT_ID, AppState.currentChatId || '');
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(AppState.settings));
    localStorage.setItem(STORAGE_KEYS.PERSONA, AppState.activePersona);
    localStorage.setItem(STORAGE_KEYS.THEME, AppState.theme);
  } catch (e) {
    console.error('State save error:', e);
  }
}

function getCurrentChat() {
  if (!AppState.currentChatId) return null;
  return AppState.chats.find(c => c.id === AppState.currentChatId) || null;
}

function createNewChat() {
  const newChat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    title: 'New Conversation',
    persona: AppState.activePersona,
    createdAt: new Date().toISOString(),
    messages: []
  };

  AppState.chats.unshift(newChat);
  AppState.currentChatId = newChat.id;
  saveState();

  renderSidebarHistory();
  renderChatViewport();

  document.getElementById('messageInput')?.focus();
  SoundEngine.play('click');
}

async function deleteChat(chatId, e) {
  if (e) e.stopPropagation();
  AppState.chats = AppState.chats.filter(c => c.id !== chatId);
  if (AppState.currentChatId === chatId) {
    AppState.currentChatId = AppState.chats.length > 0 ? AppState.chats[0].id : null;
  }
  saveState();
  renderSidebarHistory();
  renderChatViewport();
  SoundEngine.play('click');

  // Sync delete with Supabase
  await ApiClient.deleteConversation(chatId);
}

async function selectChat(chatId) {
  if (AppState.currentChatId === chatId) return;
  AppState.currentChatId = chatId;
  saveState();

  const chat = getCurrentChat();
  // If messages are empty, try fetching from Supabase
  if (chat && chat.messages.length === 0) {
    const cloudMsgs = await ApiClient.fetchMessages(chatId);
    if (cloudMsgs && cloudMsgs.length > 0) {
      chat.messages = cloudMsgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at
      }));
      saveState();
    }
  }

  renderSidebarHistory();
  renderChatViewport();
  SoundEngine.play('click');
  document.getElementById('sidebar')?.classList.remove('open');
}

function clearCurrentChat() {
  const chat = getCurrentChat();
  if (!chat || chat.messages.length === 0) return;
  if (confirm('Clear all messages in this conversation?')) {
    chat.messages = [];
    saveState();
    renderChatViewport();
    renderSidebarHistory();
    SoundEngine.play('click');
  }
}

// --------------------------------------------------------------------------
// 6. DOM Rendering
// --------------------------------------------------------------------------
function renderPersonaDisplay() {
  const persona = AppState.personas[AppState.activePersona] || {
    name: 'Nexus Core',
    meta: 'Backend Engine • Latency: <15ms'
  };

  const nameEl = document.getElementById('currentModelDisplay');
  const metaEl = document.getElementById('modelMetaInfo');

  if (nameEl) nameEl.textContent = persona.name;
  if (metaEl) {
    const dbIndicator = AppState.supabase.connected ? ' • Supabase 🗄️' : '';
    if (AppState.settings.intelligenceMode === 'gemini') {
      metaEl.textContent = `Google Gemini 1.5 Flash • Server Routed${dbIndicator}`;
    } else {
      metaEl.textContent = `${persona.meta}${dbIndicator}`;
    }
  }

  document.querySelectorAll('.persona-tab').forEach(tab => {
    if (tab.getAttribute('data-persona') === AppState.activePersona) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

function renderSidebarHistory() {
  const list = document.getElementById('historyList');
  const countBadge = document.getElementById('historyCount');
  if (!list) return;

  if (countBadge) countBadge.textContent = AppState.chats.length;

  if (AppState.chats.length === 0) {
    list.innerHTML = `<div class="empty-history-text">No conversation history yet. Start a new chat!</div>`;
    return;
  }

  list.innerHTML = AppState.chats.map(chat => {
    const isActive = chat.id === AppState.currentChatId;
    const persona = AppState.personas[chat.persona] || { icon: '🧠' };
    return `
      <div class="history-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}">
        <span style="margin-right: 6px; font-size: 0.9rem;">${persona.icon || '🧠'}</span>
        <span class="history-item-title">${escapeHtml(chat.title || 'Conversation')}</span>
        <button class="history-item-delete" data-delete-id="${chat.id}" title="Delete conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-chat-id');
      if (id) selectChat(id);
    });
  });

  list.querySelectorAll('.history-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-delete-id');
      if (id) deleteChat(id, e);
    });
  });
}

function renderChatViewport() {
  const chat = getCurrentChat();
  const welcomeScreen = document.getElementById('welcomeScreen');
  const messagesList = document.getElementById('messagesList');
  const suggestionsWrapper = document.getElementById('suggestionsWrapper');

  if (!chat || chat.messages.length === 0) {
    welcomeScreen?.classList.remove('hidden');
    if (messagesList) messagesList.innerHTML = '';
    suggestionsWrapper?.classList.add('hidden');
    return;
  }

  welcomeScreen?.classList.add('hidden');
  if (messagesList) {
    messagesList.innerHTML = chat.messages.map(msg => renderSingleMessageHtml(msg)).join('');
    bindMessageActions(messagesList);
  }

  scrollToBottom();
  updateSuggestionChips();
}

function renderSingleMessageHtml(msg) {
  const isUser = msg.role === 'user';
  const persona = AppState.personas[AppState.activePersona] || { badge: 'Nexus Core' };
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  if (isUser) {
    return `
      <div class="message-row user-row" id="msg_${msg.id}">
        <div class="user-bubble-avatar">U</div>
        <div class="message-bubble">
          <p>${escapeHtml(msg.content).replace(/\n/g, '<br>')}</p>
          <span style="display:block; text-align:right; font-size:0.68rem; opacity:0.7; margin-top:4px;">${time}</span>
        </div>
      </div>
    `;
  } else {
    const renderedBody = renderMarkdown(msg.content);
    return `
      <div class="message-row bot-row" id="msg_${msg.id}">
        <div class="bot-avatar-frame">
          <img src="assets/avatar.jpg" alt="Aura Avatar">
        </div>
        <div class="message-content-wrap">
          <div class="bot-header-meta">
            <span class="bot-author-name">Aura</span>
            <span class="bot-persona-tag">${persona.badge}</span>
            <span class="message-timestamp">${time}</span>
          </div>
          <div class="message-bubble" id="body_${msg.id}">
            ${renderedBody}
          </div>
          <div class="bot-actions-bar">
            <button class="bot-action-btn copy-msg-btn" data-msg-id="${msg.id}" title="Copy response">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
            <button class="bot-action-btn speak-msg-btn" data-msg-id="${msg.id}" title="Read aloud">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              <span>Speak</span>
            </button>
            <button class="bot-action-btn feedback-btn" data-type="like">👍</button>
            <button class="bot-action-btn feedback-btn" data-type="dislike">👎</button>
          </div>
        </div>
      </div>
    `;
  }
}

function bindMessageActions(container) {
  container.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.onclick = () => {
      const code = btn.getAttribute('data-code');
      if (!code) return;
      const txt = document.createElement('textarea');
      txt.innerHTML = code;
      navigator.clipboard.writeText(txt.value).then(() => {
        const span = btn.querySelector('span');
        const orig = span.textContent;
        span.textContent = 'Copied! ✓';
        btn.style.borderColor = 'var(--accent-emerald)';
        btn.style.color = 'var(--accent-emerald)';
        SoundEngine.play('click');
        setTimeout(() => {
          span.textContent = orig;
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 2000);
      });
    };
  });

  container.querySelectorAll('.copy-msg-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-msg-id');
      const chat = getCurrentChat();
      const msg = chat?.messages.find(m => m.id === id);
      if (msg) {
        navigator.clipboard.writeText(msg.content);
        SoundEngine.play('click');
        alert('Message copied to clipboard! 📋');
      }
    };
  });

  container.querySelectorAll('.speak-msg-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-msg-id');
      const chat = getCurrentChat();
      const msg = chat?.messages.find(m => m.id === id);
      if (msg) speakText(msg.content);
    };
  });

  container.querySelectorAll('.feedback-btn').forEach(btn => {
    btn.onclick = () => {
      btn.classList.toggle('active');
      SoundEngine.play('click');
    };
  });
}

function scrollToBottom() {
  const vp = document.getElementById('chatViewport');
  if (vp) vp.scrollTop = vp.scrollHeight;
}

function updateSuggestionChips() {
  const chat = getCurrentChat();
  const wrapper = document.getElementById('suggestionsWrapper');
  const bar = document.getElementById('suggestionsBar');
  if (!wrapper || !bar) return;

  if (!chat || chat.messages.length === 0 || AppState.isGenerating) {
    wrapper.classList.add('hidden');
    return;
  }

  const lastMsg = chat.messages[chat.messages.length - 1];
  if (lastMsg.role === 'user') {
    wrapper.classList.add('hidden');
    return;
  }

  const suggestions = [
    'Tell me more about this',
    'Can you provide a code example?',
    'Explain this more simply',
    'What are potential edge cases?',
    'Summarize into 3 key takeaways'
  ];

  bar.innerHTML = suggestions.map(s => `
    <button class="suggestion-chip" data-chip-text="${escapeHtml(s)}">${escapeHtml(s)}</button>
  `).join('');

  bar.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.onclick = () => {
      const text = chip.getAttribute('data-chip-text');
      if (text) sendMessage(text);
    };
  });

  wrapper.classList.remove('hidden');
}

// --------------------------------------------------------------------------
// 7. Message Transmission with Supabase Cloud Sync
// --------------------------------------------------------------------------
async function sendMessage(textToSend) {
  const input = document.getElementById('messageInput');
  const text = (textToSend || input?.value || '').trim();
  if (!text || AppState.isGenerating) return;

  if (!AppState.currentChatId || !getCurrentChat()) {
    createNewChat();
  }

  const chat = getCurrentChat();
  if (chat.messages.length === 0) {
    chat.title = text.length > 34 ? text.substring(0, 34) + '...' : text;
  }

  // 1. Add user message
  const userMsgId = 'msg_' + Date.now();
  chat.messages.push({
    id: userMsgId,
    role: 'user',
    content: text,
    timestamp: new Date().toISOString()
  });
  saveState();

  if (input) {
    input.value = '';
    input.style.height = 'auto';
  }
  handleInputChange();
  document.getElementById('suggestionsWrapper')?.classList.add('hidden');

  renderChatViewport();
  SoundEngine.play('send');

  // 2. Call Backend API (automatically saves to Supabase)
  AppState.isGenerating = true;
  const typingIndicator = document.getElementById('typingIndicator');
  typingIndicator?.classList.remove('hidden');
  scrollToBottom();

  const botMsgId = 'msg_' + (Date.now() + 1);
  let botReply = '';

  try {
    const backendResult = await ApiClient.sendChatMessage({
      message: text,
      persona: AppState.activePersona,
      history: chat.messages,
      mode: AppState.settings.intelligenceMode,
      apiKey: AppState.settings.geminiApiKey,
      conversationId: chat.id,
      userMessageId: userMsgId
    });

    botReply = backendResult.reply;

    const metaEl = document.getElementById('modelMetaInfo');
    if (metaEl && backendResult.durationMs !== undefined) {
      const dbBadge = AppState.supabase.connected ? ' • Supabase Synced ✓' : '';
      metaEl.textContent = `Latency: ${backendResult.durationMs}ms • ~${backendResult.approxTokens || 0} tokens${dbBadge}`;
    }
  } catch (err) {
    console.error('Backend API error:', err);
    botReply = `⚠️ **Backend Error**: ${err.message || 'Failed to reach API server.'}\n\nPlease verify that the backend server is running at \`http://localhost:3000\`.`;
  } finally {
    typingIndicator?.classList.add('hidden');
  }

  // 3. Render Assistant Reply
  const botMsg = {
    id: botMsgId,
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString()
  };
  chat.messages.push(botMsg);

  const messagesList = document.getElementById('messagesList');
  if (messagesList) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderSingleMessageHtml(botMsg);
    messagesList.appendChild(tempDiv.firstElementChild);
    bindMessageActions(messagesList);
  }

  const bodyEl = document.getElementById(`body_${botMsgId}`);
  const speed = AppState.settings.typingSpeed;

  if (speed === 'fast') {
    botMsg.content = botReply;
    if (bodyEl) bodyEl.innerHTML = renderMarkdown(botReply);
  } else {
    const chunkSize = speed === 'slow' ? 3 : 12;
    const intervalMs = speed === 'slow' ? 35 : 18;

    for (let i = 0; i < botReply.length; i += chunkSize) {
      botMsg.content += botReply.slice(i, i + chunkSize);
      if (bodyEl) bodyEl.innerHTML = renderMarkdown(botMsg.content);
      scrollToBottom();
      await new Promise(r => setTimeout(r, intervalMs));
    }
    botMsg.content = botReply;
    if (bodyEl) bodyEl.innerHTML = renderMarkdown(botReply);
  }

  if (messagesList) bindMessageActions(messagesList);

  AppState.isGenerating = false;
  saveState();
  renderSidebarHistory();
  SoundEngine.play('receive');
  scrollToBottom();
  updateSuggestionChips();

  if (AppState.settings.autoSpeech) {
    speakText(botReply);
  }
}

function handleInputChange() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  if (!input || !sendBtn) return;

  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 180) + 'px';
  sendBtn.disabled = !input.value.trim() || AppState.isGenerating;
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';

  html.setAttribute('data-theme', newTheme);
  AppState.theme = newTheme;
  saveState();

  const sun = document.querySelector('.sun-icon');
  const moon = document.querySelector('.moon-icon');
  if (newTheme === 'light') {
    sun?.classList.add('hidden');
    moon?.classList.remove('hidden');
  } else {
    sun?.classList.remove('hidden');
    moon?.classList.add('hidden');
  }
  SoundEngine.play('click');
}

function toggleSound() {
  AppState.settings.soundEnabled = !AppState.settings.soundEnabled;
  SoundEngine.enabled = AppState.settings.soundEnabled;
  saveState();

  const soundOn = document.querySelector('.sound-on-icon');
  const soundOff = document.querySelector('.sound-off-icon');
  if (AppState.settings.soundEnabled) {
    soundOn?.classList.remove('hidden');
    soundOff?.classList.add('hidden');
    SoundEngine.play('click');
  } else {
    soundOn?.classList.add('hidden');
    soundOff?.classList.remove('hidden');
  }
}

function exportCurrentChat() {
  const chat = getCurrentChat();
  if (!chat || chat.messages.length === 0) {
    alert('There are no messages in the current conversation to export.');
    return;
  }

  let markdown = `# ${chat.title || 'Conversation with Aura AI'}\n`;
  markdown += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  chat.messages.forEach(msg => {
    const roleName = msg.role === 'user' ? '👤 User' : '🤖 Aura AI';
    markdown += `### ${roleName} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n`;
    markdown += `${msg.content}\n\n---\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Aura_Chat_${chat.id}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  SoundEngine.play('click');
}

// --------------------------------------------------------------------------
// 8. Settings Modal & Supabase Configuration
// --------------------------------------------------------------------------
function openSettings() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  const modeSimulated = document.getElementById('modeSimulated');
  const modeGemini = document.getElementById('modeGemini');
  const apiKeyGroup = document.getElementById('apiKeySettingGroup');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const typingSpeedSelect = document.getElementById('typingSpeedSelect');
  const autoSpeechToggle = document.getElementById('autoSpeechToggle');

  // Populate Gemini
  if (AppState.settings.intelligenceMode === 'gemini') {
    if (modeGemini) modeGemini.checked = true;
    apiKeyGroup?.classList.remove('hidden');
  } else {
    if (modeSimulated) modeSimulated.checked = true;
    apiKeyGroup?.classList.add('hidden');
  }
  if (apiKeyInput) apiKeyInput.value = AppState.settings.geminiApiKey || '';
  if (typingSpeedSelect) typingSpeedSelect.value = AppState.settings.typingSpeed || 'natural';
  if (autoSpeechToggle) autoSpeechToggle.checked = !!AppState.settings.autoSpeech;

  // Populate Supabase
  const urlInput = document.getElementById('supabaseUrlInput');
  if (urlInput && AppState.supabase.url) {
    urlInput.placeholder = AppState.supabase.url;
  }

  syncSupabaseStatus();

  modal.classList.remove('hidden');
  SoundEngine.play('click');
}

function closeSettings() {
  document.getElementById('settingsModal')?.classList.add('hidden');
}

function saveSettings() {
  const modeGemini = document.getElementById('modeGemini');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const typingSpeedSelect = document.getElementById('typingSpeedSelect');
  const autoSpeechToggle = document.getElementById('autoSpeechToggle');

  AppState.settings.intelligenceMode = modeGemini?.checked ? 'gemini' : 'simulated';
  AppState.settings.geminiApiKey = apiKeyInput?.value.trim() || '';
  AppState.settings.typingSpeed = typingSpeedSelect?.value || 'natural';
  AppState.settings.autoSpeech = !!autoSpeechToggle?.checked;

  saveState();
  renderPersonaDisplay();
  closeSettings();
  SoundEngine.play('click');
}

async function handleTestSupabase() {
  const urlInput = document.getElementById('supabaseUrlInput');
  const keyInput = document.getElementById('supabaseKeyInput');
  const feedback = document.getElementById('supabaseFeedbackMsg');
  const testBtn = document.getElementById('testSupabaseBtn');

  const url = urlInput?.value.trim();
  const key = keyInput?.value.trim();

  if (!url || !key) {
    if (feedback) {
      feedback.style.color = 'var(--accent-rose)';
      feedback.textContent = 'Please enter both Supabase Project URL and Anon Key.';
    }
    return;
  }

  if (testBtn) testBtn.textContent = 'Connecting...';
  if (feedback) {
    feedback.style.color = 'var(--text-muted)';
    feedback.textContent = 'Contacting Supabase PostgreSQL...';
  }

  try {
    const res = await ApiClient.updateSupabaseConfig(url, key);
    if (testBtn) testBtn.textContent = 'Connect & Test Database';

    if (res.connected) {
      if (feedback) {
        feedback.style.color = 'var(--accent-emerald)';
        feedback.textContent = '✅ Connected successfully to Supabase! Tables verified.';
      }
      await syncSupabaseStatus();
      await loadCloudConversations();
    } else {
      if (feedback) {
        feedback.style.color = 'var(--accent-amber)';
        feedback.textContent = `⚠️ Connection attempt returned: ${res.error || 'Check credentials or run schema.sql.'}`;
      }
      await syncSupabaseStatus();
    }
  } catch (err) {
    if (testBtn) testBtn.textContent = 'Connect & Test Database';
    if (feedback) {
      feedback.style.color = 'var(--accent-rose)';
      feedback.textContent = `❌ Error: ${err.message}`;
    }
  }
}

// --------------------------------------------------------------------------
// 9. Lifecycle & Initial Setup
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await loadClientEnv();
  loadState();

  // Apply theme & sound
  document.documentElement.setAttribute('data-theme', AppState.theme);
  if (AppState.theme === 'light') {
    document.querySelector('.sun-icon')?.classList.add('hidden');
    document.querySelector('.moon-icon')?.classList.remove('hidden');
  }
  if (!AppState.settings.soundEnabled) {
    document.querySelector('.sound-on-icon')?.classList.add('hidden');
    document.querySelector('.sound-off-icon')?.classList.remove('hidden');
  }

  // Check Backend Health & load personas
  try {
    const health = await ApiClient.checkHealth();
    AppState.backendConnected = health.connected;
    if (health.connected) {
      const personasList = await ApiClient.getPersonas();
      personasList.forEach(p => {
        AppState.personas[p.id] = p;
      });
    }
  } catch (err) {
    console.warn('[Frontend] Backend healthcheck notice:', err);
  }

  if (Object.keys(AppState.personas).length === 0) {
    AppState.personas = {
      nexus: { id: 'nexus', name: 'Nexus Core', badge: 'Nexus Core', icon: '🧠', meta: 'Client Fallback' },
      coder: { id: 'coder', name: 'Code Architect', badge: 'Code Architect', icon: '💻', meta: 'Senior Systems Architect' },
      creative: { id: 'creative', name: 'Creative Spark', badge: 'Creative Spark', icon: '🎨', meta: 'Visionary Muse' },
      zen: { id: 'zen', name: 'Zen Guide', badge: 'Zen Guide', icon: '🧘', meta: 'Mindful Philosophy' }
    };
  }

  if (AppState.chats.length === 0) {
    createNewChat();
  } else if (!AppState.currentChatId) {
    AppState.currentChatId = AppState.chats[0].id;
  }

  initSpeech();
  renderPersonaDisplay();
  renderSidebarHistory();
  renderChatViewport();

  // Sync Supabase status & fetch any cloud conversations
  await syncSupabaseStatus();
  await loadCloudConversations();

  // Bind Buttons
  document.getElementById('newChatBtn')?.addEventListener('click', createNewChat);
  document.getElementById('clearChatBtn')?.addEventListener('click', clearCurrentChat);
  document.getElementById('exportChatBtn')?.addEventListener('click', exportCurrentChat);
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('soundToggleBtn')?.addEventListener('click', toggleSound);

  // Mobile Drawer
  document.getElementById('openSidebarBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.add('open');
  });
  document.getElementById('closeSidebarBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
  });
  document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
  });

  // Settings Modal
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
  document.getElementById('closeSettingsBtn')?.addEventListener('click', closeSettings);
  document.getElementById('cancelSettingsBtn')?.addEventListener('click', closeSettings);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('testSupabaseBtn')?.addEventListener('click', handleTestSupabase);
  document.getElementById('dbStatusPill')?.addEventListener('click', openSettings);

  document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
    if (confirm('Delete all stored chats and preferences?')) {
      localStorage.clear();
      location.reload();
    }
  });

  document.querySelectorAll('input[name="intelligenceMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const apiKeyGroup = document.getElementById('apiKeySettingGroup');
      if (e.target.value === 'gemini') {
        apiKeyGroup?.classList.remove('hidden');
      } else {
        apiKeyGroup?.classList.add('hidden');
      }
    });
  });

  document.getElementById('toggleApiKeyVis')?.addEventListener('click', () => {
    const input = document.getElementById('apiKeyInput');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('toggleDbKeyVis')?.addEventListener('click', () => {
    const input = document.getElementById('supabaseKeyInput');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Voice
  document.getElementById('voiceBtn')?.addEventListener('click', toggleVoice);

  // Attachments
  const fileInput = document.getElementById('fileInputHidden');
  document.getElementById('attachFileBtn')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const nameEl = document.getElementById('attachmentName');
      if (nameEl) nameEl.textContent = `📎 ${file.name} (${Math.round(file.size / 1024)} KB)`;
      document.getElementById('attachmentPreview')?.classList.remove('hidden');
    }
  });
  document.getElementById('removeAttachmentBtn')?.addEventListener('click', () => {
    if (fileInput) fileInput.value = '';
    document.getElementById('attachmentPreview')?.classList.add('hidden');
  });

  // Persona tabs
  document.querySelectorAll('.persona-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const p = tab.getAttribute('data-persona');
      if (p) {
        AppState.activePersona = p;
        saveState();
        renderPersonaDisplay();
        SoundEngine.play('click');
      }
    });
  });

  // Prompt starter cards
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt) sendMessage(prompt);
    });
  });

  // Textarea input
  const msgInput = document.getElementById('messageInput');
  msgInput?.addEventListener('input', handleInputChange);
  msgInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  document.getElementById('sendBtn')?.addEventListener('click', () => sendMessage());

  // Global Shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      createNewChat();
    }
  });
});
