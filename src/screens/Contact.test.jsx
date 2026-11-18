import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Contact, { formatAddress } from './Contact.jsx'
import { api } from '../lib/api.js'

vi.mock('../lib/api.js', () => ({ api: { getContact: vi.fn(), updateContact: vi.fn(async () => ({})) } }))
vi.mock('../lib/camera.js', () => ({ downloadVcf: vi.fn() }))

const base = { id: '1', firstName: 'Tara', lastName: 'Christie', title: '', company: '', workPhone: '',
  mobilePhone: '', email: '', website: '', street: '', city: '', province: '', postalCode: '', country: '', notes: '' }
const renderContact = () => render(
  <MemoryRouter initialEntries={['/contact/1']}>
    <Routes><Route path="/contact/:id" element={<Contact />} /></Routes>
  </MemoryRouter>,
)

beforeEach(() => { api.getContact.mockReset(); api.updateContact.mockClear() })

describe('Contact', () => {
  it('shows the card photo as the profile picture and enlarges it on tap', async () => {
    api.getContact.mockResolvedValue({ ...base, cardImage: 'data:image/jpeg;base64,card' })
    renderContact()
    const img = await screen.findByAltText('Business card')
    expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,card')
    fireEvent.click(screen.getByRole('button', { name: /view card photo/i }))
    expect(screen.getByRole('dialog', { name: 'Card photo' })).toBeInTheDocument()
  })

  it('falls back to initials when there is no card photo', async () => {
    api.getContact.mockResolvedValue({ ...base, cardImage: '' })
    renderContact()
    expect(await screen.findByText('TC')).toBeInTheDocument()
  })

  it('does not resend the photo when saving an edit', async () => {
    api.getContact.mockResolvedValue({ ...base, cardImage: 'data:image/jpeg;base64,card' })
    renderContact()
    await screen.findByAltText('Business card')
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await vi.waitFor(() => expect(api.updateContact).toHaveBeenCalled())
    expect(api.updateContact.mock.calls[0][1]).not.toHaveProperty('cardImage')
  })

  it('shows the address as one line that opens in maps', async () => {
    api.getContact.mockResolvedValue({ ...base, cardImage: '', street: 'Suite 510, 1100 Melville St.',
      city: 'Vancouver', province: 'BC', postalCode: 'V6E 4A6', country: 'Canada' })
    renderContact()
    const link = await screen.findByText('Suite 510, 1100 Melville St., Vancouver, BC V6E 4A6, Canada')
    expect(link.getAttribute('href')).toContain('google.com/maps/search')
  })

  it('hides the address row when there is no address', async () => {
    api.getContact.mockResolvedValue({ ...base, cardImage: '' })
    renderContact()
    await screen.findByText('TC')
    expect(screen.queryByText('Address')).not.toBeInTheDocument()
    expect(formatAddress({ city: 'Calgary', province: 'AB' })).toBe('Calgary, AB')
  })
})
