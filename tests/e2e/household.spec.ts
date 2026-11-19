import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const mailpit = process.env.E2E_MAILPIT_URL

async function signUp(page: Page, request: APIRequestContext, email: string) {
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send sign-in code' }).click()
  await expect(page.getByLabel('Verification code')).toBeVisible()

  let code = ''
  await expect.poll(async () => {
    const response = await request.get(`${mailpit}/api/v1/messages`)
    const data = await response.json() as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> }
    const message = data.messages.find(({ To }) => To.some(({ Address }) => Address === email))
    if (!message) return false
    const details = await request.get(`${mailpit}/api/v1/message/${message.ID}`)
    const body = await details.json() as { Text: string; HTML: string }
    code = `${body.Text} ${body.HTML}`.match(/\b\d{6}\b/)?.[0] ?? ''
    return Boolean(code)
  }, { timeout: 15_000 }).toBe(true)

  await page.getByLabel('Verification code').fill(code)
  await page.getByRole('button', { name: 'Verify code' }).click()
}

async function createHousehold(page: Page, name: string) {
  await expect(page.getByRole('heading', { name: 'Create your household' })).toBeVisible()
  await page.getByLabel('Household name').fill(name)
  await page.getByRole('button', { name: 'Create household' }).click()
  await expect(page.getByRole('heading', { name: 'Your storage boxes' })).toBeVisible()
}

test('signs up separate households, shares a box by invite, and deletes a member account', async ({ page, browser, request }) => {
  test.skip(!mailpit, 'Run this test with the local Supabase mail catcher')
  test.setTimeout(90_000)
  const id = randomUUID()
  const memberEmail = `member-${id}@example.com`

  await page.goto('/signup')
  await signUp(page, request, `owner-${id}@example.com`)
  await createHousehold(page, 'Our Home')
  await page.getByRole('button', { name: 'New box', exact: true }).first().click()
  const create = page.getByRole('dialog', { name: 'Create a box' })
  await create.getByLabel('Name', { exact: true }).fill('Garage tools')
  await create.getByRole('button', { name: 'Add new location' }).click()
  await create.getByLabel('New location name').fill('Garage')
  await create.getByLabel('New location name').press('Enter')
  await expect(create.getByLabel('Location', { exact: true }).locator('option:checked')).toHaveText('Garage')
  await create.getByRole('button', { name: 'Add new category' }).click()
  await create.getByLabel('New category name').fill('Tools')
  await create.getByLabel('New category name').press('Enter')
  await create.getByRole('button', { name: 'Create box' }).click()
  await page.getByRole('link', { name: /Garage tools/ }).click()
  await expect(page.getByRole('heading', { name: 'Garage tools' })).toBeVisible()
  const boxPath = new URL(page.url()).pathname

  await page.getByRole('button', { name: 'Add item', exact: true }).click()
  await page.getByLabel('New item name').fill('Spare batteries')
  await page.getByLabel('Quantity').fill('8')
  await page.getByRole('button', { name: 'Add to box' }).click()
  await expect(page.getByRole('heading', { name: 'Spare batteries' })).toBeVisible()

  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVYQAAAAASUVORK5CYII=', 'base64')
  await page.locator('input[type="file"]').setInputFiles({ name: 'tools.png', mimeType: 'image/png', buffer: pixel })
  await expect(page.getByRole('img', { name: 'tools.png' })).toBeVisible()
  await page.getByRole('button', { name: 'QR label' }).click()
  await expect(page.getByRole('img', { name: 'QR code for Garage tools' })).toHaveAttribute('src', /^data:image\/png/)
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'All boxes' }).click()
  await page.getByRole('searchbox').or(page.getByLabel('Search boxes and items')).fill('batteries')
  await expect(page.getByRole('link', { name: /Garage tools.*Spare batteries.*8/ })).toBeVisible()

  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Invite', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Email address').fill(memberEmail)
  await page.getByRole('button', { name: 'Create invitation' }).click()
  const inviteInput = page.getByLabel('Share this single-use link')
  await expect(inviteInput).toHaveValue(/\/join\//)
  const invitePath = new URL(await inviteInput.inputValue()).pathname

  const outsider = await browser.newPage()
  await outsider.goto(new URL(boxPath, page.url()).href)
  await expect(outsider.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await outsider.getByRole('link', { name: /New here/ }).click()
  await signUp(outsider, request, `out-${id}@example.com`)
  await outsider.getByLabel('Household name').fill('Another Home')
  await outsider.getByRole('button', { name: 'Create household' }).click()
  await expect(outsider.getByRole('heading', { name: 'Box not found' })).toBeVisible()
  await outsider.close()

  const member = await browser.newPage()
  await member.goto(new URL(invitePath, page.url()).href)
  await member.getByRole('link', { name: /New here/ }).click()
  await signUp(member, request, memberEmail)
  await member.getByRole('button', { name: 'Accept invitation' }).click()
  await expect(member.getByRole('link', { name: /Garage tools/ })).toBeVisible()
  await member.goto(new URL(boxPath, page.url()).href)
  await expect(member.getByRole('img', { name: 'tools.png' })).toBeVisible()
  await member.goto(new URL('/account/delete', page.url()).href)
  await member.getByLabel('Type DELETE to confirm').fill('DELETE')
  await member.getByRole('button', { name: 'Permanently delete account' }).click()
  await expect(member.getByRole('heading', { name: 'Account deleted' })).toBeVisible()
  await member.close()

  await page.goto(boxPath)
  await expect(page.getByRole('heading', { name: 'Spare batteries' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete box' }).click()
  await expect(page.getByRole('heading', { name: 'Your storage boxes' })).toBeVisible()
  await page.goto(boxPath)
  await expect(page.getByRole('heading', { name: 'Box not found' })).toBeVisible()
})
