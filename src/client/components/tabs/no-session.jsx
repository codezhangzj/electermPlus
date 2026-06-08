import { Button } from 'antd'
import {
  HomeOutlined,
  PlusCircleOutlined
} from '@ant-design/icons'
import './no-session.styl'

const e = window.translate

export default function NoSessionPanel ({ height, onNewSsh }) {
  if (window.store.showHomeDashboard) {
    return null
  }

  const handleShowHome = () => {
    window.store.showHomeDashboard = true
  }

  return (
    <div className='no-sessions' style={{ height: height + 'px' }}>
      <div className='no-session-panel'>
        <div className='no-session-icon'>
          <HomeOutlined />
        </div>
        <h2>没有打开的会话</h2>
        <p>回到连接工作台选择书签，或创建新的远程连接。</p>
        <div className='no-session-actions'>
          <Button type='primary' icon={<HomeOutlined />} onClick={handleShowHome}>连接工作台</Button>
          <Button icon={<PlusCircleOutlined />} onClick={onNewSsh}>{e('newBookmark')}</Button>
        </div>
      </div>
    </div>
  )
}
