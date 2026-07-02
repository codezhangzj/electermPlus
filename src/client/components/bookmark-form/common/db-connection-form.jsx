import {
  Form,
  Input,
  InputNumber,
  Select,
  Button
} from 'antd'
import { PlusCircleOutlined, SaveOutlined } from '@ant-design/icons'
import Password from '../../common/password.jsx'
import { dbTypeDefaults, dbTypeOptions } from '../../../common/db-connection-defaults'

const FormItem = Form.Item
const e = window.translate

const layout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}
const tail = {
  wrapperCol: { offset: 6, span: 18 }
}

export default function DbConnectionForm (props) {
  const {
    formChild,
    initialValues,
    onFinish,
    onValuesChange,
    isEdit
  } = props

  function onSubmit () {
    formChild.submit()
  }

  function handleTypeChange (dbType) {
    const defaults = dbTypeDefaults[dbType] || {}
    const current = formChild.getFieldsValue()
    formChild.setFieldsValue({
      port: current.port || defaults.port,
      clientCmd: current.clientCmd || defaults.clientCmd
    })
  }

  return (
    <Form
      form={formChild}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
      initialValues={initialValues}
      {...layout}
      name='db-connection-form'
    >
      <FormItem
        label={e('plusDbType')}
        name='dbType'
        rules={[{ required: true, message: e('plusDbType') }]}
      >
        <Select options={dbTypeOptions} onChange={handleTypeChange} />
      </FormItem>
      <FormItem
        label={e('plusDbName')}
        name='name'
      >
        <Input placeholder={e('plusDbNamePlaceholder')} />
      </FormItem>
      <FormItem
        label={e('host')}
        name='dbHost'
        rules={[{ required: true, message: e('host') }]}
        tooltip={e('plusDbHostTip')}
      >
        <Input placeholder='127.0.0.1' />
      </FormItem>
      <FormItem
        label={e('port')}
        name='port'
        rules={[{ required: true, message: e('port') }]}
      >
        <InputNumber min={1} max={65535} className='width-100' />
      </FormItem>
      <FormItem
        label={e('username')}
        name='username'
        rules={[{ required: true, message: e('username') }]}
      >
        <Input autoComplete='off' />
      </FormItem>
      <FormItem
        label={e('password')}
        name='password'
      >
        <Password placeholder={e('password')} />
      </FormItem>
      <FormItem
        label={e('plusDbDefaultDatabase')}
        name='database'
      >
        <Input placeholder={e('plusDbOptional')} />
      </FormItem>
      <FormItem
        label={e('plusDbClientCmd')}
        name='clientCmd'
        tooltip={e('plusDbClientCmdTip')}
      >
        <Input placeholder='mysql' />
      </FormItem>
      <FormItem {...tail}>
        <Button
          type='dashed'
          onClick={onSubmit}
          icon={isEdit ? <SaveOutlined /> : <PlusCircleOutlined />}
        >
          {isEdit ? e('save') : e('plusDbAddAnother')}
        </Button>
      </FormItem>
    </Form>
  )
}
