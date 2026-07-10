const { test, describe } = require('node:test')
const assert = require('assert/strict')
const {
  buildAnthropicBody,
  extractAnthropicText,
  parseAnthropicStreamLine
} = require('../../src/app/lib/ai-anthropic')

describe('Anthropic adapter: buildAnthropicBody', () => {
  test('maps role/prompt into native Messages shape with required max_tokens', () => {
    const body = buildAnthropicBody('you are helpful', 'hi', 'claude-opus-4-8', false)
    assert.equal(body.model, 'claude-opus-4-8')
    assert.equal(body.system, 'you are helpful')
    assert.equal(body.stream, false)
    assert.equal(typeof body.max_tokens, 'number')
    assert.equal(body.max_tokens > 0, true)
    assert.deepEqual(body.messages, [{ role: 'user', content: 'hi' }])
  })

  test('omits empty system prompt', () => {
    const body = buildAnthropicBody('   ', 'hi', 'claude-haiku-4-5', true)
    assert.equal('system' in body, false)
    assert.equal(body.stream, true)
  })

  test('honors an explicit max_tokens override', () => {
    const body = buildAnthropicBody('r', 'p', 'm', false, 512)
    assert.equal(body.max_tokens, 512)
  })
})

describe('Anthropic adapter: extractAnthropicText', () => {
  test('joins text blocks and ignores non-text blocks', () => {
    const data = {
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'tool_use', name: 'x' },
        { type: 'text', text: 'world' }
      ]
    }
    assert.equal(extractAnthropicText(data), 'Hello world')
  })

  test('returns empty string on missing/blank content', () => {
    assert.equal(extractAnthropicText(null), '')
    assert.equal(extractAnthropicText({}), '')
    assert.equal(extractAnthropicText({ content: [] }), '')
  })
})

describe('Anthropic adapter: parseAnthropicStreamLine', () => {
  test('extracts text_delta content', () => {
    const line = 'data: ' + JSON.stringify({
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'chunk' }
    })
    assert.deepEqual(parseAnthropicStreamLine(line), { text: 'chunk' })
  })

  test('signals done on message_stop', () => {
    const line = 'data: ' + JSON.stringify({ type: 'message_stop' })
    assert.deepEqual(parseAnthropicStreamLine(line), { done: true })
  })

  test('surfaces stream error events', () => {
    const line = 'data: ' + JSON.stringify({
      type: 'error',
      error: { message: 'overloaded' }
    })
    assert.deepEqual(parseAnthropicStreamLine(line), { error: 'overloaded' })
  })

  test('ignores non-data, ping, empty and malformed lines', () => {
    assert.deepEqual(parseAnthropicStreamLine('event: ping'), {})
    assert.deepEqual(parseAnthropicStreamLine('data: '), {})
    assert.deepEqual(parseAnthropicStreamLine('data: {not json'), {})
    assert.deepEqual(parseAnthropicStreamLine(''), {})
    assert.deepEqual(parseAnthropicStreamLine('data: ' + JSON.stringify({ type: 'ping' })), {})
  })
})
