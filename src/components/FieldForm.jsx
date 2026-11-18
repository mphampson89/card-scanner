import { FIELD_LABELS, FIELD_GROUPS, WIDE_FIELDS } from '../../shared/fields.js'

const INPUT_TYPE = { workPhone: 'tel', mobilePhone: 'tel', email: 'email', website: 'url' }

// Grouped, labelled edit form shared by Review and Contact. `keys` limits which fields show.
export default function FieldForm({ idPrefix, values, onChange, keys }) {
  const groups = FIELD_GROUPS
    .map((g) => ({ ...g, keys: keys ? g.keys.filter((k) => keys.includes(k)) : g.keys }))
    .filter((g) => g.keys.length)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map((g) => (
        <fieldset key={g.title} style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend className="label" style={{ padding: 0, marginBottom: 10, fontWeight: 600, color: 'var(--text)' }}>{g.title}</legend>
          <div className="field-grid">
            {g.keys.map((k) => {
              const id = `${idPrefix}-${k}`
              return (
                <div key={k} className={`field${WIDE_FIELDS.has(k) ? ' wide' : ''}`}>
                  <label htmlFor={id}>{FIELD_LABELS[k]}</label>
                  {k === 'notes'
                    ? <textarea id={id} className="input" value={values[k] || ''} onChange={(e) => onChange(k, e.target.value)} />
                    : <input id={id} className="input" type={INPUT_TYPE[k] || 'text'} value={values[k] || ''}
                        onChange={(e) => onChange(k, e.target.value)} />}
                </div>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
