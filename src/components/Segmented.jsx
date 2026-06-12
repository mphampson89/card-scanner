export default function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'inline-flex', gap: 3, padding: 3,
      background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--line)' }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={active}
            style={{ border: 'none', borderRadius: 9, padding: '6px 14px', fontSize: 13,
              fontWeight: active ? 600 : 500,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-ink)' : 'var(--text-2)',
              transition: 'background .18s ease, color .18s ease' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
