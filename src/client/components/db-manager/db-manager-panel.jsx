/**
 * Database manager panel (MySQL V1).
 *
 * Rendered inside the right-side panel on the 'db' tab. Connects the target
 * bookmark + credential through a dedicated SSH tunnel (server/db-api.js),
 * then lets the user browse schemas/tables and run SQL. Write statements go
 * through a preview + confirm before executing (M2 will add row editing).
 */

import { auto } from 'manate/react'
import { useState, useEffect, useRef } from 'react'
import {
  Button,
  Table,
  Input,
  Spin,
  Empty,
  Popconfirm
} from 'antd'
import {
  DatabaseOutlined,
  TableOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  CopyOutlined,
  CloseOutlined,
  CaretRightOutlined
} from '@ant-design/icons'
import {
  dbConnect,
  dbQuery,
  dbListSchemas,
  dbListTables
} from '../../common/db-apis'
import { copy } from '../../common/clipboard'
import { getItem, setItem } from '../../common/safe-local-storage.js'
import message from '../common/message'
import './db-manager.styl'

const e = window.translate
const { TextArea } = Input
let turnSeq = 0
const ROW_LIMIT = 500
const PREVIEW_LIMIT = 200
const TREE_W_KEY = 'dbMgrTreeWidth'
const TREE_W_MIN = 110
const TREE_W_MAX = 380

// built-in schemas that are not user-created databases
const SYSTEM_SCHEMAS = new Set([
  'information_schema', 'mysql', 'performance_schema', 'sys'
])

// Escape a MySQL identifier by doubling backticks.
function ident (name) {
  return '`' + String(name).replace(/`/g, '``') + '`'
}

// A statement is a write when its first keyword mutates data or schema.
const WRITE_RE = /^\s*(insert|update|delete|replace|drop|truncate|alter|create|grant|revoke|rename|set)\b/i

// Render a rows result as tab-separated text (header + rows) so it pastes
// cleanly into spreadsheets / docs.
function buildTsv (result) {
  const cols = (result.columns || []).map(c => c.name)
  const header = cols.join('\t')
  const lines = (result.rows || []).map(row => cols.map(c => {
    const v = row[c]
    return v === null || v === undefined ? '' : String(v)
  }).join('\t'))
  return [header, ...lines].join('\n')
}

function DbCellValue ({ value }) {
  if (value === null || value === undefined) {
    return <span className='db-cell-null'>NULL</span>
  }
  return <span className='db-cell-val'>{String(value)}</span>
}

function ResultTable ({ result }) {
  const columns = (result.columns || []).map((c, i) => ({
    title: c.name,
    dataIndex: c.name,
    key: `${c.name}-${i}`,
    ellipsis: true,
    render: (v) => <DbCellValue value={v} />
  }))
  const dataSource = (result.rows || []).map((row, i) => ({ ...row, __k: i }))
  return (
    <div className='db-manager-result'>
      <button
        type='button'
        className='db-manager-copy'
        title={e('copy')}
        onClick={() => copy(buildTsv(result))}
      >
        <CopyOutlined />
      </button>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey='__k'
        size='small'
        pagination={false}
        scroll={{ x: 'max-content', y: 300 }}
      />
      <div className='db-manager-turn-meta'>
        {result.rowCount} {e('plusUnitItems')}
        {result.truncated ? ` (${e('plusDbMgrTruncated')} ${ROW_LIMIT})` : ''}
      </div>
    </div>
  )
}

// One executed statement + its result, rendered like a chat turn.
function DbTurn ({ turn, onDelete }) {
  return (
    <div className='db-manager-turn'>
      <div className='db-manager-turn-sql'>
        <code>{turn.sql}</code>
        <div className='db-manager-turn-ops'>
          <button
            type='button'
            className='db-manager-turn-op'
            title={e('copy')}
            onClick={() => copy(turn.sql)}
          >
            <CopyOutlined />
          </button>
          <button
            type='button'
            className='db-manager-turn-op'
            title={e('del')}
            onClick={() => onDelete(turn.id)}
          >
            <CloseOutlined />
          </button>
        </div>
      </div>
      <div className='db-manager-turn-body'>
        {turn.state === 'running'
          ? <Spin size='small' />
          : turn.state === 'error'
            ? <div className='db-manager-turn-error'>{turn.error}</div>
            : turn.result.kind === 'ok'
              ? <div className='db-manager-ok'>{e('plusDbMgrAffected')}: {turn.result.affectedRows}</div>
              : <ResultTable result={turn.result} />}
      </div>
    </div>
  )
}

function DbManagerInner ({ target }) {
  const { connId, sshConfig, dbConn } = target
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')
  const [schemas, setSchemas] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())
  const [tablesBySchema, setTablesBySchema] = useState({})
  const [activeTable, setActiveTable] = useState('')
  const [sql, setSql] = useState('')
  const [history, setHistory] = useState([])
  const [running, setRunning] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [treeWidth, setTreeWidth] = useState(() => {
    const v = parseInt(getItem(TREE_W_KEY), 10)
    return v >= TREE_W_MIN && v <= TREE_W_MAX ? v : 160
  })
  const transcriptRef = useRef(null)

  function startTreeResize (ev) {
    ev.preventDefault()
    const startX = ev.clientX
    const startW = treeWidth
    const onMove = (e) => {
      const w = Math.min(TREE_W_MAX, Math.max(TREE_W_MIN, startW + (e.clientX - startX)))
      setTreeWidth(w)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      setTreeWidth(w => {
        setItem(TREE_W_KEY, String(w))
        return w
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
  }

  useEffect(() => {
    let cancelled = false
    setStatus('connecting')
    setError('')
    setHistory([])
    setActiveTable('')
    setExpanded(new Set())
    setTablesBySchema({})
    dbConnect(connId, sshConfig, dbConn)
      .then(() => dbListSchemas(connId))
      .then(async (r) => {
        if (cancelled) return
        const list = r.schemas || []
        setSchemas(list)
        setStatus('ready')
        // auto-expand the bookmark's default database, if any
        const initial = dbConn.database && list.includes(dbConn.database)
          ? dbConn.database
          : ''
        if (initial) {
          try {
            const tr = await dbListTables(connId, initial)
            if (!cancelled) {
              setExpanded(new Set([initial]))
              setTablesBySchema({ [initial]: tr.tables || [] })
            }
          } catch (_) {}
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error')
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [connId, attempt])

  // double-click a database to expand/collapse; load its tables on first open
  async function toggleSchema (name) {
    const isOpen = expanded.has(name)
    const next = new Set(expanded)
    if (isOpen) {
      next.delete(name)
    } else {
      next.add(name)
      if (!tablesBySchema[name]) {
        try {
          const r = await dbListTables(connId, name)
          setTablesBySchema(prev => ({ ...prev, [name]: r.tables || [] }))
        } catch (err) {
          message.error(err.message)
        }
      }
    }
    setExpanded(next)
  }

  // keep the transcript pinned to the latest turn
  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history])

  async function runStatement (raw) {
    const q = raw.trim().replace(/;\s*$/, '')
    if (!q || running) return
    const id = ++turnSeq
    setHistory(h => [...h, { id, sql: q, state: 'running' }])
    setRunning(true)
    try {
      const res = await dbQuery(connId, q, [], ROW_LIMIT)
      setHistory(h => h.map(t => t.id === id ? { ...t, state: 'done', result: res } : t))
    } catch (err) {
      setHistory(h => h.map(t => t.id === id ? { ...t, state: 'error', error: err.message } : t))
    } finally {
      setRunning(false)
    }
  }

  function handleSend () {
    const q = sql.trim()
    if (!q || running) return
    setSql('')
    runStatement(q)
  }

  function removeTurn (id) {
    setHistory(h => h.filter(t => t.id !== id))
  }

  function openTableData (schemaName, name) {
    setActiveTable(`${schemaName}.${name}`)
    runStatement(`SELECT * FROM ${ident(schemaName)}.${ident(name)} LIMIT ${PREVIEW_LIMIT}`)
  }

  function handleEditorKey (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
      ev.preventDefault()
      if (!WRITE_RE.test(sql)) handleSend()
    }
  }

  if (status === 'error') {
    return (
      <div className='db-manager-panel'>
        <Empty
          image={<DatabaseOutlined />}
          description={(
            <div>
              <b>{e('plusDbMgrConnectFailed')}</b>
              <span className='db-manager-error'>{error}</span>
            </div>
          )}
        >
          <Button icon={<ReloadOutlined />} onClick={() => setAttempt(a => a + 1)}>
            {e('plusReconnect')}
          </Button>
        </Empty>
      </div>
    )
  }

  const isWrite = WRITE_RE.test(sql)
  const userSchemas = schemas.filter(s => !SYSTEM_SCHEMAS.has(String(s).toLowerCase()))

  return (
    <div className='db-manager-panel'>
      {status === 'connecting' && (
        <div className='db-manager-connecting'>
          <Spin tip={e('plusDbMgrConnecting')}>
            <span />
          </Spin>
        </div>
      )}
      <div className='db-manager-head'>
        <DatabaseOutlined />
        <b>{dbConn.name}</b>
        <span className='db-manager-host'>{dbConn.username}@{dbConn.dbHost}:{dbConn.port}</span>
      </div>

      <div className='db-manager-body'>
        <div className='db-manager-tree' style={{ width: treeWidth }}>
          {userSchemas.length
            ? userSchemas.map(s => {
              const open = expanded.has(s)
              const tbls = tablesBySchema[s]
              return (
                <div key={s} className='db-manager-tree-node'>
                  <div
                    className={'db-manager-tree-db' + (open ? ' open' : '')}
                    onDoubleClick={() => toggleSchema(s)}
                    title={s}
                  >
                    <CaretRightOutlined
                      className='db-manager-caret'
                      onClick={(ev) => { ev.stopPropagation(); toggleSchema(s) }}
                    />
                    <DatabaseOutlined /> <span>{s}</span>
                  </div>
                  {open && (
                    <div className='db-manager-tree-tables'>
                      {tbls
                        ? tbls.length
                          ? tbls.map(t => (
                            <div
                              key={t.name}
                              className={'db-manager-tree-item' + (activeTable === `${s}.${t.name}` ? ' on' : '')}
                              onClick={() => openTableData(s, t.name)}
                              title={t.name}
                            >
                              <TableOutlined /> <span>{t.name}</span>
                            </div>
                          ))
                          : <div className='db-manager-tree-empty small'>{e('plusDbMgrNoTables')}</div>
                        : <div className='db-manager-tree-empty small'><Spin size='small' /></div>}
                    </div>
                  )}
                </div>
              )
            })
            : <div className='db-manager-tree-empty'>{e('plusDbMgrNoSchemas')}</div>}
        </div>
        <div
          className='db-manager-tree-resizer'
          onMouseDown={startTreeResize}
          title={e('plusDbMgrResizeTree')}
        />

        <div className='db-manager-main'>
          <div className='db-manager-transcript' ref={transcriptRef}>
            {history.length
              ? history.map(turn => <DbTurn key={turn.id} turn={turn} onDelete={removeTurn} />)
              : <Empty description={e('plusDbMgrRunHint')} />}
          </div>

          <div className='db-manager-input-bar'>
            <TextArea
              className='db-manager-editor'
              value={sql}
              onChange={ev => setSql(ev.target.value)}
              onKeyDown={handleEditorKey}
              placeholder={e('plusDbMgrSqlPlaceholder')}
              autoSize={{ minRows: 2, maxRows: 8 }}
            />
            {isWrite
              ? (
                <Popconfirm
                  title={e('plusDbMgrWriteConfirm')}
                  description={<pre className='db-manager-sql-preview'>{sql.trim()}</pre>}
                  okText={e('plusApproveRun')}
                  cancelText={e('cancel')}
                  onConfirm={handleSend}
                >
                  <Button danger type='primary' icon={<PlayCircleOutlined />} loading={running}>
                    {e('plusDbMgrRunWrite')}
                  </Button>
                </Popconfirm>
                )
              : (
                <Button type='primary' icon={<PlayCircleOutlined />} loading={running} onClick={handleSend}>
                  {e('plusDbMgrRun')}
                </Button>
                )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default auto(function DbManagerPanel ({ rightPanelTab }) {
  if (rightPanelTab !== 'db') {
    return null
  }
  const target = window.store.dbManagerTarget
  if (!target) {
    return null
  }
  return <DbManagerInner key={target.connId} target={target} />
})
