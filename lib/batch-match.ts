export type PendingBatch = { timestamp: number; requestIds: number[] }

export function matchBatchResponse(
  pendingBatches: Map<string, PendingBatch>,
  responseIds: number[],
  now: number,
): { linkedBatchId?: string; responseTime?: number } {
  for (const [batchId, pending] of pendingBatches.entries()) {
    const allMatch = pending.requestIds.every((id) => responseIds.includes(id))
    const hasAny = responseIds.some((id) => pending.requestIds.includes(id))
    if (allMatch || hasAny) {
      return { linkedBatchId: batchId, responseTime: now - pending.timestamp }
    }
  }
  return {}
}

