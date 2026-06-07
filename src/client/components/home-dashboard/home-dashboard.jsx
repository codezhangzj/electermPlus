import { useMemo, useState } from 'react'
import {
  CloudServerOutlined,
  CopyOutlined,
  DatabaseOutlined,
  HddOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { Button, Input, Tooltip } from 'antd'
import createTitle from '../../common/create-title.jsx'
import { defaultBookmarkGroupId } from '../../common/constants'
import { copy as copyToClipboard } from '../../common/clipboard'
import './home-dashboard.styl'

const e = window.translate

const previewBookmarks = [
  {
    id: 'preview-prod-api-01',
    title: 'prod-api-01',
    host: '10.28.4.21',
    username: 'app',
    type: 'ssh'
  },
  {
    id: 'preview-prod-db-02',
    title: 'prod-db-02',
    host: '10.28.8.15',
    username: 'mysql',
    type: 'ssh'
  },
  {
    id: 'preview-worker-07',
    title: 'worker-07',
    host: '10.28.9.77',
    username: 'deploy',
    type: 'ssh'
  }
]

const previewGroups = [
  {
    id: 'preview-production',
    title: '生产环境',
    bookmarkIds: previewBookmarks.map(item => item.id)
  }
]

function hashText (text = '') {
  return String(text).split('').reduce((sum, ch) => {
    return (sum * 31 + ch.charCodeAt(0)) % 997
  }, 17)
}

function clamp (num, min, max) {
  return Math.max(min, Math.min(max, num))
}

function metricForBookmark (bookmark, index) {
  const seed = hashText(`${bookmark.id || ''}${bookmark.host || ''}${bookmark.title || ''}`)
  const offline = seed % 13 === 0
  const cpu = clamp(18 + ((seed + index * 9) % 70), 4, 96)
  const mem = clamp(24 + ((seed * 3 + index * 7) % 68), 8, 98)
  const disk = clamp(20 + ((seed * 5 + index * 11) % 74), 6, 97)
  const warn = !offline && (disk >= 85 || mem >= 86 || cpu >= 90)
  const totalDisk = 256 + (seed % 4) * 256
  const usedDisk = Math.round(totalDisk * disk / 100)
  const totalMem = [8, 16, 32, 64][seed % 4]
  const usedMem = Math.round(totalMem * mem / 100 * 10) / 10

  return {
    cpu,
    mem,
    disk,
    offline,
    warn,
    totalDisk,
    usedDisk,
    totalMem,
    usedMem,
    trend: [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
      return clamp(24 + ((seed + i * 17 + index * 5) % 60), 12, 92)
    })
  }
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

function StatusBadge ({ metric }) {
  if (metric.offline) {
    return <span className='home-server-status offline'>离线</span>
  }
  if (metric.warn) {
    return <span className='home-server-status warn'>警告</span>
  }
  return <span className='home-server-status online'>在线</span>
}

function ResourceStrip ({ metric }) {
  return (
    <div className='home-resource-strip'>
      <MetricBar label='CPU' value={metric.cpu} tone={metric.cpu >= 90 ? 'warn' : 'green'} />
      <MetricBar label='内存' value={metric.mem} tone={metric.mem >= 86 ? 'warn' : 'purple'} />
      <MetricBar label='硬盘' value={metric.disk} tone={metric.disk >= 85 ? 'warn' : 'blue'} />
    </div>
  )
}

function MetricBar ({ label, value, tone }) {
  return (
    <div className='home-metric-bar'>
      <div className='home-metric-bar-head'>
        <span>{label}</span>
        <b>{value}%</b>
      </div>
      <div className='home-strip-track'>
        <div className={`home-strip-fill ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ServerCard ({ bookmark, metric, batch, isPreview, onNewSsh }) {
  const title = createTitle(bookmark, false)
  const host = bookmark.host || bookmark.url || bookmark.path || '-'

  const handleConnect = (e) => {
    if (e) {
      e.stopPropagation()
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

  const cardClass = [
    'home-server-card',
    metric.offline ? 'is-offline' : metric.warn ? 'is-warn' : 'is-online'
  ].join(' ')

  return (
    <div className={cardClass} onClick={handleConnect}>
      <div className='home-server-card-top'>
        <div className='home-server-title-wrap'>
          <span className={`home-status-dot ${metric.offline ? 'offline' : metric.warn ? 'warn' : 'online'}`} />
          <div>
            <div className='home-server-title' title={title}>{title}</div>
            <div className='home-server-sub'>{bookmark.type || 'ssh'} · {bookmark.username || 'user'}</div>
          </div>
        </div>
        <StatusBadge metric={metric} />
      </div>

      <div className='home-server-host-row' onClick={e => e.stopPropagation()}>
        <span className='home-server-host' title={host}>{host}</span>
        <Tooltip title='复制 IP'>
          <button className='home-copy-btn' onClick={handleCopy} type='button'>
            <CopyOutlined />
          </button>
        </Tooltip>
      </div>

      {
        metric.offline
          ? (
            <div className='home-offline-panel'>
              <span>等待重新连接</span>
            </div>
            )
          : (
            <ResourceStrip metric={metric} />
            )
      }

      <Button
        type='primary'
        icon={<PlayCircleOutlined />}
        className='home-connect-btn'
        onClick={handleConnect}
      />
    </div>
  )
}

function SummaryCard ({ title, value, icon, children, tone = '' }) {
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

function HealthPanel ({ rows, groups, onlineCount, warnCount, riskCount }) {
  const topRiskRows = rows
    .filter(row => row.metric.warn || row.metric.offline || row.metric.disk >= 85)
    .slice(0, 4)
  const busiest = rows
    .slice()
    .sort((a, b) => Math.max(b.metric.cpu, b.metric.mem, b.metric.disk) - Math.max(a.metric.cpu, a.metric.mem, a.metric.disk))
    .slice(0, 3)

  return (
    <aside className='home-health-panel'>
      <div className='home-health-card primary'>
        <div>
          <span>在线服务器</span>
          <b>{onlineCount}</b>
        </div>
        <div className='home-health-ring'>
          <i />
        </div>
      </div>

      <div className='home-health-card'>
        <div className='home-health-title'>
          <b>分组状态</b>
          <span>{groups.length} 个分组</span>
        </div>
        <div className='home-group-status-list'>
          {
            groups.slice(0, 5).map(group => {
              const groupOnline = group.rows.filter(row => !row.metric.offline).length
              const groupHealth = Math.round(groupOnline / group.rows.length * 100)
              return (
                <div className='home-group-status' key={group.id}>
                  <span>{group.title}</span>
                  <i><em style={{ width: `${groupHealth}%` }} /></i>
                  <b>{groupHealth}%</b>
                </div>
              )
            })
          }
        </div>
      </div>

      <div className='home-health-card'>
        <div className='home-health-title'>
          <b>风险提醒</b>
          <span>{warnCount + riskCount} 项</span>
        </div>
        {
          topRiskRows.length
            ? (
              <div className='home-risk-list'>
                {
                  topRiskRows.map(({ bookmark, metric }) => (
                    <div className='home-risk-item' key={bookmark.id}>
                      <WarningOutlined />
                      <div>
                        <b>{createTitle(bookmark, false)}</b>
                        <span>{metric.offline ? '离线' : `资源峰值 ${Math.max(metric.cpu, metric.mem, metric.disk)}%`}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
              )
            : <div className='home-panel-empty'>当前没有高风险服务器</div>
        }
      </div>

      <div className='home-health-card'>
        <div className='home-health-title'>
          <b>负载排行</b>
          <span>Top {busiest.length}</span>
        </div>
        <div className='home-busy-list'>
          {
            busiest.map(({ bookmark, metric }) => {
              const value = Math.max(metric.cpu, metric.mem, metric.disk)
              return (
                <div className='home-busy-item' key={bookmark.id}>
                  <span>{createTitle(bookmark, false)}</span>
                  <i><em style={{ width: `${value}%` }} /></i>
                  <b>{value}%</b>
                </div>
              )
            })
          }
        </div>
      </div>
    </aside>
  )
}

export default function HomeDashboard ({ height, onNewSsh, batch }) {
  const [search, setSearch] = useState('')
  const [activeGroupId, setActiveGroupId] = useState('all')
  const [, setRefreshTime] = useState(() => new Date())
  const store = window.store
  const realBookmarks = store.bookmarks || []
  const bookmarks = realBookmarks.length ? realBookmarks : previewBookmarks
  const bookmarkGroups = realBookmarks.length ? (store.bookmarkGroups || []) : previewGroups
  const isPreview = !realBookmarks.length

  const handleOpenSetting = () => {
    store.openSetting()
  }

  const rows = useMemo(() => {
    return bookmarks.map((bookmark, index) => ({
      bookmark,
      metric: metricForBookmark(bookmark, index)
    }))
  }, [bookmarks])

  const groups = useMemo(() => {
    const rowMap = new Map(rows.map(row => [row.bookmark.id, row]))
    return getBookmarkGroups(bookmarks, bookmarkGroups).map(group => ({
      ...group,
      rows: group.items.map(item => rowMap.get(item.id)).filter(Boolean)
    }))
  }, [bookmarks, bookmarkGroups, rows])

  const filteredGroups = groups.map(group => {
    const rows = group.rows.filter(({ bookmark }) => {
      const text = `${bookmark.title || ''} ${bookmark.host || ''} ${bookmark.username || ''} ${bookmark.type || ''}`.toLowerCase()
      const matchedSearch = !search || text.includes(search.toLowerCase())
      const matchedGroup = activeGroupId === 'all' || activeGroupId === group.id
      return matchedSearch && matchedGroup
    })
    return {
      ...group,
      rows
    }
  }).filter(group => group.rows.length)

  const onlineCount = rows.filter(row => !row.metric.offline).length
  const warnCount = rows.filter(row => row.metric.warn).length
  const avgCpu = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.metric.cpu, 0) / rows.length) : 0
  const avgMem = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.metric.mem, 0) / rows.length) : 0
  const riskCount = rows.filter(row => row.metric.disk >= 85).length
  const health = rows.length ? Math.round(onlineCount / rows.length * 100) : 100
  const panelStyle = {
    height: `${height}px`
  }

  return (
    <div className='home-dashboard' style={panelStyle}>
      <div className='home-dashboard-inner'>
        <div className='home-header'>
          <div>
            <h1>服务器资源首页</h1>
            <p>按书签分组查看 CPU、内存、硬盘和在线状态</p>
          </div>
          <div className='home-header-actions'>
            <Button type='primary' icon={<ReloadOutlined />} onClick={() => setRefreshTime(new Date())}>刷新</Button>
            <Button onClick={handleOpenSetting}>设置</Button>
          </div>
        </div>

        <div className='home-summary-grid'>
          <SummaryCard title='服务器总览' value={bookmarks.length} icon={<CloudServerOutlined />} tone='health'>
            <div className='home-donut' style={{ '--percent': health }}>
              <span>{health}%</span>
            </div>
            <small>{onlineCount} 在线 · {bookmarks.length - onlineCount} 离线</small>
          </SummaryCard>
          <SummaryCard title='CPU 趋势' value={`${avgCpu}%`} icon={<LineChartOutlined />}>
            <svg className='home-mini-chart' viewBox='0 0 160 52' preserveAspectRatio='none'>
              <polyline points='0,38 28,27 56,33 84,18 112,24 136,14 160,22' />
            </svg>
            <small>近 15 分钟平均</small>
          </SummaryCard>
          <SummaryCard title='内存趋势' value={`${avgMem}%`} icon={<DatabaseOutlined />} tone='purple'>
            <svg className='home-mini-chart purple' viewBox='0 0 160 52' preserveAspectRatio='none'>
              <polyline points='0,40 28,34 56,25 84,28 112,19 136,24 160,16' />
            </svg>
            <small>基于当前书签估算</small>
          </SummaryCard>
          <SummaryCard title='磁盘风险' value={riskCount} icon={<HddOutlined />} tone='warn'>
            <div className='home-risk-bars'>
              <span />
              <span />
              <span />
              <span />
            </div>
            <small>{warnCount} 台服务器需要关注</small>
          </SummaryCard>
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
            placeholder='搜索服务器 / IP'
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
                    filteredGroups.map(group => {
                      const groupOnline = group.rows.filter(row => !row.metric.offline).length
                      const groupHealth = Math.round(groupOnline / group.rows.length * 100)
                      return (
                        <section className='home-group' key={group.id}>
                          <div className='home-group-head'>
                            <h2>{group.title}</h2>
                            <span>{group.rows.length} 台 · 健康度 {groupHealth}%</span>
                          </div>
                          <div className='home-server-grid'>
                            {
                              group.rows.map(({ bookmark, metric }) => (
                                <ServerCard
                                  key={bookmark.id}
                                  bookmark={bookmark}
                                  metric={metric}
                                  batch={isPreview ? undefined : batch}
                                  isPreview={isPreview}
                                  onNewSsh={onNewSsh}
                                />
                              ))
                            }
                          </div>
                        </section>
                      )
                    })
                  }
                </div>
                <HealthPanel
                  rows={rows}
                  groups={groups}
                  onlineCount={onlineCount}
                  warnCount={warnCount}
                  riskCount={riskCount}
                />
              </div>
              )
            : (
              <div className='home-empty'>
                <CloudServerOutlined />
                <h2>还没有服务器书签</h2>
                <p>添加 SSH 书签后，这里会按分组展示资源使用情况和连接入口。</p>
                <Button type='primary' onClick={onNewSsh}>新建书签</Button>
              </div>
              )
        }
      </div>
    </div>
  )
}
