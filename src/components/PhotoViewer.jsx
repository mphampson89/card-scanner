import { useLocation, useNavigate } from 'react-router-dom'
import { X } from '@phosphor-icons/react'

// Full-screen photo overlay. Tap anywhere or the close button to close. Optional toggle between two images.
export default function PhotoViewer({ src, alt, onClose, toggle }) {
  return (
    <div role="dialog" aria-label="Card photo" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(8,10,14,.94)',
        overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={src} alt={alt} style={{ maxWidth: 'none', width: '100%', height: 'auto' }} />
      {/* stopPropagation: otherwise the backdrop's onClose fires too and Back runs twice, leaving the screen. */}
      <button type="button" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Close photo"
        style={{ position: 'fixed', top: 14, right: 14, width: 40, height: 40, borderRadius: 999,
          border: 0, background: 'rgba(255,255,255,.16)', color: '#f4f5f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={20} weight="bold" aria-hidden />
      </button>
      {toggle && (
        <button type="button" onClick={(e) => { e.stopPropagation(); toggle.onClick() }}
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            minHeight: 44, padding: '0 20px', borderRadius: 999, border: 0, fontSize: 14, fontWeight: 600,
            background: 'rgba(255,255,255,.16)', color: '#f4f5f7' }}>
          {toggle.label}
        </button>
      )}
    </div>
  )
}

// Keeps an open overlay in browser history, so the phone's Back button closes it
// instead of leaving the screen. Returns [value, open(value), close()].
export function useHistoryOverlay() {
  const loc = useLocation()
  const nav = useNavigate()
  const value = loc.state?.overlay ?? null
  const open = (v) => nav(loc.pathname + loc.search, { state: { ...(loc.state || {}), overlay: v } })
  const close = () => nav(-1)
  return [value, open, close]
}
