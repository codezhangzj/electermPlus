import {
  logoPath1,
  packInfo
} from '../../common/constants'
import { Tag } from 'antd'
import './logo.styl'

export default function LogoElem () {
  return (
    <h1 className='mg3y font50 app-logo'>
      <img src={logoPath1} className='app-logo-icon' alt={packInfo.name} />
      <Tag color='#08c' variant='solid'>{packInfo.version}</Tag>
    </h1>
  )
}
