# myNotes Cloudflare Auth Relay (Hono)

A lightweight, zero-latency Google OAuth relay built with **[Hono](https://hono.dev/)** on **Cloudflare Workers**.

This worker protects the `GOOGLE_CLIENT_SECRET` completely on Cloudflare's secure edge infrastructure. The distributed `myNotes` desktop application binaries never contain the secret, ensuring complete security even in public open-source releases.

## 🔐 Flow

1. App opens `/auth/login?port&state&code_challenge`; the worker redirects to Google with the app's PKCE challenge.
2. Google redirects to `/callback`; the worker forwards only the one-time `code` to `http://127.0.0.1:<port>/callback`.
3. The app POSTs `{ code, codeVerifier }` to `/auth/token`; the worker adds the client secret and returns tokens in the response body.
4. The app POSTs `{ refreshToken }` to `/auth/refresh` to get new access tokens.

`/`, `/privacy` and `/terms` redirect to the myNotes pages on www.noruj.com; `/health` is a JSON health check.

Tokens never pass through the browser, and an intercepted code is useless without the app's PKCE verifier. `/auth/*` is rate limited per IP.

---

## 🚀 Quick Setup & Deployment

### 1. In Google Cloud Console (Google Auth Platform):
1. **APIs & Services → Library**: enable the **Google Drive API**.
2. **Google Auth Platform → Clients**: create (or open) an OAuth client of type **Web application**. Desktop clients can't use an https redirect URI.
   - **Authorized redirect URIs**: `https://auth.noruj.com/callback` (must match `APP_URL` + `/callback` exactly)
   - Leave **Authorized JavaScript origins** empty.
   - For local relay testing, use a *separate* dev client with `http://localhost:8787/callback`.
3. **Data Access**: add only `.../auth/drive.appdata`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. All three are non-sensitive, so you don't need a sensitive-scope review.
4. **Branding**: app name `myNotes`, plus a support email.
   - Home page: `https://www.noruj.com/mynotes`
   - Privacy policy: `https://www.noruj.com/mynotes/privacy`
   - Terms of service: `https://www.noruj.com/mynotes/terms`
   - **Authorized domains**: `noruj.com`
   - The domain must be verified in [Search Console](https://search.google.com/search-console) (Domain property) by an account that is an Owner of the Cloud project.
5. **Audience → Publish app**: move from *Testing* to *In production*. In Testing mode only test users can sign in, and refresh tokens expire after 7 days.

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
