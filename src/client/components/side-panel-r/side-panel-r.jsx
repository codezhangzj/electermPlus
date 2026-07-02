import React, { memo, useRef } from 'react'
import DragHandle from '../common/drag-handle'
import './right-side-panel.styl'
import {
  CloseCircleOutlined,
  PushpinOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  MinusOutlined,
  RobotOutlined
} from '@ant-design/icons'
import {
  Typography,
  Flex,
  Tag
} from 'antd'

export default memo(function RightSidePanel (
  {
    rightPanelVisible,
    rightPanelPinned,
    rightPanelWidth,
    dbPanelLayout,
    children,
    title,
    rightPanelTab
  }
) {
  const panelRef = useRef(null)
  const isDb = rightPanelTab === 'db'

  if (!rightPanelVisible) {
    return (
      <button
        type='button'
        className='right-side-ai-launcher'
        onClick={window.store.handleOpenAIPanel}
        title='打开智能运维助手'
      >
        <RobotOutlined />
        <span>AI 助手</span>
      </button>
    )
  }

  // database minimized: collapse to a thin restore rail, but keep the panel
  // mounted (hidden) so the live connection and query history survive.
  if (isDb && dbPanelLayout === 'dbMin') {
    return (
      <div
        className='right-side-panel right-side-panel-pinned right-side-panel-rail'
        style={{ width: `${rightPanelWidth}px` }}
      >
        <button
          type='button'
          className='right-side-rail-restore'
          title='还原数据库面板'
          onClick={() => window.store.setDbPanelLayout('split')}
        >
          <DatabaseOutlined />
        </button>
        <div className='right-side-panel-hidden'>
          {children}
        </div>
      </div>
    )
  }

  const tag = rightPanelTab === 'ai'
    ? <Tag className='mg1r'>AI</Tag>
    : isDb
      ? <DatabaseOutlined className='mg1r' />
      : <InfoCircleOutlined className='mg1r' />

  function onDragEnd (nw) {
    window.store.setRightSidePanelWidth(nw)
  }

  function onDragMove (nw) {
    if (panelRef.current) {
      panelRef.current.style.width = nw + 'px'
    }
  }

  function onClose () {
    const activeRun = window.store.aiTerminalRun
    if (
      rightPanelTab === 'ai' &&
      activeRun &&
      !['completed', 'failed', 'cancelled'].includes(activeRun.state)
    ) {
      try {
        window.store.mcpCancelAITerminalRun({ runId: activeRun.id })
      } catch (_) {}
    }
    if (isDb) {
      window.store.closeDbManager()
      return
    }
    window.store.rightPanelVisible = false
    window.store.triggerResize()
  }

  function togglePin () {
    window.store.rightPanelPinned = !window.store.rightPanelPinned
    window.store.triggerResize()
  }

  const panelProps = {
    className: 'right-side-panel animate-fast' +
      (rightPanelPinned ? ' right-side-panel-pinned' : '') +
      (rightPanelTab === 'ai' ? ' right-side-panel-ai' : ''),
    ref: panelRef,
    style: {
      width: `${rightPanelWidth}px`
    }
  }

  const pinProps = {
    className: 'right-side-panel-pin right-side-panel-controls' + (rightPanelPinned ? ' pinned' : ''),
    onClick: togglePin
  }
  // dragging only makes sense in the normal split layout
  const showDrag = !isDb || dbPanelLayout === 'split'
  const dragProps = {
    min: 400,
    max: 1000,
    width: rightPanelWidth,
    onDragEnd,
    onDragMove,
    left: false
  }

  function renderDbLayoutControls () {
    if (!isDb) {
      return null
    }
    return (
      <>
        {dbPanelLayout === 'dbMax'
          ? (
            <DoubleRightOutlined
              className='right-side-panel-controls mg1l'
              onClick={() => window.store.setDbPanelLayout('split')}
              title='还原终端'
            />
            )
          : (
            <DoubleLeftOutlined
              className='right-side-panel-controls mg1l'
              onClick={() => window.store.setDbPanelLayout('dbMax')}
              title='最小化终端（数据库占满）'
            />
            )}
        <MinusOutlined
          className='right-side-panel-controls mg1l'
          onClick={() => window.store.setDbPanelLayout('dbMin')}
          title='最小化数据库面板'
        />
      </>
    )
  }

  return (
    <div
      {...panelProps}
    >
      {showDrag && <DragHandle {...dragProps} />}
      <Flex
        className='right-panel-title pd2'
        justify='space-between'
        align='center'
      >
        <Typography.Text level={4} ellipsis style={{ margin: 0, flex: 1 }}>
          {tag} {title}
        </Typography.Text>
        <Flex>
          {renderDbLayoutControls()}
          <PushpinOutlined
            {...pinProps}
            title={rightPanelPinned ? '取消固定' : '固定在终端右侧'}
          />
          <CloseCircleOutlined
            className='right-side-panel-close right-side-panel-controls mg1l'
            onClick={onClose}
            title={isDb ? '关闭数据库连接' : '收起右侧面板'}
          />
        </Flex>
      </Flex>
      <div className={'right-side-panel-content' + (isDb ? ' right-side-panel-content-db' : '')}>
        {children}
      </div>
    </div>
  )
})
