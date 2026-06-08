const log = require('electron-log')
const { isDev, appDataDirName } = require('./runtime-constants')
const { join } = require('path')
const os = require('os')

let app
try {
  app = require('electron').app
} catch (e) {
  app = null
}

function getAppDataPath () {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('appData')
  }
  if (process.env.appPath) {
    return process.env.appPath
  }
  if (process.platform === 'darwin') {
    return join(os.homedir(), 'Library', 'Application Support')
  }
  if (process.platform === 'win32') {
    return process.env.APPDATA || join(os.homedir(), 'AppData', 'Roaming')
  }
  return process.env.XDG_CONFIG_HOME || join(os.homedir(), '.config')
}

log.transports.console.format = '{h}:{i}:{s} {level} › {text}'
log.transports.file.resolvePathFn = () => {
  return join(getAppDataPath(), appDataDirName, 'logs', 'main.log')
}

if (!isDev) {
  log.transports.console.level = 'warn'
  log.transports.file.level = 'warn'
}

module.exports = exports.default = log
