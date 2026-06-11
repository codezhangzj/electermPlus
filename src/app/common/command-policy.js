const BLOCKED_RULES = [
  { pattern: /\brm\s+-[^\s]*[rR][^\s]*\b/, reason: 'Recursive deletion commands are blocked.' },
  { pattern: /\brm\s+--recursive\b/, reason: 'Recursive deletion commands are blocked.' },
  { pattern: /\bsudo\s+rm\b/, reason: 'Elevated file deletion is blocked.' },
  { pattern: /\b(?:mkfs|fdisk|parted)\b/, reason: 'Disk formatting and partition operations are blocked.' },
  { pattern: /\bdd\b[\s\S]*\bof\s*=\s*\/dev\//, reason: 'Writing directly to a block device is blocked.' },
  { pattern: />\s*\/dev\/[sh]d[a-z]/, reason: 'Redirecting output to a raw disk is blocked.' },
  { pattern: /:\s*\(\s*\)\s*\{[\s\S]*\|[\s\S]*&[\s\S]*\}/, reason: 'Fork bombs are blocked.' },
  { pattern: /\b(?:curl|wget)\b[\s\S]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/, reason: 'Piping downloaded content directly into a shell is blocked.' },
  { pattern: /\b(?:nc|ncat|netcat)\b[\s\S]*(?:-e\s*\/bin\/(?:sh|bash)|\|\s*\/bin\/(?:sh|bash))/, reason: 'Reverse shell commands are blocked.' },
  { pattern: /\/dev\/(?:tcp|udp)\//, reason: 'Shell network device access is blocked.' },
  { pattern: /\b(?:history\s+-c|unset\s+HISTFILE)\b/, reason: 'Commands that erase shell audit history are blocked.' }
]

const HIGH_RISK_RULES = [
  { pattern: /\bsudo\b/, reason: 'Uses elevated privileges.' },
  { pattern: /\b(?:rm|rmdir|shred|unlink)\b/, reason: 'Deletes files or directories.' },
  { pattern: /\b(?:chmod|chown|chgrp|setfacl)\b/, reason: 'Changes permissions or ownership.' },
  { pattern: /\b(?:useradd|userdel|usermod|groupadd|groupdel|passwd)\b/, reason: 'Changes users, groups, or credentials.' },
  { pattern: /\b(?:iptables|nft|ufw|firewall-cmd)\b/, reason: 'Changes firewall or network policy.' },
  { pattern: /\b(?:shutdown|reboot|poweroff|halt)\b/, reason: 'Changes machine availability.' },
  { pattern: /\b(?:apt|apt-get|yum|dnf|pacman|brew)\s+(?:remove|purge|autoremove|uninstall)\b/, reason: 'Removes installed software.' },
  { pattern: /\b(?:systemctl|service)\s+(?:stop|disable|mask|restart)\b/, reason: 'Changes service availability.' },
  { pattern: /\b(?:docker|podman)\s+(?:rm|rmi|kill|stop|prune)\b/, reason: 'Removes or stops containers and images.' },
  { pattern: /\bkubectl\s+(?:delete|apply|replace|patch|edit|scale|rollout|cordon|drain)\b/, reason: 'Changes Kubernetes resources.' },
  { pattern: /\b(?:drop|truncate|delete\s+from|update|insert\s+into|alter)\b/i, reason: 'May modify database data or schema.' },
  { pattern: /(?:>|>>|2>|&>)/, reason: 'Writes command output to a file or device.' }
]

const READ_ONLY_COMMANDS = new Set([
  'awk', 'cat', 'cut', 'date', 'df', 'dig', 'du', 'env', 'find', 'free',
  'grep', 'head', 'hostname', 'id', 'ip', 'journalctl', 'less', 'ls',
  'lsof', 'netstat', 'nslookup', 'pgrep', 'ping', 'ps', 'pwd', 'sed',
  'ss', 'stat', 'tail', 'top', 'traceroute', 'uname', 'uptime', 'wc', 'who',
  'whoami'
])

const READ_ONLY_SUBCOMMANDS = {
  docker: new Set(['inspect', 'logs', 'ps', 'stats', 'version', 'info']),
  git: new Set(['branch', 'diff', 'log', 'show', 'status', 'remote']),
  kubectl: new Set(['api-resources', 'cluster-info', 'describe', 'explain', 'get', 'logs', 'top', 'version']),
  podman: new Set(['inspect', 'logs', 'ps', 'stats', 'version', 'info']),
  systemctl: new Set(['is-active', 'is-enabled', 'list-units', 'show', 'status'])
}

const TOOL_POLICIES = {
  get_terminal_output: 'read',
  get_terminal_context: 'read',
  get_terminal_status: 'read',
  list_tabs: 'read',
  get_active_tab: 'read',
  list_bookmarks: 'read',
  sftp_list: 'read',
  sftp_stat: 'read',
  sftp_read_file: 'read',
  sftp_transfer_list: 'read',
  sftp_transfer_history: 'read',
  get_background_task_status: 'read',
  get_background_task_log: 'read',
  get_ai_terminal_run: 'read',
  switch_tab: 'read',
  open_local_terminal: 'confirm',
  open_bookmark: 'confirm',
  open_tab: 'confirm',
  add_bookmark: 'confirm',
  close_tab: 'confirm',
  cancel_terminal_command: 'confirm',
  cancel_background_task: 'confirm',
  sftp_upload: 'confirm',
  sftp_download: 'confirm',
  sftp_del: 'confirm',
  send_terminal_input: 'confirm'
}

function firstExecutableTokens (command) {
  return command
    .split(/(?:&&|\|\||;|\||\n)/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const tokens = part.match(/(?:"[^"]*"|'[^']*'|[^\s]+)/g) || []
      while (tokens[0] && /^(?:sudo|command|env|nohup|time)$/.test(tokens[0])) tokens.shift()
      while (tokens[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) tokens.shift()
      return tokens.map(token => token.replace(/^['"]|['"]$/g, ''))
    })
}

function isReadOnlyCommand (command) {
  if (/(?:>|>>|2>|&>|`|\$\(|\bxargs\b)/.test(command)) return false
  const groups = firstExecutableTokens(command)
  if (!groups.length) return false
  return groups.every(tokens => {
    const executable = (tokens[0] || '').split('/').pop()
    if (READ_ONLY_COMMANDS.has(executable)) return true
    const subcommands = READ_ONLY_SUBCOMMANDS[executable]
    return Boolean(subcommands && subcommands.has(tokens[1]))
  })
}

function classifyCommand (command) {
  const normalized = String(command || '').trim()
  if (!normalized) {
    return { allowed: false, risk: 'blocked', reason: 'The command is empty.' }
  }

  const blocked = BLOCKED_RULES.find(rule => rule.pattern.test(normalized))
  if (blocked) {
    return {
      allowed: false,
      risk: 'blocked',
      reason: blocked.reason,
      impact: 'The command will not be sent to the terminal.',
      rollback: 'Not applicable because execution is blocked.'
    }
  }

  const highRisk = HIGH_RISK_RULES.find(rule => rule.pattern.test(normalized))
  if (highRisk) {
    return {
      allowed: true,
      risk: 'high',
      requiresApproval: true,
      reason: highRisk.reason,
      impact: 'This command can change system state or service availability.',
      rollback: 'Verify a rollback command or backup before approving.'
    }
  }

  if (isReadOnlyCommand(normalized)) {
    return {
      allowed: true,
      risk: 'read',
      requiresApproval: false,
      reason: 'Recognized as a read-only diagnostic command.',
      impact: 'Reads system state without an expected persistent change.',
      rollback: 'No rollback is normally required.'
    }
  }

  return {
    allowed: true,
    risk: 'medium',
    requiresApproval: true,
    reason: 'The command is not proven to be read-only.',
    impact: 'The command may change files, processes, packages, or remote state.',
    rollback: 'Review the command and prepare a rollback before approving.'
  }
}

function classifyToolCall (toolName, args = {}) {
  if (toolName === 'send_terminal_command' || toolName === 'run_background_command') {
    return classifyCommand(args.command)
  }
  const policy = TOOL_POLICIES[toolName] || 'confirm'
  if (policy === 'read') {
    return {
      allowed: true,
      risk: 'read',
      requiresApproval: false,
      reason: 'This tool only reads application or server state.',
      impact: 'No persistent change is expected.',
      rollback: 'No rollback is normally required.'
    }
  }
  return {
    allowed: true,
    risk: toolName === 'sftp_del' ? 'high' : 'medium',
    requiresApproval: true,
    reason: toolName === 'sftp_del'
      ? 'Deletes a remote file or directory.'
      : 'This tool can change application or remote state.',
    impact: 'Review the target and arguments before execution.',
    rollback: toolName === 'sftp_del'
      ? 'Restore the deleted data from a backup if available.'
      : 'Undo the operation manually if necessary.'
  }
}

function validateCommand (command, config = {}) {
  const result = classifyCommand(command)
  if (!result.allowed) return result

  const blacklist = String(config.commandBlacklist || '').split('\n').map(s => s.trim()).filter(Boolean)
  for (const raw of blacklist) {
    try {
      if (new RegExp(raw).test(command)) {
        return { allowed: false, risk: 'blocked', reason: `Command blocked by blacklist pattern: ${raw}` }
      }
    } catch (_) {}
  }

  const whitelist = String(config.commandWhitelist || '').split('\n').map(s => s.trim()).filter(Boolean)
  if (whitelist.length && !whitelist.some(raw => {
    try { return new RegExp(raw).test(command) } catch (_) { return false }
  })) {
    return { allowed: false, risk: 'blocked', reason: 'Command not in whitelist' }
  }
  return result
}

module.exports = {
  BLOCKED_RULES,
  classifyCommand,
  classifyToolCall,
  validateCommand
}
