import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api.js'
import { CAMEL_KEYS, emptyContact } from '../../shared/fields.js'

const LABELS = {
  firstName: 'First name', lastName: 'Last name', title: 'Title', company: 'Company',
  workPhone: 'Work phone', mobilePhone: 'Mobile phone', email: 'Email', website: 'Website',
  street: 'Street', city: 'City', province: 'Province', postalCode: 'Postal code',
  country: 'Country', notes: 'Notes',
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      try { out[idx] = await fn(items[idx], idx) } catch (e) { out[idx] = { error: e.message } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export default function Review() {
  const nav = useNavigate()
  const shots = useLocation().state?.shots || []
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (shots.length === 0) { nav('/'); return }
    mapLimit(shots, 3, (shot) => api.extract(shot.b64, shot.type)).then(async (results) => {
      const initial = results.map((r) => ({
        fields: r.error ? emptyContact() : r.fields,
        confidence: r.error ? 'check' : r.confidence,
        error: r.error || null,
        dupe: null,
        action: 'save',
      }))
      const matches = await api.matchDuplicates(initial.map((c) => c.fields)).catch(() => [])
      setCards(initial.map((c, i) => ({ ...c, dupe: matches[i]?.match || null,
        action: matches[i]?.match ? 'skip' : 'save' })))
      setLoading(false)
    })
  }, [])

  function update(idx, key, value) {
    setCards((cs) => cs.map((c, i) => i === idx ? { ...c, fields: { ...c.fields, [key]: value } } : c))
  }
  function setAction(idx, action) {
    setCards((cs) => cs.map((c, i) => i === idx ? { ...c, action } : c))
  }

  async function save() {
    setSaving(true)
    const toCreate = cards.filter((c) => c.action === 'save').map((c) => c.fields)
    const toUpdate = cards.filter((c) => c.action === 'update' && c.dupe)
    if (toCreate.length) await api.createContacts(toCreate)
    for (const c of toUpdate) await api.updateContact(c.dupe.id, c.fields)
    nav('/')
  }

  if (loading) return <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>Reading {shots.length > 1 ? 'cards' : 'card'}…</p>

  const single = cards.length === 1
  return (
    <div style={{ padding: '24px 18px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>{single ? 'Review details' : `Review ${cards.length} cards`}</h1>
      {cards.map((card, idx) => (
        <div key={idx} style={{ borderTop: idx ? '1px solid var(--line)' : 'none', paddingTop: idx ? 16 : 8, marginTop: idx ? 16 : 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 14 }}>{`${card.fields.firstName} ${card.fields.lastName}`.trim() || 'Untitled card'}</strong>
            <span style={{ fontSize: 11, fontWeight: 600,
              color: card.confidence === 'high' ? 'var(--ok)' : 'var(--warn)' }}>
              {card.confidence === 'high' ? 'High' : 'Check'}
            </span>
          </div>
          {card.dupe && (
            <div style={{ background: 'color-mix(in srgb, var(--warn) 14%, transparent)',
              borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 12 }}>
              Possible duplicate (matched on {card.dupe.matchedOn}).
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {['skip', 'save', 'update'].map((a) => (
                  <button key={a} onClick={() => setAction(idx, a)}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 12,
                      border: '1px solid var(--line)',
                      background: card.action === a ? 'var(--accent)' : 'transparent',
                      color: card.action === a ? 'var(--accent-ink)' : 'var(--text)' }}>
                    {a === 'skip' ? 'Skip' : a === 'save' ? 'Save new' : 'Update'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(single ? CAMEL_KEYS : ['firstName', 'lastName', 'company', 'email', 'workPhone']).map((key) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-2)' }}>{LABELS[key]}</label>
              <input className="input" value={card.fields[key]}
                onChange={(e) => update(idx, key, e.target.value)} />
            </div>
          ))}
        </div>
      ))}
      <button className="btn-primary" style={{ margin: '16px 0 24px' }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : `Save ${cards.filter((c) => c.action !== 'skip').length} ${single ? 'contact' : 'contacts'}`}
      </button>
    </div>
  )
}
