const { fork } = require('child_process')
const path = require('path')

// Map to store active terminal processes (pid -> {child, port, ws})
const activeTerminals = new Map()

// Track the last port assigned
let lastPort = 30975
const MIN_PORT = 30975
const MAX_PORT = 65534
// Add a set to track ports that are currently being assigned
const pendingPorts = new Set()

function getForkEnv (env) {
  const nextEnv = {
    ...env
  }
  if (process.versions.electron) {
    nextEnv.ELECTRON_RUN_AS_NODE = '1'
  }
  return nextEnv
}

function getPort (fromPort = MIN_PORT) {
  // Use the last port + 1 or start over if we've reached MAX_PORT
  let startPort = lastPort >= MAX_PORT ? MIN_PORT : lastPort + 1

  // Skip ports that are currently being assigned
  while (pendingPorts.has(startPort)) {
    startPort = startPort >= MAX_PORT ? MIN_PORT : startPort + 1
  }

  // Mark this port as pending
  pendingPorts.add(startPort)

  return new Promise((resolve, reject) => {
    require('find-free-port')(startPort, '127.0.0.1', function (err, freePort) {
      if (err) {
        // Remove from pending set on error
        pendingPorts.delete(startPort)
        reject(err)
      } else {
        // Remember this port for next time
        lastPort = freePort
        // Remove from pending set when done
        pendingPorts.delete(startPort)
        resolve(freePort)
      }
    })
  })
}

async function runSessionServer (type, port) {
  return new Promise((resolve) => {
    const child = fork(path.resolve(__dirname, './session-server.js'), {
      env: getForkEnv(Object.assign(
        {},
        process.env,
        {
          wsPort: port,
          type
        }
      )),
      cwd: process.cwd()
    }, (error, stdout, stderr) => {
      if (error || stderr) {
        console.error('Error in session server:', error || stderr)
        throw error || stderr
      }
    })
    child.on('message', (m) => {
      if (m && m.serverInited) {
        resolve(child)
      }
    })
  })
}

/**
 * Pre-warmed spare session-server.
 *
 * Forking a node child + scanning for a free port + waiting for its ws
 * server adds 100-300ms before the SSH handshake can even start. Keep one
 * spare child ready so opening a tab skips that cost. The spare's env type
 * is 'terminal', which only matters to session-server for rdp/vnc/spice
 * (different startup mode) and ftp (Ftp vs Sftp class), so those types
 * never consume the spare. An unused spare self-terminates after 2 minutes
 * (session-server orphan protection), which doubles as pool GC — a dead
 * spare is simply detected and replaced on next use.
 */
const PREWARM_TYPE = 'terminal'
const noPrewarmTypes = ['rdp', 'vnc', 'spice', 'ftp']
let sparePromise = null

async function createServer (type) {
  const port = await getPort()
  const child = await runSessionServer(type, port)
  return { child, port }
}

function refillSpare () {
  const p = createServer(PREWARM_TYPE)
    .then(entry => {
      entry.child.once('exit', () => {
        if (sparePromise === p) {
          sparePromise = null
        }
      })
      return entry
    })
    .catch((err) => {
      console.error('prewarm session server failed', err)
      if (sparePromise === p) {
        sparePromise = null
      }
      return null
    })
  sparePromise = p
}

async function takeServer (type) {
  const prewarmable = !noPrewarmTypes.includes(type)
  if (prewarmable && sparePromise) {
    const p = sparePromise
    sparePromise = null
    const entry = await p
    if (entry && entry.child.exitCode === null && entry.child.connected) {
      refillSpare()
      return entry
    }
  }
  const entry = await createServer(type)
  if (prewarmable && !sparePromise) {
    refillSpare()
  }
  return entry
}

async function sendMsgToChildProcess (pid, msg) {
  const child = typeof pid === 'object' ? pid : activeTerminals.get(pid)?.child
  if (!child) {
    throw new Error(`Terminal with PID ${pid} not found`)
  }

  return new Promise((resolve, reject) => {
    const responseHandler = (response) => {
      if (response.id === msg.id) {
        child.removeListener('message', responseHandler)
        if (response.error) {
          reject(response.error)
        } else {
          resolve(response.data)
        }
      }
    }

    child.on('message', responseHandler)
    child.send({
      type: 'common',
      data: msg
    })
  })
}

exports.terminal = async function (initOptions, ws, uid) {
  const type = initOptions.termType || initOptions.type || 'terminal'
  const { child, port } = await takeServer(type)
  const pid = initOptions.uid
  const isSsh = ![
    'telnet',
    'serial',
    'local',
    'rdp',
    'vnc',
    'spice',
    'ftp'
  ].includes(type)
  if (isSsh) {
    child.on('message', (m) => {
      const { type, data } = m
      if (type === 'common') {
        ws.s(data)
        ws.once((data) => {
          child.send(data)
        }, data.id)
      }
    })
  }
  child.on('exit', () => {
    // Remove all pending message listeners to prevent memory leaks
    // if the child exits before responding to sendMsgToChildProcess calls
    child.removeAllListeners('message')
    activeTerminals.delete(pid)
  })
  if (type !== 'ftp') {
    try {
      await sendMsgToChildProcess(child, {
        id: uid,
        action: 'create-terminal',
        body: initOptions
      })
    } catch (err) {
      child.kill()
      throw err
    }
  }

  // Kill any existing child process for this pid before overwriting.
  // This can happen on reconnects where a new process is spawned for the same tab id.
  const existingEntry = activeTerminals.get(pid)
  if (existingEntry) {
    existingEntry.child.kill()
    activeTerminals.delete(pid)
  }

  // Store the terminal process in the map
  activeTerminals.set(pid, {
    child,
    port,
    ws
  })

  return {
    pid,
    port
  }
}

exports.testConnection = async function (initOptions, ws, uid) {
  const type = initOptions.termType || initOptions.type || 'terminal'
  const { child } = await takeServer(type)

  const isSsh = ![
    'telnet',
    'serial',
    'local',
    'rdp',
    'vnc',
    'spice',
    'ftp'
  ].includes(type)
  if (isSsh && ws) {
    child.on('message', (m) => {
      const { type: msgType, data } = m
      if (msgType === 'common') {
        ws.s(data)
        ws.once((respData) => {
          child.send(respData)
        }, data.id)
      }
    })
  }

  const res = await sendMsgToChildProcess(child, {
    id: uid,
    action: 'test-terminal',
    body: initOptions
  })

  child.kill()
  return res
}

/**
 * Get terminal instance by pid
 * @param {string} pid - Process ID of the terminal
 * @returns {object|null} Terminal instance or null if not found
 */
exports.terminals = function (pid) {
  const terminal = activeTerminals.get(pid)
  if (!terminal) {
    return null
  }

  return {
    runCmd: async (cmd, id) => {
      return sendMsgToChildProcess(pid, {
        id,
        action: 'run-cmd',
        body: { cmd, pid }
      })
    },
    resize: (cols, rows, id) => {
      sendMsgToChildProcess(pid, {
        id,
        action: 'resize-terminal',
        body: { cols, rows, pid }
      })// Ignore errors for resize
    },
    toggleTerminalLog: (id) => {
      sendMsgToChildProcess(pid, {
        id,
        action: 'toggle-terminal-log',
        body: { pid }
      })
    },
    toggleTerminalLogTimestamp: (id) => {
      sendMsgToChildProcess(pid, {
        id,
        action: 'toggle-terminal-log-timestamp',
        body: { pid }
      })
    },
    setTerminalLogPath: (id, logPath) => {
      sendMsgToChildProcess(pid, {
        id,
        action: 'set-terminal-log-path',
        body: { pid, logPath }
      })
    },
    startTerminalLogFile: (id, logFilePath, addTimeStampToTermLog) => {
      sendMsgToChildProcess(pid, {
        id,
        action: 'start-terminal-log-file',
        body: { pid, logFilePath, addTimeStampToTermLog }
      })
    }
  }
}

/**
 * Clean up all active terminals
 */
exports.cleanupTerminals = function () {
  for (const [pid, terminal] of activeTerminals) {
    terminal.child.kill()
    activeTerminals.delete(pid)
  }
  // also reap an unconsumed pre-warmed spare (it is not in activeTerminals)
  if (sparePromise) {
    const p = sparePromise
    sparePromise = null
    p.then(entry => {
      entry && entry.child.kill()
    }).catch(() => {})
  }
}

// Clean up on process exit
process.on('SIGINT', () => {
  exports.cleanupTerminals()
  process.exit()
})
process.on('SIGTERM', () => {
  exports.cleanupTerminals()
  process.exit()
})
