/**
 * One-click database login quick bar.
 *
 * Only rendered when the tab's bookmark has dbConnections configured, so
 * users without credentials never see it. Login is a user-only action: it is
 * not exposed to the AI agent, and the password is injected by the state
 * machine in common/db-quick-login.js only after the client prompts for it.
 */

import { auto } from 'manate/react'
import { Dropdown } from 'antd'
import {
  DatabaseOutlined,
  DownOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import message from '../common/message'
import { enabledDbTypes } from '../../common/db-connection-defaults'
import './db-quick-bar.styl'

const e = window.translate

const failureReasonKeys = {
  accessDenied: 'plusDbAccessDenied',
  connRefused: 'plusDbConnRefused',
  unknownDatabase: 'plusDbUnknownDatabase',
  clientMissing: 'plusDbClientMissing',
  noPrompt: 'plusDbNoPrompt',
  timeout: 'plusDbTimeout',
  superseded: 'plusDbSuperseded'
}

export function describeDbFailure (reason) {
  return e(failureReasonKeys[reason] || 'plusDbLoginFailed')
}

export function listEnabledDbConnections (item) {
  return (item?.dbConnections || []).filter(
    conn => enabledDbTypes.includes(conn.dbType || 'mysql')
  )
}

/**
 * Resolve DB credentials for a terminal tab.
 *
 * A tab is a snapshot taken when the bookmark was opened, so credentials
 * added to the bookmark AFTER opening would be missing from it. We therefore
 * prefer the live bookmark (matched by srcId) and fall back to the tab's own
 * snapshot for local tabs or tabs with no source bookmark.
 */
export function resolveTabDbConnections (tab) {
  if (!tab) {
    return []
  }
  const live = tab.srcId && window.store
    ? window.store.bookmarks.find(b => b.id === tab.srcId)
    : null
  const source = live && (live.dbConnections || []).length ? live : tab
  return listEnabledDbConnections(source)
}

export async function runDbQuickLogin (tabId, conn) {
  try {
    const result = await window.store.dbQuickLogin(tabId, conn)
    if (result && result.state === 'success') {
      message.success(`${e('plusDbLoginSuccess')}: ${conn.name}`)
    } else {
      const reason = result && !result.timedOut ? result.reason : 'timeout'
      message.error(`${e('plusDbLoginFailed')}: ${describeDbFailure(reason)}`)
    }
    return result
  } catch (err) {
    message.error(err.message)
  }
}

export default auto(function DbQuickBar ({ tab }) {
  const conns = resolveTabDbConnections(tab)
  if (!conns.length) {
    return null
  }
  const login = window.store.dbLoginState
  const running = !!(login && login.tabId === tab.id && !login.finishedAt)

  function handleLogin (conn) {
    if (running) {
      return
    }
    runDbQuickLogin(tab.id, conn)
  }

  const icon = running
    ? <LoadingOutlined />
    : <DatabaseOutlined />
  const label = running
    ? `${e('plusDbLoggingIn')} ${login.name}`
    : conns.length === 1
      ? conns[0].name
      : e('plusDbQuickLogin')

  if (conns.length === 1) {
    return (
      <div className='db-quick-bar'>
        <span
          className='db-quick-bar-btn'
          title={e('plusDbQuickLogin')}
          onClick={() => handleLogin(conns[0])}
        >
          {icon} {label}
        </span>
      </div>
    )
  }

  const items = conns.map(conn => ({
    key: conn.id,
    label: (
      <span>
        <b>{conn.name}</b>
        <span className='db-quick-bar-item-detail'>
          {conn.username}@{conn.dbHost || conn.host}:{conn.port}
        </span>
      </span>
    )
  }))

  function onMenuClick ({ key }) {
    const conn = conns.find(c => c.id === key)
    if (conn) {
      handleLogin(conn)
    }
  }

  return (
    <div className='db-quick-bar'>
      <Dropdown
        menu={{ items, onClick: onMenuClick }}
        trigger={['click']}
      >
        <span className='db-quick-bar-btn'>
          {icon} {label} <DownOutlined />
        </span>
      </Dropdown>
    </div>
  )
})
