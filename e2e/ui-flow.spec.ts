import { test, expect } from '@playwright/test'

test.describe('UI flow interactions (Dummy Mode)', () => {
  test('connect, send single + batch, tweak performance, export, clear', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.getByText('JSONRPC WebSocket')).toBeVisible()

    // Connect in Dummy Mode
    await page.getByLabel('Dummy Mode').click()
    await page.getByRole('button', { name: /Connect/ }).click()
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible()

    // RequestForm: single send
    const methodInput = page.getByPlaceholder('e.g., getUser, sendMessage').first()
    await methodInput.fill('demo.call')
    const paramsArea = page.getByPlaceholder('{"key": "value"}').first()
    await paramsArea.fill('{"foo":"bar"}')
    await page.getByRole('button', { name: /^Format$/ }).first().click()
    await page.getByRole('button', { name: /^Send Request$/ }).click()

    // Wait for messages to accumulate (either from send or dummy stream)
    await page.waitForTimeout(500)

    // Switch to Performance tab and tweak settings
    await page.getByRole('tab', { name: 'Performance' }).click()
    const limitInput = page.getByLabel('Message Buffer Limit')
    await limitInput.fill('200')
    await page.getByLabel('Prefer Pending').click()
    await page.getByLabel('Prefer Batches').click()
    await page.getByLabel('Drop Chunk Size').fill('2')

    // Back to Connection tab
    await page.getByRole('tab', { name: 'Connection' }).click()

    // Export messages (verify download)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export' }).click(),
    ])
    const name = download.suggestedFilename()
    expect(name.endsWith('.json')).toBe(true)

    // Batch Mode send
    await page.getByLabel('Batch Mode').click()
    await page.getByRole('button', { name: 'Add Request' }).click()
    const batchMethods = page.getByPlaceholder('Method')
    await batchMethods.nth(0).fill('demo.one')
    await batchMethods.nth(1).fill('demo.two')
    await page.getByRole('button', { name: /Send Batch/ }).click()

    // Clear messages at the end
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByText('No messages yet')).toBeVisible()
  })
})

