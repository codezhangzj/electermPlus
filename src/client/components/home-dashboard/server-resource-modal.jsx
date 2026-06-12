import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiOutlined,
  BarsOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  PartitionOutlined,
  PushpinOutlined,
  ReloadOutlined,
  SettingOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { Button, Empty, InputNumber, Popover, Spin, Switch } from 'antd'
import { filesize } from 'filesize'
import createTitle from '../../common/create-title.jsx'
import parseInt10 from '../../common/parse-int10'
import { statusMap } from '../../common/constants'
import {
  getAlertPrefs,
  setAlertPrefs,
  getAlertLevel,
  notifyResourceAlert,
  resetAlertTracking
} from '../../common/resource-alert-prefs'
import { runCmds, terminalInfoCommands } from '../terminal-info/run-cmd.jsx'

const e = window.translate

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

// Module-level cache so the various tone helpers (gauges, tiles, disk rows)
// pick up the user's configured thresholds without prop drilling. The main
// component refreshes this whenever prefs change.
let currentPrefs = getAlertPrefs()

function getTone (percent, prefs = currentPrefs) {
  const warn = prefs?.warn ?? 70
  const danger = prefs?.danger ?? 90
  if (percent >= danger) return 'danger'
  if (percent >= warn) return 'warn'
  if (percent >= Math.max(40, warn - 20)) return 'blue'
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
        meta={e('plusCpuLoad')}
      />
      <MetricTile
        icon={<DatabaseOutlined />}
        label={e('plusMemory')}
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
        label={e('plusDisk')}
        value={metrics.disk}
        meta={metrics.diskItem.mount ? `${metrics.diskItem.used || '-'} / ${metrics.diskItem.size || '-'}` : e('plusWaitingDiskData')}
      />
    </div>
  )
}

function ResourceAlerts ({ data, prefs }) {
  const metrics = getResourceMetrics(data)
  const alerts = [
    ['CPU', metrics.cpu],
    [e('plusMemory'), metrics.mem],
    [e('plusDisk'), metrics.disk]
  ].filter(([, value]) => value >= prefs.warn)
  const level = alerts.some(([, value]) => value >= prefs.danger)
    ? 'danger'
    : alerts.length ? 'warn' : 'healthy'
  return (
    <div className={`home-resource-alert-summary ${level}`}>
      <WarningOutlined />
      <div>
        <b>{alerts.length ? e('plusResourceThresholdAlert') : e('plusResourceNormal')}</b>
        <span>
          {alerts.length
            ? alerts.map(([label, value]) => `${label} ${value}%`).join(' · ')
            : e('plusResourceBelowThreshold')}
        </span>
      </div>
    </div>
  )
}

function getMaxMetric (data) {
  const metrics = getResourceMetrics(data)
  return Math.max(metrics.cpu, metrics.mem, metrics.disk)
}

function AlertSettingsPopover ({ prefs, onChange }) {
  const content = (
    <div className='home-resource-alert-settings'>
      <label className='home-resource-alert-row'>
        <span><BellOutlined /> {e('plusDesktopNotify')}</span>
        <Switch
          size='small'
          checked={prefs.notify}
          onChange={notify => onChange({ notify })}
        />
      </label>
      <label className='home-resource-alert-row'>
        <span>{e('plusWarnThreshold')}</span>
        <InputNumber
          size='small'
          min={1}
          max={100}
          value={prefs.warn}
          formatter={v => `${v}%`}
          parser={v => v.replace('%', '')}
          onChange={warn => warn && onChange({ warn })}
        />
      </label>
      <label className='home-resource-alert-row'>
        <span>{e('plusDangerThreshold')}</span>
        <InputNumber
          size='small'
          min={1}
          max={100}
          value={prefs.danger}
          formatter={v => `${v}%`}
          parser={v => v.replace('%', '')}
          onChange={danger => danger && onChange({ danger })}
        />
      </label>
    </div>
  )
  return (
    <Popover content={content} title={e('plusAlertSettings')} trigger='click' placement='bottomRight'>
      <button type='button' title={e('plusAlertSettings')}>
        <SettingOutlined />
      </button>
    </Popover>
  )
}

function TrendPanel ({ points }) {
  const latest = points[points.length - 1] || {}
  return (
    <section className='home-resource-panel wide home-resource-trend-panel'>
      <div className='home-resource-section-title'>
        <b><LineChartOutlined /> {e('plusResourceTrend')}</b>
        <span>{points.length ? `${points.length} ${e('plusUnitSamples')}` : e('plusWaitingSampling')}</span>
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
                <span className='mem'>{e('plusMemory')} <b>{normalizePercent(latest.mem)}%</b></span>
                <span className='disk'>{e('plusDisk')} <b>{normalizePercent(latest.disk)}%</b></span>
                <span className='network'>{e('plusNetwork')} <b>{filesize(latest.network || 0)}/s</b></span>
              </div>
            </>
            )
          : <div className='home-resource-placeholder'>{e('plusWaitingTrendData')}</div>
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
        <b><PartitionOutlined /> {e('plusFilesystem')}</b>
        <span>{rows.length} {e('plusUnitItems')}</span>
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
          : <div className='home-resource-placeholder'>{e('plusWaitingDiskData')}</div>
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
        <b><ApiOutlined /> {e('plusNetwork')}</b>
        <span>{rows.length} {e('plusUnitInterfaces')}</span>
      </div>
      {
        rows.length
          ? rows.map(row => (
            <div className='home-resource-network-row' key={row.name}>
              <div>
                <b>{row.name}</b>
                <span>{row.ip || e('plusNoIpv4')}</span>
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
          : <div className='home-resource-placeholder'>{e('plusWaitingNetworkData')}</div>
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
        <b><BarsOutlined /> {e('plusTopProcesses')}</b>
        <span>{rows.length} {e('plusUnitRecords')}</span>
      </div>
      {
        rows.length
          ? (
            <div className='home-resource-process-table'>
              <div className='home-resource-process-head'>
                <span>PID</span>
                <span>{e('plusUser')}</span>
                <span>CPU</span>
                <span>{e('plusMemory')}</span>
                <span>{e('plusCommand')}</span>
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
          : <div className='home-resource-placeholder'>{e('plusWaitingProcessData')}</div>
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
  const [prefs, setPrefs] = useState(getAlertPrefs)
  const [, setTick] = useState(0)
  const autoConnectRef = useRef('')
  const store = window.store
  const title = bookmark ? createTitle(bookmark, false) : ''
  const host = getHostText(bookmark)
  const serverKey = bookmark ? (bookmark.id || `${getType(bookmark)}:${host}`) : ''
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
    : e('plusNotRefreshed')

  // keep the module-level tone cache in sync with the current prefs
  currentPrefs = prefs

  const handlePrefsChange = useCallback((patch) => {
    setPrefs(setAlertPrefs(patch))
  }, [])

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
    resetAlertTracking(serverKey)
  }, [bookmark?.id, activeTab?.id, open])

  // fire an OS notification when this server escalates into warn/danger
  useEffect(() => {
    if (!open || !activeTab || !hasResourceReading(data)) {
      return
    }
    const maxMetric = getMaxMetric(data)
    const level = getAlertLevel(maxMetric, prefs)
    if (level === 'healthy') {
      // still update tracking so a later spike re-notifies
      notifyResourceAlert({ serverKey, level, title, detail: '' })
      return
    }
    const titleText = level === 'danger' ? e('plusAlertCritical') : e('plusAlertWarning')
    notifyResourceAlert({
      serverKey,
      level,
      title: `${titleText} · ${title}`,
      detail: `${host} — ${maxMetric}%`
    })
  }, [open, activeTab, data.updatedAt, prefs.warn, prefs.danger, prefs.notify])

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
          title={e('plusUnsupportedResourceType')}
          description={e('plusResourceCollectDesc')}
        />
      )
    }
    if (!activeTab) {
      return (
        <EmptyState
          icon={<CloudServerOutlined />}
          title={pendingTab ? e('plusConnecting') : e('plusAutoConnecting')}
          description={pendingTab ? e('plusConnectingDesc') : e('plusReconnectDesc')}
          action={!pendingTab
            ? <Button type='primary' icon={<CloudServerOutlined />} onClick={onConnect}>{e('plusReconnect')}</Button>
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
          <ResourceAlerts data={data} prefs={prefs} />
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
      {!pinned && <button className='home-resource-sidebar-mask' type='button' aria-label={e('plusCloseResourceMonitor')} onClick={onCancel} />}
      <aside className={`home-resource-sidebar ${pinned ? 'pinned' : ''}`}>
        <div className='home-resource-sidebar-title'>
          <div>
            <LineChartOutlined />
            <b>{e('plusResourceMonitor')}</b>
            <span>{e('plusRefreshEvery3s')}</span>
          </div>
          <div>
            <AlertSettingsPopover prefs={prefs} onChange={handlePrefsChange} />
            <button
              type='button'
              className={pinned ? 'active' : ''}
              title={pinned ? e('plusUnpinPanel') : e('plusPinPanel')}
              onClick={() => onPinnedChange(!pinned)}
            >
              <PushpinOutlined />
            </button>
            <button type='button' title={e('close')} onClick={onCancel}>
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
                <span><ClockCircleOutlined /> {data.uptime || e('plusWaitingUptime')}</span>
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
