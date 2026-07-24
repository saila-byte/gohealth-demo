# GoHealth × Tavus onboarding demo

Express keeps the Tavus API key server-side. The React app talks to Alex via CVI.

## Setup

```bash
cp .env.example .env
# set TAVUS_API_KEY and TAVUS_PERSONA_ID
npm install
npm run dev:all
```

Open http://localhost:5173

## Flow

1. Frontend `POST /api/tavus` with `action: "create"` and `conversational_context`
2. Express creates the Tavus conversation with Alex's `pal_id`
3. Join `conversation_url` with the CVI `Conversation` component
4. On leave, `POST /api/tavus` with `action: "end"`

## Scripts

- `npm run dev:all` — Express (`:3001`) + Vite (`:5173`) with `/api` proxy
- `npm run server` — API only
- `npm run build && npm start` — production (API + `dist/`)

## Deploy (Render)

Repo: https://github.com/saila-byte/gohealth-demo

1. In [Render](https://dashboard.render.com), **New → Web Service** and connect `saila-byte/gohealth-demo`
2. Settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
3. Environment variables:
   - `TAVUS_API_KEY` — your Tavus API key
   - `TAVUS_PERSONA_ID` — Alex’s persona/pal id (see `.env.example`)
4. Deploy

Or use **New → Blueprint** with the included [`render.yaml`](render.yaml).
