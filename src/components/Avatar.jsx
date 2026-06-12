export default function Avatar({ contact, size = 40 }) {
  const initials = ((contact.firstName?.[0] || '') + (contact.lastName?.[0] || '')).toUpperCase()
    || (contact.company?.[0] || '?').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.32, flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
      color: 'var(--accent)', fontWeight: 600, fontSize: size * 0.33 }}>
      {initials}
    </div>
  )
}
