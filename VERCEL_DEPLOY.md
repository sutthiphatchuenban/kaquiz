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
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Required for AI quiz generation through OpenRouter free models. |
| `NVIDIA_API_KEY` | `nvapi-...` | Recommended fallback when OpenRouter free capacity is busy. |
| `AI_GENERATION_BUDGET_MS` | `240000` | Optional AI request budget. Keep this below the function duration. |

5. In **Settings → Functions**, set the function duration to 300 seconds. The AI route reserves 30 seconds for cold starts, model discovery, and response serialization.
6. Click **Deploy** (or redeploy after changing environment variables).

---

## Part 3: Test It

1. Open your Vercel deployment URL.
2. Login and Try to Host a Game.
3. Join the game from another tab/device.
4. If players can join and the game starts, your connection is working!

### Troubleshooting
- **Game doesn't start?** Check the Browser Console (F12) for connection errors. Ensure `NEXT_PUBLIC_SOCKET_URL` is correct and starts with `https://`.
- **Database errors?** Ensure your database provider (Neon) allows connections from "All IP addresses" since Vercel IPs change dynamicallly.
