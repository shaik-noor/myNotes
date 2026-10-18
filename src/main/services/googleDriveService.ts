import { createHash, randomBytes } from 'node:crypto'
import http from 'node:http'
import { BrowserWindow, safeStorage, shell } from 'electron'
import type { BackupManifest, CloudSyncConfig, CloudSyncResult, Result } from '../types'
import { DatabaseService } from './databaseService'

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const VAULT_FILENAME = 'mynotes_vault.json'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function encryptSecret(plainText: string): string {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return 'enc:' + safeStorage.encryptString(plainText).toString('base64')
    }
  } catch (e) {
    console.warn('safeStorage encryption failed, falling back to plaintext:', e)
  }
  return plainText
}

function decryptSecret(cipherOrPlain: string): string {
  try {
    if (cipherOrPlain.startsWith('enc:') && safeStorage.isEncryptionAvailable()) {
      const buf = Buffer.from(cipherOrPlain.slice(4), 'base64')
      return safeStorage.decryptString(buf)
    }
  } catch (e) {
    console.warn('safeStorage decryption failed:', e)
  }
  return cipherOrPlain
}

export class GoogleDriveService {
  private static isSyncing = false
  private static lastError: string | null = null
  private static debounceTimer: NodeJS.Timeout | null = null
  private static periodicTimer: NodeJS.Timeout | null = null
  private static authServer: http.Server | null = null

  static getClientId(): string {
    const fromDb = DatabaseService.getCloudSyncValue('clientId')
    if (fromDb && fromDb.trim()) return fromDb.trim()
    return process.env.GOOGLE_CLIENT_ID || ''
  }

  static getClientSecret(): string {
    const fromDb = DatabaseService.getCloudSyncValue('clientSecret')
    if (fromDb && fromDb.trim()) return decryptSecret(fromDb.trim())
    return process.env.GOOGLE_CLIENT_SECRET || ''
  }

  static getAccessToken(): string | null {
    const raw = DatabaseService.getCloudSyncValue('accessToken')
    return raw ? decryptSecret(raw) : null
  }

  static getRefreshToken(): string | null {
    const raw = DatabaseService.getCloudSyncValue('refreshToken')
    return raw ? decryptSecret(raw) : null
  }

  static getTokenExpiry(): number {
    const raw = DatabaseService.getCloudSyncValue('tokenExpiry')
    return raw ? Number.parseInt(raw, 10) : 0
  }

  static isConnected(): boolean {
    return Boolean(GoogleDriveService.getRefreshToken())
  }

  static getConfig(): CloudSyncConfig {
    const clientId = GoogleDriveService.getClientId()
    const clientSecret = GoogleDriveService.getClientSecret()
    const autoSyncVal = DatabaseService.getCloudSyncValue('autoSync')

    return {
      clientId: clientId ? clientId.slice(0, 12) + '...' : '',
      clientSecret: clientSecret ? '••••••••' : '',
      userEmail: DatabaseService.getCloudSyncValue('userEmail'),
      userName: DatabaseService.getCloudSyncValue('userName'),
      userPicture: DatabaseService.getCloudSyncValue('userPicture'),
      autoSync: autoSyncVal === null ? true : autoSyncVal === '1',
      lastSyncTime: DatabaseService.getCloudSyncValue('lastSyncTime'),
      isConnected: GoogleDriveService.isConnected(),
      isSyncing: GoogleDriveService.isSyncing,
      lastError: GoogleDriveService.lastError,
      fileId: DatabaseService.getCloudSyncValue('fileId')
    }
  }

  static saveCredentials(clientId: string, clientSecret?: string): Result {
    try {
      DatabaseService.setCloudSyncValue('clientId', clientId.trim())
      if (clientSecret !== undefined) {
        DatabaseService.setCloudSyncValue(
          'clientSecret',
          clientSecret.trim() ? encryptSecret(clientSecret.trim()) : null
        )
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  static setAutoSync(enabled: boolean): Result {
    try {
      DatabaseService.setCloudSyncValue('autoSync', enabled ? '1' : '0')
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  /**
   * Start OAuth 2.0 PKCE loopback login flow.
   */
  static async startLogin(): Promise<Result<{ email: string; name: string }>> {
    const clientId = GoogleDriveService.getClientId()
    if (!clientId) {
      return {
        success: false,
        error:
          'Google Client ID is not configured. Please enter your Google Cloud OAuth Client ID in Settings -> Cloud Sync.'
      }
    }

    // Stop any existing auth server
    if (GoogleDriveService.authServer) {
      try {
        GoogleDriveService.authServer.close()
      } catch {}
      GoogleDriveService.authServer = null
    }

    const codeVerifier = base64UrlEncode(randomBytes(32))
    const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
    const state = randomBytes(16).toString('hex')

    return new Promise((resolve) => {
      const server = http.createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`)
          if (reqUrl.pathname !== '/callback') {
            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('Not found')
            return
          }

          const code = reqUrl.searchParams.get('code')
          const returnedState = reqUrl.searchParams.get('state')
          const errorParam = reqUrl.searchParams.get('error')

          if (errorParam) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1115; color: #f87171; text-align: center; padding: 60px 20px;">
                  <h2 style="font-size: 24px; margin-bottom: 8px;">Authentication Cancelled</h2>
                  <p style="color: #94a3b8; font-size: 14px;">${errorParam}</p>
                  <p style="margin-top: 24px; font-size: 12px; color: #64748b;">You can safely close this browser window and return to myNotes.</p>
                </body>
              </html>
            `)
            server.close()
            resolve({ success: false, error: `Authentication error: ${errorParam}` })
            return
          }

          if (returnedState !== state || !code) {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end('Invalid state or authorization code.')
            server.close()
            resolve({ success: false, error: 'Invalid state verification or authorization code' })
            return
          }

          // Exchange code for tokens
          const tokenRes = await GoogleDriveService.exchangeCodeForTokens(
            code,
            codeVerifier,
            `http://127.0.0.1:${port}/callback`
          )

          if (!tokenRes.success) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1115; color: #f87171; text-align: center; padding: 60px 20px;">
                  <h2 style="font-size: 24px; margin-bottom: 8px;">Token Exchange Failed</h2>
                  <p style="color: #94a3b8; font-size: 14px;">${tokenRes.error || 'Failed to exchange tokens with Google'}</p>
                </body>
              </html>
            `)
            server.close()
            resolve({ success: false, error: tokenRes.error })
            return
          }

          // Success HTML page
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <html>
              <head><title>myNotes - Connected</title></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1115; color: #f8fafc; text-align: center; padding: 60px 20px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-size: 32px; margin-bottom: 20px;">✓</div>
                <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 10px 0;">Google Drive Connected!</h1>
                <p style="color: #94a3b8; font-size: 14px; max-width: 420px; margin: 0 auto 24px auto;">myNotes is now connected to your private Google Drive storage. You can safely close this tab and return to the app.</p>
                <div style="font-size: 12px; color: #64748b;">Closing this window...</div>
                <script>setTimeout(function() { window.close(); }, 3000);</script>
              </body>
            </html>
          `)

          server.close()

          // Trigger initial sync in background
          setTimeout(() => {
            GoogleDriveService.syncNow().catch((e) => console.error('Initial sync error:', e))
          }, 500)

          resolve({
            success: true,
            data: {
              email: DatabaseService.getCloudSyncValue('userEmail') || '',
              name: DatabaseService.getCloudSyncValue('userName') || ''
            }
          })
        } catch (err) {
          server.close()
          resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err)
          })
        }
      })

      // Listen on ephemeral local port
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          resolve({ success: false, error: 'Could not bind local loopback server' })
          return
        }
        port = address.port
        GoogleDriveService.authServer = server

        const redirectUri = `http://127.0.0.1:${port}/callback`
        const authUrl =
          `${OAUTH_AUTH_URL}?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(SCOPES)}` +
          `&code_challenge=${encodeURIComponent(codeChallenge)}` +
          `&code_challenge_method=S256` +
          `&state=${encodeURIComponent(state)}` +
          `&access_type=offline` +
          `&prompt=consent`

        shell.openExternal(authUrl)
      })

      let port = 0

      // Auto-timeout after 2 minutes if user doesn't finish auth
      setTimeout(() => {
        if (GoogleDriveService.authServer === server) {
          try {
            server.close()
          } catch {}
          GoogleDriveService.authServer = null
          resolve({ success: false, error: 'Authentication timed out. Please try again.' })
        }
      }, 120000)
    })
  }

  private static async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<Result> {
    try {
      const clientId = GoogleDriveService.getClientId()
      const clientSecret = GoogleDriveService.getClientSecret()

      const bodyParams: Record<string, string> = {
        code,
        client_id: clientId,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }
      if (clientSecret) {
        bodyParams.client_secret = clientSecret
      }

      const response = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(bodyParams).toString()
      })

      if (!response.ok) {
        const errText = await response.text()
        return { success: false, error: `Google OAuth Token Error: ${errText}` }
      }

      const data = (await response.json()) as {
        access_token: string
        refresh_token?: string
        expires_in: number
      }

      const now = Date.now()
      const expiry = now + (data.expires_in || 3600) * 1000

      DatabaseService.setCloudSyncValue('accessToken', encryptSecret(data.access_token))
      DatabaseService.setCloudSyncValue('tokenExpiry', String(expiry))
      if (data.refresh_token) {
        DatabaseService.setCloudSyncValue('refreshToken', encryptSecret(data.refresh_token))
      }

      // Fetch user profile info
      try {
        const userRes = await fetch(USERINFO_URL, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        })
        if (userRes.ok) {
          const user = (await userRes.json()) as { email?: string; name?: string; picture?: string }
          if (user.email) DatabaseService.setCloudSyncValue('userEmail', user.email)
          if (user.name) DatabaseService.setCloudSyncValue('userName', user.name)
          if (user.picture) DatabaseService.setCloudSyncValue('userPicture', user.picture)
        }
      } catch (userErr) {
        console.warn('Could not fetch user profile info:', userErr)
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = GoogleDriveService.getRefreshToken()
    if (!refreshToken) return null

    const clientId = GoogleDriveService.getClientId()
    const clientSecret = GoogleDriveService.getClientSecret()

    try {
      const bodyParams: Record<string, string> = {
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }
      if (clientSecret) bodyParams.client_secret = clientSecret

      const response = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(bodyParams).toString()
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Failed to refresh Google access token:', errText)
        return null
      }

      const data = (await response.json()) as {
        access_token: string
        expires_in: number
        refresh_token?: string
      }

      const expiry = Date.now() + (data.expires_in || 3600) * 1000
      DatabaseService.setCloudSyncValue('accessToken', encryptSecret(data.access_token))
      DatabaseService.setCloudSyncValue('tokenExpiry', String(expiry))
      if (data.refresh_token) {
        DatabaseService.setCloudSyncValue('refreshToken', encryptSecret(data.refresh_token))
      }

      return data.access_token
    } catch (e) {
      console.error('Exception during Google access token refresh:', e)
      return null
    }
  }

  private static async getValidAccessToken(): Promise<string | null> {
    const expiry = GoogleDriveService.getTokenExpiry()
    const current = GoogleDriveService.getAccessToken()

    // Refresh if within 90 seconds of expiration or missing
    if (!current || Date.now() > expiry - 90000) {
      return await GoogleDriveService.refreshAccessToken()
    }
    return current
  }

  /**
   * Disconnects Google account and clears stored tokens.
   */
  static async logout(): Promise<Result> {
    try {
      const accessToken = GoogleDriveService.getAccessToken()
      if (accessToken) {
        // Attempt token revocation (best effort)
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          })
        } catch {}
      }

      DatabaseService.setCloudSyncValue('accessToken', null)
      DatabaseService.setCloudSyncValue('refreshToken', null)
      DatabaseService.setCloudSyncValue('tokenExpiry', null)
      DatabaseService.setCloudSyncValue('userEmail', null)
      DatabaseService.setCloudSyncValue('userName', null)
      DatabaseService.setCloudSyncValue('userPicture', null)
      DatabaseService.setCloudSyncValue('lastSyncTime', null)
      DatabaseService.setCloudSyncValue('fileId', null)

      GoogleDriveService.lastError = null
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Find remote vault file ID in Google Drive AppData folder.
   */
  private static async findRemoteVaultFileId(accessToken: string): Promise<string | null> {
    const storedFileId = DatabaseService.getCloudSyncValue('fileId')
    if (storedFileId) return storedFileId

    const q = `name='${VAULT_FILENAME}' and trashed=false`
    const url = `${DRIVE_FILES_URL}?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      throw new Error(`Failed to query Google Drive files: ${response.statusText}`)
    }

    const data = (await response.json()) as { files?: { id: string; name: string }[] }
    if (data.files && data.files.length > 0) {
      const id = data.files[0].id
      DatabaseService.setCloudSyncValue('fileId', id)
      return id
    }
    return null
  }

  /**
   * Upload vault manifest snapshot to Google Drive appDataFolder.
   */
  private static async uploadVault(accessToken: string, fileId: string | null): Promise<string> {
    const manifest = DatabaseService.exportBackup()
    const content = JSON.stringify(manifest)

    if (fileId) {
      // Update existing file
      const updateUrl = `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: content
      })

      if (!res.ok) {
        throw new Error(`Failed to update vault file on Drive: ${await res.text()}`)
      }
      return fileId
    } else {
      // Create new file via multipart
      const boundary = '-------314159265358979323846'
      const delimiter = `\r\n--${boundary}\r\n`
      const closeDelimiter = `\r\n--${boundary}--`

      const metadata = {
        name: VAULT_FILENAME,
        parents: ['appDataFolder']
      }

      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        content +
        closeDelimiter

      const createUrl = `${DRIVE_UPLOAD_URL}?uploadType=multipart`
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      })

      if (!res.ok) {
        throw new Error(`Failed to create vault file on Drive: ${await res.text()}`)
      }

      const data = (await res.json()) as { id: string }
      DatabaseService.setCloudSyncValue('fileId', data.id)
      return data.id
    }
  }

  /**
   * Download remote vault snapshot from Google Drive.
   */
  private static async downloadVault(
    accessToken: string,
    fileId: string
  ): Promise<BackupManifest | null> {
    const url = `${DRIVE_FILES_URL}/${fileId}?alt=media`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error(`Failed to download vault from Google Drive: ${await res.text()}`)
    }

    const text = await res.text()
    return JSON.parse(text) as BackupManifest
  }

  /**
   * Executes bidirectional synchronization with Google Drive AppData folder.
   */
  static async syncNow(): Promise<Result<CloudSyncResult>> {
    if (!GoogleDriveService.isConnected()) {
      return { success: false, error: 'Not connected to Google Drive' }
    }

    if (GoogleDriveService.isSyncing) {
      return { success: false, error: 'Sync already in progress' }
    }

    GoogleDriveService.isSyncing = true
    GoogleDriveService.lastError = null
    GoogleDriveService.notifyWindows('sync-started', GoogleDriveService.getConfig())

    try {
      const token = await GoogleDriveService.getValidAccessToken()
      if (!token) {
        throw new Error('Could not obtain valid Google access token. Please re-authenticate.')
      }

      let downloaded = false
      let fileId = await GoogleDriveService.findRemoteVaultFileId(token)

      if (fileId) {
        // Download remote and merge
        try {
          const remoteVault = await GoogleDriveService.downloadVault(token, fileId)
          if (remoteVault && Array.isArray(remoteVault.notes)) {
            const { changed } = DatabaseService.mergeVaultFromCloud(remoteVault)
            downloaded = true
            if (changed) {
              GoogleDriveService.notifyWindows('vault-updated', {
                notes: DatabaseService.loadNotes()
              })
            }
          }
        } catch (downloadErr) {
          console.warn(
            'Could not download or merge remote vault, creating fresh upload:',
            downloadErr
          )
        }
      }

      // Upload latest unified snapshot to Drive
      fileId = await GoogleDriveService.uploadVault(token, fileId)
      const nowIso = new Date().toISOString()
      DatabaseService.setCloudSyncValue('lastSyncTime', nowIso)

      const result: CloudSyncResult = {
        notesCount: DatabaseService.loadNotes().length,
        uploaded: true,
        downloaded,
        timestamp: nowIso
      }

      GoogleDriveService.isSyncing = false
      GoogleDriveService.lastError = null
      GoogleDriveService.notifyWindows('sync-completed', {
        config: GoogleDriveService.getConfig(),
        result
      })

      return { success: true, data: result }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err)
      GoogleDriveService.isSyncing = false
      GoogleDriveService.lastError = errMessage
      GoogleDriveService.notifyWindows('sync-error', {
        config: GoogleDriveService.getConfig(),
        error: errMessage
      })

      return { success: false, error: errMessage }
    }
  }

  /**
   * Triggers a debounced sync if auto-sync is enabled.
   */
  static triggerAutoSyncDebounced(): void {
    const autoSyncVal = DatabaseService.getCloudSyncValue('autoSync')
    const isAutoSync = autoSyncVal === null || autoSyncVal === '1'

    if (!isAutoSync || !GoogleDriveService.isConnected()) {
      return
    }

    if (GoogleDriveService.debounceTimer) {
      clearTimeout(GoogleDriveService.debounceTimer)
    }

    GoogleDriveService.debounceTimer = setTimeout(() => {
      GoogleDriveService.syncNow().catch((e) => {
        console.error('Debounced auto-sync failed:', e)
      })
    }, 4000)
  }

  /**
   * Start 5-minute background sync interval.
   */
  static startPeriodicSync(): void {
    if (GoogleDriveService.periodicTimer) return
    GoogleDriveService.periodicTimer = setInterval(
      () => {
        const autoSyncVal = DatabaseService.getCloudSyncValue('autoSync')
        const isAutoSync = autoSyncVal === null || autoSyncVal === '1'
        if (isAutoSync && GoogleDriveService.isConnected() && !GoogleDriveService.isSyncing) {
          GoogleDriveService.syncNow().catch((e) => console.error('Periodic sync error:', e))
        }
      },
      5 * 60 * 1000
    )
  }

  private static notifyWindows(event: string, payload: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(`cloud:${event}`, payload)
      }
    }
  }
}
