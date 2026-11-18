import { sql, checkPin, json, unauthorized, ensureSchema, cleanCardImage } from './_db.js'
import { rowToContact, contactToRow } from '../../shared/fields.js'

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()
  await ensureSchema()
  const id = new URL(req.url).pathname.split('/').pop()

  if (req.method === 'GET') {
    const [row] = await sql`SELECT * FROM contacts WHERE id=${id}`
    if (!row) return json({ error: 'Not found' }, 404)
    return json({ ...rowToContact(row), cardImage: row.card_image || '' })
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    const r = contactToRow(body)
    // Only replace the stored card photo when a valid new one is sent.
    const img = cleanCardImage(body.cardImage)
    const [row] = await sql`
      UPDATE contacts SET
        first_name=${r.first_name}, last_name=${r.last_name}, title=${r.title}, company=${r.company},
        work_phone=${r.work_phone}, mobile_phone=${r.mobile_phone}, email=${r.email}, website=${r.website},
        street=${r.street}, city=${r.city}, province=${r.province}, postal_code=${r.postal_code},
        country=${r.country}, notes=${r.notes},
        card_image=COALESCE(${img}, card_image), updated_at=now()
      WHERE id=${id} RETURNING *`
    if (!row) return json({ error: 'Not found' }, 404)
    return json({ ...rowToContact(row), cardImage: row.card_image || '' })
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM contacts WHERE id=${id}`
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/contacts/:id' }
