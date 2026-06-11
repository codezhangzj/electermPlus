const MAX_AI_CONTENT_LENGTH = 50000

const REDACTION_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]'],
  [/\b(api[_-]?key|access[_-]?token|secret|password|passwd)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]'],
  [/\b(?:sk|ghp|glpat|xox[baprs])-[-A-Za-z0-9_]{12,}\b/g, '[REDACTED TOKEN]'],
  [/Authorization:\s*(?:Bearer|Basic)\s+[^\s]+/gi, 'Authorization: [REDACTED]']
]

function sanitizeAIText (value) {
  if (typeof value !== 'string') return value
  const redacted = REDACTION_PATTERNS.reduce((text, [pattern, replacement]) => {
    return text.replace(pattern, replacement)
  }, value)
  if (redacted.length <= MAX_AI_CONTENT_LENGTH) return redacted
  return redacted.slice(0, MAX_AI_CONTENT_LENGTH) + '\n[TRUNCATED]'
}

function sanitizeMessages (messages) {
  return messages.map(message => ({
    ...message,
    content: sanitizeAIText(message.content)
  }))
}

module.exports = {
  sanitizeAIText,
  sanitizeMessages
}
