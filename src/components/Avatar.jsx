// A tiny business card with the contact's initials on it.
export default function Avatar({ contact }) {
  const initials = ((contact.firstName?.[0] || '') + (contact.lastName?.[0] || '')).toUpperCase()
    || (contact.company?.[0] || '?').toUpperCase()
  return <div className="chip-card" aria-hidden>{initials}</div>
}
