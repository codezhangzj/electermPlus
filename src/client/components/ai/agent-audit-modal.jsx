import { Button, Empty, Tag } from 'antd'
import Modal from '../common/modal'

const e = window.translate

const AUDIT_KEY = 'ai_agent_audit_log'

function readAuditEntries () {
  try {
    return JSON.parse(window.localStorage.getItem(AUDIT_KEY) || '[]')
  } catch (_) {
    return []
  }
}

export default function AgentAuditModal ({ open, onClose }) {
  if (!open) return null
  const entries = readAuditEntries()

  function clearAudit () {
    window.localStorage.removeItem(AUDIT_KEY)
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
      {!entries.length
        ? <Empty description={e('plusNoToolCalls')} />
        : (
          <div className='ai-audit-list'>
            {entries.slice(0, 100).map((entry, index) => (
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
    </Modal>
  )
}
