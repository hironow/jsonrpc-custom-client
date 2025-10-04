import { describe, it, expect } from 'vitest'
import { matchBatchResponse } from '@/lib/batch-match'

describe('matchBatchResponse', () => {
  it('matches batch by any or all request ids and computes responseTime', () => {
    const now = 1000
    const pending = new Map<string, { timestamp: number; requestIds: number[] }>([
      ['A', { timestamp: 100, requestIds: [1, 2] }],
      ['B', { timestamp: 200, requestIds: [3, 4] }],
    ])

    // partial overlap
    const p1 = matchBatchResponse(pending, [2], now)
    expect(p1.linkedBatchId).toBe('A')
    expect(p1.responseTime).toBe(900)

    // full overlap
    const p2 = matchBatchResponse(pending, [3, 4], now)
    expect(p2.linkedBatchId).toBe('B')
    expect(p2.responseTime).toBe(800)
  })
})

