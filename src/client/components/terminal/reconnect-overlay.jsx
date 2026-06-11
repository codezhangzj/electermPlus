import { memo } from 'react'

const e = window.translate

export default memo(function ReconnectOverlay ({ countdown, waitingForNetwork, attempt, onCancel }) {
  if ((countdown === null || countdown === undefined) && !waitingForNetwork) {
    return null
  }
  return (
    <div className='terminal-reconnect-overlay'>
      <b>{waitingForNetwork ? '网络恢复后自动重连' : `${e('autoReconnectTerminal')}: ${countdown}s`}</b>
      <span>{attempt ? `第 ${attempt} 次重试` : '连接中断'}</span>
      <button type='button' onClick={onCancel}>取消</button>
    </div>
  )
})
