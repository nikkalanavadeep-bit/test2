/**
 * ============================================================================
 * FRONTEND API CLIENT: api.js
 * ============================================================================
 * Handles HTTP requests to the Backend REST API, including chat generation
 * and Supabase cloud database synchronization.
 */

import { ENV } from './env.js';

function getBaseUrl() {
  return ENV.API_BASE_URL || window.location.origin;
}

export const ApiClient = {
  /**
   * Check backend server & database health
   */
  async checkHealth() {
    try {
      const start = performance.now();
      const res = await fetch(`${getBaseUrl()}/api/health`);
      const latency = Math.round(performance.now() - start);
      if (!res.ok) throw new Error(`Healthcheck failed: ${res.status}`);
      const data = await res.json();
      return { ...data, latencyMs: latency, connected: true };
    } catch (err) {
      console.warn('Backend offline or unreachable:', err);
      return { connected: false, error: err.message };
    }
  },

  /**
   * Fetch current Supabase configuration & connection status
   */
  async getSupabaseStatus() {
    try {
      const res = await fetch(`${getBaseUrl()}/api/supabase/status`);
      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      return { configured: false, connected: false, error: err.message };
    }
  },

  /**
   * Update Supabase credentials dynamically
   */
  async updateSupabaseConfig(url, key) {
    const res = await fetch(`${getBaseUrl()}/api/supabase/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, key })
    });
    return await res.json();
  },

  /**
   * Fetch all conversations from Supabase
   */
  async fetchConversations() {
    try {
      const res = await fetch(`${getBaseUrl()}/api/conversations`);
      if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
      const data = await res.json();
      return data.conversations || [];
    } catch (err) {
      console.warn('Could not fetch conversations from database:', err);
      return [];
    }
  },

  /**
   * Delete a conversation from Supabase
   */
  async deleteConversation(id) {
    try {
      const res = await fetch(`${getBaseUrl()}/api/conversations/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (err) {
      console.warn('Failed to delete conversation on server:', err);
      return { success: false };
    }
  },

  /**
   * Fetch messages for a specific conversation from Supabase
   */
  async fetchMessages(conversationId) {
    try {
      const res = await fetch(`${getBaseUrl()}/api/conversations/${encodeURIComponent(conversationId)}/messages`);
      if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
      const data = await res.json();
      return data.messages || [];
    } catch (err) {
      console.warn('Failed to fetch messages from database:', err);
      return [];
    }
  },

  /**
   * Fetch configured AI personas from backend
   */
  async getPersonas() {
    try {
      const res = await fetch(`${getBaseUrl()}/api/personas`);
      if (!res.ok) throw new Error(`Failed to load personas: ${res.status}`);
      const data = await res.json();
      return data.personas || [];
    } catch (err) {
      console.error('Failed to fetch personas from backend:', err);
      return [];
    }
  },

  /**
   * Send a user message to backend /api/chat
   */
  async sendChatMessage({ message, persona, history, mode, apiKey, conversationId, userMessageId }) {
    const res = await fetch(`${getBaseUrl()}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        persona,
        history,
        mode,
        apiKey,
        conversationId,
        userMessageId
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Server responded with status ${res.status}`);
    }

    return data.data;
  }
};
