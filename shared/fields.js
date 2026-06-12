export const CAMEL_KEYS = [
  'firstName', 'lastName', 'title', 'company',
  'workPhone', 'mobilePhone', 'email', 'website',
  'street', 'city', 'province', 'postalCode', 'country', 'notes',
]

const CAMEL_TO_SNAKE = {
  firstName: 'first_name', lastName: 'last_name', title: 'title', company: 'company',
  workPhone: 'work_phone', mobilePhone: 'mobile_phone', email: 'email', website: 'website',
  street: 'street', city: 'city', province: 'province', postalCode: 'postal_code',
  country: 'country', notes: 'notes',
}
const SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k]),
)

export function emptyContact() {
  return Object.fromEntries(CAMEL_KEYS.map((k) => [k, '']))
}

export function coerceFields(obj) {
  const out = emptyContact()
  for (const k of CAMEL_KEYS) {
    if (obj && typeof obj[k] === 'string') out[k] = obj[k]
  }
  return out
}

export function rowToContact(row) {
  const c = { id: row.id }
  for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL)) {
    c[camel] = row[snake] ?? ''
  }
  return c
}

export function contactToRow(contact) {
  const row = {}
  for (const k of CAMEL_KEYS) {
    row[CAMEL_TO_SNAKE[k]] = contact[k] ?? ''
  }
  return row
}
