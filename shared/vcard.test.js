import { describe, it, expect } from 'vitest'
import { contactToVCard, contactsToVCardFile, vcardFilename } from './vcard.js'
import { emptyContact } from './fields.js'

const maya = { ...emptyContact(), firstName: 'Maya', lastName: 'Rodriguez', company: 'Northbeam', email: 'm@nb.co', workPhone: '+16045550148' }

describe('vcard', () => {
  it('produces a valid single vCard', () => {
    const v = contactToVCard(maya)
    expect(v).toContain('BEGIN:VCARD')
    expect(v).toContain('VERSION:3.0')
    expect(v).toContain('FN:Maya Rodriguez')
    expect(v).toContain('N:Rodriguez;Maya;;;')
    expect(v).toContain('ORG:Northbeam')
    expect(v).toContain('EMAIL:m@nb.co')
    expect(v).toContain('TEL;TYPE=WORK,VOICE:+16045550148')
    expect(v.trim().endsWith('END:VCARD')).toBe(true)
  })

  it('escapes commas and semicolons', () => {
    const v = contactToVCard({ ...emptyContact(), company: 'A, B; C' })
    expect(v).toContain('ORG:A\\, B\\; C')
  })

  it('falls back to company then Unknown for FN', () => {
    expect(contactToVCard({ ...emptyContact(), company: 'Acme' })).toContain('FN:Acme')
    expect(contactToVCard(emptyContact())).toContain('FN:Unknown')
  })

  it('concatenates many into one file', () => {
    const file = contactsToVCardFile([maya, maya])
    expect(file.match(/BEGIN:VCARD/g)).toHaveLength(2)
  })

  it('builds a filename from the name', () => {
    expect(vcardFilename(maya)).toBe('rodriguez-maya.vcf')
    expect(vcardFilename(emptyContact())).toBe('contact.vcf')
  })
})
