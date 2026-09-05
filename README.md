# WhatsApp AI Agent

A production-ready WhatsApp AI agent built with Next.js (App Router), the
official Meta WhatsApp Business API, Supabase, and OpenRouter. Replaces n8n
with a single app that handles the webhook, generates AI replies, and
provides a live dashboard of all conversations.

```
User sends WhatsApp message
  → Meta forwards to our webhook (POST /api/webhook)
  → App extracts message, stores in DB
  → App sends message to AI model (OpenRouter)
  → App sends AI response back via Meta Graph API
  → App stores AI response in DB
  → Frontend dashboard shows all conversations in real-time
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Apply the schema in [`supabase/migrations/0001_create_conversations_and_messages.sql`](supabase/migrations/0001_create_conversations_and_messages.sql)
using the Supabase SQL editor, the Supabase CLI, or the Supabase MCP server's
`apply_migration` tool.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your
  Supabase project's API settings.
- `SUPABASE_SERVICE_ROLE_KEY` — same page, service role secret (server-only,
  never exposed to the browser).
- `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` — from your Meta App's
  WhatsApp product. Use a permanent token from a System User so it never
  expires.
- `WHATSAPP_VERIFY_TOKEN` — any string you choose; you'll enter the same
  value when configuring the webhook in Meta's dashboard.
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` — from https://openrouter.ai.

### 4. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` for the dashboard.

To receive real WhatsApp webhooks locally, tunnel port 3000 (e.g. with
`ngrok http 3000`) and use that URL when configuring the webhook below.

### 5. Configure the Meta webhook

In Meta App Dashboard → WhatsApp → Configuration:

- Callback URL: `https://<your-domain>/api/webhook`
- Verify token: same value as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the `messages` webhook field

### 6. Deploy

Deploy to Vercel (or any Node.js host) and set the same environment
variables in the hosting provider's dashboard.

## How it works

- **`POST /api/webhook`** — receives incoming WhatsApp messages, stores them,
  and (when the conversation is in `agent` mode) generates and sends an AI
  reply via OpenRouter. Always responds `200` quickly so Meta doesn't retry.
- **`GET /api/webhook`** — handles Meta's webhook verification handshake.
- **Conversation modes**: each conversation is either `agent` (AI replies
  automatically) or `human` (messages are stored only; a person replies from
  the dashboard). Toggle this from the chat panel.
- **Dashboard** (`/`) — lists conversations sorted by latest activity, shows
  full message history for the selected conversation, and updates in real
  time via Supabase Realtime.

## Project structure

```
src/
  app/
    page.tsx                  Dashboard UI
    api/webhook/route.ts      Meta webhook (GET verify, POST receive)
    api/conversations/        REST API for the dashboard
  components/
    ConversationSidebar.tsx
    ChatPanel.tsx
  lib/
    supabase-server.ts        Service-role client (server only)
    supabase-browser.ts       Anon client (browser, realtime)
    whatsapp.ts                sendWhatsAppMessage()
    ai.ts                     generateReply() via OpenRouter
    types.ts
supabase/migrations/          SQL schema
```
