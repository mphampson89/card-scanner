import { checkPin, json, unauthorized } from './_db.js'
import { coerceFields } from '../../shared/fields.js'
import { computeConfidence } from '../../shared/confidence.js'

const MODEL = 'claude-sonnet-4-6'

const INSTRUCTION = "Extract the contact details from this business card. Return ONLY a valid JSON object with these exact keys: firstName, lastName, title, company, workPhone, mobilePhone, email, website, street, city, province, postalCode, country, notes. If a field is not present on the card, return an empty string for that key. Phone numbers should be in E.164 format where possible. Do not include any preamble, explanation, markdown, or code fences. Return the JSON object only."

export function parseExtraction(text) {
  let raw = text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(raw)
  const fields = coerceFields(parsed)
  return { fields, confidence: computeConfidence(fields) }
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
      max_tokens: 1000,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
        { type: 'text', text: INSTRUCTION },
      ] }],
    }),
  })
  const data = await res.json()
  if (!res.ok) return json({ error: data?.error?.message || `API error ${res.status}` }, 502)

  const block = (data.content || []).find((b) => b.type === 'text')
  if (!block) return json({ error: 'No text block in response' }, 502)
  try {
    return json(parseExtraction(block.text))
  } catch {
    return json({ error: 'Could not parse card', raw: block.text }, 422)
  }
}

export const config = { path: '/api/extract' }
