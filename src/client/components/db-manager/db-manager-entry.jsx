/**
 * Lazy entry for the DB manager panel, mirroring ai-chat-entry: keeps the
 * panel (and its antd Table usage) out of the main bundle until the right
 * side panel first renders.
 */

import { lazy, Suspense } from 'react'

const DbManagerPanel = lazy(() => import('./db-manager-panel'))

export default function DbManagerEntry (props) {
  return (
    <Suspense fallback={null}>
      <DbManagerPanel {...props} />
    </Suspense>
  )
}
