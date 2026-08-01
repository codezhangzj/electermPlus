const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const COOKIE_NAME = 'electerm_mobile_session'
const TOKEN_ISSUER = 'electerm-plus-mobile'
const TOKEN_AUDIENCE = 'electerm-plus-mobile-admin'
const TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_FAILURES = 5

function hashAdminPassword (password, salt = crypto.randomBytes(16)) {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('管理员密码至少需要 12 位。')
  }
  const digest = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${digest.toString('hex')}`
}

function verifyAdminPassword (password, encoded) {
  try {
    const [algorithm, saltHex, digestHex] = String(encoded).split('$')
    if (algorithm !== 'scrypt' || !saltHex || !digestHex) return false
    const expected = Buffer.from(digestHex, 'hex')
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

function parseAllowedHosts (value) {
  return new Set(
    String(value || '')
      .split(',')
      .map(host => host.trim().toLowerCase())
      .filter(Boolean)
  )
}

function isHostAllowed (host, allowedHosts) {
  const normalized = String(host || '').trim().toLowerCase()
  return allowedHosts.has('*') || allowedHosts.has(normalized)
}

function parseCookie (header = '') {
  const cookies = {}
  for (const entry of header.split(';')) {
    const separator = entry.indexOf('=')
    if (separator < 1) continue
    const name = entry.slice(0, separator).trim()
    const value = entry.slice(separator + 1).trim()
    try {
      cookies[name] = decodeURIComponent(value)
    } catch {
      cookies[name] = value
    }
  }
  return cookies
}

function loadMobileSshConfig (env = process.env) {
  const publicOrigin = new URL(env.MOBILE_SSH_PUBLIC_ORIGIN || '')
  const allowInsecureHttp = env.MOBILE_SSH_ALLOW_INSECURE_HTTP === 'yes'
  if (publicOrigin.protocol !== 'https:' && !allowInsecureHttp) {
    throw new Error('MOBILE_SSH_PUBLIC_ORIGIN 必须使用 https://。')
  }

  const passwordHash = env.MOBILE_SSH_ADMIN_PASSWORD_HASH || ''
  if (!passwordHash.startsWith('scrypt$')) {
    throw new Error('缺少有效的 MOBILE_SSH_ADMIN_PASSWORD_HASH。')
  }

  const jwtSecret = env.MOBILE_SSH_JWT_SECRET || ''
  if (jwtSecret.length < 32) {
    throw new Error('MOBILE_SSH_JWT_SECRET 至少需要 32 个字符。')
  }

  const allowedHosts = parseAllowedHosts(env.MOBILE_SSH_ALLOWED_HOSTS)
  if (!allowedHosts.size) {
    throw new Error('必须通过 MOBILE_SSH_ALLOWED_HOSTS 设置允许连接的 SSH 主机。')
  }

  const knownHostsPath = env.MOBILE_SSH_KNOWN_HOSTS_PATH || ''
  if (!knownHostsPath) {
    throw new Error('必须设置 MOBILE_SSH_KNOWN_HOSTS_PATH。')
  }

  const port = Number(env.MOBILE_SSH_PORT || 5581)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MOBILE_SSH_PORT 必须是有效端口。')
  }

  return {
    host: env.MOBILE_SSH_HOST || '127.0.0.1',
    port,
    publicOrigin: publicOrigin.origin,
    secureCookies: !allowInsecureHttp,
    passwordHash,
    jwtSecret,
    allowedHosts,
    knownHostsPath,
    maxSessions: 4,
    sessionIdleMs: 30 * 60 * 1000
  }
}

function createAuthService (config) {
  const loginFailures = new Map()

  function getFailures (ip) {
    const now = Date.now()
    const failures = (loginFailures.get(ip) || []).filter(time => now - time < LOGIN_WINDOW_MS)
    if (failures.length) loginFailures.set(ip, failures)
    else loginFailures.delete(ip)
    return failures
  }

  function recordFailure (ip) {
    const failures = getFailures(ip)
    failures.push(Date.now())
    loginFailures.set(ip, failures)
  }

  function requireAllowedOrigin (req, res, next) {
    if (req.headers.origin !== config.publicOrigin) {
      res.status(403).json({ error: '请求来源不受信任。' })
      return
    }
    next()
  }

  function createToken () {
    return jwt.sign({
      sub: 'admin',
      sid: crypto.randomUUID()
    }, config.jwtSecret, {
      audience: TOKEN_AUDIENCE,
      expiresIn: TOKEN_MAX_AGE_SECONDS,
      issuer: TOKEN_ISSUER
    })
  }

  function verifyRequest (req) {
    const token = parseCookie(req.headers.cookie)[COOKIE_NAME]
    if (!token) return null
    try {
      return jwt.verify(token, config.jwtSecret, {
        audience: TOKEN_AUDIENCE,
        issuer: TOKEN_ISSUER
      })
    } catch {
      return null
    }
  }

  function requireAuth (req, res, next) {
    const session = verifyRequest(req)
    if (!session) {
      res.status(401).json({ error: '请先登录。' })
      return
    }
    req.mobileSshAuth = session
    next()
  }

  function setSessionCookie (res, token) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: TOKEN_MAX_AGE_SECONDS * 1000,
      path: '/',
      sameSite: 'strict',
      secure: config.secureCookies
    })
  }

  function clearSessionCookie (res) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: config.secureCookies
    })
  }

  function login (req, res) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    if (getFailures(ip).length >= LOGIN_MAX_FAILURES) {
      res.status(429).json({ error: '登录失败次数过多，请 15 分钟后重试。' })
      return
    }
    if (!verifyAdminPassword(req.body?.password, config.passwordHash)) {
      recordFailure(ip)
      res.status(401).json({ error: '管理员密码错误。' })
      return
    }
    loginFailures.delete(ip)
    setSessionCookie(res, createToken())
    res.json({ authenticated: true })
  }

  return {
    clearSessionCookie,
    login,
    requireAllowedOrigin,
    requireAuth,
    verifyRequest
  }
}

module.exports = {
  COOKIE_NAME,
  createAuthService,
  hashAdminPassword,
  isHostAllowed,
  loadMobileSshConfig,
  parseAllowedHosts,
  parseCookie,
  verifyAdminPassword
}
