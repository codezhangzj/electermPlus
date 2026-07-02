/**
 * Database quick-login credential definitions.
 *
 * V1 ships MySQL/MariaDB only. Each dbType declares how to build a client
 * launch command and how to recognise its interactive password prompt and
 * common failure signatures. PostgreSQL / Redis are scaffolded but disabled
 * in the UI until their login state machines are validated.
 */

export const dbTypeDefaults = {
  mysql: {
    port: 3306,
    clientCmd: 'mysql'
  },
  postgresql: {
    port: 5432,
    clientCmd: 'psql'
  },
  redis: {
    port: 6379,
    clientCmd: 'redis-cli'
  }
}

export const dbTypeLabels = {
  mysql: 'MySQL / MariaDB',
  postgresql: 'PostgreSQL',
  redis: 'Redis'
}

// Only enabled types can be created or launched in V1.
export const enabledDbTypes = ['mysql']

export const dbTypeOptions = Object.keys(dbTypeLabels).map(value => ({
  value,
  label: dbTypeLabels[value] + (enabledDbTypes.includes(value) ? '' : ' (planned)'),
  disabled: !enabledDbTypes.includes(value)
}))

function shellQuote (value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

/**
 * Build the client launch command WITHOUT the password. The password is
 * injected later, only after the client prints its own password prompt, so
 * it never lands in the command line, shell history or process list.
 */
export function buildDbLoginCommand (conn) {
  const type = conn.dbType || 'mysql'
  const client = (conn.clientCmd || dbTypeDefaults[type]?.clientCmd || '').trim()
  const host = conn.dbHost || conn.host || '127.0.0.1'
  const port = conn.port || dbTypeDefaults[type]?.port
  const user = conn.username || ''
  const database = (conn.database || '').trim()

  if (type === 'mysql') {
    const parts = [client || 'mysql', '-h', shellQuote(host), '-P', String(port), '-u', shellQuote(user)]
    if (conn.password) {
      parts.push('-p')
    }
    if (database) {
      parts.push(shellQuote(database))
    }
    return parts.join(' ')
  }
  if (type === 'postgresql') {
    const parts = [client || 'psql', '-h', shellQuote(host), '-p', String(port), '-U', shellQuote(user), '-W']
    if (database) {
      parts.push('-d', shellQuote(database))
    }
    return parts.join(' ')
  }
  if (type === 'redis') {
    const parts = [client || 'redis-cli', '-h', shellQuote(host), '-p', String(port)]
    return parts.join(' ')
  }
  return ''
}

// Prompt the interactive client prints when it wants a password.
export const dbPasswordPromptPatterns = {
  mysql: /enter password:\s*$/i,
  postgresql: /password.*:\s*$/i,
  redis: /$^/
}

// The success prompt that means we are inside the DB shell.
export const dbSuccessPatterns = {
  mysql: /mysql\s*>|MariaDB\s*\[[^\]]*\]>/i,
  postgresql: /=[#>]\s*$/,
  redis: /^\S+:\d+>\s*$/m
}

// Known login-failure signatures, matched against recent output.
export const dbFailurePatterns = {
  mysql: [
    { re: /access denied for user/i, reason: 'accessDenied' },
    { re: /can't connect to (?:local )?mysql server|connection refused/i, reason: 'connRefused' },
    { re: /unknown database/i, reason: 'unknownDatabase' },
    { re: /command not found|not recognized as an internal/i, reason: 'clientMissing' }
  ],
  postgresql: [
    { re: /password authentication failed/i, reason: 'accessDenied' },
    { re: /could not connect to server|connection refused/i, reason: 'connRefused' },
    { re: /command not found/i, reason: 'clientMissing' }
  ],
  redis: [
    { re: /wrongpass|noauth/i, reason: 'accessDenied' },
    { re: /could not connect|connection refused/i, reason: 'connRefused' },
    { re: /command not found/i, reason: 'clientMissing' }
  ]
}

export function getDbFailure (dbType, output) {
  const patterns = dbFailurePatterns[dbType] || dbFailurePatterns.mysql
  const tail = String(output || '').slice(-1000)
  for (const { re, reason } of patterns) {
    if (re.test(tail)) {
      return reason
    }
  }
  return null
}
