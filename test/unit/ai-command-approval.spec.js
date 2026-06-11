const { test, describe } = require('node:test')
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')

describe('AI terminal command approval contract', () => {
  const agentSource = fs.readFileSync(
    path.join(__dirname, '../../src/client/components/ai/agent.js'),
    'utf8'
  )
  const toolsSource = fs.readFileSync(
    path.join(__dirname, '../../src/client/components/ai/agent-tools.js'),
    'utf8'
  )
  const cardSource = fs.readFileSync(
    path.join(__dirname, '../../src/client/components/ai/agent-tool-call-card.jsx'),
    'utf8'
  )

  test('requires approval for every terminal command', () => {
    assert.match(agentSource, /policy\.requiresApproval \|\| isTerminalCommand/)
  })

  test('requires an explanation with every proposed command', () => {
    assert.match(toolsSource, /required: \['command', 'purpose', 'explanation', 'expectedOutcome'\]/)
  })

  test('shows an explicit allow execution action', () => {
    assert.match(cardSource, /允许执行/)
    assert.match(cardSource, /命令说明/)
    assert.match(cardSource, /判断依据/)
  })

  test('asks the model to analyze exit code and output', () => {
    assert.match(agentSource, /Analyze this result using the exit code and output/)
  })

  test('forces a tool-free analysis after a terminal command completes', () => {
    assert.match(agentSource, /async function analyzeTerminalResults/)
    assert.match(agentSource, /Do not call any more tools in this response/)
    assert.match(agentSource, /callBackendAIchatWithTools\(\s*analysisMessages,\s*config,\s*\[\]/)
    assert.match(agentSource, /if \(hasTerminalCommandResult\)/)
  })
})
