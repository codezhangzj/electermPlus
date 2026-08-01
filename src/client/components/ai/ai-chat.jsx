import { useState, useCallback, useEffect } from 'react'
import { Button, Flex, Input, Popconfirm, Segmented, Select, Switch, Tag } from 'antd'
import TabSelect from '../footer/tab-select'
import AiChatHistory from './ai-chat-history'
import uid from '../../common/uid'
import { pick } from 'lodash-es'
import {
  SettingOutlined,
  SendOutlined,
  HistoryOutlined,
  PlusOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import {
  aiChatModeLsKey
} from '../../common/constants'
import { getItem, setItem } from '../../common/safe-local-storage.js'
import { refsStatic } from '../common/ref'
import AgentAuditModal from './agent-audit-modal'
import message from '../common/message'
import './ai.styl'

const { TextArea } = Input
const MAX_HISTORY = 100
const MAX_CONTEXT_CHARS = 6000
const AGENT_MODES = ['diagnose', 'execute', 'agent', 'auto']
const e = window.translate

function getAgentContinuation (history, boundTabId, conversationId) {
  const previous = [...history].reverse().find(item => {
    return AGENT_MODES.includes(item.mode) &&
      item.boundTabId === boundTabId &&
      item.conversationId === conversationId &&
      ['completed', 'stopped', 'error', 'limit_reached'].includes(item.agentPhase)
  })
  if (!previous) {
    return { contextMessages: [] }
  }
  const contextMessages = [
    ...(previous.contextMessages || []),
    { role: 'user', content: previous.prompt?.slice(0, MAX_CONTEXT_CHARS) },
    { role: 'assistant', content: previous.response?.slice(-MAX_CONTEXT_CHARS) }
  ].filter(message => message.content).slice(-12)
  return { contextMessages }
}

export default function AIChat (props) {
  const [prompt, setPrompt] = useState('')
  const [showAudit, setShowAudit] = useState(false)
  const [conversationId, setConversationId] = useState(() => uid())
  const [mode, setMode] = useState(() => {
    const saved = getItem(aiChatModeLsKey)
    if (saved === 'ask') return 'explain'
    if (saved === 'agent') return 'execute'
    return saved || 'diagnose'
  })

  function handlePromptChange (e) {
    setPrompt(e.target.value)
  }

  function handleModeChange (val) {
    setItem(aiChatModeLsKey, val)
    setMode(val)
  }

  function handleNewTask () {
    setConversationId(uid())
    message.success(e('plusAgentNewTaskStarted'))
  }

  const boundTabId = props.aiFollowActiveTerminal
    ? props.activeTabId
    : (props.aiTerminalBoundTabId || props.activeTabId)
  const boundTab = props.tabs.find(tab => tab.id === boundTabId)

  function handleFollowChange (checked) {
    if (props.aiTerminalRun && !['completed', 'failed', 'cancelled'].includes(props.aiTerminalRun.state)) {
      message.warning('当前 AI 命令仍在运行，请先停止后再切换终端。')
      return
    }
    window.store.aiFollowActiveTerminal = checked
    if (checked) window.store.aiTerminalBoundTabId = ''
  }

  function handleBoundTabChange (tabId) {
    if (props.aiTerminalRun && !['completed', 'failed', 'cancelled'].includes(props.aiTerminalRun.state)) {
      message.warning('当前 AI 命令仍在运行，请先停止后再切换终端。')
      return
    }
    window.store.aiFollowActiveTerminal = false
    window.store.aiTerminalBoundTabId = tabId
  }

  function handleCancelRun () {
    if (!props.aiTerminalRun?.id) return
    window.store.mcpCancelAITerminalRun({ runId: props.aiTerminalRun.id })
  }

  const handleSubmit = useCallback(function () {
    if (window.store.aiConfigMissing()) {
      window.store.toggleAIConfig()
    }
    if (!prompt.trim()) return
    if ((mode === 'diagnose' || mode === 'execute' || mode === 'auto') && !boundTabId) {
      message.warning('请先选择一个服务器终端。')
      return
    }
    if (mode === 'diagnose' || mode === 'execute' || mode === 'auto') {
      window.store.aiFollowActiveTerminal = false
      window.store.aiTerminalBoundTabId = boundTabId
    }

    const chatId = uid()
    const isAgentMode = AGENT_MODES.includes(mode)
    const continuation = isAgentMode
      ? getAgentContinuation(window.store.aiChatHistory, boundTabId, conversationId)
      : { contextMessages: [] }
    let terminalContext = null
    if (boundTabId) {
      try {
        terminalContext = {
          connection: window.store.mcpGetTerminalContext({ tabId: boundTabId }),
          recent: window.store.mcpGetTerminalOutput({ tabId: boundTabId, lines: 100 })
        }
      } catch (_) {}
    }
    const chatEntry = {
      prompt,
      response: '',
      isStreaming: false,
      pending: true,
      sessionId: null,
      mode,
      boundTabId,
      terminalContext,
      selectedTabIds: boundTabId ? [boundTabId] : [...props.selectedTabIds],
      toolCalls: [],
      timeline: [],
      conversationId,
      contextMessages: continuation.contextMessages,
      ...pick(props.config, [
        'nameAI',
        'providerAI',
        'modelAI',
        'roleAI',
        'baseURLAI',
        'apiPathAI',
        'apiKeyAI',
        'proxyAI',
        'languageAI'
      ]),
      timestamp: Date.now(),
      id: chatId
    }

    window.store.aiChatHistory.push(chatEntry)
    setPrompt('')

    if (window.store.aiChatHistory.length > MAX_HISTORY) {
      window.store.aiChatHistory.splice(MAX_HISTORY)
    }
  }, [prompt, mode, boundTabId, conversationId])

  function renderHistory () {
    return (
      <AiChatHistory
        history={props.aiChatHistory}
      />
    )
  }

  function toggleConfig () {
    window.store.toggleAIConfig()
  }

  function clearHistory () {
    window.store.aiChatHistory = []
    setConversationId(uid())
  }

  function renderTabSelect () {
    return (
      <TabSelect
        selectedTabIds={props.selectedTabIds}
        tabs={props.tabs}
        activeTabId={props.activeTabId}
      />
    )
  }

  function renderSendIcon () {
    return (
      <Button
        type='primary'
        shape='circle'
        size='small'
        icon={<SendOutlined />}
        onClick={handleSubmit}
        disabled={!prompt.trim()}
        className='ai-send-button'
        title='Enter to send, Shift+Enter for new line'
      />
    )
  }

  useEffect(() => {
    refsStatic.add('AIChat', {
      setPrompt,
      handleSubmit
    })
    if (props.rightPanelTab === 'ai' && window.store.aiConfigMissing()) {
      window.store.toggleAIConfig()
    }
    return () => {
      refsStatic.remove('AIChat')
    }
  }, [handleSubmit])

  if (props.rightPanelTab !== 'ai') {
    return null
  }

  const handleKeyPress = (e) => {
    if (!e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const modeMeta = {
    explain: '解释命令和输出，不访问终端工具',
    diagnose: '只读采集信息，生成结论、证据和排查步骤',
    execute: '先规划再执行，每条命令都需本地审批',
    auto: '批准计划后自动执行整套步骤，高危操作仍单独确认'
  }
  const agentModeSelected = AGENT_MODES.includes(mode)
  const terminalRunMeta = {
    running: { color: 'processing', label: e('plusAgentExecuting') },
    waiting_input: { color: 'warning', label: e('plusAgentWaitingInput') },
    user_takeover: { color: 'default', label: e('plusAgentUserTakeover') },
    completed: { color: 'success', label: e('plusCompleted') },
    failed: { color: 'error', label: e('plusExecFailed') },
    cancelled: { color: 'default', label: e('plusAgentStopped') }
  }[props.aiTerminalRun?.state]

  return (
    <Flex vertical className='ai-chat-container'>
      <div className='ai-terminal-binding'>
        <Flex align='center' gap={8}>
          <div className='ai-terminal-binding-label'>目标终端</div>
          <Select
            size='small'
            value={boundTabId || undefined}
            onChange={handleBoundTabChange}
            className='ai-terminal-binding-select'
            placeholder='选择终端'
            options={props.tabs.map(tab => ({
              value: tab.id,
              label: tab.title || tab.host || tab.id
            }))}
          />
          <span className='ai-terminal-follow-label'>跟随</span>
          <Switch
            size='small'
            checked={props.aiFollowActiveTerminal}
            onChange={handleFollowChange}
          />
          <Button
            type='text'
            size='small'
            icon={<HistoryOutlined />}
            className='ai-audit-entry'
            title='查看审计记录'
            onClick={() => setShowAudit(true)}
          />
        </Flex>
        <Flex align='center' gap={6} className='ai-terminal-context-line'>
          <span>{boundTab?.username || boundTab?.user || 'user'}@{boundTab?.host || 'local'}</span>
          <Tag color={boundTab?.status === 'success' ? 'success' : 'default'}>
            {boundTab?.status === 'success' ? e('plusConnected') : e('plusDisconnected')}
          </Tag>
          {props.aiTerminalRun?.tabId === boundTabId && terminalRunMeta && (
            <>
              <Tag color={terminalRunMeta.color}>
                {terminalRunMeta.label}
              </Tag>
              {!['completed', 'failed', 'cancelled'].includes(props.aiTerminalRun.state) && (
                <Button danger size='small' onClick={handleCancelRun}>停止</Button>
              )}
            </>
          )}
        </Flex>
        {props.aiTerminalRun?.tabId === boundTabId && props.aiTerminalRun.state === 'waiting_input' && (
          <div className='ai-terminal-waiting'>
            {props.aiTerminalRun.waitingInputType === 'secret'
              ? '终端正在等待密码、口令或验证码，请直接在服务器终端中输入。AI 不会读取该内容。'
              : '终端正在等待 yes/no 确认，助手将在获得批准后继续。'}
          </div>
        )}
      </div>
      <Flex className='ai-chat-history' flex='auto'>
        {renderHistory()}
      </Flex>

      <Flex className='ai-chat-input'>
        <Flex className='ai-composer-meta' align='center' gap={8}>
          <div className={`ai-mode-hint ai-mode-${mode}`}>
            {modeMeta[mode]}
          </div>
          {agentModeSelected && (
            <Button
              type='text'
              size='small'
              icon={<PlusOutlined />}
              className='ai-new-task-action'
              onClick={handleNewTask}
            >
              {e('plusAgentNewTask')}
            </Button>
          )}
        </Flex>
        <TextArea
          value={prompt}
          onChange={handlePromptChange}
          onPressEnter={handleKeyPress}
          placeholder={mode === 'explain'
            ? '输入命令、报错或需要解释的内容'
            : mode === 'diagnose'
              ? '描述故障现象，助手将只读收集证据'
              : '描述目标，助手会先给出计划并对危险操作请求确认'}
          autoSize={{ minRows: 2, maxRows: 8 }}
          className='ai-chat-textarea'
        />
        <Flex className='ai-chat-terminals' justify='space-between' align='center'>
          <Flex align='center'>
            <Segmented
              options={[
                { label: '解释', value: 'explain' },
                { label: '诊断', value: 'diagnose' },
                { label: '执行', value: 'execute' },
                { label: '自动', value: 'auto' }
              ]}
              value={mode}
              onChange={handleModeChange}
              size='small'
            />
            {renderTabSelect()}
            <SettingOutlined
              onClick={toggleConfig}
              className='mg1l pointer icon-hover toggle-ai-setting-icon'
            />
            <Popconfirm
              title={window.translate('clear') + ' AI ' + window.translate('history') + '?'}
              okText={window.translate('ok')}
              cancelText={window.translate('cancel')}
              onConfirm={clearHistory}
            >
              <UnorderedListOutlined
                className='mg2x pointer clear-ai-icon icon-hover'
                title='Clear AI chat history'
              />
            </Popconfirm>
          </Flex>
          {renderSendIcon()}
        </Flex>
      </Flex>
      <AgentAuditModal open={showAudit} onClose={() => setShowAudit(false)} />
    </Flex>
  )
}
