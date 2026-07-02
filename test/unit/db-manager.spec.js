const { test, describe } = require('node:test')
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')

function read (rel) {
  return fs.readFileSync(path.join(__dirname, '../../', rel), 'utf8')
}

// Pull a single top-level function body out of a source file and eval it, so
// the panel's pure helpers can be tested without importing antd/JSX.
function extractFn (src, name) {
  const start = src.indexOf(`function ${name} `)
  assert.ok(start >= 0, `function ${name} not found`)
  let depth = 0
  let i = src.indexOf('{', start)
  const bodyStart = i
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) break
    }
  }
  const header = src.slice(start, bodyStart)
  const body = src.slice(bodyStart, i + 1)
  // eslint-disable-next-line no-new-func
  return new Function(`${header}${body}; return ${name}`)()
}

describe('db manager panel — pure helpers', () => {
  const panel = read('src/client/components/db-manager/db-manager-panel.jsx')

  test('identifier escaping doubles backticks and wraps', () => {
    const ident = extractFn(panel, 'ident')
    assert.equal(ident('users'), '`users`')
    assert.equal(ident('we`ird'), '`we``ird`')
  })

  test('write statements are detected for the confirm gate', () => {
    const WRITE_RE = /^\s*(insert|update|delete|replace|drop|truncate|alter|create|grant|revoke|rename|set)\b/i
    for (const w of ['UPDATE users SET x=1', ' delete from t', 'DROP TABLE t', 'truncate t']) {
      assert.match(w, WRITE_RE)
    }
    for (const r of ['SELECT * FROM t', '  show databases', 'DESCRIBE t']) {
      assert.doesNotMatch(r, WRITE_RE)
    }
  })

  test('CSV cells are RFC-4180 quoted only when needed', () => {
    const csvCell = extractFn(panel, 'csvCell')
    assert.equal(csvCell('plain'), 'plain')
    assert.equal(csvCell(null), '')
    assert.equal(csvCell('a,b'), '"a,b"')
    assert.equal(csvCell('say "hi"'), '"say ""hi"""')
    assert.equal(csvCell('line\nbreak'), '"line\nbreak"')
  })
})

describe('db manager — row editing safety', () => {
  const panel = read('src/client/components/db-manager/db-manager-panel.jsx')

  test('editing is only enabled when a primary key is known', () => {
    assert.match(panel, /editMeta && editMeta\.pkCols && editMeta\.pkCols\.length/)
    assert.match(panel, /colKey === 'PRI'/)
  })

  test('UPDATE/DELETE/INSERT bind values as parameters, never string-interpolated', () => {
    // SET col = ?  /  WHERE pk = ?  /  VALUES (?, ?)
    assert.match(panel, /SET \$\{ident\(col\)\} = \? WHERE \$\{clause\}/)
    assert.match(panel, /DELETE FROM \$\{ident\(em\.schema\)\}\.\$\{ident\(em\.table\)\} WHERE \$\{clause\}/)
    assert.match(panel, /VALUES \(\$\{cols\.map\(\(\) => '\?'\)\.join/)
    // WHERE clause built from pk columns with placeholders
    assert.match(panel, /editMeta\.pkCols\.map\(c => `\$\{ident\(c\)\} = \?`\)/)
  })

  test('every write goes through an explicit confirm modal', () => {
    assert.match(panel, /function confirmWrite/)
    assert.match(panel, /Modal\.confirm\(/)
    // edit/delete/insert all route through confirmWrite
    assert.match(panel, /confirmWrite\(sql, \[newVal, \.\.\.vals\]/)
    assert.match(panel, /confirmWrite\(sql, vals,/)
    assert.match(panel, /confirmWrite\(sql, cols\.map/)
  })
})

describe('db manager — backend contract', () => {
  const api = read('src/app/server/db-api.js')
  const dispatch = read('src/app/server/dispatch-center.js')

  test('queries run over an ssh2 forwardOut tunnel piped into mysql2', () => {
    assert.match(api, /forwardOut\('127\.0\.0\.1', 0, dbHost, dbPort/)
    assert.match(api, /mysql\.createConnection\(/)
    assert.match(api, /stream,/)
  })

  test('multi-statement SQL is disabled (no stacked-query injection)', () => {
    assert.match(api, /multipleStatements: false/)
  })

  test('result sets are capped to a hard row limit', () => {
    assert.match(api, /HARD_ROW_LIMIT/)
    assert.match(api, /Math\.min\(limit \|\| DEFAULT_ROW_LIMIT, HARD_ROW_LIMIT\)/)
  })

  test('binary values are serialized JSON-safe', () => {
    assert.match(api, /Buffer\.isBuffer/)
  })

  test('db actions are routed to the db-api dispatcher', () => {
    assert.match(dispatch, /action\.startsWith\('db-'\)/)
    assert.match(dispatch, /dbApi\(ws, msg\)/)
  })
})

describe('db manager — AI isolation', () => {
  const store = read('src/client/store/db-manager.js')
  const mcp = read('src/client/store/mcp-handler.js')

  test('openDbManager is a user-only store action, not an MCP/AI tool', () => {
    assert.match(store, /openDbManager/)
    assert.doesNotMatch(mcp, /openDbManager/)
    assert.doesNotMatch(mcp, /dbManagerTarget/)
  })

  test('credentials still stripped from AI bookmark tools', () => {
    assert.match(mcp, /delete updates\.dbConnections/)
    assert.match(mcp, /delete args\.dbConnections/)
  })
})
