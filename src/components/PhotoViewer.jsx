// Full-screen photo overlay. Tap anywhere or × to close. Optional toggle between two images.
export default function PhotoViewer({ src, alt, onClose, toggle }) {
  return (
    <div role="dialog" aria-label="Card photo" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.92)',
        overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={src} alt={alt} style={{ maxWidth: 'none', width: '100%', height: 'auto' }} />
      <button onClick={onClose} aria-label="Close photo"
        style={{ position: 'fixed', top: 14, right: 14, width: 36, height: 36, borderRadius: 999,
          border: 0, background: 'rgba(255,255,255,.18)', color: '#fff', fontSize: 20 }}>×</button>
      {toggle && (
        <button onClick={(e) => { e.stopPropagation(); toggle.onClick() }}
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 18px', borderRadius: 999, border: 0, fontSize: 14,
            background: 'rgba(255,255,255,.18)', color: '#fff' }}>
          {toggle.label}
        </button>
      )}
    </div>
  )
}
