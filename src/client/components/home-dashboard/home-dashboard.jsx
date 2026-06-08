import { useMemo, useState } from 'react'
import {
  ApiOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  LoginOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { Button, Input, Tooltip } from 'antd'
import createTitle from '../../common/create-title.jsx'
import { defaultBookmarkGroupId, statusMap } from '../../common/constants'
import { copy as copyToClipboard } from '../../common/clipboard'
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

function StatCard ({ title, value, icon, children, tone = '' }) {
  return (
    <div className={`home-summary-card ${tone}`}>
      <div className='home-summary-meta'>
        <span>{title}</span>
        <b>{value}</b>
      </div>
      <div className='home-summary-icon'>{icon}</div>
      {children}
    </div>
  )
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

function ServerCard ({ bookmark, batch, isPreview, onNewSsh }) {
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
        <span>连接后可打开信息面板查看实时资源与网络数据。</span>
      </div>

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

function WorkspacePanel ({ rows, groups, history, tabs, transferCount, onOpenThemes }) {
  const activeSessions = tabs.filter(tab => tab.status !== statusMap.error).slice(0, 4)
  const recentHistory = history.slice(0, 4)

  return (
    <aside className='home-health-panel'>
      <div className='home-health-card'>
        <div className='home-health-title'>
          <b>活跃连接</b>
          <span>{activeSessions.length} 个</span>
        </div>
        {
          activeSessions.length
            ? (
              <div className='home-side-list'>
                {
                  activeSessions.map(tab => (
                    <div className='home-side-item' key={tab.id}>
                      <CloudServerOutlined />
                      <div>
                        <b>{createTitle(tab, false)}</b>
                        <span>{getTypeLabel(tab.type)} · {getHostText(tab)}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
              )
            : <div className='home-panel-empty'>还没有打开的连接</div>
        }
      </div>

      <div className='home-health-card'>
        <div className='home-health-title'>
          <b>最近连接</b>
          <span>{recentHistory.length} 条</span>
        </div>
        {
          recentHistory.length
            ? (
              <div className='home-side-list'>
                {
                  recentHistory.map(item => (
                    <div className='home-side-item' key={item.id}>
                      <HistoryOutlined />
                      <div>
                        <b>{createTitle(item.tab, false)}</b>
                        <span>{getTypeLabel(item.tab?.type)} · {getHostText(item.tab || {})}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
              )
            : <div className='home-panel-empty'>连接记录会显示在这里</div>
        }
      </div>

      <div className='home-health-card'>
        <div className='home-health-title'>
          <b>工作区概况</b>
          <span>{groups.length} 个分组</span>
        </div>
        <div className='home-group-status-list'>
          <div className='home-workspace-metric'>
            <span>书签</span>
            <b>{rows.length}</b>
          </div>
          <div className='home-workspace-metric'>
            <span>传输</span>
            <b>{transferCount}</b>
          </div>
        </div>
        <Button
          block
          icon={<AppstoreOutlined />}
          className='home-side-button'
          onClick={onOpenThemes}
        >
          调整外观
        </Button>
      </div>
    </aside>
  )
}

export default function HomeDashboard ({ height, onNewTab, onNewSsh, batch }) {
  const [search, setSearch] = useState('')
  const [activeGroupId, setActiveGroupId] = useState('all')
  const store = window.store
  const bookmarks = store.bookmarks || []
  const bookmarkGroups = store.bookmarkGroups || []
  const history = store.config.disableConnectionHistory ? [] : (store.history || [])
  const tabs = store.getTabs()
  const transferCount = store.fileTransfers.length

  const groups = useMemo(() => {
    return getBookmarkGroups(bookmarks, bookmarkGroups)
  }, [bookmarks, bookmarkGroups])

  const rows = useMemo(() => {
    return bookmarks.map(bookmark => ({ bookmark }))
  }, [bookmarks])

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

  const groupCount = groups.length
  const connectionTypes = new Set(bookmarks.map(item => item.type || 'ssh')).size
  const panelStyle = {
    height: `${height}px`
  }

  const handleOpenSetting = () => {
    store.openSetting()
  }

  const handleOpenThemes = () => {
    store.openTerminalThemes()
  }

  const handleQuickConnect = () => {
    store.setOpenedSideBar('bookmarks')
    store.showHomeDashboard = false
  }

  return (
    <div className='home-dashboard' style={panelStyle}>
      <div className='home-dashboard-inner'>
        <div className='home-header'>
          <div>
            <h1>连接工作台</h1>
            <p>从书签、历史和当前会话进入工作；真实资源数据在连接后的信息面板采集。</p>
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

        <div className='home-summary-grid'>
          <StatCard title='书签总数' value={bookmarks.length} icon={<CloudServerOutlined />} tone='health'>
            <small>{groupCount} 个分组 · {connectionTypes} 种连接</small>
          </StatCard>
          <StatCard title='当前会话' value={tabs.length} icon={<ApiOutlined />}>
            <small>{tabs.filter(tab => tab.status === statusMap.error).length} 个异常状态</small>
          </StatCard>
          <StatCard title='最近连接' value={history.length} icon={<ClockCircleOutlined />} tone='purple'>
            <small>最多保留 50 条历史</small>
          </StatCard>
          <StatCard title='传输队列' value={transferCount} icon={<ThunderboltOutlined />} tone='warn'>
            <small>{store.transferHistory.length} 条历史记录</small>
          </StatCard>
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
                          <h2>{group.title}</h2>
                          <span>{group.items.length} 个连接入口</span>
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
                              />
                            ))
                          }
                        </div>
                      </section>
                    ))
                  }
                </div>
                <WorkspacePanel
                  rows={rows}
                  groups={groups}
                  history={history}
                  tabs={tabs}
                  transferCount={transferCount}
                  onOpenThemes={handleOpenThemes}
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
    </div>
  )
}
