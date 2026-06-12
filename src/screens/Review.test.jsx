import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Review from './Review.jsx'
import { api } from '../lib/api.js'

vi.mock('../lib/api.js', () => ({
  api: {
    extract: vi.fn(),
    matchDuplicates: vi.fn(),
    createContacts: vi.fn(),
  },
}))

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
})
