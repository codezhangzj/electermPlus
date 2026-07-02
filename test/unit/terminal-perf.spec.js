const { test, describe } = require('node:test')
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')

function read (rel) {
  return fs.readFileSync(path.join(__dirname, '../../', rel), 'utf8')
}

describe('terminal performance contract', () => {
  test('ssh compression prefers none, matching the OpenSSH default', () => {
    const alg = read('src/app/server/ssh2-alg.js')
    const compressBlock = alg.slice(alg.indexOf('compress:'), alg.indexOf(']', alg.indexOf('compress:')))
    const noneIdx = compressBlock.indexOf("'none'")
    const zlibIdx = compressBlock.indexOf("'zlib")
    assert.ok(noneIdx > 0 && zlibIdx > 0, 'both options present')
    assert.ok(noneIdx < zlibIdx, "'none' must come before zlib")
  })

  test('AI output hook skips regex cleanup when no run is active', () => {
    const src = read('src/client/common/ai-terminal-runner.js')
    const fnStart = src.indexOf('export function appendAITerminalOutput')
    const guardIdx = src.indexOf('if (!hasActiveRun) return', fnStart)
    const cleanIdx = src.indexOf('cleanOutput(rawOutput)', fnStart)
    assert.ok(guardIdx > fnStart, 'active-run guard exists')
    assert.ok(cleanIdx > guardIdx, 'cleanOutput only runs after the guard')
  })

  test('session child processes are pre-warmed and rdp/vnc/spice/ftp excluded', () => {
    const src = read('src/app/server/session-process.js')
    assert.match(src, /function refillSpare/)
    assert.match(src, /await takeServer\(type\)/)
    assert.match(src, /\['rdp', 'vnc', 'spice', 'ftp'\]/)
    // stale/dead spares must be detected before use
    assert.match(src, /child\.exitCode === null && entry\.child\.connected/)
  })

  test('renderer defaults to webGL in both default-setting copies', () => {
    for (const f of ['src/app/common/default-setting.js', 'src/client/common/default-setting.js']) {
      assert.match(read(f), /rendererType: 'webGL'/, f)
    }
  })
})
