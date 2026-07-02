/**
 * Database manager panel store extension.
 *
 * Opens the right-side panel on the 'db' tab for a given bookmark + one of its
 * saved dbConnections. The heavy lifting (tunnel + queries) lives in the panel
 * component via common/db-apis.js; the store only tracks which target is open.
 *
 * Like one-click login, this is a user-only action and dbConnections never
 * enter the AI context.
 */

import { dbClose } from '../common/db-apis'

// Build the minimal SSH connect options the tunnel needs from a bookmark.
// V1 supports password and inline private-key auth (agent / profiles / jump
// hosts are deferred to V2).
function buildSshConfig (bookmark) {
  return {
    host: bookmark.host,
    port: bookmark.port || 22,
    username: bookmark.username || bookmark.user || 'root',
    password: bookmark.password,
    privateKey: bookmark.privateKey,
    passphrase: bookmark.passphrase
  }
}

export default Store => {
  Store.prototype.openDbManager = function (bookmark, dbConn) {
    const { store } = window
    if (!bookmark || !dbConn) {
      return
    }
    store.dbManagerTarget = {
      connId: `${bookmark.id}:${dbConn.id}`,
      bookmarkId: bookmark.id,
      title: bookmark.title || bookmark.host || '',
      sshConfig: buildSshConfig(bookmark),
      dbConn: {
        id: dbConn.id,
        name: dbConn.name,
        dbType: dbConn.dbType || 'mysql',
        dbHost: dbConn.dbHost || dbConn.host || '127.0.0.1',
        port: dbConn.port,
        username: dbConn.username,
        password: dbConn.password,
        database: dbConn.database || ''
      }
    }
    store.rightPanelVisible = true
    store.rightPanelTab = 'db'
    store.rightPanelPinned = true
    store.dbPanelLayout = 'split'
    store.triggerResize()
  }

  // 'split' | 'dbMax' (terminal minimized) | 'dbMin' (database minimized)
  Store.prototype.setDbPanelLayout = function (mode) {
    const { store } = window
    store.dbPanelLayout = mode
    store.triggerResize()
  }

  Store.prototype.closeDbManager = function () {
    const { store } = window
    const target = store.dbManagerTarget
    if (target) {
      dbClose(target.connId).catch(() => {})
    }
    store.dbManagerTarget = null
    store.dbPanelLayout = 'split'
    if (store.rightPanelTab === 'db') {
      store.rightPanelVisible = false
      store.triggerResize()
    }
  }
}
