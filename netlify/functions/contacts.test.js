import { describe, it, expect, beforeAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { rowToContact, contactToRow } from '../../shared/fields.js'

const dbUrl = process.env.DATABASE_URL_TEST
const run = dbUrl ? describe : describe.skip
const sql = dbUrl ? neon(dbUrl) : null

run('contacts table contract', () => {
  beforeAll(async () => { await sql`DELETE FROM contacts` })

  it('insert via contactToRow then read back via rowToContact round-trips', async () => {
    const row = contactToRow({ firstName: 'Maya', lastName: 'Rodriguez', company: 'Northbeam', email: 'm@nb.co' })
    const [inserted] = await sql`
      INSERT INTO contacts (first_name, last_name, company, email)
      VALUES (${row.first_name}, ${row.last_name}, ${row.company}, ${row.email})
      RETURNING *`
    const c = rowToContact(inserted)
    expect(c.firstName).toBe('Maya')
    expect(c.email).toBe('m@nb.co')
    expect(c.id).toBeTruthy()

    const found = await sql`SELECT * FROM contacts WHERE lower(email) = ${'m@nb.co'}`
    expect(found).toHaveLength(1)
  })
})
