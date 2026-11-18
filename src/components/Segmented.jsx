export default function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'inline-flex', gap: 2, padding: 3, flex: 'none',
      background: 'var(--surface-2)', borderRadius: 999 }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={active}
            style={{ border: 'none', borderRadius: 999, padding: '0 14px', minHeight: 34, fontSize: 13.5,
              fontWeight: active ? 600 : 500,
              background: active ? 'var(--seg-on)' : 'transparent',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              color: active ? 'var(--text)' : 'var(--text-2)',
              transition: 'background-color .18s ease, color .18s ease' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
