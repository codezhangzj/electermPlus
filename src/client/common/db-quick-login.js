/**
 * One-click database login state machine.
 *
 * Security model:
 * - The launch command is built WITHOUT the password, so it never appears in
 *   the command line, the shell history, or the remote process list.
 * - The password is written to the pty ONLY after the DB client prints its
 *   own password prompt (e.g. `Enter password:`). We never inject blindly —
 *   if the prompt does not arrive before the timeout, we abort so the
 *   password can never be typed into an ordinary shell.
 * - The password is never published to the store, the AI context, or the
 *   audit log. Only connection metadata and the outcome are recorded.
 */

import uid from './uid'
import {
  buildDbLoginCommand,
  dbPasswordPromptPatterns,
  dbSuccessPatterns,
  getDbFailure,
  dbTypeLabels
} from './db-connection-defaults'

const logins = new Map()
const PROMPT_TIMEOUT = 8000
const RESULT_TIMEOUT = 12000
const MAX_OUTPUT = 20000

function cleanOutput (value) {
  return String(value || '')
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g, '')
    .replace(/\r(?!\n)/g, '\n')
}

function publish (login) {
  if (!window.store) return
  window.store.dbLoginState = login
    ? {
        tabId: login.tabId,
        connId: login.connId,
        name: login.name,
        dbType: login.dbType,
        state: login.state,
        reason: login.reason || '',
        startedAt: login.startedAt,
        finishedAt: login.finishedAt || null
      }
    : null
}

function auditLogin (login, status) {
  try {
    window.pre.runGlobalAsync('appendAIAuditLog', {
      timestamp: Date.now(),
      tool: 'db_quick_login',
      status,
      risk: 'medium',
      target: {
        title: login.name,
        host: `${login.dbType}://${login.host}:${login.port}`
      },
      args: {
        dbType: login.dbType,
        host: login.host,
        port: login.port,
        username: login.username,
        database: login.database || ''
        // password intentionally omitted
      }
    }).catch(() => {})
  } catch (_) {}
}

function finish (login, state, reason) {
  clearTimeout(login.promptTimer)
  clearTimeout(login.resultTimer)
  login.state = state
  login.reason = reason || ''
  login.finishedAt = Date.now()
  publish(login)
  auditLogin(login, state)
  const pending = login.waiters || []
  login.waiters = []
  pending.forEach(resolve => resolve({ ...login }))
  // keep the record briefly so late output does not restart it, then drop
  setTimeout(() => {
    if (logins.get(login.tabId) === login) {
      logins.delete(login.tabId)
    }
  }, 1500)
}

export function startDbLogin ({ tabId, conn, send }) {
  if (!tabId) throw new Error('No terminal is bound for database login.')
  if (!conn) throw new Error('No database credential provided.')
  const dbType = conn.dbType || 'mysql'
  const command = buildDbLoginCommand(conn)
  if (!command) {
    throw new Error(`Unsupported database type: ${dbType}`)
  }

  // supersede any stale attempt on the same tab
  const existing = logins.get(tabId)
  if (existing && !existing.finishedAt) {
    finish(existing, 'failed', 'superseded')
  }

  const login = {
    id: uid(),
    tabId,
    connId: conn.id || '',
    name: conn.name || dbTypeLabels[dbType] || dbType,
    dbType,
    host: conn.dbHost || conn.host || '127.0.0.1',
    port: conn.port,
    username: conn.username || '',
    database: conn.database || '',
    password: conn.password || '',
    state: 'connecting',
    reason: '',
    output: '',
    passwordSent: false,
    startedAt: Date.now(),
    finishedAt: null,
    waiters: [],
    send
  }
  logins.set(tabId, login)
  publish(login)

  send(command + '\r')

  // If no password prompt appears in time and no success either, abort so the
  // password is never injected into an unexpected context.
  login.promptTimer = setTimeout(() => {
    if (login.finishedAt) return
    if (!login.passwordSent && !login.password) {
      // passwordless clients may connect without a prompt; give the result
      // timer a chance instead of failing here
      return
    }
    if (!login.passwordSent) {
      finish(login, 'failed', 'noPrompt')
    }
  }, PROMPT_TIMEOUT)

  login.resultTimer = setTimeout(() => {
    if (!login.finishedAt) {
      finish(login, 'failed', 'timeout')
    }
  }, RESULT_TIMEOUT)

  return { ...login }
}

export function appendDbLoginOutput (tabId, rawOutput) {
  const login = logins.get(tabId)
  if (!login || login.finishedAt) return
  const text = cleanOutput(rawOutput)
  if (!text) return
  login.output = (login.output + text).slice(-MAX_OUTPUT)
  const recent = login.output.slice(-1000)

  // 1. failure first — a denied/refused message is decisive
  const failure = getDbFailure(login.dbType, login.output)
  if (failure) {
    finish(login, 'failed', failure)
    return
  }

  // 2. success — we are inside the DB shell
  const successRe = dbSuccessPatterns[login.dbType]
  if (successRe && successRe.test(recent)) {
    finish(login, 'success')
    return
  }

  // 3. password prompt — inject exactly once, only when the client asks
  if (!login.passwordSent && login.password) {
    const promptRe = dbPasswordPromptPatterns[login.dbType]
    if (promptRe && promptRe.test(recent)) {
      login.passwordSent = true
      login.state = 'authenticating'
      publish(login)
      login.send && login.send(login.password + '\r')
    }
  }
  publish(login)
}

export function getDbLogin (tabId) {
  const login = logins.get(tabId)
  return login ? { ...login } : null
}

export function waitForDbLogin (tabId, timeout = RESULT_TIMEOUT + 2000) {
  const login = logins.get(tabId)
  if (!login) return Promise.reject(new Error('No database login in progress.'))
  if (login.finishedAt) return Promise.resolve({ ...login })
  return new Promise(resolve => {
    login.waiters.push(resolve)
    setTimeout(() => resolve({ ...login, timedOut: true }), timeout)
  })
}

export const dbQuickLoginTestHelpers = {
  cleanOutput
}
