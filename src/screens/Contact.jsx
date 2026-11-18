import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CaretLeft, Phone, EnvelopeSimple, DownloadSimple, ArrowsOut } from '@phosphor-icons/react'
import { api } from '../lib/api.js'
import { FIELD_LABELS } from '../../shared/fields.js'
import { contactToVCard, vcardFilename } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'
import FieldForm from '../components/FieldForm.jsx'
import PhotoViewer, { useHistoryOverlay } from '../components/PhotoViewer.jsx'

// One line for display: "Suite 510, 1100 Melville St., Vancouver, BC V6E 4A6, Canada"
export function formatAddress(c) {
  const region = [c.province, c.postalCode].filter(Boolean).join(' ')
  return [c.street, c.city, region, c.country].filter(Boolean).join(', ')
}

const DETAIL_KEYS = ['mobilePhone', 'workPhone', 'email', 'website']

function href(k, v) {
  if (k === 'workPhone' || k === 'mobilePhone') return `tel:${v.replace(/[^\d+]/g, '')}`
  if (k === 'email') return `mailto:${v}`
  if (k === 'website') return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

function initials(c) {
  return ((c.firstName?.[0] || '') + (c.lastName?.[0] || '')).toUpperCase() || (c.company?.[0] || '?').toUpperCase()
}

export default function Contact() {
  const { id } = useParams()
  const nav = useNavigate()
  const [c, setC] = useState(undefined) // undefined = loading, null = not found
  const [draft, setDraft] = useState(null) // non-null while editing
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [viewing, openViewer, closeViewer] = useHistoryOverlay()

  useEffect(() => {
    api.getContact(id).then(setC).catch(() => setC(null))
  }, [id])

  const back = (
    <button type="button" className="btn-link" onClick={() => nav('/')}>
      <CaretLeft size={18} aria-hidden /> Cards
    </button>
  )

  if (c === undefined) return (
    <div className="screen" aria-busy="true" aria-label="Loading contact">
      {back}
      <div className="skel" style={{ aspectRatio: 1.75, borderRadius: 'var(--r-panel)', marginTop: 12 }} />
    </div>
  )
  if (c === null) return (
    <div className="screen">
      {back}
      <p style={{ fontWeight: 600, marginTop: 24 }}>Couldn’t open this card.</p>
      <p className="small muted">It may have been deleted, or you may be offline.</p>
    </div>
  )

  async function saveEdit() {
    setBusy(true); setError('')
    const { cardImage, ...fields } = draft // the stored photo is unchanged by edits; don't resend it
    try { await api.updateContact(id, fields); setC({ ...fields, cardImage: c.cardImage }); setDraft(null) }
    catch { setError('Couldn’t save your changes. Try again.') }
    finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError('')
    try { await api.deleteContact(id); nav('/') }
    catch { setBusy(false); setError('Couldn’t delete this card. Try again.') }
  }

  if (draft) return (
    <div className="screen enter">
      <header className="screen-head">
        <h1 className="screen-title">Edit card</h1>
      </header>
      <FieldForm idPrefix="edit" values={draft} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
      {error && <p role="alert" className="error-text" style={{ marginTop: 16 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={() => { setDraft(null); setError('') }}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={saveEdit}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )

  const name = `${c.firstName} ${c.lastName}`.trim()
  const phone = c.mobilePhone || c.workPhone
  const address = formatAddress(c)
  return (
    <div className="screen enter">
      {viewing && <PhotoViewer src={c.cardImage} alt="Business card, full size" onClose={closeViewer} />}
      {back}

      {c.cardImage ? (
        <>
          <button type="button" onClick={() => openViewer(true)} aria-label="View card photo full screen"
            style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--line)', marginTop: 8,
              borderRadius: 'var(--r-panel)', overflow: 'hidden', background: 'var(--surface-2)',
              boxShadow: 'var(--shadow-md)', cursor: 'zoom-in', position: 'relative' }}>
            <img src={c.cardImage} alt="Business card" style={{ width: '100%', aspectRatio: 1.75, objectFit: 'cover', display: 'block' }} />
            <span aria-hidden style={{ position: 'absolute', right: 10, bottom: 10, width: 32, height: 32, borderRadius: 999,
              background: 'color-mix(in srgb, var(--text) 70%, transparent)', color: 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowsOut size={16} weight="bold" />
            </span>
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginTop: 16, overflowWrap: 'anywhere' }}>{name || c.company || 'No name'}</h1>
          {(c.title || c.company) && <p className="muted" style={{ marginTop: 2 }}>{[c.title, c.company].filter(Boolean).join(' · ')}</p>}
        </>
      ) : (
        // No photo saved: set the contact like a printed business card instead.
        <article className="panel" style={{ aspectRatio: 1.75, marginTop: 8, padding: '20px 22px 20px 26px', gap: 16,
          boxShadow: 'inset 5px 0 0 var(--accent), var(--shadow-md)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="small" style={{ fontWeight: 600, color: 'var(--accent)' }}>{c.company}</span>
            <span className="num" aria-hidden style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>{initials(c)}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, overflowWrap: 'anywhere' }}>{name || c.company || 'No name'}</h1>
            {c.title && <p className="muted" style={{ marginTop: 4 }}>{c.title}</p>}
            <div className="num small muted" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {phone && <span className="ellipsis">{phone}</span>}
              {c.email && <span className="ellipsis">{c.email}</span>}
            </div>
          </div>
        </article>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '16px 0 8px' }}>
        <a className="btn btn-primary btn-sm" href={phone ? href('mobilePhone', phone) : undefined}
          aria-disabled={!phone} onClick={(e) => { if (!phone) e.preventDefault() }}>
          <Phone size={18} weight="bold" aria-hidden /> Call
        </a>
        <a className="btn btn-ghost btn-sm" href={c.email ? `mailto:${c.email}` : undefined}
          aria-disabled={!c.email} onClick={(e) => { if (!c.email) e.preventDefault() }}>
          <EnvelopeSimple size={18} aria-hidden /> Email
        </a>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadVcf(vcardFilename(c), contactToVCard(c))}>
          <DownloadSimple size={18} aria-hidden /> To phone
        </button>
      </div>

      <dl style={{ margin: '8px 0 0' }}>
        {DETAIL_KEYS.filter((k) => c[k]).map((k) => (
          <div key={k} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <dt className="label">{FIELD_LABELS[k]}</dt>
            <dd style={{ margin: '2px 0 0' }}>
              <a href={href(k, c[k])} className={k.endsWith('Phone') ? 'num' : undefined}
                target={k === 'website' ? '_blank' : undefined} rel={k === 'website' ? 'noreferrer' : undefined}
                style={{ color: 'var(--text)', textDecoration: 'none', overflowWrap: 'anywhere' }}>{c[k]}</a>
            </dd>
          </div>
        ))}
        {address && (
          <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <dt className="label">Address</dt>
            <dd style={{ margin: '2px 0 0' }}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank" rel="noreferrer"
                style={{ color: 'var(--text)', textDecoration: 'none', overflowWrap: 'anywhere' }}>{address}</a>
            </dd>
          </div>
        )}
        {c.notes && (
          <div style={{ padding: '12px 0' }}>
            <dt className="label">Notes</dt>
            <dd style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{c.notes}</dd>
          </div>
        )}
      </dl>

      {error && <p role="alert" className="error-text" style={{ marginTop: 16 }}>{error}</p>}
      {confirmDel ? (
        <div className="panel" style={{ padding: 16, marginTop: 22 }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Delete {name || 'this card'}?</p>
          <p className="small muted" style={{ marginBottom: 14 }}>This can’t be undone. Anything already saved to your phone stays there.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(false)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 22 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setDraft({ ...c })}>Edit</button>
          <button type="button" className="btn btn-ghost" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(true)}>Delete</button>
        </div>
      )}
    </div>
  )
}
