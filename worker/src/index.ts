import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { secureHeaders } from 'hono/secure-headers'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  APP_URL?: string
  AUTH_LIMITER?: RateLimit
}

type AppContext = Context<{ Bindings: Bindings }>

const SCOPES =
  'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

// Input formats produced by the desktop app (see src-tauri/src/cloud.rs start_login)
const STATE_RE = /^[A-Za-z0-9_-]{16,128}$/
const PKCE_RE = /^[A-Za-z0-9._~-]{43,128}$/
const MAX_CODE_LEN = 512
const MAX_REFRESH_TOKEN_LEN = 2048

const app = new Hono<{ Bindings: Bindings }>()

// No CORS: only the native desktop app (not browsers) calls the JSON endpoints.
app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      styleSrc: ["'unsafe-inline'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"]
    },
    referrerPolicy: 'no-referrer',
    crossOriginResourcePolicy: 'same-origin'
  })
)
app.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
})
app.use('/auth/*', bodyLimit({ maxSize: 8 * 1024, onError: (c) => c.json({ success: false, error: 'Request too large' }, 413) }))
app.use('/auth/*', async (c, next) => {
  if (c.env.AUTH_LIMITER) {
    const ip = c.req.header('cf-connecting-ip') || 'unknown'
    const { success } = await c.env.AUTH_LIMITER.limit({ key: ip })
    if (!success) {
      return c.json({ success: false, error: 'Too many requests' }, 429)
    }
  }
  await next()
})

const isConfigured = (c: AppContext) => Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET)

// Must match the Authorized redirect URI registered in Google Cloud Console exactly
const redirectUri = (c: AppContext) => `${(c.env.APP_URL || new URL(c.req.url).origin).replace(/\/+$/, '')}/callback`

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string)

const errorPage = (c: AppContext, title: string, message: string, status: 400 | 500 = 400) =>
  c.html(
    `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><title>${escapeHtml(title)} - MyNotes</title></head>
  <body style="font-family: -apple-system, sans-serif; background: #0f1115; color: #f87171; text-align: center; padding: 60px 20px;">
    <h2>${escapeHtml(title)}</h2>
    <p style="color: #94a3b8;">${escapeHtml(message)}</p>
  </body>
</html>`,
    status
  )

const toBase64Url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'))

const parsePort = (value: string | undefined): number | null => {
  if (!value || !/^\d{1,5}$/.test(value)) return null
  const port = Number(value)
  return port >= 1024 && port <= 65535 ? port : null
}

// Google's `state` round-trip carries the desktop loopback port and the desktop's own CSRF state.
const decodeState = (value: string | undefined): { port: number; state: string } | null => {
  if (!value || value.length > 512) return null
  try {
    const decoded = JSON.parse(fromBase64Url(value)) as { p?: unknown; s?: unknown }
    const port = parsePort(String(decoded.p))
    const state = typeof decoded.s === 'string' && STATE_RE.test(decoded.s) ? decoded.s : null
    return port && state ? { port, state } : null
  } catch {
    return null
  }
}

const loopbackUrl = (port: number, params: Record<string, string>) =>
  `http://127.0.0.1:${port}/callback?${new URLSearchParams(params).toString()}`

const googleTokenRequest = async (params: Record<string, string>) => {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString()
  })
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  return { ok: res.ok && Boolean(data.access_token), data }
}

const readJson = async <T>(c: AppContext): Promise<T | null> => {
  try {
    return (await c.req.json()) as T
  } catch {
    return null
  }
}

// The MyNotes home page, privacy policy and terms live on the verified main site (linked from the Google consent screen)
const SITE_PAGES: Record<string, string> = {
  '/': 'https://www.noruj.com/mynotes',
  '/privacy': 'https://www.noruj.com/mynotes/privacy',
  '/terms': 'https://www.noruj.com/mynotes/terms'
}
for (const [path, target] of Object.entries(SITE_PAGES)) {
  app.get(path, (c) => c.redirect(target, 301))
}

app.get('/health', (c) =>
  c.json({
    service: 'MyNotes Google OAuth Relay',
    status: 'healthy',
    configured: isConfigured(c),
    version: '2.0.0'
  })
)

// Step 1: Desktop app opens this in the browser; we forward to Google consent with the desktop's PKCE challenge.
app.get('/auth/login', (c) => {
  const port = parsePort(c.req.query('port'))
  const state = c.req.query('state')
  const codeChallenge = c.req.query('code_challenge')

  if (!port || !state || !STATE_RE.test(state) || !codeChallenge || !PKCE_RE.test(codeChallenge)) {
    return errorPage(c, 'Invalid Request', 'Missing or invalid login parameters. Please start sign-in from the MyNotes app.')
  }
  if (!isConfigured(c)) {
    return errorPage(c, 'Service Unavailable', 'The authentication relay is not configured.', 500)
  }

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(c),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: toBase64Url(JSON.stringify({ p: port, s: state }))
  })

  return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
})

// Step 2: Google redirects here. Only the one-time, PKCE-bound code is forwarded to the desktop loopback;
// no tokens ever pass through the browser.
app.get('/callback', (c) => {
  const target = decodeState(c.req.query('state'))
  if (!target) {
    return errorPage(c, 'Invalid Request', 'This sign-in link is invalid or has expired. Please start sign-in from the MyNotes app.')
  }

  const code = c.req.query('code')
  const error = c.req.query('error')

  if (error || !code || code.length > MAX_CODE_LEN) {
    const reason = error === 'access_denied' ? 'Authentication was cancelled' : 'Authentication failed'
    return c.redirect(loopbackUrl(target.port, { error: reason, state: target.state }))
  }

  return c.redirect(loopbackUrl(target.port, { code, state: target.state }))
})

// Step 3: Desktop app redeems the code with its PKCE verifier; the client secret stays on the edge.
app.post('/auth/token', async (c) => {
  const body = await readJson<{ code?: unknown; codeVerifier?: unknown }>(c)
  const code = body?.code
  const codeVerifier = body?.codeVerifier

  if (
    typeof code !== 'string' ||
    !code ||
    code.length > MAX_CODE_LEN ||
    typeof codeVerifier !== 'string' ||
    !PKCE_RE.test(codeVerifier)
  ) {
    return c.json({ success: false, error: 'Invalid request' }, 400)
  }
  if (!isConfigured(c)) {
    return c.json({ success: false, error: 'Auth relay is not configured' }, 500)
  }

  const { ok, data } = await googleTokenRequest({
    client_id: c.env.GOOGLE_CLIENT_ID,
    client_secret: c.env.GOOGLE_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(c)
  })

  if (!ok) {
    console.error('Token exchange failed:', data.error, data.error_description)
    return c.json({ success: false, error: data.error || 'Token exchange failed' }, 400)
  }

  let userInfo: { email?: string; name?: string; picture?: string } = {}
  try {
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${data.access_token}` }
    })
    if (userRes.ok) {
      userInfo = (await userRes.json()) as typeof userInfo
    }
  } catch (e) {
    console.error('Failed to fetch userinfo:', e)
  }

  return c.json({
    success: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresIn: data.expires_in || 3600,
    email: userInfo.email || '',
    name: userInfo.name || '',
    picture: userInfo.picture || ''
  })
})

// Step 4: Refresh access token using the Cloudflare Worker secret
app.post('/auth/refresh', async (c) => {
  const body = await readJson<{ refreshToken?: unknown }>(c)
  const refreshToken = body?.refreshToken

  if (typeof refreshToken !== 'string' || !refreshToken || refreshToken.length > MAX_REFRESH_TOKEN_LEN) {
    return c.json({ success: false, error: 'Invalid request' }, 400)
  }
  if (!isConfigured(c)) {
    return c.json({ success: false, error: 'Auth relay is not configured' }, 500)
  }

  const { ok, data } = await googleTokenRequest({
    client_id: c.env.GOOGLE_CLIENT_ID,
    client_secret: c.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })

  if (!ok) {
    console.error('Token refresh failed:', data.error, data.error_description)
    // `invalid_grant` means the user revoked access or the token expired: the app should prompt a re-login
    return c.json({ success: false, error: data.error || 'Token refresh failed' }, 400)
  }

  return c.json({
    success: true,
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600
  })
})

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ success: false, error: 'Internal error' }, 500)
})

export default app
