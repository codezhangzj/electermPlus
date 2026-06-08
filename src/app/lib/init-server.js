/**
 * server init script
 */

const createChildServer = require('../server/child-process')
const globalState = require('./glob-state')
const log = require('../common/log')

module.exports = async (config, env, sysLocale) => {
  return new Promise((resolve, reject) => {
    const child = createChildServer(config, env, sysLocale)
    const timer = setTimeout(() => {
      const err = new Error('App server startup timed out')
      log.error(err)
      try {
        child.kill()
      } catch (e) {
        log.error(e)
      }
      reject(err)
    }, 15000)
    child.on('exit', () => {
      globalState.set('childPid', null)
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      log.error('App server child process error', err)
      reject(err)
    })
    globalState.set('childPid', child.pid)
    child.on('message', (m) => {
      if (m && m.serverInited) {
        clearTimeout(timer)
        resolve(child)
      }
    })
  })
}
