import { describe, it, expect } from 'vitest'
import { validateJsonRpcMessage } from '@/lib/jsonrpc-validator'

describe('validateJsonRpcMessage - request', () => {
  it('accepts valid request with id, method, params', () => {
    const req = { jsonrpc: '2.0', method: 'sum', params: [1,2], id: 1 }
    const res = validateJsonRpcMessage(req, 'request')
    expect(res.isValid).toBe(true)
    expect(res.errors).toEqual([])
  })

  it('warns when notification (no id)', () => {
    const req = { jsonrpc: '2.0', method: 'ping' }
    const res = validateJsonRpcMessage(req, 'request')
    expect(res.isValid).toBe(true)
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  it('rejects when missing method', () => {
    const req: any = { jsonrpc: '2.0', id: 1 }
    const res = validateJsonRpcMessage(req, 'request')
    expect(res.isValid).toBe(false)
    expect(res.errors.some(e => e.includes('Missing required "method"'))).toBe(true)
  })

  it('rejects when method is not string', () => {
    const req: any = { jsonrpc: '2.0', method: 42, id: 1 }
    const res = validateJsonRpcMessage(req, 'request')
    expect(res.isValid).toBe(false)
  })

  it('rejects when params is neither array nor object', () => {
    const req: any = { jsonrpc: '2.0', method: 'sum', params: 'bad', id: 1 }
    const res = validateJsonRpcMessage(req, 'request')
    expect(res.isValid).toBe(false)
  })

  it('rejects invalid jsonrpc value', () => {
    const req: any = { jsonrpc: '1.0', method: 'sum', id: 1 }
    const res = validateJsonRpcMessage(req, 'request')
    expect(res.isValid).toBe(false)
    expect(res.errors.some(e => e.includes('jsonrpc'))).toBe(true)
  })
})

describe('validateJsonRpcMessage - response', () => {
  it('accepts valid result response', () => {
    const resp = { jsonrpc: '2.0', result: { ok: true }, id: 1 }
    const res = validateJsonRpcMessage(resp, 'response')
    expect(res.isValid).toBe(true)
  })

  it('rejects response without id', () => {
    const resp: any = { jsonrpc: '2.0', result: { ok: true } }
    const res = validateJsonRpcMessage(resp, 'response')
    expect(res.isValid).toBe(false)
    expect(res.errors.some(e => e.includes('Missing required "id"'))).toBe(true)
  })

  it('rejects response having both result and error', () => {
    const resp = { jsonrpc: '2.0', result: {}, error: { code: -1, message: 'x' }, id: 1 } as any
    const res = validateJsonRpcMessage(resp, 'response')
    expect(res.isValid).toBe(false)
  })

  it('rejects malformed error object', () => {
    const resp1 = { jsonrpc: '2.0', error: { code: 'not-number', message: 'x' }, id: 1 } as any
    const res1 = validateJsonRpcMessage(resp1, 'response')
    expect(res1.isValid).toBe(false)

    const resp2 = { jsonrpc: '2.0', error: { code: -1, message: 42 }, id: 1 } as any
    const res2 = validateJsonRpcMessage(resp2, 'response')
    expect(res2.isValid).toBe(false)
  })

  it('rejects invalid jsonrpc in response', () => {
    const resp: any = { jsonrpc: '1.0', result: {}, id: 1 }
    const res = validateJsonRpcMessage(resp, 'response')
    expect(res.isValid).toBe(false)
  })
})

describe('validateJsonRpcMessage - batch', () => {
  it('aggregates errors across batch items', () => {
    const batch = [
      { jsonrpc: '2.0', method: 'ok', id: 1 },
      { jsonrpc: '2.0', result: {}, id: 1 },
      { jsonrpc: '2.0', error: { code: -1, message: 'x' }, id: 2 },
    ]
    const res = validateJsonRpcMessage(batch, 'request')
    // Second item is a response-like shape when validating as request, should error
    expect(res.isValid).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
  })

  it('rejects empty batch', () => {
    const res = validateJsonRpcMessage([], 'request')
    expect(res.isValid).toBe(false)
  })

  it('collects warnings for notifications in batch', () => {
    const batch = [
      { jsonrpc: '2.0', method: 'note' },
      { jsonrpc: '2.0', method: 'sum', id: 1 },
    ]
    const res = validateJsonRpcMessage(batch, 'request')
    expect(res.isValid).toBe(true)
    expect(res.warnings.length).toBeGreaterThan(0)
  })
})
