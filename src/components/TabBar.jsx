import { useNavigate, useLocation } from 'react-router-dom'
import { Cards, Camera, GearSix } from '@phosphor-icons/react'

const TABS = [
  { to: '/', label: 'Cards', Icon: Cards },
  { to: '/scan', label: 'Scan', Icon: Camera, primary: true },
  { to: '/settings', label: 'Settings', Icon: GearSix },
]

export default function TabBar() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  return (
    <nav aria-label="Main" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderTop: '1px solid var(--line)', zIndex: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', height: 68 }}>
        {TABS.map(({ to, label, Icon, primary }) => {
          const active = pathname === to || (to === '/' && pathname.startsWith('/contact'))
          if (primary) {
            return (
              <div key={to} style={{ display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={() => nav(to)} aria-label="Scan a card"
                  aria-current={active ? 'page' : undefined} className="btn btn-primary"
                  style={{ width: 'auto', minHeight: 46, padding: '0 22px', borderRadius: 999, gap: 7 }}>
                  <Icon size={20} weight="bold" aria-hidden /> {label}
                </button>
              </div>
            )
          }
          return (
            <button key={to} type="button" onClick={() => nav(to)} aria-current={active ? 'page' : undefined}
              style={{ background: 'none', border: 'none', height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 11.5,
                fontWeight: active ? 600 : 500, color: active ? 'var(--accent)' : 'var(--text-2)',
                transition: 'color .18s ease' }}>
              <Icon size={22} weight={active ? 'fill' : 'regular'} aria-hidden />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
