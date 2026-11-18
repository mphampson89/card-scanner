import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PhotoViewer from './PhotoViewer.jsx'

describe('PhotoViewer', () => {
  it('closes once when the close button is tapped (not twice via the backdrop)', () => {
    const onClose = vi.fn()
    render(<PhotoViewer src="data:," alt="Card" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
