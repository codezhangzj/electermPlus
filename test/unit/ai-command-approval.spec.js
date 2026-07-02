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
    // strings moved to plus-locales; the card must still surface the
    // explicit approval action and the command explanation fields
    assert.match(cardSource, /plusApproveRun/)
    assert.match(cardSource, /plusCommandDesc/)
    assert.match(cardSource, /plusJudgeBasis/)
  })

  test('asks the model to analyze exit code and output', () => {
    assert.match(agentSource, /Analyze this result using the exit code and output/)
  })

  test('keeps the agent loop running for multi-step tasks', () => {
    // executing a terminal command must not force-terminate the loop;
    // it only ends when the model stops calling tools or hits the cap
    assert.doesNotMatch(agentSource, /hasTerminalCommandResult/)
    assert.match(agentSource, /iteration < MAX_ITERATIONS/)
    assert.match(agentSource, /agentPhase: 'limit_reached'/)
  })

  test('persists the audit trail via the main process', () => {
    assert.match(agentSource, /runGlobalAsync\('appendAIAuditLog'/)
    assert.doesNotMatch(agentSource, /localStorage/)
  })
})
