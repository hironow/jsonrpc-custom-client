import { describe, it, expect } from 'vitest'
import { findLinkedMessage } from '@/lib/message-link'

type Msg = {
  id: string
  type: 'sent' | 'received' | 'error' | 'system'
  data: any
  linkedMessageId?: string
}

describe('findLinkedMessage', () => {
  it('links sent request with received response by id', () => {
    const sent: Msg = { id: 'a', type: 'sent', data: { jsonrpc: '2.0', method: 'x', id: 1 } }
    const recv: Msg = { id: 'b', type: 'received', data: { jsonrpc: '2.0', result: {}, id: 1 } }
    const out = findLinkedMessage([sent, recv], sent)
    expect(out?.id).toBe('b')
  })

  it('returns null when no id present', () => {
    const notif: Msg = { id: 'n', type: 'received', data: { jsonrpc: '2.0', method: 'note' } }
    const out = findLinkedMessage([notif], notif)
    expect(out).toBeNull()
  })

  it('follows explicit linkedMessageId', () => {
    const req: Msg = { id: 'r', type: 'sent', data: { jsonrpc: '2.0', method: 'x', id: 3 }, linkedMessageId: 'p' }
    const pair: Msg = { id: 'p', type: 'received', data: { jsonrpc: '2.0', result: {}, id: 3 } }
    const out = findLinkedMessage([req, pair], req)
    expect(out?.id).toBe('p')
  })
})

