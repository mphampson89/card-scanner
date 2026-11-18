import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Warning } from '@phosphor-icons/react'
import { api } from '../lib/api.js'
import { CAMEL_KEYS, emptyContact } from '../../shared/fields.js'
import { contactsToVCardFile, vcardFilename } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'
import FieldForm from '../components/FieldForm.jsx'
import Segmented from '../components/Segmented.jsx'

const SHORT_KEYS = ['firstName', 'lastName', 'title', 'company', 'workPhone', 'mobilePhone', 'email']

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
  const [saveError, setSaveError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (shots.length === 0) { nav('/'); return }
    mapLimit(shots, 3, (shot) => api.extract(shot.b64, shot.type)).then(async (results) => {
      const initial = results.map((r) => ({
        fields: r.error ? emptyContact() : { ...emptyContact(), ...r.fields },
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
    setSaveError('')
    // Hand the just-scanned cards to the phone's Contacts import as one bundled .vcf.
    // Fire this inside the Save tap's user gesture (before the network writes) so the
    // browser treats it as user-initiated and doesn't block the download.
    const kept = cards.filter((c) => c.action !== 'skip').map((c) => c.fields)
    if (kept.length) {
      const filename = kept.length === 1 ? vcardFilename(kept[0]) : 'scanned-contacts.vcf'
      downloadVcf(filename, contactsToVCardFile(kept))
    }
    try {
      const toCreate = cards.filter((c) => c.action === 'save').map((c) => c.fields)
      const toUpdate = cards.filter((c) => c.action === 'update' && c.dupe)
      if (toCreate.length) await api.createContacts(toCreate)
      for (const c of toUpdate) await api.updateContact(c.dupe.id, c.fields)
      nav('/')
    } catch {
      setSaving(false)
      setSaveError('Couldn’t save to your card list. Your edits are still here. Try again.')
    }
  }

  const plural = shots.length > 1
  if (loading) return (
    <div className="screen enter" aria-busy="true">
      <header className="screen-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <h1 className="screen-title">Reading {plural ? `${shots.length} cards` : 'card'}…</h1>
        <p className="small muted">Picking out names, numbers and emails.</p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: plural ? '1fr 1fr' : '1fr', gap: 14 }}>
        {shots.map((s, i) => (
          <div key={i} className="reading">
            {s.dataUrl && <img src={s.dataUrl} alt={`Card ${i + 1} being read`} />}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22 }}>
        {[70, 88, 56].map((w, j) => (
          <div key={j} style={{ marginBottom: 16 }}>
            <div className="skel" style={{ width: 80, height: 10, marginBottom: 8 }} />
            <div className="skel" style={{ width: `${w}%`, height: 46, borderRadius: 'var(--r-ctl)' }} />
          </div>
        ))}
      </div>
    </div>
  )

  const single = cards.length === 1
  const keepCount = cards.filter((c) => c.action !== 'skip').length
  return (
    <div className="screen enter">
      <header className="screen-head">
        <h1 className="screen-title">{single ? 'Check the details' : `Check ${cards.length} cards`}</h1>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {cards.map((card, idx) => {
          const name = `${card.fields.firstName} ${card.fields.lastName}`.trim() || card.fields.company || 'No name found'
          const high = card.confidence === 'high'
          const photo = shots[idx]?.dataUrl
          return (
            <section key={idx} className="panel" style={{ padding: 16 }} aria-label={name}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16,
                opacity: card.action === 'skip' ? 0.55 : 1, transition: 'opacity .2s ease' }}>
                {photo && (
                  <img src={photo} alt={`Photo of card ${idx + 1}`} style={{ width: 92, aspectRatio: 1.75, objectFit: 'cover',
                    borderRadius: 'var(--r-chip)', border: '1px solid var(--line)', flex: 'none' }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 className="ellipsis" style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{name}</h2>
                  <span className={`badge ${high ? 'badge-ok' : 'badge-warn'}`}>
                    {high ? <CheckCircle size={14} weight="fill" aria-hidden /> : <Warning size={14} weight="fill" aria-hidden />}
                    {high ? 'Read clearly' : 'Double-check this one'}
                  </span>
                </div>
              </div>

              {card.error && (
                <p className="notice" role="alert" style={{ marginBottom: 14 }}>
                  This card couldn’t be read. Type the details in below.
                </p>
              )}

              {card.dupe && (
                <div className="notice" style={{ marginBottom: 16 }}>
                  <p style={{ marginBottom: 10 }}>
                    <strong>Already in your cards?</strong> {card.dupe.matchedOn === 'email' ? 'Same email' : 'Same name and company'} as someone you saved.
                  </p>
                  <Segmented ariaLabel={`What to do with ${name}`} value={card.action} onChange={(a) => setAction(idx, a)}
                    options={[{ value: 'skip', label: 'Skip' }, { value: 'update', label: 'Update' }, { value: 'save', label: 'Keep both' }]} />
                </div>
              )}

              {card.action !== 'skip' && (single ? (
                <FieldForm idPrefix={`c${idx}`} values={card.fields} onChange={(k, v) => update(idx, k, v)} />
              ) : (
                <>
                  <FieldForm idPrefix={`c${idx}`} values={card.fields} onChange={(k, v) => update(idx, k, v)} keys={SHORT_KEYS} />
                  <details style={{ marginTop: 16 }}>
                    <summary className="small" style={{ color: 'var(--accent)', fontWeight: 600, padding: '6px 0' }}>
                      Address, website and notes
                    </summary>
                    <div style={{ marginTop: 12 }}>
                      <FieldForm idPrefix={`c${idx}m`} values={card.fields} onChange={(k, v) => update(idx, k, v)}
                        keys={CAMEL_KEYS.filter((k) => !SHORT_KEYS.includes(k))} />
                    </div>
                  </details>
                </>
              ))}
            </section>
          )
        })}
      </div>

      <div style={{ position: 'sticky', bottom: 'calc(80px + env(safe-area-inset-bottom))', marginTop: 20, paddingTop: 12,
        background: 'linear-gradient(to bottom, transparent, var(--bg) 30%)' }}>
        {saveError && <p role="alert" className="error-text" style={{ marginBottom: 10 }}>{saveError}</p>}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : keepCount ? `Save ${keepCount} and add to phone` : 'Done'}
        </button>
      </div>
    </div>
  )
}
