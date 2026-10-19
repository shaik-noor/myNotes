# myNotes Cloudflare Auth Relay (Hono)

A lightweight, zero-latency Google OAuth relay built with **[Hono](https://hono.dev/)** on **Cloudflare Workers**.

This worker protects the `GOOGLE_CLIENT_SECRET` completely on Cloudflare's secure edge infrastructure. The distributed `myNotes` desktop application binaries never contain the secret, ensuring complete security even in public open-source releases.

## 🔐 Flow

1. App opens `/auth/login?port&state&code_challenge`; the worker redirects to Google with the app's PKCE challenge.
2. Google redirects to `/callback`; the worker forwards only the one-time `code` to `http://127.0.0.1:<port>/callback`.
3. The app POSTs `{ code, codeVerifier }` to `/auth/token`; the worker adds the client secret and returns tokens in the response body.
4. The app POSTs `{ refreshToken }` to `/auth/refresh` to get new access tokens.

Tokens never pass through the browser, and an intercepted code is useless without the app's PKCE verifier. `/auth/*` is rate limited per IP.

---

## 🚀 Quick Setup & Deployment

### 1. In Google Cloud Console:
1. Open [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services**.
2. Enable the **Google Drive API**.
3. Under **Credentials** -> **Create Credentials** -> **OAuth client ID**:
   - Application type: **Web application** (required: Desktop clients can't use an https redirect URI)
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
Set `vars.APP_URL` in `wrangler.jsonc` to your worker URL (pins the OAuth redirect URI), then:
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
