import { osResolve } from './resolve'
import { appDataDirName } from './constants'

export default function () {
  return window.et.sessionLogPath || osResolve(window.store.appPath, appDataDirName, 'session_logs')
}
