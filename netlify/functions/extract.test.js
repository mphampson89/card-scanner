import { describe, it, expect } from 'vitest'
import { parseExtraction } from './extract.js'

describe('parseExtraction', () => {
  it('parses clean JSON and computes high confidence', () => {
    const text = JSON.stringify({ firstName: 'Maya', lastName: 'R', email: 'm@x.co' })
    const out = parseExtraction(text)
    expect(out.fields.firstName).toBe('Maya')
    expect(out.fields.lastName).toBe('R')
    expect(out.confidence).toBe('high')
  })
  it('strips code fences', () => {
    const text = '```json\n{"firstName":"Maya","lastName":"R","mobilePhone":"+1"}\n```'
    expect(parseExtraction(text).fields.firstName).toBe('Maya')
  })
  it('throws on non-JSON', () => {
    expect(() => parseExtraction('not json')).toThrow()
  })
  it('coerces missing keys and flags check confidence', () => {
    const out = parseExtraction(JSON.stringify({ company: 'Acme' }))
    expect(out.fields.firstName).toBe('')
    expect(out.confidence).toBe('check')
  })
})
