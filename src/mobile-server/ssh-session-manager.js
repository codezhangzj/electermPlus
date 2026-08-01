const net = require('net')
const crypto = require('crypto')
const { Client } = require('@electerm/ssh2')
const { createHostVerifier } = require('../app/server/ssh-known-hosts')
const { isHostAllowed } = require('./security')

const MAX_INPUT_BYTES = 64 * 1024
const MAX_BUFFER_BYTES = 1024 * 1024

function validateHost (host) {
  const value = String(host || '').trim()
  if (!value || value.length > 253 || (/[\s/:]/.test(value) && net.isIP(value) === 0)) {
    throw new Error('SSH 主机地址无效。')
  }
  return value
}

function validatePort (port) {
  const value = Number(port || 22)
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('SSH 端口无效。')
  }
  return value
}

function validateUsername (username) {
  const value = String(username || '').trim()
  if (!value || value.length > 128 || /[\r\n\0]/.test(value)) {
    throw new Error('SSH 用户名无效。')
  }
  return value
}

function getPromptFingerprint (prompt) {
  const line = (prompt?.instructions || []).find(text => /fingerprint:/i.test(text))
  return line ? line.replace(/^.*fingerprint:\s*/i, '').trim() : ''
}

class SshSessionManager {
  constructor (config) {
    this.config = config
    this.sessions = new Map()
    this.idleTimer = setInterval(() => this.cleanupIdleSessions(), 60 * 1000)
    this.idleTimer.unref?.()
  }

  async create (owner, options) {
    if (this.sessions.size >= this.config.maxSessions) {
      const err = new Error('活动 SSH 会话已达到上限。')
      err.statusCode = 429
      throw err
    }

    const host = validateHost(options.host)
    const port = validatePort(options.port)
    const username = validateUsername(options.username)
    const password = String(options.password || '')
    if (!password || password.length > 4096) {
      throw new Error('SSH 密码不能为空。')
    }
    if (!isHostAllowed(host, this.config.allowedHosts)) {
      const err = new Error('该 SSH 主机不在允许列表中。')
      err.statusCode = 403
      throw err
    }

    const acceptedFingerprint = String(options.acceptHostFingerprint || '')
    const client = new Client()
    let hostPrompt = null

    const connectionOptions = {
      host,
      port,
      username,
      password,
      readyTimeout: 15000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      hostVerifier: createHostVerifier({
        host,
        port,
        knownHostsPath: this.config.knownHostsPath,
        confirm: async (prompt) => {
          hostPrompt = prompt
          const accepted = acceptedFingerprint && getPromptFingerprint(prompt) === acceptedFingerprint
          if (accepted) hostPrompt = null
          return accepted
        }
      })
    }

    return new Promise((resolve, reject) => {
      let settled = false

      const fail = (error) => {
        if (settled) return
        settled = true
        client.end()
        if (hostPrompt) {
          const err = new Error('需要确认 SSH 主机指纹。')
          err.code = 'HOST_KEY_CONFIRM_REQUIRED'
          err.statusCode = 409
          err.hostKeyPrompt = {
            name: hostPrompt.name,
            instructions: hostPrompt.instructions,
            fingerprint: getPromptFingerprint(hostPrompt)
          }
          reject(err)
          return
        }
        reject(error)
      }

      client.once('error', fail)
      client.once('ready', () => {
        delete connectionOptions.password
        client.shell({
          term: 'xterm-256color',
          cols: Math.min(Math.max(Number(options.cols) || 80, 20), 500),
          rows: Math.min(Math.max(Number(options.rows) || 24, 5), 200)
        }, (error, stream) => {
          if (error) {
            fail(error)
            return
          }
          if (settled) {
            stream.end()
            return
          }
          settled = true
          client.removeListener('error', fail)
          const id = crypto.randomUUID()
          const session = {
            id,
            owner,
            client,
            stream,
            ws: null,
            buffer: [],
            bufferBytes: 0,
            lastActivity: Date.now(),
            closed: false
          }
          this.sessions.set(id, session)
          stream.on('data', data => this.sendOutput(session, data))
          stream.stderr?.on('data', data => this.sendOutput(session, data))
          stream.once('close', () => this.destroy(id, 'SSH 会话已结束。'))
          client.once('error', err => this.destroy(id, `SSH 连接错误：${err.message}`))
          client.once('close', () => this.destroy(id, 'SSH 连接已关闭。'))
          resolve({ id })
        })
      })
      client.connect(connectionOptions)
    })
  }

  attachWebSocket (id, owner, ws) {
    const session = this.sessions.get(id)
    if (!session || session.owner !== owner || session.closed) {
      ws.close(1008, 'SSH session not found')
      return false
    }
    if (session.ws) {
      ws.close(1008, 'SSH session already attached')
      return false
    }
    session.ws = ws
    session.lastActivity = Date.now()
    for (const chunk of session.buffer) ws.send(chunk)
    session.buffer = []
    session.bufferBytes = 0

    ws.on('message', raw => this.handleMessage(session, raw))
    ws.once('close', () => this.destroy(id, '浏览器连接已断开。'))
    ws.once('error', () => this.destroy(id, '浏览器连接发生错误。'))
    return true
  }

  handleMessage (session, raw) {
    try {
      const message = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw))
      session.lastActivity = Date.now()
      if (message.type === 'input') {
        const data = String(message.data || '')
        if (Buffer.byteLength(data) > MAX_INPUT_BYTES) return
        session.stream.write(data)
      } else if (message.type === 'resize') {
        const cols = Math.min(Math.max(Number(message.cols) || 80, 20), 500)
        const rows = Math.min(Math.max(Number(message.rows) || 24, 5), 200)
        session.stream.setWindow(rows, cols, 0, 0)
      } else if (message.type === 'close') {
        this.destroy(session.id, '用户已断开。')
      }
    } catch {
      session.ws?.close(1003, 'Invalid terminal message')
    }
  }

  sendOutput (session, data) {
    if (session.closed) return
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data)
    session.lastActivity = Date.now()
    if (session.ws?.readyState === 1) {
      session.ws.send(chunk)
      return
    }
    session.buffer.push(chunk)
    session.bufferBytes += chunk.length
    while (session.bufferBytes > MAX_BUFFER_BYTES && session.buffer.length) {
      session.bufferBytes -= session.buffer.shift().length
    }
  }

  cleanupIdleSessions () {
    const now = Date.now()
    for (const session of this.sessions.values()) {
      if (now - session.lastActivity > this.config.sessionIdleMs) {
        this.destroy(session.id, 'SSH 会话因长时间空闲而结束。')
      }
    }
  }

  destroy (id, reason) {
    const session = this.sessions.get(id)
    if (!session || session.closed) return
    session.closed = true
    this.sessions.delete(id)
    try {
      if (session.ws?.readyState === 1) {
        session.ws.send(JSON.stringify({ type: 'closed', reason }))
        session.ws.close(1000, 'SSH session closed')
      }
    } catch {}
    try { session.stream.end() } catch {}
    try { session.client.end() } catch {}
  }

  destroyAll () {
    clearInterval(this.idleTimer)
    for (const id of [...this.sessions.keys()]) {
      this.destroy(id, 'SSH 网关正在关闭。')
    }
  }
}

module.exports = {
  SshSessionManager,
  getPromptFingerprint,
  validateHost,
  validatePort,
  validateUsername
}
