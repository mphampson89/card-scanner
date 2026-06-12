import { describe, it, expect } from 'vitest'
import { CAMEL_KEYS, emptyContact, coerceFields, rowToContact, contactToRow } from './fields.js'

describe('fields', () => {
  it('has 14 camelCase keys', () => {
    expect(CAMEL_KEYS).toHaveLength(14)
    expect(CAMEL_KEYS).toContain('firstName')
    expect(CAMEL_KEYS).toContain('postalCode')
  })

  it('emptyContact is all empty strings', () => {
    const c = emptyContact()
    expect(Object.keys(c)).toHaveLength(14)
    expect(c.firstName).toBe('')
  })

  it('coerceFields fills missing keys with "" and drops unknown keys', () => {
    const out = coerceFields({ firstName: 'Maya', bogus: 'x' })
    expect(out.firstName).toBe('Maya')
    expect(out.lastName).toBe('')
    expect('bogus' in out).toBe(false)
  })

  it('rowToContact maps snake_case row to camelCase + id', () => {
    const c = rowToContact({ id: 'u1', first_name: 'Maya', postal_code: 'V6B' })
    expect(c.id).toBe('u1')
    expect(c.firstName).toBe('Maya')
    expect(c.postalCode).toBe('V6B')
  })

  it('contactToRow maps camelCase to snake_case (no id)', () => {
    const row = contactToRow({ firstName: 'Maya', postalCode: 'V6B' })
    expect(row.first_name).toBe('Maya')
    expect(row.postal_code).toBe('V6B')
    expect('id' in row).toBe(false)
  })
})
