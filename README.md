# AURA AI — Full-Stack Conversational Intelligence with Supabase

Aura AI is engineered with a **strict, decoupled separation of concerns** between the **Frontend (Browser Client)**, the **Backend (Node.js REST API Server)**, and **Supabase (PostgreSQL Cloud Database)**, with dedicated `.env` configuration files for both tiers.

```
test2/
├── backend/                       # 🟢 BACKEND RUNTIME (Node.js)
│   ├── .env                       # Backend private environment variables
│   ├── .env.example               # Backend template
│   ├── server.js                  # HTTP server & static frontend host
│   ├── routes/
│   │   └── chatRoutes.js          # REST endpoints (/api/chat, /api/conversations, /api/supabase/*)
│   └── services/
│       ├── botService.js          # Core intelligence engine & persona prompts
│       └── supabaseService.js     # Supabase client & PostgreSQL CRUD layer
│
├── frontend/                      # 🔵 FRONTEND RUNTIME (Browser)
│   ├── .env                       # Frontend public client environment variables
│   ├── .env.example               # Frontend template
│   ├── index.html                 # Semantic UI markup & accessibility tree
│   ├── style.css                  # Design tokens, glassmorphism, animations & themes
│   ├── js/
│   │   ├── env.js                 # Client environment loader (bridges frontend/.env)
│   │   ├── api.js                 # HTTP fetch client communicating with backend
│   │   ├── audio.js               # Web Audio API synthesizer (pure sound waves)
│   │   └── app.js                 # UI controller, speech recognition & state
│   └── assets/
│       └── avatar.jpg             # High-resolution bot avatar
│
├── supabase/                      # 🗄️ DATABASE CONFIGURATION
│   └── schema.sql                 # PostgreSQL tables, indices & RLS security policies
│
└── package.json                   # Project lifecycle scripts
```

---

## 🔐 Environment Variables Configuration

### 1. Backend Environment (`backend/.env`)
Controls the Node.js server, database connection strings, and server-side API secrets.

```env
# Server Runtime Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Supabase PostgreSQL Database Configuration
# Obtain from: https://supabase.com -> Project Settings -> API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Google Gemini AI Configuration (Optional: server-managed key for live model inference)
GEMINI_API_KEY=your-gemini-api-key-here

# Session & Security Secret (Optional)
SESSION_SECRET=aura-super-secret-key-change-in-production
```

### 2. Frontend Environment (`frontend/.env`)
Controls public client configuration, default UI preferences, and API target URLs.

```env
# Backend REST API Server URL
VITE_API_BASE_URL=http://localhost:3000

# Supabase Public Configuration (For client-side synchronization)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Application Metadata
VITE_APP_NAME="AURA AI"
VITE_APP_VERSION="2.5.0"
VITE_APP_DESCRIPTION="Next-Generation Conversational Intelligence"

# UI Defaults
VITE_DEFAULT_THEME=dark
VITE_DEFAULT_PERSONA=nexus
VITE_ENABLE_SOUND=true
VITE_ENABLE_SPEECH_RECOGNITION=true
VITE_ENABLE_TEXT_TO_SPEECH=true
```

---

## 🗄️ Supabase PostgreSQL Setup Guide

1. In your [Supabase Dashboard](https://supabase.com), open the **SQL Editor**.
2. Run the script in `supabase/schema.sql` (or navigate to `http://localhost:3000/schema.sql`).
3. Add your `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `backend/.env` and `frontend/.env`.
4. Run `npm start`.
