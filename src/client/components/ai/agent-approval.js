const pendingApprovals = new Map()
const APPROVAL_TIMEOUT = 5 * 60 * 1000

export function requestAgentApproval (toolCallId) {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      pendingApprovals.delete(toolCallId)
      resolve(false)
    }, APPROVAL_TIMEOUT)
    pendingApprovals.set(toolCallId, { resolve, timeout })
  })
}

export function resolveAgentApproval (toolCallId, approved) {
  const pending = pendingApprovals.get(toolCallId)
  if (!pending) return
  clearTimeout(pending.timeout)
  pendingApprovals.delete(toolCallId)
  pending.resolve(Boolean(approved))
}

export function cancelAgentApprovals (toolCalls = []) {
  toolCalls.forEach(toolCall => resolveAgentApproval(toolCall.id, false))
}
