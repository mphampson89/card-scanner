function esc(s) {
  if (!s) return ''
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function contactToVCard(c) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  const fn = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.company || 'Unknown'
  lines.push('FN:' + esc(fn))
  lines.push('N:' + esc(c.lastName) + ';' + esc(c.firstName) + ';;;')
  if (c.company) lines.push('ORG:' + esc(c.company))
  if (c.title) lines.push('TITLE:' + esc(c.title))
  if (c.workPhone) lines.push('TEL;TYPE=WORK,VOICE:' + esc(c.workPhone))
  if (c.mobilePhone) lines.push('TEL;TYPE=CELL:' + esc(c.mobilePhone))
  if (c.email) lines.push('EMAIL:' + esc(c.email))
  if (c.website) lines.push('URL:' + esc(c.website))
  if (c.street || c.city || c.province || c.postalCode || c.country) {
    lines.push('ADR;TYPE=WORK:;;' + esc(c.street) + ';' + esc(c.city) + ';' + esc(c.province) + ';' + esc(c.postalCode) + ';' + esc(c.country))
  }
  if (c.notes) lines.push('NOTE:' + esc(c.notes))
  lines.push('END:VCARD')
  return lines.join('\r\n') + '\r\n'
}

export function contactsToVCardFile(contacts) {
  return contacts.map(contactToVCard).join('')
}

export function vcardFilename(c) {
  const first = (c.firstName || '').toLowerCase().replace(/\s+/g, '-')
  const last = (c.lastName || '').toLowerCase().replace(/\s+/g, '-')
  if (last && first) return `${last}-${first}.vcf`
  if (last) return `${last}.vcf`
  if (first) return `${first}.vcf`
  return 'contact.vcf'
}
