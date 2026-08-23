import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'owner-id' } }, membership: null, loading: false }),
}))

describe('ProtectedRoute', () => {
  it('renders the setup page for an authenticated user without a household', () => {
    render(
      <MemoryRouter initialEntries={['/setup-required']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/setup-required" element={<h1>Owner setup</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Owner setup' })).toBeVisible()
  })
})
