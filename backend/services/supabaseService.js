/**
 * ============================================================================
 * BACKEND SERVICE: supabaseService.js
 * ============================================================================
 * Manages Supabase client initialization, connection verification,
 * and database CRUD operations for conversations and message persistence.
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = process.env.SUPABASE_URL || '';
    this.key = process.env.SUPABASE_ANON_KEY || '';
    this.isConnected = false;
    this.lastError = null;

    // In-memory fallback repository when Supabase is not configured
    this.memoryConversations = [];
    this.memoryMessages = [];

    if (this.url && this.key) {
      this.initClient(this.url, this.key);
    }
  }

  /**
   * Initialize or reconfigure Supabase client
   */
  initClient(url, key) {
    if (!url || !key) {
      this.client = null;
      this.isConnected = false;
      this.url = '';
      this.key = '';
      return false;
    }

    try {
      this.url = url.trim();
      this.key = key.trim();
      this.client = createClient(this.url, this.key, {
        auth: { persistSession: false }
      });
      this.testConnection();
      return true;
    } catch (err) {
      console.error('[Supabase] Initialization failed:', err.message);
      this.client = null;
      this.isConnected = false;
      this.lastError = err.message;
      return false;
    }
  }

  /**
   * Test database connection to public.conversations
   */
  async testConnection() {
    if (!this.client) {
      this.isConnected = false;
      return { connected: false, error: 'Supabase client not initialized.' };
    }

    try {
      // Query 1 row from conversations
      const { data, error } = await this.client
        .from('conversations')
        .select('id')
        .limit(1);

      if (error) {
        // If table does not exist, provide helpful schema notice
        if (error.code === '42P01') {
          this.lastError = 'Table "conversations" does not exist. Please run supabase/schema.sql in your Supabase SQL Editor.';
        } else {
          this.lastError = error.message;
        }
        this.isConnected = false;
        return { connected: false, error: this.lastError };
      }

      this.isConnected = true;
      this.lastError = null;
      console.log(`[Supabase] Successfully connected to database: ${this.url}`);
      return { connected: true, error: null };
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      return { connected: false, error: err.message };
    }
  }

  /**
   * Get current Supabase status
   */
  async getStatus() {
    const isConfigured = Boolean(this.url && this.key);
    if (isConfigured && !this.isConnected) {
      await this.testConnection();
    }

    return {
      configured: isConfigured,
      connected: this.isConnected,
      url: this.url ? this.url.replace(/(https?:\/\/)(.*)/, '$1***.supabase.co') : null,
      error: this.lastError
    };
  }

  // --------------------------------------------------------------------------
  // Conversations CRUD
  // --------------------------------------------------------------------------

  async getConversations() {
    if (this.client && this.isConnected) {
      const { data, error } = await this.client
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] getConversations error:', error.message);
        return this.memoryConversations;
      }
      return data || [];
    }
    return this.memoryConversations;
  }

  async saveConversation({ id, title, persona }) {
    const now = new Date().toISOString();
    const record = {
      id: id || `chat_${Date.now()}`,
      title: title || 'New Conversation',
      persona: persona || 'nexus',
      updated_at: now
    };

    if (this.client && this.isConnected) {
      const { data, error } = await this.client
        .from('conversations')
        .upsert({
          ...record,
          created_at: now
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.warn('[Supabase] saveConversation error:', error.message);
      } else {
        return data;
      }
    }

    // Memory fallback
    const idx = this.memoryConversations.findIndex(c => c.id === record.id);
    if (idx >= 0) {
      this.memoryConversations[idx] = { ...this.memoryConversations[idx], ...record };
    } else {
      this.memoryConversations.unshift({ ...record, created_at: now });
    }
    return record;
  }

  async deleteConversation(id) {
    if (this.client && this.isConnected) {
      const { error } = await this.client
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('[Supabase] deleteConversation error:', error.message);
      }
    }

    this.memoryConversations = this.memoryConversations.filter(c => c.id !== id);
    this.memoryMessages = this.memoryMessages.filter(m => m.conversation_id !== id);
    return true;
  }

  // --------------------------------------------------------------------------
  // Messages CRUD
  // --------------------------------------------------------------------------

  async getMessages(conversationId) {
    if (this.client && this.isConnected) {
      const { data, error } = await this.client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[Supabase] getMessages error:', error.message);
        return this.memoryMessages.filter(m => m.conversation_id === conversationId);
      }
      return data || [];
    }

    return this.memoryMessages.filter(m => m.conversation_id === conversationId);
  }

  async saveMessage({ id, conversationId, role, content, durationMs = 0, tokens = 0 }) {
    const record = {
      id: id || `msg_${Date.now()}`,
      conversation_id: conversationId,
      role: role,
      content: content,
      duration_ms: durationMs,
      tokens: tokens,
      created_at: new Date().toISOString()
    };

    if (this.client && this.isConnected) {
      const { data, error } = await this.client
        .from('messages')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.warn('[Supabase] saveMessage error:', error.message);
      }

      // Also update parent conversation's updated_at
      await this.client
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (data) return data;
    }

    // Memory fallback
    this.memoryMessages.push(record);
    return record;
  }
}

// Singleton export
module.exports = new SupabaseService();
