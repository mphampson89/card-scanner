const PIN_KEY = 'cs_pin'

export function getPin() { return sessionStorage.getItem(PIN_KEY) || '' }
export function setPin(p) { sessionStorage.setItem(PIN_KEY, p) }
export function clearPin() { sessionStorage.removeItem(PIN_KEY) }

async function call(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${getPin()}`, ...(opts.headers || {}) },
  })
  if (res.status === 401) { clearPin(); throw new Error('Unauthorized') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  verifyPin: (pin) => fetch('/api/contacts', { headers: { authorization: `Bearer ${pin}` } }).then((r) => r.ok),
  extract: (image, mediaType) => call('/api/extract', { method: 'POST', body: JSON.stringify({ image, mediaType }) }),
  listContacts: (query = '') => call(`/api/contacts${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  createContacts: (contactsOrOne) => call('/api/contacts', { method: 'POST', body: JSON.stringify(contactsOrOne) }),
  updateContact: (id, contact) => call(`/api/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(contact) }),
  deleteContact: (id) => call(`/api/contacts/${id}`, { method: 'DELETE' }),
  matchDuplicates: (candidates) => call('/api/contacts/match', { method: 'POST', body: JSON.stringify(candidates) }),
}
