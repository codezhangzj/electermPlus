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

describe('db manager — packaging safety', () => {
  const api = read('src/app/server/db-api.js')
  const yarnclean = read('build/bin/.yarnclean')

  test('mysql2/ssh2 are lazy-loaded so server boot never depends on them', () => {
    // top-level require would crash the server child at startup if a DB dep
    // is missing in a packaged build (regression: long/umd stripped)
    assert.doesNotMatch(api, /^const mysql = require/m)
    assert.doesNotMatch(api, /^const \{ Client \} = require/m)
    assert.match(api, /function loadDbDeps/)
    assert.match(api, /loadDbDeps\(\)/)
  })

  test('.yarnclean does not strip umd dirs (long uses umd/index.js as main)', () => {
    assert.doesNotMatch(yarnclean, /^umd$/m)
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
    assert.match(panel, /confirmWrite = useCallback/)
    assert.match(panel, /Modal\.confirm\(/)
    // edit/delete/insert all route through confirmWrite
    assert.match(panel, /confirmWrite\(sql, \[newVal, \.\.\.vals\]/)
    assert.match(panel, /confirmWrite\(sql, vals,/)
    assert.match(panel, /confirmWrite\(sql, cols\.map/)
  })
})

describe('db manager — transcript performance contract', () => {
  const panel = read('src/client/components/db-manager/db-manager-panel.jsx')
  const entry = read('src/client/components/db-manager/db-manager-entry.jsx')
  const main = read('src/client/components/main/main.jsx')

  test('transcript is bounded and old turns collapse by default', () => {
    assert.match(panel, /MAX_TURNS = \d+/)
    assert.match(panel, /next\.length > MAX_TURNS/)
    assert.match(panel, /KEEP_EXPANDED/)
    assert.match(panel, /turn\.collapsed \?\? \(i < history\.length - KEEP_EXPANDED\)/)
  })

  test('turns are memoized so appending does not re-render history', () => {
    assert.match(panel, /const DbTurn = memo\(function DbTurn/)
  })

  test('panel is lazy-loaded out of the main bundle', () => {
    assert.match(entry, /lazy\(\(\) => import\('\.\/db-manager-panel'\)\)/)
    assert.match(main, /db-manager\/db-manager-entry/)
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

  test('user queries stream rows and never buffer past the cap', () => {
    // row-by-row events with bounded retention, instead of conn.query()
    // buffering the whole result set in the server process
    assert.match(api, /q\.on\('result'/)
    assert.match(api, /rows\.length < cap/)
    // doQuery (arbitrary user SQL) must go through streamQuery; the bounded
    // metadata helpers (SHOW DATABASES etc.) may keep plain conn.query
    const doQueryBlock = api.slice(
      api.indexOf('async function doQuery'),
      api.indexOf('async function doListSchemas')
    )
    assert.match(doQueryBlock, /await streamQuery\(conn, sql/)
    assert.doesNotMatch(doQueryBlock, /conn\.query\(/)
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
