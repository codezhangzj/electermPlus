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
  const historyItemSource = fs.readFileSync(
    path.join(__dirname, '../../src/client/components/ai/ai-chat-history-item.jsx'),
    'utf8'
  )
  const chatSource = fs.readFileSync(
    path.join(__dirname, '../../src/client/components/ai/ai-chat.jsx'),
    'utf8'
  )
  const styleSource = fs.readFileSync(
    path.join(__dirname, '../../src/client/components/ai/ai.styl'),
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

  test('shows command approval after the latest assistant response', () => {
    const outputPosition = historyItemSource.indexOf('{showOutput && <AIOutput item={item} />}')
    const approvalPosition = historyItemSource.indexOf('{renderToolCalls()}', outputPosition)
    assert.notEqual(outputPosition, -1)
    assert.ok(approvalPosition > outputPosition)
  })

  test('renders assistant messages and tool steps in one ordered timeline', () => {
    assert.match(agentSource, /type: 'assistant'/)
    assert.match(agentSource, /type: 'tool'/)
    assert.match(historyItemSource, /timeline\.map/)
  })

  test('supports retrying a stopped or failed agent task', () => {
    assert.match(historyItemSource, /plusAgentRetry/)
    assert.match(historyItemSource, /startAgentRequest\(\)/)
  })

  test('continues completed agent tasks with bounded text context', () => {
    assert.match(chatSource, /contextMessages/)
    assert.match(chatSource, /slice\(-12\)/)
    assert.match(agentSource, /chatEntry\.contextMessages \|\| \[\]/)
  })

  test('lets the user start a fresh task without clearing history', () => {
    assert.match(chatSource, /plusAgentNewTask/)
    assert.match(chatSource, /item\.conversationId === conversationId/)
  })

  test('uses a compact composer with an explicit send action', () => {
    assert.match(chatSource, /autoSize=\{\{ minRows: 2, maxRows: 8 \}\}/)
    assert.match(chatSource, /className='ai-send-button'/)
    assert.doesNotMatch(chatSource, /className='ai-assistant-header'/)
  })

  test('keeps the current approval visible above the composer', () => {
    assert.match(styleSource, /\.agent-tool-waiting_approval[\s\S]*position sticky/)
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

  test('auto mode: one plan approval auto-runs the rest, high-risk always re-confirms', () => {
    // approval is skipped only when the plan is approved AND the step is not
    // high-risk; high-risk steps can never be auto-approved
    assert.match(agentSource, /const autoSkip = autoRun && planApproved && !isHigh/)
    assert.match(agentSource, /const isHigh = policy\.risk === 'high'/)
    // approving any step in auto mode flips planApproved on for the rest
    assert.match(agentSource, /} else if \(autoRun\) \{\s*\n\s*\/\/[^\n]*\n\s*planApproved = true/)
    // planApproved starts false — no auto-run without an explicit approval
    assert.match(agentSource, /let planApproved = false/)
  })
})
