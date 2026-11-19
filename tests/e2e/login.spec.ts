import { expect, test } from '@playwright/test'

test('offers signup and login on the public site', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Know what’s in every box/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Family', exact: true })).toBeVisible()
  await expect(page.getByText('€29', { exact: false })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Get started free' }).click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await page.getByRole('link', { name: /Already have an account/ }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
})
