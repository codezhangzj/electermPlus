import { useEffect, useState } from 'react'
import { Button, Empty, Spin, Tag } from 'antd'
import Modal from '../common/modal'

const e = window.translate

export default function AgentAuditModal ({ open, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let closed = false
    setLoading(true)
    window.pre.runGlobalAsync('readAIAuditLog', 100)
      .then(list => {
        if (!closed) {
          setEntries(Array.isArray(list) ? list : [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!closed) {
          setLoading(false)
        }
      })
    return () => {
      closed = true
    }
  }, [open])

  if (!open) return null

  async function clearAudit () {
    await window.pre.runGlobalAsync('clearAIAuditLog').catch(() => {})
    setEntries([])
    onClose()
  }

  return (
    <Modal
      open
      onCancel={onClose}
      title={e('plusAgentAuditTitle')}
      width={720}
      footer={(
        <Button danger onClick={clearAudit}>{e('plusClearRecords')}</Button>
      )}
      className='ai-audit-modal'
    >
      <Spin spinning={loading}>
        {!entries.length
          ? <Empty description={e('plusNoToolCalls')} />
          : (
            <div className='ai-audit-list'>
              {entries.map((entry, index) => (
                <div className='ai-audit-item' key={`${entry.timestamp}-${index}`}>
                  <div className='ai-audit-item-head'>
                    <b>{entry.tool}</b>
                    <Tag>{entry.status}</Tag>
                    <Tag color={entry.risk === 'high' || entry.risk === 'blocked' ? 'error' : 'default'}>
                      {entry.risk || 'unknown'}
                    </Tag>
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div>{entry.target?.title} · {entry.target?.host}</div>
                  <pre>{JSON.stringify(entry.args, null, 2)}</pre>
                </div>
              ))}
            </div>
            )}
      </Spin>
    </Modal>
  )
}
