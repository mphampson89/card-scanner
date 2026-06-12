import { describe, it, expect } from 'vitest'
import { computeConfidence } from './confidence.js'
import { emptyContact } from './fields.js'

const base = emptyContact()

describe('computeConfidence', () => {
  it('high when a name and one contact method exist', () => {
    expect(computeConfidence({ ...base, firstName: 'Maya', lastName: 'Rodriguez', email: 'm@x.co' })).toBe('high')
  })
  it('check when name is fully empty', () => {
    expect(computeConfidence({ ...base, company: 'Acme', email: 'm@x.co' })).toBe('check')
  })
  it('check when all contact methods are empty', () => {
    expect(computeConfidence({ ...base, firstName: 'Maya', lastName: 'Rodriguez' })).toBe('check')
  })
  it('high with only mobile phone', () => {
    expect(computeConfidence({ ...base, firstName: 'Maya', lastName: 'R', mobilePhone: '+1604' })).toBe('high')
  })
})
