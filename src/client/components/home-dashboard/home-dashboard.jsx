import { useCallback, useMemo, useState } from 'react'
import {
  ApiOutlined,
  AppstoreOutlined,
  CloseOutlined,
  CloudServerOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  PlayCircleOutlined,
  RightOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { Button, Input, Tooltip } from 'antd'
import createTitle from '../../common/create-title.jsx'
import { defaultBookmarkGroupId, statusMap } from '../../common/constants'
import { copy as copyToClipboard } from '../../common/clipboard'
import ServerResourceModal from './server-resource-modal.jsx'
import './home-dashboard.styl'

const e = window.translate

const typeLabelMap = {
  ssh: 'SSH',
  telnet: 'Telnet',
  serial: 'Serial',
  local: 'Local',
  web: 'Web',
  rdp: 'RDP',
  vnc: 'VNC',
  ftp: 'FTP',
  spice: 'Spice'
}

function getTypeLabel (type) {
  return typeLabelMap[type] || (type ? String(type).toUpperCase() : 'SSH')
}

function getBookmarkGroups (bookmarks, bookmarkGroups) {
  const bookmarkMap = new Map(bookmarks.map(bookmark => [bookmark.id, bookmark]))
  const used = new Set()
  const groups = (bookmarkGroups || []).map((group) => {
    const ids = group.bookmarkIds || []
    const items = ids.map(id => bookmarkMap.get(id)).filter(Boolean)
    items.forEach(item => used.add(item.id))
    return {
      ...group,
      title: group.title || e(defaultBookmarkGroupId),
      items
    }
  }).filter(group => group.items.length)

  const rest = bookmarks.filter(bookmark => !used.has(bookmark.id))
  if (rest.length) {
    groups.push({
      id: 'ungrouped',
      title: e(defaultBookmarkGroupId),
      items: rest
    })
  }
  return groups
}

function getHostText (item) {
  return item.host || item.hostname || item.url || item.path || '-'
}

function sameConnection (tab, target) {
  if (!tab || !target) {
    return false
  }
  const keys = ['type', 'host', 'hostname', 'port', 'username', 'url', 'path', 'serialPort']
  const targetKeys = keys.filter(key => target[key] !== undefined && target[key] !== '')
  if (targetKeys.length) {
    return targetKeys.every(key => String(tab[key] || '') === String(target[key] || ''))
  }
  return createTitle(tab, false) === createTitle(target, false)
}

function QuickAction ({ icon, title, subtitle, onClick, primary }) {
  return (
    <button
      className={`home-quick-action ${primary ? 'primary' : ''}`}
      type='button'
      onClick={onClick}
    >
      <span className='home-quick-action-icon'>{icon}</span>
      <span>
        <b>{title}</b>
        <em>{subtitle}</em>
      </span>
    </button>
  )
}

function ConnectButtonIcon () {
  return (
    <span className='home-connect-icon' aria-hidden='true'>
      <ApiOutlined className='home-connect-icon-node' />
      <LoginOutlined className='home-connect-icon-arrow' />
    </span>
  )
}

function ServerCard ({ bookmark, batch, isPreview, onNewSsh, onShowResource }) {
  const title = createTitle(bookmark, false)
  const host = getHostText(bookmark)
  const typeLabel = getTypeLabel(bookmark.type || 'ssh')
  const connectTitle = e('connect') || '连接'

  const handleConnect = (event) => {
    if (event) {
      event.stopPropagation()
    }
    if (isPreview) {
      onNewSsh()
      return
    }
    window.openTabBatch = batch
    window.store.showHomeDashboard = false
    window.store.onSelectBookmark(bookmark.id)
  }

  const handleCopy = (event) => {
    event.stopPropagation()
    copyToClipboard(host)
  }

  const handleShowResource = (event) => {
    event.stopPropagation()
    if (isPreview) {
      onNewSsh()
      return
    }
    onShowResource(bookmark)
  }

  return (
    <div className='home-server-card' onClick={handleConnect}>
      <div className='home-server-card-top'>
        <div className='home-server-title-wrap'>
          <span className='home-server-avatar'>{typeLabel.slice(0, 1)}</span>
          <div>
            <div className='home-server-title' title={title}>{title}</div>
            <div className='home-server-sub'>{typeLabel} · {bookmark.username || bookmark.user || 'user'}</div>
          </div>
        </div>
        <span className='home-server-status ready'>就绪</span>
      </div>

      <div className='home-server-host-row' onClick={e => e.stopPropagation()}>
        <span className='home-server-host' title={host}>{host}</span>
        <Tooltip title='复制地址'>
          <button className='home-copy-btn' onClick={handleCopy} type='button'>
            <CopyOutlined />
          </button>
        </Tooltip>
      </div>

      <div className='home-card-notes'>
        <span>连接后可打开资源监控侧栏查看实时数据。</span>
      </div>

      <Tooltip title='服务器资源'>
        <button
          className='home-resource-btn'
          type='button'
          aria-label='服务器资源'
          onClick={handleShowResource}
        >
          <InfoCircleOutlined />
        </button>
      </Tooltip>

      <Button
        type='primary'
        icon={<ConnectButtonIcon />}
        className='home-connect-btn'
        aria-label={connectTitle}
        title={connectTitle}
        onClick={handleConnect}
      />
    </div>
  )
}

function WorkspacePanel ({
  history,
  tabs,
  onOpenTab,
  onCloseTab,
  onOpenHistory
}) {
  const allActiveSessions = tabs.filter(tab => tab.status !== statusMap.error)
  const activeSessions = allActiveSessions.slice(0, 4)
  const errorSessions = tabs.filter(tab => tab.status === statusMap.error).slice(0, 4)
  const recentHistory = history.filter(item => item.tab).slice(0, 4)

  return (
    <aside className='home-health-panel'>
      <div className='home-workspace-panel'>
        <div className='home-rail-section abnormal'>
          <div className='home-health-title'>
            <div>
              <span className='home-section-icon abnormal'><WarningOutlined /></span>
              <b>连接健康</b>
            </div>
            <span className={errorSessions.length ? 'danger' : 'healthy'}>
              {errorSessions.length ? `${errorSessions.length} 个待处理` : '运行正常'}
            </span>
          </div>
          {
            errorSessions.length
              ? (
                <div className='home-side-list'>
                  {errorSessions.map(tab => (
                    <button
                      className='home-side-item error-session'
                      key={tab.id}
                      type='button'
                      title={`查看 ${createTitle(tab, false)}`}
                      onClick={() => onOpenTab(tab)}
                    >
                      <WarningOutlined className='home-side-item-icon error' />
                      <div>
                        <b>{createTitle(tab, false)}</b>
                        <span>连接中断，进入终端后可重连</span>
                      </div>
                      <RightOutlined className='home-side-arrow' />
                    </button>
                  ))}
                </div>
                )
              : <div className='home-panel-healthy'>所有连接状态正常</div>
          }
        </div>

        <div className='home-rail-section'>
          <div className='home-health-title'>
            <div>
              <span className='home-section-icon active'><CloudServerOutlined /></span>
              <b>活跃连接</b>
            </div>
            <span>{allActiveSessions.length} 个</span>
          </div>
          {
            activeSessions.length
              ? (
                <div className='home-side-list'>
                  {
                    activeSessions.map(tab => (
                      <div className='home-side-item active-session' key={tab.id}>
                        <button
                          className='home-side-main'
                          type='button'
                          title={`打开 ${createTitle(tab, false)}`}
                          onClick={() => onOpenTab(tab)}
                        >
                          <span className={`home-session-dot ${tab.status === statusMap.success ? 'online' : ''}`} />
                          <div>
                            <b>{createTitle(tab, false)}</b>
                            <span>{getTypeLabel(tab.type)} · {getHostText(tab)}</span>
                          </div>
                        </button>
                        <button
                          className='home-side-close'
                          type='button'
                          title={`关闭 ${createTitle(tab, false)}`}
                          aria-label={`关闭 ${createTitle(tab, false)}`}
                          onClick={() => onCloseTab(tab)}
                        >
                          <CloseOutlined />
                        </button>
                      </div>
                    ))
                  }
                </div>
                )
              : <div className='home-panel-empty'>还没有打开的连接</div>
          }
        </div>

        <div className='home-rail-section'>
          <div className='home-health-title'>
            <div>
              <span className='home-section-icon recent'><HistoryOutlined /></span>
              <b>最近连接</b>
            </div>
            <span>{history.length} 条</span>
          </div>
          {
            recentHistory.length
              ? (
                <div className='home-side-list'>
                  {
                    recentHistory.map(item => (
                      <button
                        className='home-side-item'
                        key={item.id}
                        type='button'
                        title={`打开 ${createTitle(item.tab, false)}`}
                        onClick={() => onOpenHistory(item.tab)}
                      >
                        <HistoryOutlined className='home-side-item-icon' />
                        <div>
                          <b>{createTitle(item.tab, false)}</b>
                          <span>{getTypeLabel(item.tab?.type)} · {getHostText(item.tab || {})}</span>
                        </div>
                        <RightOutlined className='home-side-arrow' />
                      </button>
                    ))
                  }
                </div>
                )
              : <div className='home-panel-empty'>连接记录会显示在这里</div>
          }
        </div>

      </div>
    </aside>
  )
}

export default function HomeDashboard ({ height, onNewTab, onNewSsh, batch }) {
  const [search, setSearch] = useState('')
  const [activeGroupId, setActiveGroupId] = useState('all')
  const [resourceBookmark, setResourceBookmark] = useState(null)
  const [resourcePinned, setResourcePinned] = useState(false)
  const store = window.store
  const bookmarks = store.bookmarks || []
  const bookmarkGroups = store.bookmarkGroups || []
  const history = store.config.disableConnectionHistory ? [] : (store.history || [])
  const tabs = store.getTabs()

  const groups = useMemo(() => {
    return getBookmarkGroups(bookmarks, bookmarkGroups)
  }, [bookmarks, bookmarkGroups])

  const filteredGroups = groups.map(group => {
    const items = group.items.filter((bookmark) => {
      const text = `${bookmark.title || ''} ${getHostText(bookmark)} ${bookmark.username || ''} ${bookmark.type || ''}`.toLowerCase()
      const matchedSearch = !search || text.includes(search.toLowerCase())
      const matchedGroup = activeGroupId === 'all' || activeGroupId === group.id
      return matchedSearch && matchedGroup
    })
    return {
      ...group,
      items
    }
  }).filter(group => group.items.length)

  const panelStyle = {
    height: `${height}px`
  }

  const handleOpenSetting = () => {
    store.openSetting()
  }

  const handleQuickConnect = () => {
    store.setOpenedSideBar('bookmarks')
    store.showHomeDashboard = false
  }

  const handleOpenTab = (tab) => {
    store.clickTab(tab.id, tab.batch)
  }

  const handleCloseTab = (tab) => {
    store.delTab(tab.id)
  }

  const handleOpenHistory = (tab) => {
    const openTab = tabs
      .slice()
      .sort((a, b) => (b.tabCount || 0) - (a.tabCount || 0))
      .find(item => sameConnection(item, tab))
    if (openTab) {
      handleOpenTab(openTab)
      return
    }
    window.openTabBatch = batch
    store.onSelectHistory(tab)
  }

  const handleConnectResourceBookmark = useCallback(() => {
    if (!resourceBookmark) {
      return
    }
    window.openTabBatch = batch
    store.onSelectBookmark(resourceBookmark.id)
    store.showHomeDashboard = true
  }, [batch, resourceBookmark, store])

  return (
    <div className={`home-dashboard ${resourcePinned && resourceBookmark ? 'resource-panel-pinned' : ''}`} style={panelStyle}>
      <div className='home-dashboard-inner'>
        <div className='home-header'>
          <div>
            <h1>连接工作台</h1>
            <p>继续活跃会话、处理异常连接，或从常用书签快速开始工作。</p>
          </div>
          <div className='home-header-actions'>
            <Button type='primary' icon={<ThunderboltOutlined />} onClick={handleQuickConnect}>快速连接</Button>
            <Button icon={<SettingOutlined />} onClick={handleOpenSetting}>设置</Button>
          </div>
        </div>

        <div className='home-quick-grid'>
          <QuickAction
            primary
            icon={<PlayCircleOutlined />}
            title={store.hasNodePty ? e('newTab') : e('newBookmark')}
            subtitle={store.hasNodePty ? '打开本地终端' : '创建远程连接'}
            onClick={store.hasNodePty ? onNewTab : onNewSsh}
          />
          <QuickAction
            icon={<CloudServerOutlined />}
            title={e('newBookmark')}
            subtitle='添加 SSH / SFTP / RDP'
            onClick={onNewSsh}
          />
          <QuickAction
            icon={<FolderOpenOutlined />}
            title={e('bookmarks')}
            subtitle='按分组管理连接'
            onClick={handleQuickConnect}
          />
        </div>

        <div className='home-toolbar'>
          <div className='home-group-tabs'>
            <button className={activeGroupId === 'all' ? 'active' : ''} onClick={() => setActiveGroupId('all')}>全部</button>
            {
              groups.slice(0, 5).map(group => (
                <button
                  key={group.id}
                  className={activeGroupId === group.id ? 'active' : ''}
                  onClick={() => setActiveGroupId(group.id)}
                >
                  {group.title}
                </button>
              ))
            }
          </div>
          <Input
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='搜索书签 / 地址'
            className='home-search'
            allowClear
          />
        </div>

        {
          bookmarks.length
            ? (
              <div className='home-body-grid'>
                <div className='home-groups'>
                  {
                    filteredGroups.map(group => (
                      <section className='home-group' key={group.id}>
                        <div className='home-group-head'>
                          <h2><AppstoreOutlined /> {group.title}</h2>
                          <span>{group.items.length} 个常用连接</span>
                        </div>
                        <div className='home-server-grid'>
                          {
                            group.items.map(bookmark => (
                              <ServerCard
                                key={bookmark.id}
                                bookmark={bookmark}
                                batch={batch}
                                isPreview={false}
                                onNewSsh={onNewSsh}
                                onShowResource={setResourceBookmark}
                              />
                            ))
                          }
                        </div>
                      </section>
                    ))
                  }
                </div>
                <WorkspacePanel
                  history={history}
                  tabs={tabs}
                  onOpenTab={handleOpenTab}
                  onCloseTab={handleCloseTab}
                  onOpenHistory={handleOpenHistory}
                />
              </div>
              )
            : (
              <div className='home-empty'>
                <CloudServerOutlined />
                <h2>还没有服务器书签</h2>
                <p>添加 SSH 书签后，这里会按分组展示连接入口。</p>
                <Button type='primary' onClick={onNewSsh}>新建书签</Button>
              </div>
              )
        }
      </div>
      <ServerResourceModal
        open={!!resourceBookmark}
        bookmark={resourceBookmark}
        onCancel={() => setResourceBookmark(null)}
        onConnect={handleConnectResourceBookmark}
        pinned={resourcePinned}
        onPinnedChange={setResourcePinned}
      />
    </div>
  )
}
