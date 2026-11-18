import { describe, it, expect } from 'vitest'
import { config as matchConfig } from '../netlify/functions/match.js'
import { config as contactConfig } from '../netlify/functions/contact.js'

describe('function routes', () => {
  it('duplicate check does not share a path pattern with /api/contacts/:id', () => {
    expect(matchConfig.path).toBe('/api/match')
    expect(matchConfig.path.startsWith('/api/contacts/')).toBe(false)
    expect(contactConfig.path).toBe('/api/contacts/:id')
  })
})
