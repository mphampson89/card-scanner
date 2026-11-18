import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api.js'
import { CAMEL_KEYS, emptyContact } from '../../shared/fields.js'
import { contactsToVCardFile, vcardFilename } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'

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

export function friendlyError(msg = '') {
  if (msg === 'Unauthorized') return 'your PIN session expired. Reopen the app and enter your PIN.'
  if (msg === 'Could not parse card') return 'the photo was unclear or did not look like a business card.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'no connection. Check your signal and try again.'
  return msg
}

export default function Review() {
  const nav = useNavigate()
  const shots = useLocation().state?.shots || []
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [retrying, setRetrying] = useState(null)
  const [viewing, setViewing] = useState(null)
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
    }).catch((e) => {
      setCards(shots.map(() => ({ fields: emptyContact(), confidence: 'check',
        error: e.message || 'Something went wrong', dupe: null, action: 'save' })))
      setLoading(false)
    })
  }, [])

  async function retry(idx) {
    setRetrying(idx)
    try {
      const r = await api.extract(shots[idx].b64, shots[idx].type)
      setCards((cs) => cs.map((c, i) => i === idx
        ? { ...c, fields: r.fields, confidence: r.confidence, error: null } : c))
    } catch (e) {
      setCards((cs) => cs.map((c, i) => i === idx ? { ...c, error: e.message } : c))
    }
    setRetrying(null)
  }

  function update(idx, key, value) {
    setCards((cs) => cs.map((c, i) => i === idx ? { ...c, fields: { ...c.fields, [key]: value } } : c))
  }
  function setAction(idx, action) {
    setCards((cs) => cs.map((c, i) => i === idx ? { ...c, action } : c))
  }

  async function save() {
    setSaving(true)
    setSaveError('')
    // Hand the just-scanned cards to the phone's Contacts import as one bundled .vcf.
    // Fire this inside the Save tap's user gesture (before the network writes) so the
    // browser treats it as user-initiated and doesn't block the download.
    const kept = cards.filter((c) => c.action !== 'skip').map((c) => c.fields)
    if (kept.length) {
      const filename = kept.length === 1 ? vcardFilename(kept[0]) : 'scanned-contacts.vcf'
      downloadVcf(filename, contactsToVCardFile(kept))
    }
    const toCreate = cards.filter((c) => c.action === 'save').map((c) => c.fields)
    const toUpdate = cards.filter((c) => c.action === 'update' && c.dupe)
    try {
      if (toCreate.length) await api.createContacts(toCreate)
      for (const c of toUpdate) await api.updateContact(c.dupe.id, c.fields)
    } catch (e) {
      setSaveError(`Could not save to your contact list: ${e.message}. The .vcf file was still downloaded.`)
      setSaving(false)
      return
    }
    nav('/')
  }

  if (loading) return (
    <div style={{ padding: '28px 18px 0' }} aria-busy="true" aria-label={`Reading ${shots.length > 1 ? 'cards' : 'card'}`}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>Reading {shots.length > 1 ? 'cards' : 'card'}…</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 20px' }}>Pulling names, numbers and emails off the photo.</p>
      {Array.from({ length: shots.length }).map((_, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div className="skel" style={{ width: 40, height: 40, borderRadius: 13 }} />
            <div className="skel" style={{ width: '52%', height: 15 }} />
          </div>
          {[88, 70, 80].map((w, j) => (
            <div key={j} className="skel" style={{ width: `${w}%`, height: 40, marginBottom: 10, borderRadius: 12 }} />
          ))}
        </div>
      ))}
    </div>
  )

  const single = cards.length === 1
  const keepCount = cards.filter((c) => c.action !== 'skip').length
  return (
    <div style={{ padding: '28px 18px 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>{single ? 'Review details' : `Review ${cards.length} cards`}</h1>
      {cards.map((card, idx) => (
        <div key={idx} style={{ borderTop: idx ? '1px solid var(--line)' : 'none', paddingTop: idx ? 16 : 8, marginTop: idx ? 16 : 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 15 }}>{`${card.fields.firstName} ${card.fields.lastName}`.trim() || 'Untitled card'}</strong>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
              color: card.confidence === 'high' ? 'var(--ok)' : 'var(--warn)',
              background: `color-mix(in srgb, ${card.confidence === 'high' ? 'var(--ok)' : 'var(--warn)'} 15%, transparent)` }}>
              {card.confidence === 'high' ? 'High confidence' : 'Please check'}
            </span>
          </div>
          {shots[idx]?.dataUrl && (
            <button onClick={() => setViewing(idx)} aria-label={`View card ${idx + 1} photo full screen`}
              style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'var(--bg, transparent)',
                marginBottom: 12, cursor: 'zoom-in',
                ...(single ? { position: 'sticky', top: 0, zIndex: 2, paddingTop: 6, paddingBottom: 6 } : {}) }}>
              <img src={shots[idx].dataUrl} alt={`Card ${idx + 1} photo`}
                style={{ width: '100%', maxHeight: single ? '26vh' : 160, objectFit: 'contain',
                  borderRadius: 12, display: 'block', background: 'var(--surface)' }} />
            </button>
          )}
          {card.error && (
            <div role="alert" style={{ background: 'color-mix(in srgb, var(--warn) 16%, transparent)',
              borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 12 }}>
              Could not read this card: {friendlyError(card.error)}
              <button onClick={() => retry(idx)} disabled={retrying === idx}
                style={{ display: 'block', marginTop: 8, padding: '6px 12px', borderRadius: 8, fontSize: 12,
                  border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)' }}>
                {retrying === idx ? 'Trying again…' : 'Try again'}
              </button>
              <div style={{ marginTop: 6, color: 'var(--text-2)' }}>Or type the details in below.</div>
            </div>
          )}
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
      {viewing !== null && (
        <div role="dialog" aria-label="Card photo" onClick={() => setViewing(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.92)',
            overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={shots[viewing].dataUrl} alt={`Card ${viewing + 1} photo, full size`}
            style={{ maxWidth: 'none', width: '100%', height: 'auto' }} />
          <button onClick={() => setViewing(null)} aria-label="Close photo"
            style={{ position: 'fixed', top: 14, right: 14, width: 36, height: 36, borderRadius: 999,
              border: 0, background: 'rgba(255,255,255,.18)', color: '#fff', fontSize: 20 }}>×</button>
        </div>
      )}
      {saveError && (
        <div role="alert" style={{ marginTop: 16, padding: 10, borderRadius: 10, fontSize: 12,
          background: 'color-mix(in srgb, var(--warn) 16%, transparent)' }}>{saveError}</div>
      )}
      <button className="btn-primary" style={{ margin: '16px 0 24px' }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : keepCount ? `Save ${keepCount} & add to phone` : 'Save'}
      </button>
    </div>
  )
}
