import { describe, it, expect } from 'vitest'
import { cleanCardImage } from '../netlify/functions/_db.js'

describe('cleanCardImage', () => {
  it('accepts an image data URL and empty string', () => {
    expect(cleanCardImage('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA')
    expect(cleanCardImage('')).toBe('')
  })
  it('rejects anything else', () => {
    expect(cleanCardImage(undefined)).toBeNull()
    expect(cleanCardImage('https://x.co/a.jpg')).toBeNull()
    expect(cleanCardImage('data:text/html;base64,AAAA')).toBeNull()
    expect(cleanCardImage('data:image/jpeg;base64,' + 'A'.repeat(1_000_001))).toBeNull()
  })
})
