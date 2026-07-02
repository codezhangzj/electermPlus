import {
  Form,
  Input,
  Table,
  Tag
} from 'antd'
import { useMemo, useState } from 'react'
import { MinusCircleFilled, EditOutlined, DatabaseOutlined } from '@ant-design/icons'
import { tailFormItemLayout } from '../../../common/form-layout'
import uid from '../../../common/uid'
import Modal from '../../common/modal'
import DbConnectionForm from './db-connection-form'
import { dbTypeDefaults, dbTypeLabels } from '../../../common/db-connection-defaults'

const FormItem = Form.Item
const e = window.translate

const defaultInitialValues = {
  dbType: 'mysql',
  port: dbTypeDefaults.mysql.port,
  dbHost: '127.0.0.1',
  clientCmd: 'mysql'
}

// A draft becomes a real credential once it has the minimum needed to log in.
function isUsableDraft (draft) {
  return !!(draft && draft.username && (draft.dbHost || draft.host))
}

function draftName (draft) {
  if (draft.name) {
    return draft.name
  }
  return `${draft.username}@${draft.dbHost || draft.host}:${draft.port}`
}

export default function DbConnections (props) {
  const {
    form,
    formData
  } = props
  const [formChild] = Form.useForm()
  const [editFormChild] = Form.useForm()
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  // committed credentials (already added to the list)
  const [list, setList] = useState(formData.dbConnections || [])
  // the entry currently being typed in the inline sub-form; kept in sync with
  // the outer form so a single credential saves WITHOUT needing "add" first
  const [draft, setDraft] = useState({})
  // a stable id so the live-synced draft row does not churn on every keystroke
  const draftId = useMemo(() => uid(), [])

  // Persist committed rows + the in-progress draft (when usable) into the
  // hidden bookmark form field. This is what the outer Save actually stores.
  function syncForm (committed, currentDraft) {
    const rows = [...committed]
    if (isUsableDraft(currentDraft)) {
      rows.push({ ...currentDraft, name: draftName(currentDraft), id: draftId })
    }
    form.setFieldsValue({ dbConnections: rows })
  }

  function handleDraftChange (_changed, allValues) {
    setDraft(allValues)
    syncForm(list, allValues)
  }

  // "add another": lock the current draft in as a row and clear the sub-form
  function handleFinish (data) {
    if (!isUsableDraft(data)) {
      return
    }
    const nd = { ...data, name: draftName(data), id: uid() }
    const next = [...list, nd]
    setList(next)
    setDraft({})
    formChild.resetFields()
    syncForm(next, {})
  }

  function remove (id) {
    const next = list.filter(i => i.id !== id)
    setList(next)
    syncForm(next, draft)
  }

  function openEdit (record) {
    setEditingItem(record)
    setEditModalVisible(true)
    setTimeout(() => {
      editFormChild.setFieldsValue(record)
    }, 100)
  }

  function handleEditFinish (data) {
    const updatedItem = { ...data, name: draftName(data), id: editingItem.id }
    const next = list.map(item => item.id === editingItem.id ? updatedItem : item)
    setList(next)
    syncForm(next, draft)
    setEditModalVisible(false)
    setEditingItem(null)
    editFormChild.resetFields()
  }

  function closeEditModal () {
    setEditModalVisible(false)
    setEditingItem(null)
    editFormChild.resetFields()
  }

  const cols = [
    {
      title: 'NO.',
      dataIndex: 'index',
      key: 'index',
      width: 48,
      render: (k) => k
    },
    {
      title: e('plusDbName'),
      key: 'name',
      render: (k, item) => (
        <span>
          <Tag color='blue'>{dbTypeLabels[item.dbType] || item.dbType}</Tag>
          <b>{item.name}</b>
          <div className='ellipsis' style={{ color: 'var(--ios-muted, #888)', fontSize: 12 }}>
            {item.username}@{item.dbHost || item.host}:{item.port}{item.database ? ` / ${item.database}` : ''}
          </div>
        </span>
      )
    },
    {
      title: e('op'),
      key: 'op',
      dataIndex: 'id',
      width: 72,
      render: (id, record) => (
        <span>
          <EditOutlined
            className='pointer mg1r'
            onClick={() => openEdit(record)}
          />
          <MinusCircleFilled
            className='pointer'
            onClick={() => remove(id)}
          />
        </span>
      )
    }
  ]

  return (
    <>
      <FormItem name='dbConnections' className='hide'>
        <Input />
      </FormItem>
      <div className='pd1b'>
        <DatabaseOutlined className='mg1r' />
        <b>{e('plusDbCredentials')}</b>
        <span className='mg1l' style={{ color: 'var(--ios-muted, #888)', fontSize: 12 }}>
          {e('plusDbCredentialsHint')}
        </span>
      </div>
      {
        list.length
          ? (
            <FormItem {...tailFormItemLayout}>
              <Table
                columns={cols}
                className='mg2b'
                pagination={false}
                size='small'
                rowKey='id'
                dataSource={list.map((d, i) => ({ ...d, index: i + 1 }))}
              />
            </FormItem>
            )
          : null
      }
      <DbConnectionForm
        formChild={formChild}
        initialValues={defaultInitialValues}
        onFinish={handleFinish}
        onValuesChange={handleDraftChange}
      />
      {editModalVisible && (
        <Modal
          open={editModalVisible}
          onCancel={closeEditModal}
          footer={null}
          title={e('edit') + ' ' + e('plusDbName')}
          width={600}
        >
          <DbConnectionForm
            key={editingItem?.id}
            formChild={editFormChild}
            initialValues={editingItem}
            onFinish={handleEditFinish}
            isEdit
          />
        </Modal>
      )}
    </>
  )
}
