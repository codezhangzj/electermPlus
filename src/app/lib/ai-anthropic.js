/**
 * Anthropic (Claude) native Messages API adapter.
 *
 * The rest of the app speaks OpenAI's chat-completions shape. Claude's native
 * API differs (x-api-key + anthropic-version headers, top-level `system`,
 * required `max_tokens`, a `content` block array instead of `choices`, and SSE
 * events like `content_block_delta`). This module translates Claude's request
 * and response into the OpenAI-shaped values ai.js already consumes, so the
 * streaming session store, getStreamContent/stopStream, and the renderer stay
 * unchanged.
 *
 * M2 scope: plain chat (explain/diagnose text) — no tool use. Tool-use
 * translation for the agent modes is M3.
 */

const axios = require('axios')
const { createProxyAgent } = require('./proxy-agent')

const ANTHROPIC_VERSION = '2023-06-01'
// Anthropic requires max_tokens. OpenAI's path leaves it unbounded, so keep
// this generous to avoid truncating long diagnostic answers. Callers may
// override per request.
const DEFAULT_MAX_TOKENS = 8192

function createAnthropicClient (baseURL, apiKey, proxy) {
  const config = {
    baseURL,
    timeout: 120000,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    }
  }
  const agent = proxy ? createProxyAgent(proxy) : null
  if (agent) {
    config.httpsAgent = agent
    config.proxy = false
  }
  return axios.create(config)
}

// Build a native Messages API body from the OpenAI-style role + prompt.
function buildAnthropicBody (role, prompt, model, stream, maxTokens = DEFAULT_MAX_TOKENS) {
  const body = {
    model,
    max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
    messages: [
      { role: 'user', content: prompt }
    ],
    stream: !!stream
  }
  // `system` must be a non-empty string when present; omit it otherwise so
  // the API doesn't reject an empty top-level system prompt.
  if (role && String(role).trim()) {
    body.system = role
  }
  return body
}

// Non-streaming: join the text blocks of the response content array.
function extractAnthropicText (data) {
  const blocks = (data && data.content) || []
  return blocks
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('')
}

// Parse one SSE `data:` line of a Claude stream into { text, done }.
// Claude emits `event:` lines and several event types; we only care about
// text deltas and the terminal message_stop.
function parseAnthropicStreamLine (line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) {
    return {}
  }
  const payload = trimmed.slice(5).trim()
  if (!payload) return {}
  try {
    const data = JSON.parse(payload)
    if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') {
      return { text: data.delta.text || '' }
    }
    if (data.type === 'message_stop') {
      return { done: true }
    }
    if (data.type === 'error') {
      return { error: (data.error && data.error.message) || 'stream error' }
    }
  } catch (e) {}
  return {}
}

module.exports = {
  createAnthropicClient,
  buildAnthropicBody,
  extractAnthropicText,
  parseAnthropicStreamLine
}
