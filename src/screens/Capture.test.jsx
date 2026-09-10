import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Capture, { PICK_EVENT } from './Capture.jsx'
import TabBar from '../components/TabBar.jsx'

vi.mock('../lib/camera.js', () => ({
  resizeImage: vi.fn(async () => ({ b64: 'b', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,b' })),
}))

const renderCapture = () => render(<MemoryRouter><Capture /></MemoryRouter>)
const renderScanWithTabBar = () => render(
  <MemoryRouter initialEntries={['/scan']}><Capture /><TabBar /></MemoryRouter>,
)
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

  it('single mode offers a file upload that does not force the camera', () => {
    const { container } = renderCapture()
    const inputs = Array.from(container.querySelectorAll('input[type=file]'))
    expect(inputs.some((i) => i.hasAttribute('capture'))).toBe(true)
    const upload = inputs.find((i) => !i.hasAttribute('capture'))
    expect(upload).toBeTruthy()
    expect(upload.accept).toBe('image/*')
    expect(screen.getByText('Upload from files')).toBeInTheDocument()
  })

  it('sends an uploaded single photo straight to review', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/scan']}>
        <Routes>
          <Route path="/scan" element={<Capture />} />
          <Route path="/review" element={<div>Review screen</div>} />
        </Routes>
      </MemoryRouter>,
    )
    const upload = Array.from(container.querySelectorAll('input[type=file]')).find((i) => !i.hasAttribute('capture'))
    fireEvent.change(upload, { target: { files: [file('sent.jpg')] } })
    expect(await screen.findByText('Review screen')).toBeInTheDocument()
  })

  it('opens the file picker when + is pressed on the scan screen', () => {
    const { container } = renderScanWithTabBar()
    const upload = Array.from(container.querySelectorAll('input[type=file]')).find((i) => !i.hasAttribute('capture'))
    const click = vi.spyOn(upload, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Scan a card' }))
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('pick event opens the multi-photo picker in batch mode', () => {
    const { container } = renderCapture()
    fireEvent.click(screen.getByRole('button', { name: 'Batch' }))
    const multi = container.querySelector('input[type=file][multiple]')
    const click = vi.spyOn(multi, 'click').mockImplementation(() => {})
    window.dispatchEvent(new Event(PICK_EVENT))
    expect(click).toHaveBeenCalledTimes(1)
  })
})
