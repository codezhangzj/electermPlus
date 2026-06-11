import ReactMarkdown from 'react-markdown'
import { copy } from '../../common/clipboard'
import Link from '../common/external-link'
import { Tag } from 'antd'
import { CopyOutlined, EditOutlined, PlayCircleOutlined } from '@ant-design/icons'
import getBrand from './get-brand'
import Modal from '../common/modal'
import message from '../common/message'

const e = window.translate

export default function AIOutput ({ item }) {
  const {
    response,
    baseURLAI,
    nameAI,
    modelAI
  } = item
  if (!response) {
    return null
  }

  const { brand, brandUrl } = getBrand(baseURLAI)

  const renderCode = (props) => {
    const { node, className = '', children, ...rest } = props
    const code = String(children).replace(/\n$/, '')
    const inline = !className.includes('language-')
    if (inline) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }

    const copyToClipboard = () => {
      copy(code)
    }

    const getFilteredCode = () => {
      // Filter out comments from the code before running
      return code
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Remove empty lines and comments
          if (!line) {
            return false
          }
          if (line.startsWith('#')) {
            return false
          }
          return true
        })
        .join('\n')
    }

    const fillInTerminal = () => {
      const filteredCode = getFilteredCode()
      if (filteredCode) window.store.runCommandInTerminal(filteredCode, true)
    }

    const runInTerminal = async () => {
      const filteredCode = getFilteredCode()

      if (filteredCode) {
        const policy = await window.pre.runGlobalAsync('classifyAICommand', filteredCode)
        if (!policy.allowed) {
          message.error(policy.reason)
          return
        }
        if (!policy.requiresApproval) {
          window.store.runCommandInTerminal(filteredCode)
          return
        }
        Modal.confirm({
          title: policy.risk === 'high' ? '确认高风险命令' : '确认执行命令',
          okText: '仅本次执行',
          cancelText: '取消',
          className: policy.risk === 'high' ? 'ai-danger-command-modal' : '',
          content: (
            <div className='ai-command-confirm'>
              <pre>{filteredCode}</pre>
              <p><b>原因：</b>{policy.reason}</p>
              <p><b>影响：</b>{policy.impact}</p>
              <p><b>回滚：</b>{policy.rollback}</p>
            </div>
          ),
          onOk: () => {
            window.store.runCommandInTerminal(filteredCode)
          }
        })
      }
    }

    return (
      <div className='code-block'>
        <div className='code-block-actions alignright'>
          <CopyOutlined
            className='code-action-icon pointer iblock'
            onClick={copyToClipboard}
            title={e('copy')}
          />
          <EditOutlined
            className='code-action-icon pointer mg1l iblock'
            onClick={fillInTerminal}
            title='填入终端但不执行'
          />
          <PlayCircleOutlined
            className='code-action-icon pointer mg1l iblock'
            onClick={runInTerminal}
            title='按安全策略执行'
          />
        </div>
        <pre>
          <code className={className} {...rest}>
            {children}
          </code>
        </pre>
      </div>
    )
  }

  function renderBrand () {
    if (!brand) {
      return null
    }
    const nameLabel = nameAI || modelAI
    const label = nameLabel ? `${brand}:${nameLabel}` : brand
    return (
      <div className='pd1y'>
        <Link to={brandUrl}>
          <Tag>{label}</Tag>
        </Link>
      </div>
    )
  }

  const mdProps = {
    children: response,
    components: {
      code: renderCode
    }
  }

  return (
    <div className='pd1'>
      {renderBrand()}
      <ReactMarkdown {...mdProps} />
    </div>
  )
}
