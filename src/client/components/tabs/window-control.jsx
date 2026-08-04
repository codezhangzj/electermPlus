/**
 * btns
 */

import {
  BorderOutlined,
  CloseOutlined,
  MinusOutlined,
  SwitcherOutlined
} from '@ant-design/icons'
import { auto } from 'manate/react'
import { isMacJs, isWin } from '../../common/constants'

const e = window.translate

export default auto(function WindowControl (props) {
  const {
    isMaximized,
    config
  } = props.store
  if (isMacJs || (config.useSystemTitleBar && !isWin)) {
    return null
  }
  const minimize = () => {
    window.pre.runGlobalAsync('minimize')
  }
  const maximize = () => {
    window.pre.runGlobalAsync('maximize')
    window.store.isMaximized = true
  }
  const unmaximize = () => {
    window.pre.runGlobalAsync('unmaximize')
    window.store.isMaximized = false
  }
  const closeApp = () => {
    window.store.exit()
  }
  const MaximizeIcon = isMaximized ? SwitcherOutlined : BorderOutlined
  const maximizeTitle = isMaximized ? e('unmaximize') : e('maximize')
  return (
    <div className='window-controls' role='group' aria-label='Window controls'>
      <button
        type='button'
        className='window-control-box window-control-minimize'
        title={e('minimize')}
        aria-label={e('minimize')}
        onClick={minimize}
      >
        <MinusOutlined className='window-control-icon' />
      </button>
      <button
        type='button'
        className='window-control-box window-control-maximize'
        title={maximizeTitle}
        aria-label={maximizeTitle}
        onClick={
          isMaximized ? unmaximize : maximize
        }
      >
        <MaximizeIcon className='window-control-icon' />
      </button>
      <button
        type='button'
        className='window-control-box window-control-close'
        title={e('close')}
        aria-label={e('close')}
        onClick={closeApp}
      >
        <CloseOutlined className='window-control-icon' />
      </button>
    </div>
  )
})
