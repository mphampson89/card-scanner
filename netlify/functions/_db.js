import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL || 'postgresql://user:password@host.tld/dbname')

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
