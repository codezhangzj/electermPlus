const { test, describe } = require('node:test')
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')

describe('AI terminal runner source contract', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../src/client/common/ai-terminal-runner.js'),
    'utf8'
  )

  test('uses a unique completion marker and captures the exit code', () => {
    assert.match(source, /__ELECTERM_AI_DONE_/)
    assert.match(source, /__electerm_ai_exit_code=\$\?/)
    assert.match(source, /run\.exitCode = Number/)
  })

  test('never accepts arbitrary interactive input', () => {
    assert.match(source, /Only yes\/no confirmation input is allowed/)
    assert.match(source, /\^\(\?:y\|yes\|n\|no\)\$/)
  })

  test('pauses on secret prompts and user takeover', () => {
    assert.match(source, /waitingInputType = 'secret'/)
    assert.match(source, /run\.state = 'user_takeover'/)
  })
})
