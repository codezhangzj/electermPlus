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

const e = window.translate

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
        parsed.state ? `${e('plusStatus')}: ${parsed.state}` : '',
        parsed.exitCode !== null && parsed.exitCode !== undefined
          ? `${e('plusExitCode')}: ${parsed.exitCode}`
          : '',
        parsed.timedOut ? e('plusExecTimeout') : ''
      ].filter(Boolean).join('\n')
      return `${summary}${summary ? '\n\n' : ''}${parsed.output || e('plusNoOutput')}`
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
      checking: e('plusSecurityCheck'),
      running: e('plusRunning'),
      waiting_approval: e('plusWaitingApproval'),
      completed: e('plusCompleted'),
      rejected: e('plusNotExecuted'),
      blocked: e('plusBlocked'),
      error: e('plusExecFailed')
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
          {isCommand ? e('plusServerCommand') : name}
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
                  ? e('plusWaitingApprovalToRun')
                  : status === 'completed'
                    ? e('plusCommandExecuted')
                    : e('plusCommandExecution')}
              </div>
              <div className='agent-command-purpose'>
                {args.purpose || e('plusCollectDiagnostics')}
              </div>
              <pre className='agent-command-code'>{args.command}</pre>
              <div className='agent-command-explanation'>
                <div><b>{e('plusCommandDesc')}</b>{args.explanation || e('plusReadServerState')}</div>
                <div><b>{e('plusJudgeBasis')}</b>{args.expectedOutcome || e('plusJudgeByOutput')}</div>
                <div>
                  <b>{e('plusExecGoal')}</b>
                  {toolCall.target?.title} ({toolCall.target?.host})
                </div>
              </div>
            </div>
          )}
          {toolCall.policy && (
            <div className={`agent-tool-policy risk-${toolCall.policy.risk}`}>
              <div>
                <b>{e('plusRisk')}</b>
                {{
                  read: e('plusReadOnly'),
                  medium: e('plusMedium'),
                  high: e('plusHigh'),
                  blocked: e('plusForbidden')
                }[toolCall.policy.risk] || toolCall.policy.risk}
              </div>
              <div><b>{e('plusReason')}</b>{toolCall.policy.reason}</div>
              <div><b>{e('plusImpact')}</b>{toolCall.policy.impact}</div>
              <div><b>{e('plusRollback')}</b>{toolCall.policy.rollback}</div>
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
                {isCommand ? e('plusExecResult') : 'Result:'}
              </div>
              <pre className='agent-tool-pre'>{formatResult(result)}</pre>
            </div>
          )}
          {status === 'waiting_approval' && (
            <div className='agent-tool-approval-actions'>
              {toolCall.approvalKind === 'plan' && (
                <span className='agent-tool-approval-hint'>{e('plusAgentPlanHint')}</span>
              )}
              {toolCall.approvalKind === 'high' && (
                <span className='agent-tool-approval-hint danger'>{e('plusAgentHighHint')}</span>
              )}
              <Button onClick={(event) => handleDecision(false, event)}>
                {e('plusDeclineRun')}
              </Button>
              <Button
                danger={toolCall.policy?.risk === 'high'}
                type='primary'
                onClick={(event) => handleDecision(true, event)}
              >
                {toolCall.approvalKind === 'plan' ? e('plusAgentApprovePlan') : e('plusApproveRun')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
