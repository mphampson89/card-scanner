import { sql, checkPin, json, unauthorized, ensureSchema, cleanCardImage } from './_db.js'
import { rowToContact, contactToRow } from '../../shared/fields.js'

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()
  await ensureSchema()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const q = (url.searchParams.get('query') || '').trim().toLowerCase()
    const rows = q
      ? await sql`
          SELECT id, first_name, last_name, title, company, work_phone, mobile_phone, email, website,
                 street, city, province, postal_code, country, notes, created_at, updated_at,
                 card_image <> '' AS has_card_image
          FROM contacts
          WHERE lower(first_name || ' ' || last_name || ' ' || company) LIKE ${'%' + q + '%'}
             OR lower(email) LIKE ${'%' + q + '%'}
          ORDER BY created_at DESC`
      : await sql`
          SELECT id, first_name, last_name, title, company, work_phone, mobile_phone, email, website,
                 street, city, province, postal_code, country, notes, created_at, updated_at,
                 card_image <> '' AS has_card_image
          FROM contacts ORDER BY created_at DESC`
    return json(rows.map((row) => ({ ...rowToContact(row), hasCardImage: !!row.has_card_image })))
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const list = Array.isArray(body) ? body : [body]
    const created = []
    for (const contact of list) {
      const r = contactToRow(contact)
      const img = cleanCardImage(contact.cardImage) || ''
      const [row] = await sql`
        INSERT INTO contacts (first_name, last_name, title, company, work_phone, mobile_phone, email, website, street, city, province, postal_code, country, notes, card_image)
        VALUES (${r.first_name}, ${r.last_name}, ${r.title}, ${r.company}, ${r.work_phone}, ${r.mobile_phone}, ${r.email}, ${r.website}, ${r.street}, ${r.city}, ${r.province}, ${r.postal_code}, ${r.country}, ${r.notes}, ${img})
        RETURNING id`
      created.push({ ...contact, id: row.id, cardImage: undefined, hasCardImage: !!img })
    }
    return json(created, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/contacts' }
