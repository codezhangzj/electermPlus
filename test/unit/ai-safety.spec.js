const { test, describe } = require('node:test')
const assert = require('assert/strict')
const { sanitizeAIText } = require('../../src/app/common/ai-safety')

describe('AI request sanitization', () => {
  test('redacts common credentials', () => {
    const source = 'password=hunter2 api_key: abc123 Authorization: Bearer secret-token'
    const result = sanitizeAIText(source)
    assert.equal(result.includes('hunter2'), false)
    assert.equal(result.includes('abc123'), false)
    assert.equal(result.includes('secret-token'), false)
  })

  test('redacts private key blocks', () => {
    const source = '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----'
    const result = sanitizeAIText(source)
    assert.equal(result, '[REDACTED PRIVATE KEY]')
  })

  test('truncates oversized terminal context', () => {
    const result = sanitizeAIText('x'.repeat(60000))
    assert.equal(result.endsWith('[TRUNCATED]'), true)
    assert.equal(result.length < 60000, true)
  })
})
