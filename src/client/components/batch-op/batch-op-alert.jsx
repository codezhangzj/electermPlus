import React from 'react'
import { Alert } from 'antd'

export default function BatchOpAlert () {
  const description = (
    <>
      <p>Actions: <code>connect, command, sftp_upload, sftp_download</code></p>
    </>
  )

  return (
    <Alert
      description={description}
      type='info'
      showIcon
      className='mg1b'
    />
  )
}
