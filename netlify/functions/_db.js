import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL || 'postgresql://user:password@host.tld/dbname')

// Additive schema changes, applied once per function cold start. Safe to run repeatedly.
let schemaReady = null
export function ensureSchema() {
  schemaReady ||= sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS card_image text NOT NULL DEFAULT ''`
    .catch((e) => { schemaReady = null; throw e })
  return schemaReady
}

// Card photos must be a JPEG/PNG/WebP data URL under ~1 MB. Anything else is dropped.
export function cleanCardImage(v) {
  if (typeof v !== 'string') return null
  if (v === '') return ''
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return null
  if (v.length > 1_000_000) return null
  return v
}

export function checkPin(req) {
  const auth = req.headers.get('authorization') || ''
  const pin = auth.replace(/^Bearer\s+/i, '')
  return pin && pin === process.env.APP_PIN
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function unauthorized() {
  return json({ error: 'Unauthorized' }, 401)
}
