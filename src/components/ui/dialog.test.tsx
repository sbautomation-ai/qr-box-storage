import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from './dialog'

describe('Dialog', () => {
  it('provides an accessible title and close control', async () => {
    const onOpenChange = vi.fn()
    render(<Dialog open onOpenChange={onOpenChange} title="Create a box"><p>Body</p></Dialog>)
    expect(screen.getByRole('dialog', { name: 'Create a box' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
