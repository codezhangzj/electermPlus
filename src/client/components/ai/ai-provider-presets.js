/**
 * One-click AI provider presets.
 *
 * M1 covers OpenAI-compatible providers only (the existing request path in
 * ai.js already speaks that dialect). Selecting a preset fills the config
 * form. `providerAI` is carried so a later phase can add Claude (native
 * Anthropic Messages API) presets with `providerAI: 'anthropic'`.
 */

export const aiProviderPresets = [
  {
    key: 'deepseek-flash',
    label: 'DeepSeek 快速',
    values: {
      providerAI: 'openai',
      nameAI: 'DeepSeek 运维助手',
      baseURLAI: 'https://api.deepseek.com',
      apiPathAI: '/chat/completions',
      modelAI: 'deepseek-v4-flash'
    }
  },
  {
    key: 'deepseek-pro',
    label: 'DeepSeek 深度',
    values: {
      providerAI: 'openai',
      nameAI: 'DeepSeek 深度诊断',
      baseURLAI: 'https://api.deepseek.com',
      apiPathAI: '/chat/completions',
      modelAI: 'deepseek-v4-pro'
    }
  },
  {
    key: 'openai-gpt5',
    label: 'OpenAI GPT-5',
    values: {
      providerAI: 'openai',
      nameAI: 'GPT-5 运维助手',
      baseURLAI: 'https://api.openai.com/v1',
      apiPathAI: '/chat/completions',
      modelAI: 'gpt-5'
    }
  },
  {
    key: 'openai-gpt4o',
    label: 'OpenAI GPT-4o',
    values: {
      providerAI: 'openai',
      nameAI: 'GPT-4o 运维助手',
      baseURLAI: 'https://api.openai.com/v1',
      apiPathAI: '/chat/completions',
      modelAI: 'gpt-4o'
    }
  },
  // Claude uses the native Anthropic Messages API (providerAI: 'anthropic').
  // Chat (explain mode) works now; agent tool-use is a later phase.
  {
    key: 'claude-haiku',
    label: 'Claude 快速',
    values: {
      providerAI: 'anthropic',
      nameAI: 'Claude 运维助手',
      baseURLAI: 'https://api.anthropic.com',
      apiPathAI: '/v1/messages',
      modelAI: 'claude-haiku-4-5'
    }
  },
  {
    key: 'claude-opus',
    label: 'Claude 深度',
    values: {
      providerAI: 'anthropic',
      nameAI: 'Claude 深度诊断',
      baseURLAI: 'https://api.anthropic.com',
      apiPathAI: '/v1/messages',
      modelAI: 'claude-opus-4-8'
    }
  },
  // Relay / aggregator endpoints (one-api, new-api, etc.) speak the OpenAI
  // chat-completions dialect even when proxying Claude/Gemini. Only set the
  // protocol + path so the user's own URL / model / key stay intact.
  {
    key: 'relay-openai',
    label: '中转站（OpenAI 兼容）',
    values: {
      providerAI: 'openai',
      apiPathAI: '/chat/completions'
    }
  }
]

/**
 * Known model lists per provider, used to populate the model dropdown.
 * Matching is by baseURL host (and provider), so custom / relay endpoints
 * that don't match any group fall back to a merged list while still allowing
 * free-text input.
 */
export const aiModelGroups = [
  {
    match: /anthropic|claude/i,
    models: [
      'claude-opus-4-8',
      'claude-sonnet-5',
      'claude-haiku-4-5',
      'claude-opus-4-7',
      'claude-fable-5'
    ]
  },
  {
    match: /deepseek/i,
    models: [
      'deepseek-v4-flash',
      'deepseek-v4-pro',
      'deepseek-chat',
      'deepseek-reasoner'
    ]
  },
  {
    match: /openai\.com/i,
    models: [
      'gpt-5',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'o3',
      'o3-mini'
    ]
  }
]

export function getModelOptions (baseURL = '', provider = '') {
  const hay = `${baseURL || ''} ${provider || ''}`
  const group = aiModelGroups.find(g => g.match.test(hay))
  const models = group
    ? group.models
    : aiModelGroups.reduce((all, g) => all.concat(g.models), [])
  return models.map(m => ({ value: m }))
}
