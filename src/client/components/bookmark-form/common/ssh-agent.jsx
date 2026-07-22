import React from 'react'
import { Form, Input, Switch, Space } from 'antd'
import { formItemLayout } from '../../../common/form-layout'

const FormItem = Form.Item
const e = window.translate

export default function SshAgent () {
  return (
    <FormItem
      {...formItemLayout}
      label={e('useSshAgent')}
    >
      <Space align='center'>
        <FormItem
          name='useSshAgent'
          valuePropName='checked'
          noStyle
        >
          <Switch />
        </FormItem>
        <FormItem
          name='sshAgent'
          noStyle
        >
          <Input placeholder={e('SSH Agent Path')} />
        </FormItem>
      </Space>
    </FormItem>
  )
}
