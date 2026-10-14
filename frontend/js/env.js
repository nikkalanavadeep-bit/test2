/**
 * ============================================================================
 * FRONTEND ENVIRONMENT LOADER: env.js
 * ============================================================================
 * Bridges frontend/.env variables into the browser client environment.
 */

export const ENV = {
  API_BASE_URL: window.location.origin,
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
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
    console.debug('[Env] Using default browser configuration');
  }
  return ENV;
}
