import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Library from './Library.jsx'
import { api } from '../lib/api.js'

vi.mock('../lib/api.js', () => ({
  api: { listContacts: vi.fn() },
}))

beforeEach(() => {
  api.listContacts.mockResolvedValue([
    { id: '1', firstName: 'Maya', lastName: 'Rodriguez', title: 'VP', company: 'Northbeam' },
  ])
})

describe('Library', () => {
  it('lists contacts on load', async () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(await screen.findByText('Maya Rodriguez')).toBeInTheDocument()
  })
  it('re-queries when searching', async () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    await screen.findByText('Maya Rodriguez')
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'north' } })
    await waitFor(() => expect(api.listContacts).toHaveBeenLastCalledWith('north'))
  })
})
