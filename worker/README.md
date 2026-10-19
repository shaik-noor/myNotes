# myNotes Cloudflare Auth Relay (Hono)

A lightweight, zero-latency Google OAuth relay built with **[Hono](https://hono.dev/)** on **Cloudflare Workers**.

This worker protects the `GOOGLE_CLIENT_SECRET` completely on Cloudflare's secure edge infrastructure. The distributed `myNotes` desktop application binaries never contain the secret, ensuring complete security even in public open-source releases.

---

## 🚀 Quick Setup & Deployment

### 1. In Google Cloud Console:
1. Open [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services**.
2. Enable the **Google Drive API**.
3. Under **Credentials** -> **Create Credentials** -> **OAuth client ID**:
   - Application type: **Web application** (or Desktop app)
   - Authorized redirect URIs:
     - `https://<your-worker-name>.<your-subdomain>.workers.dev/callback`
     - (For local testing: `http://localhost:8787/callback`)

### 2. Set Cloudflare Secrets:
```bash
cd worker

# Login to Cloudflare (free account)
npx wrangler login

# Set Google OAuth credentials as encrypted Cloudflare secrets
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### 3. Deploy to Cloudflare:
```bash
npx wrangler deploy
```

Once deployed, copy your worker URL (e.g., `https://mynotes-auth.<your-subdomain>.workers.dev`) and set it in your root `.env`:
```env
AUTH_SERVER_URL=https://mynotes-auth.<your-subdomain>.workers.dev
```

---

## 🛠️ Local Development

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
# Fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .dev.vars
npm run dev
```
Worker will run locally on `http://localhost:8787`.
