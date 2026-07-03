/**
 * Database manager backend (MySQL / MariaDB, V1).
 *
 * Runs in the main server process. Each logical DB connection opens its OWN
 * dedicated ssh2 tunnel (electerm's terminal sessions live in per-session
 * child processes, so their ssh2 client cannot be reused here) and pipes the
 * forwarded stream into a mysql2 connection. This keeps DB access decoupled
 * from terminal lifecycle — a bookmark can be managed without an open shell.
 *
 * The SSH + DB credentials arrive from the renderer over the same
 * token-authenticated local websocket already used to create terminals, so
 * no new trust boundary is introduced.
 */

const log = require('../common/log')

// mysql2 (and its deep dep tree) is only needed once the user actually opens a
// DB connection. Load it lazily so this module — which is required eagerly at
// server startup via dispatch-center — can never block or crash server boot if
// a DB dependency is missing/broken in a packaged build.
let mysql = null
let Client = null
function loadDbDeps () {
  if (!mysql) {
    mysql = require('mysql2/promise')
    Client = require('@electerm/ssh2').Client
  }
}

const IDLE_TIMEOUT = 5 * 60 * 1000
const DEFAULT_ROW_LIMIT = 500
const HARD_ROW_LIMIT = 5000

// connId -> { sshClient, conn, idleTimer }
const dbConns = new Map()

function scheduleIdle (connId) {
  const entry = dbConns.get(connId)
  if (!entry) return
  clearTimeout(entry.idleTimer)
  entry.idleTimer = setTimeout(() => closeConn(connId), IDLE_TIMEOUT)
}

function closeConn (connId) {
  const entry = dbConns.get(connId)
  if (!entry) return
  dbConns.delete(connId)
  clearTimeout(entry.idleTimer)
  try {
    entry.conn && entry.conn.destroy()
  } catch (e) {}
  try {
    entry.sshClient && entry.sshClient.end()
  } catch (e) {}
}

function openSshTunnel (sshConfig, dbHost, dbPort) {
  return new Promise((resolve, reject) => {
    const client = new Client()
    const connectOptions = {
      host: sshConfig.host,
      port: Number(sshConfig.port) || 22,
      username: sshConfig.username,
      readyTimeout: 20000,
      keepaliveInterval: 20000
    }
    if (sshConfig.password) {
      connectOptions.password = sshConfig.password
    }
    if (sshConfig.privateKey) {
      connectOptions.privateKey = sshConfig.privateKey
      if (sshConfig.passphrase) {
        connectOptions.passphrase = sshConfig.passphrase
      }
    }
    let settled = false
    client.on('ready', () => {
      client.forwardOut('127.0.0.1', 0, dbHost, dbPort, (err, stream) => {
        if (err) {
          settled = true
          client.end()
          return reject(err)
        }
        settled = true
        resolve({ client, stream })
      })
    })
    client.on('error', (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })
    client.connect(connectOptions)
  })
}

// mysql2 returns Buffers for binary columns; make every value JSON-safe.
function serializeValue (v) {
  if (v === null || v === undefined) return v
  if (Buffer.isBuffer(v)) {
    return v.length > 256
      ? `0x${v.slice(0, 256).toString('hex')}… (${v.length} bytes)`
      : `0x${v.toString('hex')}`
  }
  return v
}

function serializeRows (rows) {
  return rows.map(row => {
    const out = {}
    for (const k of Object.keys(row)) {
      out[k] = serializeValue(row[k])
    }
    return out
  })
}

async function doConnect (msg) {
  const { connId, sshConfig, dbConfig } = msg
  if (!connId) throw new Error('Missing connId')
  loadDbDeps()
  if (dbConns.has(connId)) {
    scheduleIdle(connId)
    return { connId, reused: true }
  }
  const dbHost = dbConfig.dbHost || dbConfig.host || '127.0.0.1'
  const dbPort = Number(dbConfig.port) || 3306
  const { client, stream } = await openSshTunnel(sshConfig, dbHost, dbPort)
  let conn
  try {
    conn = await mysql.createConnection({
      user: dbConfig.username,
      password: dbConfig.password || '',
      database: dbConfig.database || undefined,
      stream,
      multipleStatements: false,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true
    })
  } catch (e) {
    try {
      client.end()
    } catch (_) {}
    throw e
  }
  conn.on('error', () => closeConn(connId))
  dbConns.set(connId, { sshClient: client, conn, idleTimer: null })
  scheduleIdle(connId)
  return { connId, serverVersion: conn.serverVersion || '' }
}

function getConn (connId) {
  const entry = dbConns.get(connId)
  if (!entry) throw new Error('DB connection lost, please reconnect')
  scheduleIdle(connId)
  return entry.conn
}

// Stream the result set row by row and retain at most `cap` rows, so a
// SELECT over a huge table cannot buffer the whole thing in this process.
// Rows past the cap are still received (we deliberately do NOT rewrite the
// user's SQL with a LIMIT) but are counted and dropped immediately.
function streamQuery (conn, sql, params, cap) {
  return new Promise((resolve, reject) => {
    const raw = conn.connection
    const rows = []
    let fields = null
    let rowCount = 0
    let settled = false
    const q = raw.query({ sql, values: params })
    q.on('fields', (f) => {
      fields = f
    })
    q.on('result', (row) => {
      rowCount++
      if (rows.length < cap) {
        rows.push(row)
      }
    })
    q.on('error', (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })
    q.on('end', () => {
      if (!settled) {
        settled = true
        resolve({ rows, fields, rowCount })
      }
    })
  })
}

async function doQuery (msg) {
  const { connId, sql, params, limit } = msg
  const conn = getConn(connId)
  const cap = Math.min(limit || DEFAULT_ROW_LIMIT, HARD_ROW_LIMIT)
  const { rows, fields, rowCount } = await streamQuery(conn, sql, params || [], cap)
  if (fields && fields.length) {
    return {
      kind: 'rows',
      columns: fields.map(f => ({ name: f.name, type: f.type })),
      rows: serializeRows(rows),
      rowCount,
      truncated: rowCount > cap
    }
  }
  // no field packets: the single "row" is the OK packet of a write statement
  const ok = rows[0] || {}
  return {
    kind: 'ok',
    affectedRows: ok.affectedRows,
    insertId: ok.insertId,
    info: ok.info || ''
  }
}

async function doListSchemas (msg) {
  const conn = getConn(msg.connId)
  const [rows] = await conn.query('SHOW DATABASES')
  return { schemas: rows.map(r => Object.values(r)[0]) }
}

async function doListTables (msg) {
  const conn = getConn(msg.connId)
  const [rows] = await conn.query(
    'SELECT TABLE_NAME AS name, TABLE_TYPE AS type, TABLE_ROWS AS estRows ' +
    'FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [msg.schema]
  )
  return { tables: serializeRows(rows) }
}

async function doDescribe (msg) {
  const conn = getConn(msg.connId)
  const [cols] = await conn.query(
    'SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable, ' +
    'COLUMN_KEY AS colKey, COLUMN_DEFAULT AS colDefault, EXTRA AS extra ' +
    'FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ' +
    'ORDER BY ORDINAL_POSITION',
    [msg.schema, msg.table]
  )
  return { columns: serializeRows(cols) }
}

async function doClose (msg) {
  closeConn(msg.connId)
  return { closed: true }
}

const handlers = {
  'db-connect': doConnect,
  'db-query': doQuery,
  'db-list-schemas': doListSchemas,
  'db-list-tables': doListTables,
  'db-describe': doDescribe,
  'db-close': doClose
}

async function dbApi (ws, msg) {
  const { id, action } = msg
  const fn = handlers[action]
  if (!fn) {
    return ws.s({ id, error: { message: `Unknown db action: ${action}` } })
  }
  try {
    const data = await fn(msg)
    ws.s({ id, data })
  } catch (err) {
    log.error('db-api error', action, err.message)
    ws.s({ id, error: { message: err.message, stack: err.stack } })
  }
}

function cleanAllDbConns () {
  for (const connId of [...dbConns.keys()]) {
    closeConn(connId)
  }
}

module.exports = {
  dbApi,
  cleanAllDbConns
}
