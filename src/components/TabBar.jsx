import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Cards' },
  { to: '/scan', label: 'Scan', primary: true },
  { to: '/settings', label: 'Settings' },
]

export default function TabBar() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, height: 72, background: 'var(--surface)',
      borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center',
      justifyContent: 'space-around' }}>
      {TABS.map((t) => {
        const active = pathname === t.to
        if (t.primary) {
          return (
            <button key={t.to} onClick={() => nav(t.to)} aria-label="Scan"
              style={{ width: 54, height: 54, borderRadius: 18, marginTop: -18,
                background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none',
                fontSize: 24, fontWeight: 700 }}>+</button>
          )
        }
        return (
          <button key={t.to} onClick={() => nav(t.to)}
            style={{ background: 'none', border: 'none', fontSize: 12,
              color: active ? 'var(--accent)' : 'var(--text-3)' }}>{t.label}</button>
        )
      })}
    </nav>
  )
}
