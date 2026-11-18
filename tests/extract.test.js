import { describe, it, expect, vi } from 'vitest'
import handler, { parseExtraction } from '../netlify/functions/extract.js'

describe('parseExtraction', () => {
  it('parses clean JSON and computes high confidence', () => {
    const text = JSON.stringify({ firstName: 'Maya', lastName: 'R', email: 'm@x.co' })
    const out = parseExtraction(text)
    expect(out.fields.firstName).toBe('Maya')
    expect(out.fields.lastName).toBe('R')
    expect(out.confidence).toBe('high')
  })
  it('strips code fences', () => {
    const text = '```json\n{"firstName":"Maya","lastName":"R","mobilePhone":"+1"}\n```'
    expect(parseExtraction(text).fields.firstName).toBe('Maya')
  })
  it('returns the card box when the model gives one', () => {
    const out = parseExtraction(JSON.stringify({ firstName: 'T', cardBox: { x: 0.1, y: 0.45, width: 0.8, height: 0.45 } }))
    expect(out.cardBox).toEqual({ x: 0.1, y: 0.45, width: 0.8, height: 0.45 })
  })
  it('drops a missing, tiny or malformed card box', () => {
    expect(parseExtraction('{"firstName":"T"}').cardBox).toBeNull()
    expect(parseExtraction('{"cardBox":null}').cardBox).toBeNull()
    expect(parseExtraction('{"cardBox":{"x":0.5,"y":0.5,"width":0.01,"height":0.5}}').cardBox).toBeNull()
    expect(parseExtraction('{"cardBox":{"x":"a","y":0,"width":1,"height":1}}').cardBox).toBeNull()
  })
  it('clamps a card box that runs off the edge', () => {
    const out = parseExtraction('{"cardBox":{"x":0.2,"y":0.5,"width":0.9,"height":0.7}}')
    expect(out.cardBox.width).toBeCloseTo(0.8)
    expect(out.cardBox.height).toBeCloseTo(0.5)
  })
  it('throws on non-JSON', () => {
    expect(() => parseExtraction('not json')).toThrow()
  })
  it('coerces missing keys and flags check confidence', () => {
    const out = parseExtraction(JSON.stringify({ company: 'Acme' }))
    expect(out.fields.firstName).toBe('')
    expect(out.confidence).toBe('check')
  })
})

describe('extract handler request shape (Sonnet 5.5)', () => {
  const call = async (apiBody) => {
    process.env.APP_PIN = '1'
    process.env.ANTHROPIC_API_KEY = 'k'
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(apiBody), { status: 200 }))
    const req = new Request('http://x/api/extract', {
      method: 'POST', headers: { authorization: 'Bearer 1' }, body: JSON.stringify({ image: 'AAAA' }),
    })
    const res = await handler(req)
    const sent = JSON.parse(spy.mock.calls[0][1].body)
    spy.mockRestore()
    return { res, sent }
  }
  it('sends the 5.5 model, low effort, no sampling params', async () => {
    const { res, sent } = await call({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"firstName":"Maya"}' }] })
    expect(sent.model).toBe('claude-sonnet-5-5')
    expect(sent.output_config).toEqual({ effort: 'low' })
    expect(sent.max_tokens).toBeGreaterThanOrEqual(1024)
    for (const k of ['temperature', 'top_p', 'top_k', 'thinking']) expect(sent).not.toHaveProperty(k)
    expect(sent.messages.at(-1).role).toBe('user')
    expect((await res.json()).fields.firstName).toBe('Maya')
  })
  it('turns a refusal into the existing parse-failure response', async () => {
    const { res } = await call({ stop_reason: 'refusal', content: [] })
    expect(res.status).toBe(422)
  })
})
