# AURA AI — Full-Stack Conversational Intelligence

Aura AI is live in production with a **decoupled cloud architecture**:
- **Frontend Client**: Deployed on [Vercel](https://vercel.com)
- **Backend API**: Deployed on [Render](https://render.com)
- **Database**: Cloud PostgreSQL on [Supabase](https://supabase.com)

---

## 🌐 Live Production URLs

| Tier | Platform | Production URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | **[https://frontend-phi-dun-43.vercel.app](https://frontend-phi-dun-43.vercel.app)** | 🟢 **Live & Running** |
| **Backend REST API** | **Render** | **[https://aura-ai-backend-ldwh.onrender.com](https://aura-ai-backend-ldwh.onrender.com)** | 🟢 **Live & Connected** |
| **Database** | **Supabase** | **[https://rivyzejondzoggnviayt.supabase.co](https://rivyzejondzoggnviayt.supabase.co)** | 🟢 **Connected** |
| **Vercel Project Dashboard** | Vercel | **[navadeep13/frontend](https://vercel.com/navadeep13/frontend/Aj9ne7MDtSrGDLtwUfSUgcqWPf4i)** | 🟢 Active |
| **Render Service Dashboard** | Render | **[aura-ai-backend](https://dashboard.render.com/web/srv-db7h9sbbc2fs73f7i0n0)** | 🟢 Active |

---

## 🏛️ Full-Stack Communication Flow

```
[ User in Browser ]
        │
        ▼
[ Vercel Frontend ] ──> https://frontend-phi-dun-43.vercel.app
        │
        ▼ (Proxies /api/*)
[ Render Backend ] ───> https://aura-ai-backend-ldwh.onrender.com
        │
        ▼
[ Supabase Database ] ─> PostgreSQL (conversations & messages)
```

---

## 📡 Live API Endpoints

- **Health Check**: `GET https://frontend-phi-dun-43.vercel.app/api/health`
- **Personas**: `GET https://frontend-phi-dun-43.vercel.app/api/personas`
- **Chat Inference**: `POST https://frontend-phi-dun-43.vercel.app/api/chat`
- **Database Schema**: `GET https://frontend-phi-dun-43.vercel.app/schema.sql`
