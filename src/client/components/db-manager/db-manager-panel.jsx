/**
 * Database manager panel (MySQL V1).
 *
 * Rendered inside the right-side panel on the 'db' tab. Connects the target
 * bookmark + credential through a dedicated SSH tunnel (server/db-api.js),
 * then lets the user browse schemas/tables and run SQL. Write statements go
 * through a preview + confirm before executing (M2 will add row editing).
 */

import { auto } from 'manate/react'
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import {
  Button,
  Table,
  Input,
  Spin,
  Empty,
  Popconfirm,
  Modal,
  Form,
  Tooltip
} from 'antd'
import {
  DatabaseOutlined,
  TableOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  CopyOutlined,
  CloseOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons'
import {
  dbConnect,
  dbQuery,
  dbListSchemas,
  dbListTables,
  dbDescribe
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
// keep the transcript bounded: cap total turns, and only the most recent
// turns render their (heavy) result tables expanded by default
const MAX_TURNS = 30
const KEEP_EXPANDED = 3

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

// Build a parameterized WHERE clause from the row's primary-key values.
function pkWhere (editMeta, row) {
  const clause = editMeta.pkCols.map(c => `${ident(c)} = ?`).join(' AND ')
  const vals = editMeta.pkCols.map(c => row[c])
  return { clause, vals }
}

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

// RFC-4180 CSV: wrap in quotes and double inner quotes when needed.
function csvCell (v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function buildCsv (result) {
  const cols = (result.columns || []).map(c => c.name)
  const header = cols.map(csvCell).join(',')
  const lines = (result.rows || []).map(row => cols.map(c => csvCell(row[c])).join(','))
  return [header, ...lines].join('\r\n')
}

// Trigger a client-side file download without touching the main process.
function downloadText (filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function DbCellValue ({ value }) {
  if (value === null || value === undefined) {
    return <span className='db-cell-null'>NULL</span>
  }
  return <span className='db-cell-val'>{String(value)}</span>
}

// A cell that turns into an input on double-click when the result is editable.
function EditableCell ({ value, editable, onCommit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (!editable) {
    return <DbCellValue value={value} />
  }
  if (!editing) {
    return (
      <span
        className='db-cell-editable'
        onDoubleClick={() => {
          setDraft(value === null || value === undefined ? '' : String(value))
          setEditing(true)
        }}
        title={e('plusDbMgrEditHint')}
      >
        <DbCellValue value={value} />
      </span>
    )
  }
  const commit = () => {
    setEditing(false)
    const orig = value === null || value === undefined ? '' : String(value)
    if (draft !== orig) onCommit(draft)
  }
  return (
    <Input
      size='small'
      autoFocus
      value={draft}
      onChange={ev => setDraft(ev.target.value)}
      onPressEnter={commit}
      onBlur={commit}
    />
  )
}

function ResultTable ({ result, editMeta, onEditCell, onDeleteRow, onAddRow, onExport }) {
  const editable = !!(editMeta && editMeta.pkCols && editMeta.pkCols.length)
  const columns = (result.columns || []).map((c, i) => ({
    title: c.name,
    dataIndex: c.name,
    key: `${c.name}-${i}`,
    ellipsis: true,
    render: (v, record) => (
      <EditableCell
        value={v}
        editable={editable}
        onCommit={(nv) => onEditCell(record.__row, c.name, nv)}
      />
    )
  }))
  if (editable) {
    columns.push({
      title: '',
      key: '__op',
      width: 40,
      fixed: 'right',
      render: (_, record) => (
        <DeleteOutlined
          className='db-cell-del'
          title={e('del')}
          onClick={() => onDeleteRow(record.__row)}
        />
      )
    })
  }
  const dataSource = (result.rows || []).map((row, i) => ({ ...row, __k: i, __row: row }))
  return (
    <div className='db-manager-result'>
      <div className='db-manager-result-ops'>
        {editable && (
          <Tooltip title={e('plusDbMgrAddRow')}>
            <button type='button' className='db-manager-copy' onClick={onAddRow}>
              <PlusOutlined />
            </button>
          </Tooltip>
        )}
        <Tooltip title={e('plusDbMgrExportCsv')}>
          <button type='button' className='db-manager-copy' onClick={() => onExport()}>
            <DownloadOutlined />
          </button>
        </Tooltip>
        <Tooltip title={e('copy')}>
          <button type='button' className='db-manager-copy' onClick={() => copy(buildTsv(result))}>
            <CopyOutlined />
          </button>
        </Tooltip>
      </div>
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
        {editable ? ` · ${e('plusDbMgrEditHint')}` : ''}
      </div>
    </div>
  )
}

// One executed statement + its result, rendered like a chat turn.
// Memoized: appending a new turn must not re-render (or re-mount the antd
// Table of) every previous turn — all handlers passed in are stable.
const DbTurn = memo(function DbTurn ({
  turn, collapsed, onDelete, onToggle, onEditCell, onDeleteRow, onAddRow, onExport
}) {
  const hasRows = turn.state === 'done' && turn.result.kind === 'rows'
  return (
    <div className='db-manager-turn'>
      <div className='db-manager-turn-sql'>
        <code>{turn.sql}</code>
        <div className='db-manager-turn-ops'>
          {hasRows && (
            <button
              type='button'
              className='db-manager-turn-op'
              title={collapsed ? e('plusDbMgrExpand') : e('plusDbMgrCollapse')}
              onClick={() => onToggle(turn.id, !collapsed)}
            >
              {collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
            </button>
          )}
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
              : collapsed
                ? (
                  <div
                    className='db-manager-turn-collapsed'
                    onClick={() => onToggle(turn.id, false)}
                  >
                    <CaretRightOutlined /> {turn.result.rowCount} {e('plusUnitItems')} · {e('plusDbMgrExpand')}
                  </div>
                  )
                : (
                  <ResultTable
                    result={turn.result}
                    editMeta={turn.editMeta}
                    onEditCell={(row, col, val) => onEditCell(turn, row, col, val)}
                    onDeleteRow={(row) => onDeleteRow(turn, row)}
                    onAddRow={() => onAddRow(turn)}
                    onExport={() => onExport(turn)}
                  />
                  )}
      </div>
    </div>
  )
})

// Modal form to insert a new row; empty fields are omitted from the INSERT so
// column defaults / auto-increment apply.
function AddRowModal ({ turn, onSubmit, onCancel }) {
  const [form] = Form.useForm()
  const cols = (turn.result.columns || []).map(c => c.name)
  return (
    <Modal
      open
      title={`${e('plusDbMgrAddRow')} · ${turn.editMeta.table}`}
      onCancel={onCancel}
      onOk={() => form.validateFields().then(onSubmit)}
      okText={e('save')}
      cancelText={e('cancel')}
      width={480}
    >
      <Form form={form} layout='vertical' size='small' className='db-manager-addrow-form'>
        {cols.map(c => (
          <Form.Item key={c} label={c} name={c}>
            <Input placeholder={e('plusDbOptional')} />
          </Form.Item>
        ))}
      </Form>
    </Modal>
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
  const [addRowTurn, setAddRowTurn] = useState(null)
  const [treeWidth, setTreeWidth] = useState(() => {
    const v = parseInt(getItem(TREE_W_KEY), 10)
    return v >= TREE_W_MIN && v <= TREE_W_MAX ? v : 160
  })
  const transcriptRef = useRef(null)
  // busy flag readable from stable callbacks without re-creating them
  const runningRef = useRef(false)

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

  const runStatement = useCallback(async (raw, opts = {}) => {
    const q = raw.trim().replace(/;\s*$/, '')
    if (!q || runningRef.current) return { error: new Error('busy') }
    const id = ++turnSeq
    setHistory(h => {
      const next = [...h, { id, sql: q, state: 'running', editMeta: opts.editMeta }]
      // keep the transcript bounded, drop the oldest turns
      return next.length > MAX_TURNS ? next.slice(next.length - MAX_TURNS) : next
    })
    runningRef.current = true
    setRunning(true)
    try {
      const res = await dbQuery(connId, q, opts.params || [], ROW_LIMIT)
      setHistory(h => h.map(t => t.id === id ? { ...t, state: 'done', result: res } : t))
      return { id, res }
    } catch (err) {
      setHistory(h => h.map(t => t.id === id ? { ...t, state: 'error', error: err.message } : t))
      return { id, error: err }
    } finally {
      runningRef.current = false
      setRunning(false)
    }
  }, [connId])

  function handleSend () {
    const q = sql.trim()
    if (!q || runningRef.current) return
    setSql('')
    runStatement(q)
  }

  const removeTurn = useCallback((id) => {
    setHistory(h => h.filter(t => t.id !== id))
  }, [])

  const toggleTurnCollapsed = useCallback((id, next) => {
    setHistory(h => h.map(t => t.id === id ? { ...t, collapsed: next } : t))
  }, [])

  async function openTableData (schemaName, name) {
    setActiveTable(`${schemaName}.${name}`)
    // discover the primary key so the browsed result becomes safely editable
    let pkCols = []
    try {
      const d = await dbDescribe(connId, schemaName, name)
      pkCols = (d.columns || []).filter(c => c.colKey === 'PRI').map(c => c.name)
    } catch (_) {}
    runStatement(
      `SELECT * FROM ${ident(schemaName)}.${ident(name)} LIMIT ${PREVIEW_LIMIT}`,
      { editMeta: { schema: schemaName, table: name, pkCols } }
    )
  }

  // Show the generated SQL and run it only after explicit confirmation.
  const confirmWrite = useCallback((sql, params, onOk) => {
    Modal.confirm({
      title: e('plusDbMgrWriteConfirm'),
      width: 520,
      content: <pre className='db-manager-sql-preview'>{sql}</pre>,
      okText: e('plusApproveRun'),
      cancelText: e('cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await runStatement(sql, { params })
        if (r && r.res && r.res.kind === 'ok') onOk()
      }
    })
  }, [runStatement])

  const onEditCell = useCallback((turn, row, col, newVal) => {
    const em = turn.editMeta
    const { clause, vals } = pkWhere(em, row)
    const sql = `UPDATE ${ident(em.schema)}.${ident(em.table)} SET ${ident(col)} = ? WHERE ${clause} LIMIT 1`
    confirmWrite(sql, [newVal, ...vals], () => {
      // reflect the change in the browsed result without a re-query
      setHistory(h => h.map(t => {
        if (t.id !== turn.id) return t
        const rows = t.result.rows.map(rr => rr === row ? { ...rr, [col]: newVal } : rr)
        return { ...t, result: { ...t.result, rows } }
      }))
    })
  }, [confirmWrite])

  const onDeleteRow = useCallback((turn, row) => {
    const em = turn.editMeta
    const { clause, vals } = pkWhere(em, row)
    const sql = `DELETE FROM ${ident(em.schema)}.${ident(em.table)} WHERE ${clause} LIMIT 1`
    confirmWrite(sql, vals, () => {
      setHistory(h => h.map(t => {
        if (t.id !== turn.id) return t
        const rows = t.result.rows.filter(rr => rr !== row)
        return { ...t, result: { ...t.result, rows, rowCount: Math.max(0, (t.result.rowCount || rows.length) - 1) } }
      }))
    })
  }, [confirmWrite])

  const onAddRow = useCallback((turn) => {
    setAddRowTurn(turn)
  }, [])

  function submitAddRow (values) {
    const turn = addRowTurn
    setAddRowTurn(null)
    if (!turn) return
    const em = turn.editMeta
    const cols = Object.keys(values).filter(k => values[k] !== '' && values[k] !== undefined)
    if (!cols.length) return
    const sql = `INSERT INTO ${ident(em.schema)}.${ident(em.table)} ` +
      `(${cols.map(ident).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    confirmWrite(sql, cols.map(c => values[c]), () => {
      openTableData(em.schema, em.table)
    })
  }

  const onExport = useCallback((turn) => {
    const base = turn.editMeta
      ? `${turn.editMeta.schema}.${turn.editMeta.table}`
      : 'query'
    const name = `${base}-${Date.now()}.csv`.replace(/[^\w.-]/g, '_')
    downloadText(name, buildCsv(turn.result))
  }, [])

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
              ? history.map((turn, i) => (
                <DbTurn
                  key={turn.id}
                  turn={turn}
                  collapsed={turn.collapsed ?? (i < history.length - KEEP_EXPANDED)}
                  onDelete={removeTurn}
                  onToggle={toggleTurnCollapsed}
                  onEditCell={onEditCell}
                  onDeleteRow={onDeleteRow}
                  onAddRow={onAddRow}
                  onExport={onExport}
                />
              ))
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
      {addRowTurn && (
        <AddRowModal
          turn={addRowTurn}
          onSubmit={submitAddRow}
          onCancel={() => setAddRowTurn(null)}
        />
      )}
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
