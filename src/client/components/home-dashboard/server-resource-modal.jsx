import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiOutlined,
  BarsOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  PartitionOutlined,
  PushpinOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { Button, Empty, Spin } from 'antd'
import { filesize } from 'filesize'
import createTitle from '../../common/create-title.jsx'
import parseInt10 from '../../common/parse-int10'
import { statusMap } from '../../common/constants'
import { runCmds, terminalInfoCommands } from '../terminal-info/run-cmd.jsx'

const defaultResourceState = {
  uptime: '',
  cpu: '',
  mem: {},
  swap: {},
  activities: [],
  disks: [],
  network: {},
  updatedAt: 0
}

function getHostText (item) {
  item = item || {}
  return item.host || item.hostname || item.url || item.path || '-'
}

function getType (item) {
  item = item || {}
  return item.type || 'ssh'
}

function isSshResourceTarget (item) {
  item = item || {}
  return getType(item) === 'ssh' && item.enableSsh !== false
}

function sameServer (tab, bookmark) {
  if (!tab || !bookmark) {
    return false
  }
  if (tab.srcId && tab.srcId === bookmark.id) {
    return true
  }
  return Boolean(
    tab.host &&
    bookmark.host &&
    tab.host === bookmark.host &&
    String(tab.port || '') === String(bookmark.port || '') &&
    String(tab.username || '') === String(bookmark.username || '') &&
    getType(tab) === getType(bookmark)
  )
}

function toNumber (value = '') {
  const text = String(value)
  let factor = 1
  if (text.includes('T')) {
    factor = 1024 * 1024 * 1024
  } else if (text.includes('G')) {
    factor = 1024 * 1024
  } else if (text.includes('M')) {
    factor = 1024
  }
  const parsed = parseFloat(text)
  return Number.isFinite(parsed) ? parsed * factor : 0
}

function percentFromUsage (used, total) {
  const usedNum = toNumber(used)
  const totalNum = toNumber(total)
  if (!totalNum) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(usedNum * 100 / totalNum)))
}

function normalizePercent (value) {
  const parsed = parseFloat(String(value || '').replace('%', ''))
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function formatPercent (value) {
  return `${normalizePercent(value)}%`
}

function getTone (percent) {
  if (percent >= 90) return 'danger'
  if (percent >= 70) return 'warn'
  if (percent >= 50) return 'blue'
  return 'green'
}

function getPrimaryDisk (disks = []) {
  return disks.find(d => d.mount === '/') ||
    disks.find(d => String(d.filesystem || '').startsWith('/')) ||
    disks[0] ||
    {}
}

function getResourceMetrics (data) {
  const disk = getPrimaryDisk(data.disks)
  return {
    cpu: parseInt10(data.cpu) || 0,
    mem: percentFromUsage(data.mem.used, data.mem.total),
    swap: percentFromUsage(data.swap.used, data.swap.total),
    disk: normalizePercent(disk.usedPercent),
    diskItem: disk
  }
}

function hasResourceReading (data) {
  return Boolean(data.cpu || data.mem.total || (data.disks && data.disks.length))
}

function getNetworkTotal (network = {}) {
  return Object.values(network).reduce((total, item = {}) => {
    return total + (Number(item.download) || 0) + (Number(item.upload) || 0)
  }, 0)
}

function createHistoryPoint (data, previous) {
  const metrics = getResourceMetrics(data)
  const time = Date.now()
  const networkTotal = getNetworkTotal(data.network)
  const elapsed = previous ? Math.max((time - previous.time) / 1000, 1) : 1
  const network = previous && networkTotal >= previous.networkTotal
    ? Math.round((networkTotal - previous.networkTotal) / elapsed)
    : 0
  return {
    time,
    cpu: metrics.cpu,
    mem: metrics.mem,
    disk: metrics.disk,
    network,
    networkTotal
  }
}

const trendWidth = 360
const trendHeight = 148
const trendPadX = 14
const trendPadY = 16
const resourceRefreshInterval = 3000

function toChartPoint (value, index, total) {
  const x = trendPadX + index * (trendWidth - trendPadX * 2) / Math.max(total - 1, 1)
  const y = trendHeight - trendPadY - normalizePercent(value) * (trendHeight - trendPadY * 2) / 100
  return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
}

function getLinePoints (points, key) {
  if (!points.length) {
    return ''
  }
  const source = points.length === 1 ? [points[0], points[0]] : points
  return source.map((item, index) => toChartPoint(item[key], index, source.length)).join(' ')
}

function getScaledLinePoints (points, key) {
  const max = Math.max(1, ...points.map(item => Number(item[key]) || 0))
  const normalized = points.map(item => ({
    ...item,
    [key]: (Number(item[key]) || 0) * 100 / max
  }))
  return getLinePoints(normalized, key)
}

function ResourceDataGetter ({ options, pid, onData, onError }) {
  useEffect(() => {
    let closed = false
    let timer
    const cmds = options.cmds || [options.cmd]
    const run = async () => {
      try {
        const ress = await runCmds({ pid }, cmds)
        if (closed) {
          return
        }
        onData({
          ...options.formatter(...ress),
          updatedAt: Date.now()
        })
        onError('')
      } catch (err) {
        if (!closed) {
          onError(err.message || String(err))
        }
      } finally {
        if (!closed) {
          timer = setTimeout(run, resourceRefreshInterval)
        }
      }
    }
    run()
    return () => {
      closed = true
      clearTimeout(timer)
    }
  }, [options, pid, onData, onError])
  return null
}

function GaugeChart ({ value }) {
  const percent = normalizePercent(value)
  const radius = 44
  const circumference = Math.round(2 * Math.PI * radius)
  const visible = Math.round(circumference * percent / 100)
  return (
    <div className='home-resource-gauge-wrap'>
      <svg className='home-resource-gauge' viewBox='0 0 116 116' aria-hidden='true'>
        <circle className='home-resource-gauge-track' cx='58' cy='58' r={radius} />
        <circle
          className={`home-resource-gauge-value ${getTone(percent)}`}
          cx='58'
          cy='58'
          r={radius}
          strokeDasharray={`${visible} ${circumference}`}
        />
      </svg>
      <strong>{percent}%</strong>
    </div>
  )
}

function MetricTile ({ icon, label, value, meta }) {
  const percent = normalizePercent(value)
  return (
    <div className={`home-resource-metric-tile ${getTone(percent)}`}>
      <div className='home-resource-metric-head'>
        <span>{icon}</span>
        <b>{label}</b>
      </div>
      <GaugeChart value={percent} />
      <em>{meta}</em>
    </div>
  )
}

function ResourceOverview ({ data }) {
  const metrics = getResourceMetrics(data)
  return (
    <div className='home-resource-overview'>
      <MetricTile
        icon={<LineChartOutlined />}
        label='CPU'
        value={metrics.cpu}
        meta='实时处理器负载'
      />
      <MetricTile
        icon={<DatabaseOutlined />}
        label='内存'
        value={metrics.mem}
        meta={`${data.mem.used || '-'} / ${data.mem.total || '-'}`}
      />
      <MetricTile
        icon={<DatabaseOutlined />}
        label='Swap'
        value={metrics.swap}
        meta={`${data.swap.used || '-'} / ${data.swap.total || '-'}`}
      />
      <MetricTile
        icon={<PartitionOutlined />}
        label='磁盘'
        value={metrics.disk}
        meta={metrics.diskItem.mount ? `${metrics.diskItem.used || '-'} / ${metrics.diskItem.size || '-'}` : '等待磁盘数据'}
      />
    </div>
  )
}

function ResourceAlerts ({ data }) {
  const metrics = getResourceMetrics(data)
  const alerts = [
    ['CPU', metrics.cpu],
    ['内存', metrics.mem],
    ['磁盘', metrics.disk]
  ].filter(([, value]) => value >= 70)
  const level = alerts.some(([, value]) => value >= 90)
    ? 'danger'
    : alerts.length ? 'warn' : 'healthy'
  return (
    <div className={`home-resource-alert-summary ${level}`}>
      <WarningOutlined />
      <div>
        <b>{alerts.length ? '资源阈值提醒' : '资源状态正常'}</b>
        <span>
          {alerts.length
            ? alerts.map(([label, value]) => `${label} ${value}%`).join(' · ')
            : 'CPU、内存和磁盘均低于 70% 告警阈值'}
        </span>
      </div>
    </div>
  )
}

function TrendPanel ({ points }) {
  const latest = points[points.length - 1] || {}
  return (
    <section className='home-resource-panel wide home-resource-trend-panel'>
      <div className='home-resource-section-title'>
        <b><LineChartOutlined /> 资源趋势</b>
        <span>{points.length ? `${points.length} 个采样` : '等待采样'}</span>
      </div>
      {
        points.length
          ? (
            <>
              <div className='home-resource-trend-chart'>
                <svg viewBox={`0 0 ${trendWidth} ${trendHeight}`} preserveAspectRatio='none' aria-hidden='true'>
                  <line x1='14' x2='346' y1='16' y2='16' />
                  <line x1='14' x2='346' y1='74' y2='74' />
                  <line x1='14' x2='346' y1='132' y2='132' />
                  <polyline className='cpu' points={getLinePoints(points, 'cpu')} />
                  <polyline className='mem' points={getLinePoints(points, 'mem')} />
                  <polyline className='disk' points={getLinePoints(points, 'disk')} />
                  <polyline className='network' points={getScaledLinePoints(points, 'network')} />
                </svg>
              </div>
              <div className='home-resource-chart-legend'>
                <span className='cpu'>CPU <b>{normalizePercent(latest.cpu)}%</b></span>
                <span className='mem'>内存 <b>{normalizePercent(latest.mem)}%</b></span>
                <span className='disk'>磁盘 <b>{normalizePercent(latest.disk)}%</b></span>
                <span className='network'>网络 <b>{filesize(latest.network || 0)}/s</b></span>
              </div>
            </>
            )
          : <div className='home-resource-placeholder'>等待趋势数据</div>
      }
    </section>
  )
}

function DiskPanel ({ disks = [] }) {
  const rows = disks
    .slice()
    .sort((a, b) => normalizePercent(b.usedPercent) - normalizePercent(a.usedPercent))
    .slice(0, 6)
  return (
    <section className='home-resource-panel'>
      <div className='home-resource-section-title'>
        <b><PartitionOutlined /> 文件系统</b>
        <span>{rows.length} 项</span>
      </div>
      {
        rows.length
          ? rows.map(row => {
            const percent = normalizePercent(row.usedPercent)
            return (
              <div className={`home-resource-disk-row ${getTone(percent)}`} key={`${row.filesystem}-${row.mount}`}>
                <div>
                  <b title={row.mount}>{row.mount || row.filesystem}</b>
                  <span title={row.filesystem}>{row.filesystem}</span>
                </div>
                <div>
                  <strong>{formatPercent(row.usedPercent)}</strong>
                  <em>{row.used || '-'} / {row.size || '-'}</em>
                </div>
                <div className='home-resource-bar-chart'>
                  <i style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })
          : <div className='home-resource-placeholder'>等待磁盘数据</div>
      }
    </section>
  )
}

function NetworkPanel ({ network }) {
  const rows = useNetworkRows(network)
  const maxRate = Math.max(
    1,
    ...rows.map(row => Math.max(row.up, row.down))
  )
  return (
    <section className='home-resource-panel'>
      <div className='home-resource-section-title'>
        <b><ApiOutlined /> 网络</b>
        <span>{rows.length} 个接口</span>
      </div>
      {
        rows.length
          ? rows.map(row => (
            <div className='home-resource-network-row' key={row.name}>
              <div>
                <b>{row.name}</b>
                <span>{row.ip || '无 IPv4'}</span>
              </div>
              <div className='home-resource-network-chart'>
                <div>
                  <span>↑</span>
                  <i className='up' style={{ width: `${Math.round(row.up * 100 / maxRate)}%` }} />
                  <strong>{filesize(row.up)}/s</strong>
                </div>
                <div>
                  <span>↓</span>
                  <i className='down' style={{ width: `${Math.round(row.down * 100 / maxRate)}%` }} />
                  <strong>{filesize(row.down)}/s</strong>
                </div>
              </div>
            </div>
          ))
          : <div className='home-resource-placeholder'>等待网络数据</div>
      }
    </section>
  )
}

function useNetworkRows (network) {
  const previousRef = useRef({
    network: {},
    time: Date.now()
  })
  const rows = useMemo(() => {
    const previous = previousRef.current
    const now = Date.now()
    const diff = Math.max((now - previous.time) / 1000, 1)
    return Object.keys(network || {})
      .map(name => {
        const current = network[name] || {}
        const prev = previous.network[name] || {}
        const down = current.download > prev.download
          ? Math.floor((current.download - prev.download) / diff)
          : 0
        const up = current.upload > prev.upload
          ? Math.floor((current.upload - prev.upload) / diff)
          : 0
        return {
          name,
          ip: current.ip,
          up,
          down
        }
      })
      .sort((a, b) => b.down + b.up - a.down - a.up)
      .slice(0, 6)
  }, [network])

  useEffect(() => {
    previousRef.current = {
      network: { ...network },
      time: Date.now()
    }
  }, [network])

  return rows
}

function ActivityPanel ({ activities = [] }) {
  const rows = activities.slice(0, 6)
  return (
    <section className='home-resource-panel wide'>
      <div className='home-resource-section-title'>
        <b><BarsOutlined /> 高负载进程</b>
        <span>{rows.length} 条</span>
      </div>
      {
        rows.length
          ? (
            <div className='home-resource-process-table'>
              <div className='home-resource-process-head'>
                <span>PID</span>
                <span>用户</span>
                <span>CPU</span>
                <span>内存</span>
                <span>命令</span>
              </div>
              {
                rows.map(row => (
                  <div className='home-resource-process-row' key={row.pid}>
                    <span>{row.pid}</span>
                    <span>{row.user}</span>
                    <span>{row.cpu}%</span>
                    <span>{filesize((Number(row.mem) || 0) * 1024)}</span>
                    <span title={row.cmd}>{row.cmd}</span>
                  </div>
                ))
              }
            </div>
            )
          : <div className='home-resource-placeholder'>等待进程数据</div>
      }
    </section>
  )
}

function EmptyState ({ icon, title, description, action }) {
  return (
    <div className='home-resource-empty'>
      <Empty
        image={icon}
        description={(
          <div>
            <b>{title}</b>
            <span>{description}</span>
          </div>
        )}
      />
      {action}
    </div>
  )
}

export default function ServerResourceModal ({
  open,
  bookmark,
  onCancel,
  onConnect,
  pinned,
  onPinnedChange
}) {
  const [data, setData] = useState(defaultResourceState)
  const [historyPoints, setHistoryPoints] = useState([])
  const [error, setError] = useState('')
  const [, setTick] = useState(0)
  const autoConnectRef = useRef('')
  const store = window.store
  const title = bookmark ? createTitle(bookmark, false) : ''
  const host = getHostText(bookmark)
  const tabs = bookmark ? store.getTabs() : []
  const matchingTabs = tabs
    .filter(tab => sameServer(tab, bookmark))
    .sort((a, b) => (b.tabCount || 0) - (a.tabCount || 0))
  const activeTab = matchingTabs.find(tab => tab.status === statusMap.success)
  const pendingTab = matchingTabs.find(tab => tab.status === statusMap.processing)
  const canRead = isSshResourceTarget(bookmark) && !!activeTab
  const isLoading = canRead && !data.updatedAt && !error
  const updatedText = data.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString()
    : '尚未刷新'

  const handleData = useCallback((update) => {
    setData(prev => ({
      ...prev,
      ...update
    }))
  }, [])

  const handleError = useCallback((message) => {
    setError(message)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    const ref = setInterval(() => {
      setTick(tick => tick + 1)
    }, 1000)
    return () => {
      clearInterval(ref)
    }
  }, [open])

  useEffect(() => {
    setData(defaultResourceState)
    setHistoryPoints([])
    setError('')
  }, [bookmark?.id, activeTab?.id, open])

  useEffect(() => {
    if (!open || !activeTab || !hasResourceReading(data)) {
      return
    }
    setHistoryPoints(prev => {
      const last = prev[prev.length - 1]
      const point = createHistoryPoint(data, last)
      if (last && point.time - last.time < 4500) {
        return prev.slice(0, -1).concat(point)
      }
      return prev.concat(point).slice(-24)
    })
  }, [open, activeTab, data.updatedAt])

  useEffect(() => {
    if (!open) {
      autoConnectRef.current = ''
      return
    }
    if (
      !bookmark?.id ||
      !isSshResourceTarget(bookmark) ||
      activeTab ||
      pendingTab ||
      autoConnectRef.current === bookmark.id
    ) {
      return
    }
    autoConnectRef.current = bookmark.id
    onConnect()
  }, [open, bookmark?.id, activeTab, pendingTab, onConnect])

  if (!open || !bookmark) {
    return null
  }

  const renderBody = () => {
    if (!isSshResourceTarget(bookmark)) {
      return (
        <EmptyState
          icon={<WarningOutlined />}
          title='当前连接类型暂不支持资源采集'
          description='资源监控使用 SSH 命令读取 CPU、内存、磁盘、网络和进程信息。'
        />
      )
    }
    if (!activeTab) {
      return (
        <EmptyState
          icon={<CloudServerOutlined />}
          title={pendingTab ? '连接正在建立' : '正在自动连接服务器'}
          description={pendingTab ? '会话连接成功后，这里会自动开始读取资源数据。' : '如果连接未成功，可以重新发起连接。'}
          action={!pendingTab
            ? <Button type='primary' icon={<CloudServerOutlined />} onClick={onConnect}>重新连接</Button>
            : null}
        />
      )
    }
    return (
      <>
        {
          terminalInfoCommands.map(options => (
            <ResourceDataGetter
              key={`${activeTab.id}-${options.name}`}
              options={options}
              pid={activeTab.id}
              onData={handleData}
              onError={handleError}
            />
          ))
        }
        <Spin spinning={isLoading}>
          <ResourceOverview data={data} />
          <ResourceAlerts data={data} />
          {
            error
              ? <div className='home-resource-error'><WarningOutlined /> {error}</div>
              : null
          }
          <div className='home-resource-detail-grid'>
            <TrendPanel points={historyPoints} />
            <DiskPanel disks={data.disks} />
            <NetworkPanel network={data.network} />
            <ActivityPanel activities={data.activities} />
          </div>
        </Spin>
      </>
    )
  }

  return (
    <>
      {!pinned && <button className='home-resource-sidebar-mask' type='button' aria-label='关闭资源监控' onClick={onCancel} />}
      <aside className={`home-resource-sidebar ${pinned ? 'pinned' : ''}`}>
        <div className='home-resource-sidebar-title'>
          <div>
            <LineChartOutlined />
            <b>资源监控</b>
            <span>每 3 秒刷新</span>
          </div>
          <div>
            <button
              type='button'
              className={pinned ? 'active' : ''}
              title={pinned ? '取消固定' : '固定侧栏'}
              onClick={() => onPinnedChange(!pinned)}
            >
              <PushpinOutlined />
            </button>
            <button type='button' title='关闭' onClick={onCancel}>
              <CloseOutlined />
            </button>
          </div>
        </div>
        <div className='home-resource-sidebar-body'>
          <div className='home-resource-modal'>
            <div className='home-resource-hero'>
              <div className='home-resource-server-mark'>
                <CloudServerOutlined />
              </div>
              <div>
                <h2 title={title}>{title}</h2>
                <p title={host}>{host}</p>
              </div>
              <div className='home-resource-meta'>
                <span><ClockCircleOutlined /> {data.uptime || '等待 uptime'}</span>
                <span><ReloadOutlined /> {updatedText}</span>
              </div>
            </div>
            {renderBody()}
          </div>
        </div>
      </aside>
    </>
  )
}
