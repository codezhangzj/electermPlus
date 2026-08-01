const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const { once } = require('node:events')
const { describe, test } = require('node:test')
const { Server, utils } = require('@electerm/ssh2')
const WebSocket = require('ws')
const { createMobileSshGateway } = require('../../src/mobile-server/server')
const { hashAdminPassword } = require('../../src/mobile-server/security')

const PUBLIC_ORIGIN = 'http://mobile.example.test'
const ADMIN_PASSWORD = 'correct-horse-battery'
const SSH_PASSWORD = 'ssh-test-password'
const SSH_USERNAME = 'tester'

function httpRequest ({ port, path: requestPath, method = 'GET', body, cookie, origin = PUBLIC_ORIGIN }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const headers = {
      Origin: origin
    }
    if (payload) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = Buffer.byteLength(payload)
    }
    if (cookie) headers.Cookie = cookie
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: requestPath,
      method,
      headers
    }, res => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { text += chunk })
      res.on('end', () => {
        resolve({
          body: text ? JSON.parse(text) : {},
          headers: res.headers,
          status: res.statusCode
        })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function startMockSshServer () {
  const hostKey = utils.generateKeyPairSync('ed25519', {
    comment: 'electerm-mobile-gateway-test'
  })
  const clients = new Set()
  const server = new Server({ hostKeys: [hostKey.private] }, client => {
    clients.add(client)
    const cleanup = () => clients.delete(client)
    client.on('close', cleanup)
    client.on('end', cleanup)
    client.on('error', cleanup)
    client.on('authentication', ctx => {
      if (
        ctx.method === 'password' &&
        ctx.username === SSH_USERNAME &&
        ctx.password === SSH_PASSWORD
      ) {
        ctx.accept()
      } else {
        ctx.reject(['password'])
      }
    })
    client.on('ready', () => {
      client.on('session', accept => {
        const session = accept()
        session.on('pty', accept => accept())
        session.on('window-change', accept => accept?.())
        session.on('shell', accept => {
          const stream = accept()
          let input = ''
          stream.write('mock-shell-ready\r\n$ ')
          stream.on('data', data => {
            input += data.toString('utf8')
            if (!input.includes('\n') && !input.includes('\r')) return
            const command = input.trim()
            input = ''
            if (command === 'whoami') {
              stream.write(`${SSH_USERNAME}\r\n$ `)
            } else {
              stream.write(`received:${command}\r\n$ `)
            }
          })
        })
      })
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    port: server.address().port,
    async close () {
      for (const client of clients) client.end()
      await new Promise((resolve, reject) => {
        server.close(err => err ? reject(err) : resolve())
      })
    }
  }
}

function waitForOutput (ws, expected) {
  return new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${expected}: ${output}`)), 5000)
    const onMessage = data => {
      output += Buffer.from(data).toString('utf8')
      if (!output.includes(expected)) return
      clearTimeout(timer)
      ws.removeListener('message', onMessage)
      resolve(output)
    }
    ws.on('message', onMessage)
  })
}

describe('mobile SSH public single-user gateway', () => {
  test('requires login and host-key confirmation before relaying a real SSH shell', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electerm-mobile-gateway-'))
    const staticDir = path.join(tempDir, 'web')
    const knownHostsPath = path.join(tempDir, 'known_hosts')
    fs.mkdirSync(staticDir)
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<div id="root"></div>')
    const sshServer = await startMockSshServer()
    const gateway = createMobileSshGateway({
      staticDir,
      config: {
        host: '127.0.0.1',
        port: 0,
        publicOrigin: PUBLIC_ORIGIN,
        secureCookies: false,
        passwordHash: hashAdminPassword(ADMIN_PASSWORD),
        jwtSecret: crypto.randomBytes(32).toString('hex'),
        allowedHosts: new Set(['127.0.0.1']),
        knownHostsPath,
        maxSessions: 4,
        sessionIdleMs: 60 * 1000
      }
    })
    const server = await gateway.start()
    const gatewayPort = server.address().port
    let ws

    try {
      const unauthorized = await httpRequest({
        port: gatewayPort,
        path: '/api/mobile-ssh/sessions',
        method: 'POST',
        body: {
          host: '127.0.0.1',
          port: sshServer.port,
          username: SSH_USERNAME,
          password: SSH_PASSWORD
        }
      })
      assert.equal(unauthorized.status, 401)

      const wrongOrigin = await httpRequest({
        port: gatewayPort,
        path: '/api/mobile-ssh/auth/login',
        method: 'POST',
        origin: 'http://attacker.example.test',
        body: { password: ADMIN_PASSWORD }
      })
      assert.equal(wrongOrigin.status, 403)

      const login = await httpRequest({
        port: gatewayPort,
        path: '/api/mobile-ssh/auth/login',
        method: 'POST',
        body: { password: ADMIN_PASSWORD }
      })
      assert.equal(login.status, 200)
      const cookie = login.headers['set-cookie'][0].split(';')[0]
      assert.match(login.headers['set-cookie'][0], /HttpOnly/)
      assert.match(login.headers['set-cookie'][0], /SameSite=Strict/)

      const connection = {
        host: '127.0.0.1',
        port: sshServer.port,
        username: SSH_USERNAME,
        password: SSH_PASSWORD,
        cols: 80,
        rows: 24
      }
      const firstAttempt = await httpRequest({
        port: gatewayPort,
        path: '/api/mobile-ssh/sessions',
        method: 'POST',
        cookie,
        body: connection
      })
      assert.equal(firstAttempt.status, 409)
      assert.equal(firstAttempt.body.code, 'HOST_KEY_CONFIRM_REQUIRED')
      assert.match(firstAttempt.body.hostKeyPrompt.fingerprint, /^SHA256:/)

      const trustedAttempt = await httpRequest({
        port: gatewayPort,
        path: '/api/mobile-ssh/sessions',
        method: 'POST',
        cookie,
        body: {
          ...connection,
          acceptHostFingerprint: firstAttempt.body.hostKeyPrompt.fingerprint
        }
      })
      assert.equal(trustedAttempt.status, 201)
      assert.ok(trustedAttempt.body.sessionId)
      assert.match(fs.readFileSync(knownHostsPath, 'utf8'), /ssh-ed25519/)

      ws = new WebSocket(
        `ws://127.0.0.1:${gatewayPort}/ws/mobile-ssh/terminal/${trustedAttempt.body.sessionId}`,
        { headers: { Cookie: cookie, Origin: PUBLIC_ORIGIN } }
      )
      const readyOutput = waitForOutput(ws, 'mock-shell-ready')
      await once(ws, 'open')
      ws.send(JSON.stringify({ type: 'resize', cols: 100, rows: 30 }))
      assert.match(await readyOutput, /mock-shell-ready/)

      const commandOutput = waitForOutput(ws, SSH_USERNAME)
      ws.send(JSON.stringify({ type: 'input', data: 'whoami\r' }))
      assert.match(await commandOutput, new RegExp(SSH_USERNAME))
    } finally {
      ws?.close()
      await gateway.close()
      await sshServer.close()
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
