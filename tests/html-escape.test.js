const test = require('node:test')
const assert = require('node:assert/strict')
const { escapeHtml } = require('../lib/html-escape.js')

test('escapeHtml escapes <, >, & only', () => {
  const input = '<tag attr="x&y">value & more</tag>'
  const out = escapeHtml(input)
  assert.equal(out, '&lt;tag attr="x&amp;y"&gt;value &amp; more&lt;/tag&gt;')
})

test('escapeHtml leaves quotes intact for highlighting', () => {
  const input = '"quoted" and \"escaped\"'
  const out = escapeHtml(input)
  assert.equal(out.includes('&quot;'), false)
  assert.equal(out.includes('"quoted"'), true)
})

test('escapeHtml coerces non-strings', () => {
  // numbers
  assert.equal(escapeHtml(42), '42')
  // null
  assert.equal(escapeHtml(null), 'null')
})
