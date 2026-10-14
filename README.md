# AURA AI — Full-Stack Conversational Intelligence with Supabase

Aura AI is deployed with a **decoupled cloud architecture**:
- **Backend API**: Hosted on [Render](https://render.com) with live Supabase PostgreSQL connection.
- **Frontend Client**: Deployed on [Vercel](https://vercel.com) connecting to the Render API.

---

## 🌐 Live Production Deployments

| Component | Cloud Host | Live URL | Status |
| :--- | :--- | :--- | :--- |
| **Backend API** | Render | **[https://aura-ai-backend-ldwh.onrender.com](https://aura-ai-backend-ldwh.onrender.com)** | 🟢 **Live & Connected** |
| **Render Dashboard** | Render | **[View on Render](https://dashboard.render.com/web/srv-db7h9sbbc2fs73f7i0n0)** | 🟢 Active |
| **Database** | Supabase | **[https://rivyzejondzoggnviayt.supabase.co](https://rivyzejondzoggnviayt.supabase.co)** | 🟢 Active |
| **Frontend** | Vercel | **Deploy via [vercel.com/new](https://vercel.com/new)** | 🚀 Ready |

---

## 🚀 Deploy Frontend to Vercel (1-Click)

The repository includes [vercel.json](vercel.json) and [frontend/vercel.json](frontend/vercel.json) pre-configured with API proxying to Render:

1. Open **[https://vercel.com/new](https://vercel.com/new)**.
2. Select **`nikkalanavadeep-bit/test2`** and click **Import**.
3. In **Root Directory**, select **`frontend`** (or leave root with the included `vercel.json`).
4. Click **Deploy**.

Alternatively, via terminal:
```bash
cd frontend
npx vercel --prod
```

---

## 📡 Live API Endpoints (Render)

- Healthcheck: `GET https://aura-ai-backend-ldwh.onrender.com/api/health`
- Personas: `GET https://aura-ai-backend-ldwh.onrender.com/api/personas`
- Chat Inference: `POST https://aura-ai-backend-ldwh.onrender.com/api/chat`
- Database Schema: `GET https://aura-ai-backend-ldwh.onrender.com/schema.sql`
