import uid from './uid'

const runs = new Map()
const waiters = new Map()
const MAX_OUTPUT = 100000
const INTERACTIVE_COMMANDS = /^(?:sudo\s+)?(?:vim?|nano|emacs|less|more|top|htop|watch|ssh|sftp|ftp|telnet|mysql|psql|redis-cli)\b/i
const CONFIRM_PROMPT = /(?:\[[yY]\/[nN]\]|\([yY]\/[nN]\)|yes\/no|continue\?\s*$|proceed\?\s*$)/i

function cleanOutput (value) {
  return String(value || '')
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g, '')
    .replace(/\r(?!\n)/g, '\n')
}

function publish (run) {
  if (window.store) {
    window.store.aiTerminalRun = {
      ...run,
      output: run.output.slice(-20000)
    }
  }
}

function settle (run) {
  const pending = waiters.get(run.id) || []
  waiters.delete(run.id)
  pending.forEach(resolve => resolve({ ...run }))
}

function buildCommand (command, marker) {
  return `${command}
__electerm_ai_exit_code=$?
printf '\\n${marker}:%s\\n' "$__electerm_ai_exit_code"`
}

export function isInteractiveCommand (command) {
  return INTERACTIVE_COMMANDS.test(String(command || '').trim())
}

export function startAITerminalRun ({ tabId, command, send }) {
  if (!tabId) throw new Error('No terminal is bound to the AI assistant.')
  if (isInteractiveCommand(command)) {
    throw new Error('Full-screen or interactive programs require user takeover.')
  }
  const id = uid()
  const marker = `__ELECTERM_AI_DONE_${id.replace(/[^A-Za-z0-9]/g, '')}__`
  const run = {
    id,
    tabId,
    command,
    marker,
    state: 'running',
    output: '',
    exitCode: null,
    waitingInputType: null,
    userTakeover: false,
    startedAt: Date.now(),
    finishedAt: null
  }
  runs.set(id, run)
  publish(run)
  send(buildCommand(command, marker))
  return { ...run }
}

const ACTIVE_RUN_STATES = ['running', 'waiting_input', 'user_takeover']

export function appendAITerminalOutput (tabId, rawOutput) {
  // fast path: this is called for EVERY output chunk of EVERY terminal, so
  // skip the regex-heavy ANSI cleanup entirely unless an AI run is actually
  // active on this tab (which is almost never the case)
  let hasActiveRun = false
  for (const run of runs.values()) {
    if (run.tabId === tabId && ACTIVE_RUN_STATES.includes(run.state)) {
      hasActiveRun = true
      break
    }
  }
  if (!hasActiveRun) return
  const text = cleanOutput(rawOutput)
  if (!text) return
  for (const run of runs.values()) {
    if (run.tabId !== tabId || !ACTIVE_RUN_STATES.includes(run.state)) continue
    run.output = (run.output + text).slice(-MAX_OUTPUT)
    const markerPattern = new RegExp(`${run.marker}:(-?\\d+)`)
    const match = run.output.match(markerPattern)
    if (match) {
      run.exitCode = Number(match[1])
      run.output = run.output
        .replace(markerPattern, '')
        .split('\n')
        .filter(line => !line.includes(run.marker) && !line.includes('__electerm_ai_exit_code'))
        .join('\n')
        .trim()
      run.state = run.exitCode === 0 ? 'completed' : 'failed'
      run.waitingInputType = null
      run.finishedAt = Date.now()
      publish(run)
      settle(run)
      continue
    }
    if (CONFIRM_PROMPT.test(run.output.slice(-500))) {
      const changed = run.state !== 'waiting_input'
      run.state = 'waiting_input'
      run.waitingInputType = 'confirmation'
      if (changed) settle(run)
    }
    publish(run)
  }
}

export function notifyAITerminalPasswordPrompt (tabId) {
  for (const run of runs.values()) {
    if (run.tabId !== tabId || run.state !== 'running') continue
    run.state = 'waiting_input'
    run.waitingInputType = 'secret'
    publish(run)
    settle(run)
  }
}

export function notifyAITerminalUserInput (tabId) {
  for (const run of runs.values()) {
    if (run.tabId !== tabId || !['running', 'waiting_input'].includes(run.state)) continue
    run.userTakeover = true
    run.state = 'user_takeover'
    run.waitingInputType = null
    run.lastUserInputAt = Date.now()
    publish(run)
    settle(run)
  }
}

export function sendAITerminalInput ({ runId, input, send }) {
  const run = runs.get(runId)
  if (!run) throw new Error('AI terminal run not found.')
  if (run.state !== 'waiting_input' || run.waitingInputType !== 'confirmation') {
    throw new Error('The terminal is not waiting for a non-secret confirmation.')
  }
  if (!/^(?:y|yes|n|no)$/i.test(String(input || '').trim())) {
    throw new Error('Only yes/no confirmation input is allowed.')
  }
  send(String(input).trim() + '\r')
  run.state = 'running'
  run.waitingInputType = null
  publish(run)
  return { ...run }
}

export function cancelAITerminalRun ({ runId, send }) {
  const run = runs.get(runId)
  if (!run) throw new Error('AI terminal run not found.')
  send('\x03')
  run.state = 'cancelled'
  run.finishedAt = Date.now()
  publish(run)
  settle(run)
  return { ...run }
}

export function getAITerminalRun (runId) {
  const run = runs.get(runId)
  return run ? { ...run } : null
}

export function waitForAITerminalRun (runId, timeout = 120000) {
  const run = runs.get(runId)
  if (!run) return Promise.reject(new Error('AI terminal run not found.'))
  if (['completed', 'failed', 'cancelled'].includes(run.state)) {
    return Promise.resolve({ ...run })
  }
  return new Promise(resolve => {
    let settled = false
    const finish = value => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const pending = waiters.get(runId) || []
    pending.push(finish)
    waiters.set(runId, pending)
    setTimeout(() => {
      const current = runs.get(runId)
      if (!current || ['completed', 'failed', 'cancelled'].includes(current.state)) return
      const active = waiters.get(runId) || []
      waiters.set(runId, active.filter(item => item !== finish))
      finish({ ...current, timedOut: true })
    }, Math.min(timeout, 120000))
  })
}

export const aiTerminalRunnerTestHelpers = {
  buildCommand,
  cleanOutput
}
