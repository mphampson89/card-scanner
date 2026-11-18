import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Warning, ArrowsOut } from '@phosphor-icons/react'
import { api } from '../lib/api.js'
import { CAMEL_KEYS, emptyContact } from '../../shared/fields.js'
import { contactsToVCardFile, vcardFilename } from '../../shared/vcard.js'
import { downloadVcf, cropToBox, cardImageFor } from '../lib/camera.js'
import PhotoViewer, { useHistoryOverlay } from '../components/PhotoViewer.jsx'
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
  const [viewing, openViewer, closeViewer] = useHistoryOverlay()
  const [matchError, setMatchError] = useState('')
  const [wholePhoto, setWholePhoto] = useState(false)
  const [crops, setCrops] = useState({})

  // Crop each photo to the card once the AI says where the card is.
  useEffect(() => {
    cards.forEach((c, i) => {
      const key = c.cardBox && JSON.stringify(c.cardBox)
      if (!key || crops[i]?.key === key || !shots[i]?.dataUrl) return
      cropToBox(shots[i].dataUrl, c.cardBox)
        .then((url) => setCrops((cs) => ({ ...cs, [i]: { key, url } })))
        .catch(() => {})
    })
  }, [cards])
  const photo = (i) => crops[i]?.url || shots[i]?.dataUrl
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (shots.length === 0) { nav('/'); return }
    mapLimit(shots, 3, (shot) => api.extract(shot.b64, shot.type)).then(async (results) => {
      const initial = results.map((r) => ({
        fields: r.error ? emptyContact() : { ...emptyContact(), ...r.fields },
        confidence: r.error ? 'check' : r.confidence,
        cardBox: r.error ? null : r.cardBox || null,
        error: r.error || null,
        dupe: null,
        action: 'save',
      }))
      const matches = await api.matchDuplicates(initial.map((c) => c.fields)).catch((e) => {
        setMatchError(`Could not check for duplicates (${e.message}). Check your card list before saving.`)
        return []
      })
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
        ? { ...c, fields: { ...emptyContact(), ...r.fields }, confidence: r.confidence, cardBox: r.cardBox || null, error: null } : c))
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
    // Attach a small cropped copy of each card photo so the contact screen can show it.
    const images = await Promise.all(cards.map((c, i) => shots[i]?.dataUrl
      ? cardImageFor(shots[i].dataUrl, c.cardBox).catch(() => '') : ''))
    const withImage = (c) => ({ ...c.fields, cardImage: images[cards.indexOf(c)] || undefined })
    const toCreate = cards.filter((c) => c.action === 'save').map(withImage)
    const toUpdate = cards.filter((c) => c.action === 'update' && c.dupe)
    try {
      if (toCreate.length) await api.createContacts(toCreate)
      for (const c of toUpdate) await api.updateContact(c.dupe.id, withImage(c))
    } catch (e) {
      setSaveError(`Could not save to your contact list: ${friendlyError(e.message)} The contacts file was still downloaded, and your edits are still here.`)
      setSaving(false)
      return
    }
    nav('/')
  }

  const plural = shots.length > 1
  if (loading) return (
    <div className="screen enter" aria-busy="true" aria-label={`Reading ${plural ? 'cards' : 'card'}`}>
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

      {matchError && <p role="alert" className="notice" style={{ marginBottom: 16 }}>{matchError}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {cards.map((card, idx) => {
          const name = `${card.fields.firstName} ${card.fields.lastName}`.trim() || card.fields.company || 'No name found'
          const high = card.confidence === 'high'
          return (
            <section key={idx} className="panel" style={{ padding: 16 }} aria-label={name}>
              {shots[idx]?.dataUrl && (
                // In single mode the photo stays pinned while you type, so you can compare.
                <div style={single ? { position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)',
                  margin: '-16px -16px 14px', padding: '16px 16px 10px', borderRadius: 'var(--r-panel) var(--r-panel) 0 0' }
                  : { marginBottom: 14 }}>
                  <button type="button" onClick={() => { setWholePhoto(false); openViewer(idx) }}
                    aria-label={`View card ${idx + 1} photo full screen`}
                    style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'var(--surface-2)',
                      borderRadius: 'var(--r-ctl)', overflow: 'hidden', cursor: 'zoom-in', position: 'relative' }}>
                    <img src={photo(idx)} alt={`Card ${idx + 1} photo`}
                      style={{ width: '100%', aspectRatio: 1.75, maxHeight: single ? '26vh' : 180, objectFit: 'contain', display: 'block' }} />
                    <span aria-hidden style={{ position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 999,
                      background: 'color-mix(in srgb, var(--text) 70%, transparent)', color: 'var(--bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowsOut size={15} weight="bold" />
                    </span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16,
                opacity: card.action === 'skip' ? 0.55 : 1, transition: 'opacity .2s ease' }}>
                <h2 className="ellipsis" style={{ fontSize: 17, fontWeight: 600, minWidth: 0 }}>{name}</h2>
                <span className={`badge ${high ? 'badge-ok' : 'badge-warn'}`}>
                  {high ? <CheckCircle size={14} weight="fill" aria-hidden /> : <Warning size={14} weight="fill" aria-hidden />}
                  {high ? 'Read clearly' : 'Double-check'}
                </span>
              </div>

              {card.error && (
                <div role="alert" className="notice" style={{ marginBottom: 16 }}>
                  <p>{`Could not read this card: ${friendlyError(card.error)}`}</p>
                  <p className="small muted" style={{ margin: '4px 0 10px' }}>Try again, or type the details in below.</p>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'auto' }}
                    onClick={() => retry(idx)} disabled={retrying === idx}>
                    {retrying === idx ? 'Trying again…' : 'Try again'}
                  </button>
                </div>
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

      {viewing !== null && (
        <PhotoViewer src={wholePhoto ? shots[viewing].dataUrl : photo(viewing)}
          alt={`Card ${viewing + 1} photo, full size`} onClose={closeViewer}
          toggle={crops[viewing] ? { label: wholePhoto ? 'Show card only' : 'Show whole photo',
            onClick: () => setWholePhoto((w) => !w) } : null} />
      )}

      <div style={{ position: 'sticky', bottom: 'calc(80px + env(safe-area-inset-bottom))', zIndex: 3, marginTop: 20, paddingTop: 12,
        background: 'linear-gradient(to bottom, transparent, var(--bg) 30%)' }}>
        {saveError && <p role="alert" className="error-text" style={{ marginBottom: 10 }}>{saveError}</p>}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : keepCount ? `Save ${keepCount} and add to phone` : 'Done'}
        </button>
      </div>
    </div>
  )
}
