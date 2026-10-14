/**
 * ============================================================================
 * FRONTEND ENVIRONMENT LOADER: env.js
 * ============================================================================
 * Bridges frontend environment variables into the browser client environment.
 */

export const ENV = {
  // Default to live Render backend in production / cloud deployments
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.origin
    : 'https://aura-ai-backend-ldwh.onrender.com',
  SUPABASE_URL: 'https://rivyzejondzoggnviayt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpdnl6ZWpvbmR6b2dnbnZpYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NDgxNzksImV4cCI6MjEwNzUyNDE3OX0.BbFPOlFyYXX5RLb6D-aln2TrLALjuLdW8hVx7mfagew',
  APP_NAME: 'AURA AI',
  APP_VERSION: '2.5.0',
  DEFAULT_THEME: 'dark',
  DEFAULT_PERSONA: 'nexus',
  ENABLE_SOUND: true
};

export async function loadClientEnv() {
  try {
    const res = await fetch('/api/config/client');
    if (res.ok) {
      const data = await res.json();
      if (data.apiBaseUrl) ENV.API_BASE_URL = data.apiBaseUrl;
      if (data.supabaseUrl) ENV.SUPABASE_URL = data.supabaseUrl;
      if (data.supabaseAnonKey) ENV.SUPABASE_ANON_KEY = data.supabaseAnonKey;
      if (data.appName) ENV.APP_NAME = data.appName;
      if (data.appVersion) ENV.APP_VERSION = data.appVersion;
      if (data.defaultTheme) ENV.DEFAULT_THEME = data.defaultTheme;
      if (data.defaultPersona) ENV.DEFAULT_PERSONA = data.defaultPersona;
      if (data.soundEnabled !== undefined) ENV.ENABLE_SOUND = data.soundEnabled;
    }
  } catch (e) {
    console.debug('[Env] Using environment fallback config');
  }
  return ENV;
}
