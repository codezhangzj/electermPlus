const fs = require('fs')
const path = require('path')
const express = require('express')
const expressWs = require('express-ws')
const {
  createAuthService,
  loadMobileSshConfig
} = require('./security')
const { SshSessionManager } = require('./ssh-session-manager')

function createMobileSshGateway (options = {}) {
  const config = options.config || loadMobileSshConfig()
  const staticDir = options.staticDir || path.resolve(__dirname, '../../work/mobile-web')
  const app = express()
  expressWs(app, undefined, {
    wsOptions: {
      maxPayload: 64 * 1024,
      perMessageDeflate: false
    }
  })
  const auth = createAuthService(config)
  const sessions = new SshSessionManager(config)
  let server

  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use((req, res, next) => {
    const socketSource = config.secureCookies ? 'wss:' : 'ws:'
    res.setHeader('Content-Security-Policy', `default-src 'self'; connect-src 'self' ${socketSource}; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`)
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (config.secureCookies) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    next()
  })
  app.use(express.json({ limit: '16kb' }))

  app.get('/api/mobile-ssh/health', (req, res) => {
    res.json({ ok: true })
  })
  app.get('/api/mobile-ssh/auth/status', (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ authenticated: !!auth.verifyRequest(req) })
  })
  app.post('/api/mobile-ssh/auth/login', auth.requireAllowedOrigin, (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    auth.login(req, res)
  })
  app.post('/api/mobile-ssh/auth/logout', auth.requireAllowedOrigin, (req, res) => {
    auth.clearSessionCookie(res)
    res.json({ authenticated: false })
  })
  app.post(
    '/api/mobile-ssh/sessions',
    auth.requireAllowedOrigin,
    auth.requireAuth,
    async (req, res) => {
      try {
        const result = await sessions.create(req.mobileSshAuth.sid, req.body || {})
        res.status(201).json({ sessionId: result.id })
      } catch (err) {
        res.status(err.statusCode || 400).json({
          error: err.message,
          code: err.code,
          hostKeyPrompt: err.hostKeyPrompt
        })
      }
    }
  )

  app.ws('/ws/mobile-ssh/terminal/:sessionId', (ws, req) => {
    if (req.headers.origin !== config.publicOrigin) {
      ws.close(1008, 'Untrusted origin')
      return
    }
    const authenticated = auth.verifyRequest(req)
    if (!authenticated) {
      ws.close(1008, 'Authentication required')
      return
    }
    sessions.attachWebSocket(req.params.sessionId, authenticated.sid, ws)
  })

  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, {
      etag: true,
      index: false,
      maxAge: '1h'
    }))
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
        next()
        return
      }
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  app.use((req, res) => {
    res.status(404).json({ error: '接口不存在。' })
  })

  function start () {
    if (!fs.existsSync(path.join(staticDir, 'index.html'))) {
      throw new Error('移动 Web 构建产物不存在，请先执行 npm run mobile-web-build。')
    }
    return new Promise((resolve, reject) => {
      server = app.listen(config.port, config.host, () => resolve(server))
      server.once('error', reject)
    })
  }

  function close () {
    sessions.destroyAll()
    if (!server) return Promise.resolve()
    return new Promise((resolve, reject) => {
      server.close(err => err ? reject(err) : resolve())
    })
  }

  return {
    app,
    auth,
    close,
    config,
    sessions,
    start
  }
}

async function main () {
  const gateway = createMobileSshGateway()
  await gateway.start()
  console.log(`mobile SSH gateway listening on ${gateway.config.host}:${gateway.config.port}`)

  const shutdown = async () => {
    try {
      await gateway.close()
      process.exit(0)
    } catch (err) {
      console.error(err)
      process.exit(1)
    }
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message)
    process.exitCode = 1
  })
}

module.exports = {
  createMobileSshGateway
}
