import { checkPin, json, unauthorized } from './_db.js'
import { coerceFields } from '../../shared/fields.js'
import { computeConfidence } from '../../shared/confidence.js'

const MODEL = 'claude-sonnet-5-5'

const INSTRUCTION = "Extract the contact details from this business card. Return ONLY a valid JSON object with these exact keys: firstName, lastName, title, company, workPhone, mobilePhone, email, website, street, city, province, postalCode, country, notes. If a field is not present on the card, return an empty string for that key. Phone numbers should be in E.164 format where possible. Do not include any preamble, explanation, markdown, or code fences. Also include a key cardBox: an object {x, y, width, height} giving where the business card sits in the image, as fractions of the image width and height from 0 to 1, measured from the top-left corner. If you cannot tell, set cardBox to null. Return the JSON object only."

// The model's estimate of where the card sits in the photo, as 0-1 fractions. Null if unusable.
export function coerceBox(b) {
  if (!b || typeof b !== 'object') return null
  const n = [b.x, b.y, b.width, b.height].map(Number)
  if (n.some((v) => !Number.isFinite(v))) return null
  let [x, y, w, h] = n
  x = Math.max(0, Math.min(1, x)); y = Math.max(0, Math.min(1, y))
  w = Math.min(w, 1 - x); h = Math.min(h, 1 - y)
  if (w < 0.1 || h < 0.1) return null
  return { x, y, width: w, height: h }
}

export function parseExtraction(text) {
  let raw = text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(raw)
  const fields = coerceFields(parsed)
  return { fields, confidence: computeConfidence(fields), cardBox: coerceBox(parsed.cardBox) }
}

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { image, mediaType } = await req.json()
  if (!image) return json({ error: 'No image' }, 400)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
        { type: 'text', text: INSTRUCTION },
      ] }],
    }),
  })
  const data = await res.json()
  if (!res.ok) return json({ error: data?.error?.message || `API error ${res.status}` }, 502)

  // Sonnet 5.5 can decline with HTTP 200 + stop_reason "refusal" (empty/partial content).
  if (data.stop_reason === 'refusal') return json({ error: 'Could not parse card', raw: '' }, 422)

  const block = (data.content || []).find((b) => b.type === 'text')
  if (!block) return json({ error: 'No text block in response' }, 502)
  try {
    return json(parseExtraction(block.text))
  } catch {
    return json({ error: 'Could not parse card', raw: block.text }, 422)
  }
}

export const config = { path: '/api/extract' }
