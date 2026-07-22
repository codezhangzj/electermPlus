import {
  Form,
  Input,
  Button,
  AutoComplete,
  Alert,
  Space
} from 'antd'
import { useEffect, useState } from 'react'
import Link from '../common/external-link'
import AiCache from './ai-cache'
import Password from '../common/password'
import AiHistory, { addHistoryItem } from './ai-history'
import { aiProviderPresets, getModelOptions } from './ai-provider-presets'
import message from '../common/message'

const STORAGE_KEY_CONFIG = 'ai_config_history'
const EVENT_NAME_CONFIG = 'ai-config-history-update'

const e = window.translate
const defaultRoles = [
  {
    value: 'Terminal expert, provide commands for different OS, explain usage briefly, use markdown format'
  },
  {
    value: '终端专家,提供不同系统下命令,简要解释用法,用markdown格式'
  }
]

const proxyOptions = [
  { value: 'socks5://127.0.0.1:1080' },
  { value: 'http://127.0.0.1:8080' },
  { value: 'https://proxy.example.com:3128' }
]

export default function AIConfigForm ({ initialValues, onSubmit, showAIConfig }) {
  const [form] = Form.useForm()
  const [testing, setTesting] = useState(false)
  const baseURLAI = Form.useWatch('baseURLAI', form)
  const modelAI = Form.useWatch('modelAI', form)
  const providerAI = Form.useWatch('providerAI', form)

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues)
    }
  }, [initialValues])

  function filter () {
    return true
  }

  const handleSubmit = async (values) => {
    onSubmit(values)
    const historyValues = { ...values }
    delete historyValues.apiKeyAI
    addHistoryItem(STORAGE_KEY_CONFIG, historyValues, EVENT_NAME_CONFIG)
  }

  const handleTest = async () => {
    try {
      const values = await form.validateFields()
      setTesting(true)
      const res = await window.pre.runGlobalAsync(
        'AIchat',
        'Hi',
        values.modelAI,
        values.roleAI,
        values.baseURLAI,
        values.apiPathAI,
        values.apiKeyAI,
        values.proxyAI,
        false,
        values.providerAI
      )
      if (res && res.error) {
        message.error(res.error)
      } else if (res && res.response) {
        message.success('AI config works!')
      } else {
        message.error('Unexpected response from AI API')
      }
    } catch (e) {
      if (e.message) {
        message.error(e.message)
      }
    } finally {
      setTesting(false)
    }
  }

  function handleSelectHistory (item) {
    if (item && typeof item === 'object') {
      form.setFieldsValue(item)
    }
  }

  function renderHistoryItem (item) {
    if (!item || typeof item !== 'object') return { label: 'Unknown', title: 'Unknown' }
    const name = item.nameAI || ''
    const model = item.modelAI || 'Default Model'
    const rolePrefix = item.roleAI ? item.roleAI.substring(0, 15) + '...' : ''
    const label = name || `[${model}] ${rolePrefix}`
    const title = name
      ? `${name}\nModel: ${item.modelAI}\nURL: ${item.baseURLAI}`
      : `Model: ${item.modelAI}\nRole: ${item.roleAI}\nURL: ${item.baseURLAI}`
    return { label, title }
  }

  function renderApiUrlLabel () {
    if (baseURLAI === 'https://api.atlascloud.ai/v1') {
      return <span>API URL (<Link to='https://atlascloud.ai'>AtlasCloud</Link>)</span>
    }
    return 'API URL'
  }

  function applyPreset (preset) {
    form.setFieldsValue(preset.values)
  }

  if (!showAIConfig) {
    return null
  }
  const defaultLangs = window.store.getLangNames().map(l => ({ value: l }))
  return (
    <>
      {modelAI === 'deepseek-chat' && (
        <Alert
          title='当前模型名称即将弃用'
          description='建议切换到 deepseek-v4-flash 或 deepseek-v4-pro。'
          type='warning'
          showIcon
          className='mg2y'
        />
      )}
      <Alert
        title='安全说明'
        description='终端内容会在发送前自动过滤常见密码、Token 和私钥。危险命令由本地策略判断，模型不能绕过审批。'
        type='warning'
        showIcon
        className='mg2y'
      />
      <div className='mg1b' style={{ color: 'var(--ios-muted, #888)' }}>
        {e('plusAiProviderPreset')}
      </div>
      <Space className='mg2b' wrap>
        {aiProviderPresets.map(preset => (
          <Button key={preset.key} onClick={() => applyPreset(preset)}>
            {preset.label}
          </Button>
        ))}
      </Space>
      <p>
        Full Url: {initialValues?.baseURLAI}{initialValues?.apiPathAI}
      </p>
      <Form
        form={form}
        onFinish={handleSubmit}
        initialValues={initialValues}
        layout='vertical'
        className='ai-config-form'
      >
        <Form.Item name='providerAI' hidden>
          <Input />
        </Form.Item>
        <Form.Item
          label='Name'
          name='nameAI'
        >
          <Input
            placeholder='e.g. DeepSeek Relay, Local Ollama (optional)'
          />
        </Form.Item>
        <Form.Item label={renderApiUrlLabel()} required>
          <Space.Compact className='width-100'>
            <Form.Item
              label='API URL'
              name='baseURLAI'
              noStyle
              rules={[
                { required: true, message: 'Please input or select API provider URL!' },
                { type: 'url', message: 'Please enter a valid URL!' }
              ]}
            >
              <Input
                placeholder='Enter API provider URL'
                style={{ width: '75%' }}
              />
            </Form.Item>
            <Form.Item
              label='API PATH'
              name='apiPathAI'
              rules={[
                { required: true, message: 'Please input API PATH' }
              ]}
              noStyle
            >
              <Input
                placeholder='/chat/completions'
                style={{ width: '25%' }}
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>
        <Form.Item
          label={e('modelAi')}
          name='modelAI'
          rules={[{ required: true, message: 'Please input or select a model!' }]}
        >
          <AutoComplete
            options={getModelOptions(baseURLAI, providerAI)}
            filterOption={(input, option) =>
              (option?.value || '').toLowerCase().includes((input || '').toLowerCase())}
            placement='topLeft'
          >
            <Input
              placeholder='Enter or select AI model'
            />
          </AutoComplete>
        </Form.Item>

        <Form.Item
          label='API Key'
          name='apiKeyAI'
        >
          <Password placeholder='Enter your API key' />
        </Form.Item>

        <Form.Item
          label={e('roleAI')}
          name='roleAI'
          rules={[{ required: true, message: 'Please input the AI role!' }]}
        >
          <AutoComplete options={defaultRoles} placement='topLeft'>
            <Input.TextArea
              placeholder='Enter AI role/system prompt'
              rows={1}
            />
          </AutoComplete>
        </Form.Item>

        <Form.Item
          label={e('language')}
          name='languageAI'
          rules={[{ required: true, message: 'Please input language' }]}
        >
          <AutoComplete options={defaultLangs} placement='topLeft'>
            <Input
              placeholder={e('language')}
            />
          </AutoComplete>
        </Form.Item>

        <Form.Item
          label={e('proxy')}
          name='proxyAI'
          tooltip='Proxy for AI API requests (e.g., socks5://127.0.0.1:1080)'
        >
          <AutoComplete
            options={proxyOptions}
            filterOption={filter}
            allowClear
          >
            <Input placeholder='Enter proxy URL (optional)' />
          </AutoComplete>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type='primary' htmlType='submit'>
              {e('save')}
            </Button>
            <Button
              loading={testing}
              onClick={handleTest}
            >
              {e('testConnection')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <AiHistory
        storageKey={STORAGE_KEY_CONFIG}
        eventName={EVENT_NAME_CONFIG}
        onSelect={handleSelectHistory}
        renderItem={renderHistoryItem}
      />
      <AiCache />
    </>
  )
}
