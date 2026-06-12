import { describe, it, expect } from 'vitest'
import { normalizeEmail, matchedOn } from './dedup.js'

describe('dedup', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  Maya@NB.co ')).toBe('maya@nb.co')
    expect(normalizeEmail('')).toBe('')
  })
  it('matches on email when emails are equal (case/space-insensitive)', () => {
    const a = { email: 'maya@nb.co', firstName: 'Maya', lastName: 'R', company: 'X' }
    const b = { email: 'MAYA@nb.co ', firstName: 'Different', lastName: 'Z', company: 'Y' }
    expect(matchedOn(a, b)).toBe('email')
  })
  it('matches on name+company when both equal and no email', () => {
    const a = { email: '', firstName: 'Maya', lastName: 'Rodriguez', company: 'Northbeam' }
    const b = { email: '', firstName: ' maya ', lastName: 'RODRIGUEZ', company: 'northbeam' }
    expect(matchedOn(a, b)).toBe('name+company')
  })
  it('returns null when nothing matches', () => {
    const a = { email: 'a@x.co', firstName: 'Maya', lastName: 'R', company: 'X' }
    const b = { email: 'b@x.co', firstName: 'Tom', lastName: 'A', company: 'Y' }
    expect(matchedOn(a, b)).toBeNull()
  })
})
