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
      width: '100%', maxWidth: 480, height: 72, paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center',
      justifyContent: 'space-around', zIndex: 10 }}>
      {TABS.map((t) => {
        const active = pathname === t.to
        if (t.primary) {
          return (
            <button key={t.to} onClick={() => nav(t.to)} aria-label="Scan a card"
              className="btn-primary"
              style={{ width: 56, height: 56, borderRadius: 20, padding: 0,
                fontSize: 26, fontWeight: 400, lineHeight: 1, boxShadow: 'var(--shadow-pop)' }}>+</button>
          )
        }
        return (
          <button key={t.to} onClick={() => nav(t.to)} aria-current={active ? 'page' : undefined}
            style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: active ? 600 : 500,
              padding: '8px 14px', borderRadius: 10, transition: 'color .18s ease, transform .1s ease',
              color: active ? 'var(--accent)' : 'var(--text-3)' }}
            onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(.92)')}
            onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}>{t.label}</button>
        )
      })}
    </nav>
  )
}
