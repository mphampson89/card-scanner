import { sql, checkPin, json, unauthorized } from './_db.js'
import { rowToContact } from '../../shared/fields.js'
import { matchedOn } from '../../shared/dedup.js'

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const candidates = await req.json()
  const existingRows = await sql`
    SELECT id, first_name, last_name, title, company, work_phone, mobile_phone, email, website,
           street, city, province, postal_code, country, notes
    FROM contacts`
  const existing = existingRows.map(rowToContact)

  const results = candidates.map((cand) => {
    for (const ex of existing) {
      const on = matchedOn(cand, ex)
      if (on) return { match: { id: ex.id, matchedOn: on } }
    }
    return { match: null }
  })
  return json(results)
}

export const config = { path: '/api/contacts/match' }
