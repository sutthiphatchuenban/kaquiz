# Vercel Deployment Guide for KaQuiz

Since this project uses **Socket.io** for real-time game features, deploying to Vercel requires a specific setup. Vercel's serverless environment does not support long-running WebSocket connections.

Therefore, we need to deploy the application in two parts:
1. **Next.js App (Frontend & API)** -> Deployed to **Vercel**.
2. **Socket Server (Real-time Engine)** -> Deployed to a service that supports persistent Node.js servers (like **Render** or **Railway**).

---

## Part 1: Deploy Socket Server (Render.com)

We have created a standalone `socket-server.js` file in your project root for this purpose.

1. Push your code to **GitHub**.
2. Go to [Render.com](https://render.com) and create a **New Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name**: `kaquiz-socket` (or similar)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node socket-server.js`
5. Click **Deploy**.
6. Once deployed, copy the **URL** (e.g., `https://kaquiz-socket.onrender.com`). You will need this for Part 2.

---

## Part 2: Deploy Next.js App (Vercel)

1. Go to [Vercel](https://vercel.com) and add a **New Project**.
2. Import your GitHub repository.
3. In the **Configure Project** step, open **Environment Variables**.
4. Add the following variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Copy from your local `.env`. Ensure your Neon DB allows connections from Vercel. |
| `JWT_SECRET` | `...` | Generate a random secret string (e.g., `openssl rand -base64 32`). |
| `ADMIN_EMAILS` | `admin@example.com` | Comma-separated emails allowed to access `/admin`. The accounts must already be registered. |
| `UPLOADTHING_TOKEN` | `...` | Copy from your local `.env`. |
| `NEXT_PUBLIC_SOCKET_URL` | `https://kaquiz-socket.onrender.com` | **Crucial**: The URL from Part 1 (no trailing slash). |
| `GEMINI_API_KEY` | `AQ...` / `AIza...` | **First provider in the chain.** Google Gemini, pinned to the single model `gemini-flash-lite-latest`. |
| `GEMINI_API_KEY2` | `AQ...` | Optional second key for the *same* Gemini model. Free tiers are rate limited per key, so this acts as a real fallback. |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` | Optional override of the Gemini endpoint. |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Required for AI quiz generation through OpenRouter free models. Free models are capped per day on OpenRouter's side. |
| `NVIDIA_API_KEY` | `nvapi-...` | Recommended fallback when OpenRouter free capacity is busy. |
| `GROQ_API_KEY` | `gsk_...` | Optional fallback. Groq is the fastest free option. |
| `CEREBRAS_API_KEY` | `csk-...` | Optional fallback. |
| `MISTRAL_API_KEY` | `...` | Optional fallback. |
| `AI_PROVIDER_ORDER` | `gemini,gemini2,openrouter,nvidia` | Optional. Comma-separated provider order; providers not listed keep their default position. |
| `AI_GENERATION_BUDGET_MS` | `110000` | Optional per-request AI budget. Must stay below the function duration. |

5. In **Settings → Functions**, set the function duration to 300 seconds. This is only a ceiling: each AI request keeps itself well below it (see below) and reserves 30 seconds for cold starts, model discovery, and response serialization.
6. Click **Deploy** (or redeploy after changing environment variables).

---

## How AI generation avoids the 300s function limit

A Vercel function that outlives its duration is killed, and the platform then answers with a plain-text 504 page the client cannot parse. Trying to squeeze a 15-question request into that window is what used to leave users with 8 questions and a vague error, so generation is split into rounds instead:

1. The browser asks `/api/ai/generate-questions` for the full count.
2. The route works through the whole model chain until `AI_GENERATION_BUDGET_MS` (default 110s) runs out, then answers with what it produced plus `complete: false` and `remaining: N`.
3. The browser immediately requests the remainder, sending back the questions it already has so the model does not repeat them, and merges the answers into one list.
4. The loop repeats (up to 6 rounds, 9 minutes) until the requested count is complete. Every round is a fresh invocation with a fresh time budget, so the platform limit never truncates the result and the user sees progress like `12/15`.

A model that fails hard is benched for three minutes, so later rounds skip it instead of spending their budget on a model that is known to be down. Timeouts never bench a model.

The default provider order is `gemini` → `gemini2` → `openrouter` → `nvidia` → `groq` → `cerebras` → `mistral`. Gemini is pinned to `gemini-flash-lite-latest` (no catalog request, one key per entry), while the other providers are discovered live from `/v1/models` and ranked. Providers without an API key are skipped, so adding a key simply lengthens the fallback chain (each discovered provider contributes up to 6 models).

---

## Part 3: Test It

1. Open your Vercel deployment URL.
2. Login and Try to Host a Game.
3. Join the game from another tab/device.
4. If players can join and the game starts, your connection is working!

### Troubleshooting
- **Game doesn't start?** Check the Browser Console (F12) for connection errors. Ensure `NEXT_PUBLIC_SOCKET_URL` is correct and starts with `https://`.
- **Database errors?** Ensure your database provider (Neon) allows connections from "All IP addresses" since Vercel IPs change dynamicallly.
