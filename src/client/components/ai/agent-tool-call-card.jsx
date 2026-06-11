import { useEffect, useState } from 'react'
import { Button, Tag } from 'antd'
import {
  CaretDownOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
  CodeOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import { resolveAgentApproval } from './agent-approval'

const toolIcons = {
  send_terminal_command: CodeOutlined,
  get_terminal_output: CodeOutlined,
  open_local_terminal: CodeOutlined,
  list_tabs: CodeOutlined,
  get_active_tab: CodeOutlined,
  switch_tab: CodeOutlined,
  list_bookmarks: DatabaseOutlined,
  open_bookmark: DatabaseOutlined,
  add_bookmark: DatabaseOutlined
}

function formatResult (result) {
  if (!result) return ''
  try {
    const parsed = JSON.parse(result)
    if (parsed.output !== undefined) {
      const summary = [
        parsed.state ? `状态: ${parsed.state}` : '',
        parsed.exitCode !== null && parsed.exitCode !== undefined
          ? `退出码: ${parsed.exitCode}`
          : '',
        parsed.timedOut ? '执行等待超时' : ''
      ].filter(Boolean).join('\n')
      return `${summary}${summary ? '\n\n' : ''}${parsed.output || '(无输出)'}`
    }
    return JSON.stringify(parsed, null, 2)
  } catch {
    return result
  }
}

function getSafeArgs (args) {
  return Object.fromEntries(Object.entries(args || {}).map(([key, value]) => {
    if (/password|passphrase|privateKey|token|secret|apiKey/i.test(key)) {
      return [key, '[REDACTED]']
    }
    return [key, value]
  }))
}

export default function AgentToolCallCard ({ toolCall }) {
  const [expanded, setExpanded] = useState(toolCall.status === 'running')
  const { name, args, status, result } = toolCall
  const Icon = toolIcons[name] || CodeOutlined
  const isCommand = name === 'send_terminal_command'

  useEffect(() => {
    if (status === 'waiting_approval' || status === 'blocked' || status === 'error') {
      setExpanded(true)
    }
  }, [status])

  function renderStatus () {
    if (status === 'running' || status === 'checking') {
      return <LoadingOutlined className='agent-tool-status-running' />
    }
    if (status === 'completed') {
      return <CheckCircleOutlined className='agent-tool-status-completed' />
    }
    if (status === 'waiting_approval') {
      return <ClockCircleOutlined className='agent-tool-status-waiting' />
    }
    if (status === 'rejected') {
      return <MinusCircleOutlined className='agent-tool-status-rejected' />
    }
    return <CloseCircleOutlined className='agent-tool-status-error' />
  }

  function renderTag () {
    const colorMap = {
      checking: 'processing',
      running: 'processing',
      waiting_approval: 'warning',
      completed: 'success',
      rejected: 'default',
      blocked: 'error',
      error: 'error'
    }
    const labelMap = {
      checking: '安全检查',
      running: '执行中',
      waiting_approval: '等待允许',
      completed: '已完成',
      rejected: '未执行',
      blocked: '已拦截',
      error: '执行失败'
    }
    return (
      <Tag color={colorMap[status]} className='agent-tool-tag'>
        {labelMap[status] || status}
      </Tag>
    )
  }

  function handleDecision (approved, event) {
    event.stopPropagation()
    resolveAgentApproval(toolCall.id, approved)
  }

  return (
    <div className={`agent-tool-call-card agent-tool-${status}`}>
      <div
        className='agent-tool-header pointer'
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
        <Icon className='mg1l' />
        <span className='mg1l agent-tool-name'>
          {isCommand ? '服务器命令' : name}
        </span>
        {renderTag()}
        {renderStatus()}
      </div>
      {expanded && (
        <div className='agent-tool-detail'>
          {isCommand && (
            <div className='agent-command-proposal'>
              <div className='agent-command-proposal-title'>
                {status === 'waiting_approval'
                  ? '等待允许执行'
                  : status === 'completed'
                    ? '命令已执行'
                    : '命令执行'}
              </div>
              <div className='agent-command-purpose'>
                {args.purpose || '收集服务器诊断信息'}
              </div>
              <pre className='agent-command-code'>{args.command}</pre>
              <div className='agent-command-explanation'>
                <div><b>命令说明：</b>{args.explanation || '读取服务器当前状态。'}</div>
                <div><b>判断依据：</b>{args.expectedOutcome || '根据命令输出判断服务器状态。'}</div>
                <div>
                  <b>执行目标：</b>
                  {toolCall.target?.title} ({toolCall.target?.host})
                </div>
              </div>
            </div>
          )}
          {toolCall.policy && (
            <div className={`agent-tool-policy risk-${toolCall.policy.risk}`}>
              <div>
                <b>风险：</b>
                {{
                  read: '只读',
                  medium: '中等',
                  high: '高',
                  blocked: '禁止'
                }[toolCall.policy.risk] || toolCall.policy.risk}
              </div>
              <div><b>原因：</b>{toolCall.policy.reason}</div>
              <div><b>影响：</b>{toolCall.policy.impact}</div>
              <div><b>回滚：</b>{toolCall.policy.rollback}</div>
            </div>
          )}
          {!isCommand && args && Object.keys(args).length > 0 && (
            <div className='agent-tool-args'>
              <div className='agent-tool-label'>Arguments:</div>
              <pre className='agent-tool-pre'>{JSON.stringify(getSafeArgs(args), null, 2)}</pre>
            </div>
          )}
          {result && (
            <div className='agent-tool-result'>
              <div className='agent-tool-label'>
                {isCommand ? '执行结果' : 'Result:'}
              </div>
              <pre className='agent-tool-pre'>{formatResult(result)}</pre>
            </div>
          )}
          {status === 'waiting_approval' && (
            <div className='agent-tool-approval-actions'>
              <Button onClick={(event) => handleDecision(false, event)}>
                暂不执行
              </Button>
              <Button
                danger={toolCall.policy?.risk === 'high'}
                type='primary'
                onClick={(event) => handleDecision(true, event)}
              >
                允许执行
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
