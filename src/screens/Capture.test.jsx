import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Capture from './Capture.jsx'

vi.mock('../lib/camera.js', () => ({
  resizeImage: vi.fn(async () => ({ b64: 'b', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,b' })),
}))

const renderCapture = () => render(<MemoryRouter><Capture /></MemoryRouter>)
const file = (name) => new File(['x'], name, { type: 'image/jpeg' })

describe('Capture', () => {
  it('uploads multiple photos at once and queues them all for review', async () => {
    const { container } = renderCapture()
    fireEvent.click(screen.getByRole('button', { name: 'Batch' }))
    const multiInput = container.querySelector('input[type=file][multiple]')
    fireEvent.change(multiInput, { target: { files: [file('a.jpg'), file('b.jpg'), file('c.jpg')] } })
    expect(await screen.findByRole('button', { name: /review 3 cards/i })).toBeInTheDocument()
  })

  it('removes a queued card before review', async () => {
    const { container } = renderCapture()
    fireEvent.click(screen.getByRole('button', { name: 'Batch' }))
    const multiInput = container.querySelector('input[type=file][multiple]')
    fireEvent.change(multiInput, { target: { files: [file('a.jpg'), file('b.jpg')] } })
    await screen.findByRole('button', { name: /review 2 cards/i })
    fireEvent.click(screen.getByRole('button', { name: 'Remove card 1' }))
    expect(await screen.findByRole('button', { name: /review 1 card/i })).toBeInTheDocument()
  })
})
