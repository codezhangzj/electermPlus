const axios = require('axios')
const { StringDecoder } = require('string_decoder')
const log = require('../common/log')
const defaultSettings = require('../common/config-default')
const { createProxyAgent } = require('./proxy-agent')
const { classifyCommand, classifyToolCall } = require('../common/command-policy')
const { sanitizeAIText, sanitizeMessages } = require('../common/ai-safety')
const { safeDecrypt } = require('./safe-storage')
const globalState = require('./glob-state')
const {
  createAnthropicClient,
  buildAnthropicBody,
  extractAnthropicText,
  parseAnthropicStreamLine
} = require('./ai-anthropic')

// The renderer only holds the safeStorage ciphertext of the API key
// (see user-config-controller). Decrypt here, right before the HTTP call,
// so the plain-text key never leaves the main process. Legacy plain-text
// keys and empty values pass through unchanged.
const resolveApiKey = (apiKey) => {
  const key = apiKey || globalState.get('config')?.apiKeyAI || ''
  return safeDecrypt(key)
}

exports.classifyAICommand = classifyCommand
exports.classifyAIToolCall = classifyToolCall
exports.sanitizeAIText = sanitizeAIText

// Store for ongoing streaming sessions
const streamingSessions = new Map()

// Stop an ongoing streaming session
exports.stopStream = (sessionId) => {
  const session = streamingSessions.get(sessionId)
  if (!session) {
    return { error: 'Session not found' }
  }

  // Destroy the stream to stop receiving data
  if (session.stream && !session.stream.destroyed) {
    session.stream.destroy()
  }

  // Mark as completed (not an error, just stopped by user)
  session.completed = true
  session.stopped = true

  // Clean up
  streamingSessions.delete(sessionId)

  return { stopped: true }
}

// Drain a Readable into a string (used to read a streamed error body).
const streamToString = (stream) => new Promise((resolve, reject) => {
  const chunks = []
  stream.on('data', (c) => chunks.push(Buffer.from(c)))
  stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  stream.on('error', reject)
})

// Pull the provider's real error message out of a failed request. axios only
// exposes "Request failed with status code 401" on e.message; the useful
// detail ("invalid x-api-key", "model not found", relay-specific errors) lives
// in the response body — which for a stream request is itself a stream.
const extractRequestError = async (e) => {
  try {
    const data = e && e.response && e.response.data
    if (!data) return e.message
    // stream request: body is a Readable, drain then parse.
    if (typeof data.on === 'function') {
      const text = await streamToString(data)
      try {
        const json = JSON.parse(text)
        return (json.error && json.error.message) || json.message || text || e.message
      } catch (_) {
        return text || e.message
      }
    }
    if (typeof data === 'object') {
      return (data.error && data.error.message) || data.message || e.message
    }
    if (typeof data === 'string') {
      return data || e.message
    }
  } catch (_) {}
  return e.message
}

const createAIClient = (baseURL, apiKey, proxy) => {
  const config = {
    baseURL,
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    }
  }

  // Add proxy agent if proxy is provided
  const agent = proxy ? createProxyAgent(proxy) : null
  if (agent) {
    config.httpsAgent = agent
    config.proxy = false // Disable default proxy behavior when using agent
  }

  return axios.create(config)
}

exports.AIchatWithTools = async (messages, model, baseURL, path, apiKey, proxy, tools, provider = 'openai') => {
  // Tool-use for Claude uses a different request/response shape (tool_use /
  // tool_result blocks) — that translation is M3. Fail loudly instead of
  // sending OpenAI-shaped tool calls to the Anthropic endpoint.
  if (provider === 'anthropic') {
    return { error: 'Claude 暂不支持 Agent 工具调用（诊断/执行/自动模式），将在后续版本支持；请使用「解释」模式，或改用 OpenAI 兼容供应商。' }
  }
  try {
    const client = createAIClient(baseURL, resolveApiKey(apiKey), proxy)
    const requestData = {
      model,
      messages: sanitizeMessages(messages),
      stream: false
    }
    if (tools && tools.length) {
      requestData.tools = tools
      requestData.tool_choice = 'auto'
    }
    const response = await client.post(path, requestData)
    const choice = response.data.choices[0]
    return {
      message: choice.message
    }
  } catch (e) {
    log.error('AI chat with tools error', e)
    return { error: await extractRequestError(e) }
  }
}

exports.AIchat = async (
  prompt,
  model = defaultSettings.modelAI,
  role = defaultSettings.roleAI,
  baseURL = defaultSettings.baseURLAI,
  path = defaultSettings.apiPathAI,
  apiKey,
  proxy = defaultSettings.proxyAI,
  stream = true,
  provider = 'openai'
) => {
  try {
    const isAnthropic = provider === 'anthropic'
    const key = resolveApiKey(apiKey)
    const safeRole = sanitizeAIText(role)
    const safePrompt = sanitizeAIText(prompt)

    // Command suggestions should not use streaming for quick response
    const isCommandSuggestion = prompt.includes('give me max 5 command suggestions')
    const useStream = stream && !isCommandSuggestion

    const client = isAnthropic
      ? createAnthropicClient(baseURL, key, proxy)
      : createAIClient(baseURL, key, proxy)

    const requestData = isAnthropic
      ? buildAnthropicBody(safeRole, safePrompt, model, useStream)
      : {
          model,
          messages: [
            { role: 'system', content: safeRole },
            { role: 'user', content: safePrompt }
          ],
          stream: useStream
        }

    if (useStream) {
      // For streaming responses, initiate streaming and return session info
      const response = await client.post(path, requestData, {
        responseType: 'stream'
      })

      const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const sessionData = {
        stream: response.data,
        content: '',
        completed: false,
        error: null
      }

      streamingSessions.set(sessionId, sessionData)

      // Start processing the stream with the provider's line parser
      processStream(sessionId, sessionData, isAnthropic ? parseAnthropicStreamLine : parseOpenAIStreamLine)

      return {
        sessionId,
        isStream: true,
        hasMore: true,
        content: ''
      }
    } else {
      // For non-streaming responses (command suggestions and when stream=false)
      const response = await client.post(path, requestData)

      return {
        response: isAnthropic
          ? extractAnthropicText(response.data)
          : response.data.choices[0].message.content,
        isStream: false
      }
    }
  } catch (e) {
    log.error('AI chat error')
    log.error(e)
    return {
      error: await extractRequestError(e),
      stack: e.stack
    }
  }
}

// Function to get the current state of a streaming session
exports.getStreamContent = (sessionId) => {
  const session = streamingSessions.get(sessionId)
  if (!session) {
    return {
      error: 'Session not found'
    }
  }

  const result = {
    content: session.content,
    hasMore: !session.completed,
    isStream: true
  }

  if (session.error) {
    result.error = session.error
  }

  // Clean up completed sessions
  if (session.completed || session.error) {
    streamingSessions.delete(sessionId)
  }

  return result
}

// Parse one OpenAI SSE line into { text, done }.
function parseOpenAIStreamLine (line) {
  const trimmed = line.trim()
  if (trimmed === 'data: [DONE]') {
    return { done: true }
  }
  if (!line.startsWith('data: ')) {
    return {}
  }
  try {
    const data = JSON.parse(line.slice(6))
    const delta = data.choices && data.choices[0] && data.choices[0].delta
    if (delta && delta.content) {
      return { text: delta.content }
    }
  } catch (e) {
    log.error('Error parsing stream data:', e)
  }
  return {}
}

// Process streaming data. `parseLine` normalizes each SSE line to
// { text?, done?, error? } so OpenAI and Anthropic streams share this loop.
function processStream (sessionId, sessionData, parseLine = parseOpenAIStreamLine) {
  let buffer = ''
  const decoder = new StringDecoder('utf8')

  const processLines = (shouldFlush = false) => {
    const lines = buffer.split('\n')
    buffer = shouldFlush ? '' : lines.pop()
    const linesToProcess = shouldFlush ? lines.filter(Boolean).concat(buffer ? [buffer] : []) : lines

    for (const line of linesToProcess) {
      if (line.trim() === '') continue
      const parsed = parseLine(line)
      if (parsed.text) {
        sessionData.content += parsed.text
      }
      if (parsed.error) {
        sessionData.error = parsed.error
        sessionData.completed = true
        return
      }
      if (parsed.done) {
        sessionData.completed = true
        return
      }
    }
  }

  sessionData.stream.on('data', (chunk) => {
    buffer += decoder.write(chunk)
    processLines()
  })

  sessionData.stream.on('end', () => {
    buffer += decoder.end()
    processLines(true)
    sessionData.completed = true
  })

  sessionData.stream.on('error', (error) => {
    sessionData.error = error.message
    sessionData.completed = true
  })
}
