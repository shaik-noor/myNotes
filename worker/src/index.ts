import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  APP_URL?: string
}

const SCOPES =
  'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

// Health check
app.get('/', (c) => {
  const isConfigured = Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET)
  return c.json({
    service: 'myNotes Google OAuth Relay',
    status: 'healthy',
    configured: isConfigured,
    version: '1.0.0'
  })
})

// Step 1: Start login from Desktop App
app.get('/auth/login', (c) => {
  const port = c.req.query('port')
  const state = c.req.query('state') || ''
  const codeChallenge = c.req.query('code_challenge') || ''

  if (!port || Number.isNaN(Number(port))) {
    return c.text('Invalid or missing desktop loopback port parameter', 400)
  }

  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.text('Cloudflare Worker missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET secrets', 500)
  }

  // Pack desktop return coordinates into the state token
  const statePayload = btoa(
    JSON.stringify({
      port: Number(port),
      state,
      challenge: codeChallenge
    })
  )

  const origin = c.env.APP_URL || new URL(c.req.url).origin
  const redirectUri = `${origin}/callback`

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: statePayload
  })

  // Google OAuth URL (Worker uses confidential client secret on exchange, no PKCE required)
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return c.redirect(googleAuthUrl)
})

// Step 2: Google redirects here after user signs in
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  const stateParam = c.req.query('state')
  const errorParam = c.req.query('error')

  let port = 0
  let originalState = ''

  if (stateParam) {
    try {
      const decoded = JSON.parse(atob(stateParam))
      port = decoded.port || 0
      originalState = decoded.state || ''
    } catch (e) {
      console.error('Failed to parse state:', e)
    }
  }

  if (errorParam || !code) {
    const errorMsg = errorParam || 'Authentication was cancelled'
    if (port > 0) {
      return c.redirect(
        `http://127.0.0.1:${port}/callback?error=${encodeURIComponent(errorMsg)}&state=${encodeURIComponent(originalState)}`
      )
    }
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Cancelled</title></head>
        <body style="font-family: -apple-system, sans-serif; background: #0f1115; color: #f87171; text-align: center; padding: 60px 20px;">
          <h2>Authentication Cancelled</h2>
          <p style="color: #94a3b8;">${errorMsg}</p>
        </body>
      </html>
    `)
  }

  const origin = c.env.APP_URL || new URL(c.req.url).origin
  const redirectUri = `${origin}/callback`

  // Exchange authorization code for tokens securely on Cloudflare Worker
  const tokenParams = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    client_secret: c.env.GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  })

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    console.error('Token exchange failed:', errText)
    if (port > 0) {
      return c.redirect(
        `http://127.0.0.1:${port}/callback?error=${encodeURIComponent('Token exchange failed')}&state=${encodeURIComponent(originalState)}`
      )
    }
    return c.text(`Token exchange failed: ${errText}`, 400)
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  // Fetch user profile info
  let userInfo: { email?: string; name?: string; picture?: string } = {}
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    if (userRes.ok) {
      userInfo = (await userRes.json()) as { email?: string; name?: string; picture?: string }
    }
  } catch (e) {
    console.error('Failed to fetch userinfo:', e)
  }

  const payload = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || '',
    expiresIn: tokenData.expires_in || 3600,
    email: userInfo.email || '',
    name: userInfo.name || '',
    picture: userInfo.picture || ''
  }

  const encodedPayload = encodeURIComponent(JSON.stringify(payload))
  const desktopLoopbackUrl = `http://127.0.0.1:${port}/callback?token_data=${encodedPayload}&state=${encodeURIComponent(originalState)}`

  // Deliver tokens to local desktop loopback and show success page
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Connected to Google Drive - myNotes</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #090a0f;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            background: #141721;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 48px 36px;
            text-align: center;
            max-width: 440px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          }
          .icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #3b82f6;
            font-size: 36px;
            margin-bottom: 24px;
          }
          h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.02em;
          }
          p {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 20px;
          }
          .badge {
            display: inline-block;
            background: rgba(16, 185, 129, 0.12);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 999px;
            padding: 4px 14px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
          }
          .hint {
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <span class="badge">Connected</span>
          <h1>Google Drive Connected!</h1>
          <p>
            ${userInfo.email ? `Signed in as <strong>${userInfo.email}</strong>.<br />` : ''}
            Your notes and attachments will now automatically sync with your private Google Drive vault.
          </p>
          <div class="hint">Returning to myNotes... you can close this window.</div>
        </div>
        <script>
          // Send tokens directly to the local desktop app loopback server
          fetch('${desktopLoopbackUrl}').catch(function() {
            window.location.href = '${desktopLoopbackUrl}';
          });
          setTimeout(function() {
            window.location.href = '${desktopLoopbackUrl}';
          }, 300);
          setTimeout(function() {
            window.close();
          }, 2500);
        </script>
      </body>
    </html>
  `)
})

// Step 3: Refresh access token securely using Cloudflare Worker secret
app.post('/auth/refresh', async (c) => {
  let body: { refreshToken?: string } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON request body' }, 400)
  }

  const refreshToken = body.refreshToken
  if (!refreshToken) {
    return c.json({ success: false, error: 'Missing refreshToken in request body' }, 400)
  }

  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.json(
      { success: false, error: 'Server missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' },
      500
    )
  }

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    client_secret: c.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    console.error('Token refresh failed:', errText)
    return c.json({ success: false, error: `Token refresh failed: ${errText}` }, 400)
  }

  const data = (await tokenRes.json()) as {
    access_token: string
    expires_in?: number
  }

  return c.json({
    success: true,
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600
  })
})

export default app
