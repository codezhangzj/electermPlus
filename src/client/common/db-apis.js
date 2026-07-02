/**
 * Database manager client APIs.
 *
 * Thin wrappers over the server websocket. The server (db-api.js) opens a
 * dedicated ssh2 tunnel per connId and runs mysql2 over it. The renderer only
 * ever holds a connId plus SQL — the SSH/DB credentials are sent once at
 * connect time over the same authenticated local channel used for terminals.
 */

import fetch from './fetch-from-server'

// sshConfig / dbConfig come out of the manate store as Proxy objects, which
// cannot be structured-cloned across the websocket worker boundary. Round-trip
// them to plain objects before sending (values are only strings/numbers).
function plain (obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

export function dbConnect (connId, sshConfig, dbConfig) {
  return fetch({
    action: 'db-connect',
    connId,
    sshConfig: plain(sshConfig),
    dbConfig: plain(dbConfig)
  })
}

export function dbQuery (connId, sql, params, limit) {
  return fetch({
    action: 'db-query',
    connId,
    sql,
    params,
    limit
  })
}

export function dbListSchemas (connId) {
  return fetch({
    action: 'db-list-schemas',
    connId
  })
}

export function dbListTables (connId, schema) {
  return fetch({
    action: 'db-list-tables',
    connId,
    schema
  })
}

export function dbDescribe (connId, schema, table) {
  return fetch({
    action: 'db-describe',
    connId,
    schema,
    table
  })
}

export function dbClose (connId) {
  return fetch({
    action: 'db-close',
    connId
  })
}
