import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Review from './Review.jsx'
import { api } from '../lib/api.js'
import { downloadVcf } from '../lib/camera.js'

vi.mock('../lib/api.js', () => ({
  api: {
    extract: vi.fn(),
    matchDuplicates: vi.fn(),
    createContacts: vi.fn(),
  },
}))

vi.mock('../lib/camera.js', () => ({ downloadVcf: vi.fn() }))

function renderWithShots(shots) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/review', state: { shots } }]}>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/" element={<div>Library</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.extract.mockResolvedValue({ fields: { firstName: 'Maya', lastName: 'R', email: 'm@x.co' }, confidence: 'high' })
  api.matchDuplicates.mockResolvedValue([{ match: null }])
  api.createContacts.mockResolvedValue([{ id: '1' }])
  downloadVcf.mockClear()
})

describe('Review', () => {
  it('extracts each shot and shows the name', async () => {
    renderWithShots([{ b64: 'x', type: 'image/jpeg' }])
    expect(await screen.findByDisplayValue('Maya')).toBeInTheDocument()
    expect(api.extract).toHaveBeenCalledTimes(1)
  })
  it('saves on confirm', async () => {
    renderWithShots([{ b64: 'x', type: 'image/jpeg' }])
    await screen.findByDisplayValue('Maya')
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(api.createContacts).toHaveBeenCalled()
  })
  it('bundles the scanned cards into one .vcf for the phone on save', async () => {
    api.extract
      .mockResolvedValueOnce({ fields: { firstName: 'Maya', lastName: 'R', email: 'm@x.co' }, confidence: 'high' })
      .mockResolvedValueOnce({ fields: { firstName: 'Leo', lastName: 'T', email: 'l@x.co' }, confidence: 'high' })
    api.matchDuplicates.mockResolvedValue([{ match: null }, { match: null }])
    renderWithShots([{ b64: 'a', type: 'image/jpeg' }, { b64: 'b', type: 'image/jpeg' }])
    await screen.findByDisplayValue('Maya')
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(downloadVcf).toHaveBeenCalledTimes(1)
    const [filename, content] = downloadVcf.mock.calls[0]
    expect(filename).toBe('scanned-contacts.vcf')
    expect(content.match(/BEGIN:VCARD/g)).toHaveLength(2)
    expect(content).toContain('Maya')
    expect(content).toContain('Leo')
  })

  it('shows why a card failed and retries it', async () => {
    api.extract.mockRejectedValueOnce(new Error('Could not parse card'))
    renderWithShots([{ b64: 'x', type: 'image/jpeg' }])
    expect(await screen.findByText(/did not look like a business card/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByDisplayValue('Maya')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an error when saving fails', async () => {
    api.createContacts.mockRejectedValueOnce(new Error('Request failed (500)'))
    renderWithShots([{ b64: 'x', type: 'image/jpeg' }])
    fireEvent.click(await screen.findByRole('button', { name: /save 1/i }))
    expect(await screen.findByText(/Could not save to your contact list/)).toBeInTheDocument()
  })

  it('shows the card photo and opens it full screen', async () => {
    renderWithShots([{ b64: 'x', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,x' }])
    expect(await screen.findByAltText('Card 1 photo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view card 1 photo/i }))
    expect(screen.getByRole('dialog', { name: 'Card photo' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
