import { expect, test } from '@playwright/test'

test('shows a responsive, private Google sign-in screen', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'QR Box Storage' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await expect(page.getByText(/Only invited Google accounts/)).toBeVisible()
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll')
})
