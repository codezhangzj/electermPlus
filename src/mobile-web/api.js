async function request (path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body
      ? { 'Content-Type': 'application/json', ...options.headers }
      : options.headers,
    ...options
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || '请求失败。')
    error.status = response.status
    error.code = data.code
    error.hostKeyPrompt = data.hostKeyPrompt
    throw error
  }
  return data
}

export function getAuthStatus () {
  return request('/api/mobile-ssh/auth/status')
}

export function login (password) {
  return request('/api/mobile-ssh/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  })
}

export function logout () {
  return request('/api/mobile-ssh/auth/logout', {
    method: 'POST'
  })
}

export function createSshSession (options) {
  return request('/api/mobile-ssh/sessions', {
    method: 'POST',
    body: JSON.stringify(options)
  })
}

export function getTerminalWebSocketUrl (sessionId) {
  const url = new URL(`/ws/mobile-ssh/terminal/${encodeURIComponent(sessionId)}`, window.location.href)
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
