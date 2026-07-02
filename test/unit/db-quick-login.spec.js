const { test, describe } = require('node:test')
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')

// db-connection-defaults.js is a pure ESM module (no window/imports);
// strip the export keywords so its real logic can run under node --test
function loadDbConnectionDefaults () {
  const src = fs.readFileSync(
    path.join(__dirname, '../../src/client/common/db-connection-defaults.js'),
    'utf8'
  ).replace(/^export /gm, '')
  // eslint-disable-next-line no-new-func
  return new Function(`${src}; return {
    buildDbLoginCommand,
    dbPasswordPromptPatterns,
    dbSuccessPatterns,
    getDbFailure,
    enabledDbTypes
  }`)()
}

describe('db quick login command builder', () => {
  const {
    buildDbLoginCommand,
    dbPasswordPromptPatterns,
    dbSuccessPatterns,
    getDbFailure,
    enabledDbTypes
  } = loadDbConnectionDefaults()

  const conn = {
    dbType: 'mysql',
    dbHost: '127.0.0.1',
    port: 3306,
    username: 'app_rw',
    password: 'top-secret',
    database: 'app_db'
  }

  test('never puts the password into the command line', () => {
    const cmd = buildDbLoginCommand(conn)
    assert.doesNotMatch(cmd, /top-secret/)
    assert.match(cmd, /-p(\s|$)/)
  })

  test('builds a complete interactive mysql command', () => {
    const cmd = buildDbLoginCommand(conn)
    assert.equal(cmd, "mysql -h '127.0.0.1' -P 3306 -u 'app_rw' -p 'app_db'")
  })

  test('omits -p entirely for passwordless credentials', () => {
    const cmd = buildDbLoginCommand({ ...conn, password: '' })
    assert.doesNotMatch(cmd, /-p(\s|$)/)
  })

  test('shell-quotes hostile values', () => {
    const cmd = buildDbLoginCommand({
      ...conn,
      username: "a'; rm -rf / #"
    })
    assert.match(cmd, /-u 'a'\\''; rm -rf \/ #'/)
  })

  test('only mysql is enabled in V1', () => {
    assert.deepEqual(enabledDbTypes, ['mysql'])
  })

  test('recognises the mysql password prompt and shell prompt', () => {
    assert.match('Enter password: ', dbPasswordPromptPatterns.mysql)
    assert.match('mysql> ', dbSuccessPatterns.mysql)
    assert.match('MariaDB [app_db]> ', dbSuccessPatterns.mysql)
    assert.doesNotMatch('app@host:~$ ', dbSuccessPatterns.mysql)
  })

  test('classifies the four failure families', () => {
    assert.equal(getDbFailure('mysql', "ERROR 1045 (28000): Access denied for user 'x'"), 'accessDenied')
    assert.equal(getDbFailure('mysql', "ERROR 2003: Can't connect to MySQL server"), 'connRefused')
    assert.equal(getDbFailure('mysql', "ERROR 1049 (42000): Unknown database 'nope'"), 'unknownDatabase')
    assert.equal(getDbFailure('mysql', 'zsh: command not found: mysql'), 'clientMissing')
    assert.equal(getDbFailure('mysql', 'Welcome to the MySQL monitor.'), null)
  })
})

describe('db quick login security contract', () => {
  const stateMachine = fs.readFileSync(
    path.join(__dirname, '../../src/client/common/db-quick-login.js'),
    'utf8'
  )
  const mcpHandler = fs.readFileSync(
    path.join(__dirname, '../../src/client/store/mcp-handler.js'),
    'utf8'
  )
  const quickBar = fs.readFileSync(
    path.join(__dirname, '../../src/client/components/terminal/db-quick-bar.jsx'),
    'utf8'
  )

  test('injects the password only after the client prompts for it', () => {
    assert.match(stateMachine, /!login\.passwordSent && login\.password/)
    assert.match(stateMachine, /promptRe && promptRe\.test\(recent\)/)
  })

  test('aborts instead of injecting blindly on prompt timeout', () => {
    assert.match(stateMachine, /finish\(login, 'failed', 'noPrompt'\)/)
  })

  test('audit entry never contains the password', () => {
    assert.match(stateMachine, /password intentionally omitted/)
    const auditBlock = stateMachine.slice(
      stateMachine.indexOf('function auditLogin'),
      stateMachine.indexOf('function finish')
    )
    assert.doesNotMatch(auditBlock, /password:/)
  })

  test('published store state never contains the password or output', () => {
    const publishBlock = stateMachine.slice(
      stateMachine.indexOf('function publish'),
      stateMachine.indexOf('function auditLogin')
    )
    assert.doesNotMatch(publishBlock, /password/)
    assert.doesNotMatch(publishBlock, /output/)
  })

  test('dbConnections are hidden from the AI and cannot be tampered by it', () => {
    assert.match(mcpHandler, /'sshTunnels', 'dbConnections'/)
    assert.match(mcpHandler, /delete updates\.dbConnections/)
    assert.match(mcpHandler, /delete args\.dbConnections/)
  })

  test('quick bar resolves credentials from the live bookmark, not the stale tab snapshot', () => {
    // a tab opened before the credential was saved would otherwise never
    // show the login bar; resolve against window.store.bookmarks by srcId
    assert.match(quickBar, /function resolveTabDbConnections/)
    assert.match(quickBar, /tab\.srcId/)
    assert.match(quickBar, /window\.store\.bookmarks\.find/)
  })
})
