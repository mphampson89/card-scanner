import { describe, it, expect } from 'vitest'
import { validateUnlock, resolveTrustedParent, MY_APP_ID } from './bridgeUnlock.js'

const PARENT = 'https://bridge-mph.netlify.app'
const parentWindow = {}
const good = { type: 'bridge.unlock', v: 1, app: MY_APP_ID, reqId: 'r1', credential: '1234' }
const cfg = { parentOrigin: PARENT, parentWindow }

describe('scanner validateUnlock', () => {
  it('accepts a valid message', () => {
    expect(validateUnlock({ origin: PARENT, source: parentWindow, data: good }, cfg))
      .toEqual({ ok: true, credential: '1234', reqId: 'r1' })
  })
  it('rejects wrong source / origin / app / oversized', () => {
    expect(validateUnlock({ origin: PARENT, source: {}, data: good }, cfg).ok).toBe(false)
    expect(validateUnlock({ origin: 'https://evil.example', source: parentWindow, data: good }, cfg).ok).toBe(false)
    expect(validateUnlock({ origin: PARENT, source: parentWindow, data: { ...good, app: 'ledger' } }, cfg).ok).toBe(false)
    expect(validateUnlock({ origin: PARENT, source: parentWindow, data: { ...good, credential: 'x'.repeat(257) } }, cfg).ok).toBe(false)
  })
  it('resolveTrustedParent gates the allowlist', () => {
    expect(resolveTrustedParent(PARENT)).toBe(PARENT)
    expect(resolveTrustedParent('https://evil.example')).toBeNull()
  })
})
