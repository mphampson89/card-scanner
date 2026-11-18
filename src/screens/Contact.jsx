import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { CAMEL_KEYS } from '../../shared/fields.js'
import { contactToVCard, vcardFilename } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'
import Avatar from '../components/Avatar.jsx'
import PhotoViewer from '../components/PhotoViewer.jsx'

const LABELS = { workPhone: 'Work', mobilePhone: 'Mobile', email: 'Email', website: 'Website' }

export default function Contact() {
  const { id } = useParams()
  const nav = useNavigate()
  const [c, setC] = useState(null)
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [viewing, setViewing] = useState(false)

  useEffect(() => {
    api.getContact(id).then(setC).catch(() => setC(null))
  }, [id])

  if (!c) return <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</p>

  async function saveEdit() {
    const { cardImage, ...fields } = c // the stored photo is unchanged by edits; don't resend it
    await api.updateContact(id, fields); setEditing(false)
  }
  async function remove() { await api.deleteContact(id); nav('/') }

  return (
    <div style={{ padding: '24px 18px 0' }}>
      {viewing && <PhotoViewer src={c.cardImage} alt="Business card, full size" onClose={() => setViewing(false)} />}
      <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14 }}>‹ Cards</button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
        {c.cardImage ? (
          <button onClick={() => setViewing(true)} aria-label="View card photo full screen"
            style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}>
            <img src={c.cardImage} alt="Business card"
              style={{ height: 96, maxWidth: 220, objectFit: 'cover', borderRadius: 12, display: 'block',
                boxShadow: '0 2px 10px rgba(0,0,0,.18)' }} />
          </button>
        ) : <Avatar contact={c} size={72} />}
        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 12 }}>{`${c.firstName} ${c.lastName}`.trim()}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{[c.title, c.company].filter(Boolean).join(' · ')}</div>
      </div>

      <div style={{ display: 'flex', gap: 9, margin: '16px 0' }}>
        <a className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: 11 }} href={`tel:${c.workPhone || c.mobilePhone}`}>Call</a>
        <a className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: 11 }} href={`mailto:${c.email}`}>Email</a>
        <button className="btn-ghost" style={{ padding: 11 }}
          onClick={() => downloadVcf(vcardFilename(c), contactToVCard(c))}>vCard</button>
      </div>

      {editing ? (
        <>
          {CAMEL_KEYS.map((k) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-2)' }}>{k}</label>
              <input className="input" value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
            </div>
          ))}
          <button className="btn-primary" onClick={saveEdit}>Save changes</button>
        </>
      ) : (
        <>
          {['workPhone', 'mobilePhone', 'email', 'website'].filter((k) => c[k]).map((k) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{LABELS[k]}</span>
              <span className={k === 'email' || k === 'website' ? undefined : 'num'}
                style={{ fontSize: 14, textAlign: 'right', wordBreak: 'break-word' }}>{c[k]}</span>
            </div>
          ))}
          {confirmDel ? (
            <div className="card" style={{ padding: 14, marginTop: 18 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14 }}>Delete this contact? This can't be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setConfirmDel(false)}>Cancel</button>
                <button className="btn-primary" onClick={remove}
                  style={{ background: 'var(--warn)', color: 'var(--bg)', boxShadow: 'none' }}>Delete</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button className="btn-ghost" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn-ghost" onClick={() => setConfirmDel(true)}
                style={{ color: 'var(--warn)' }}>Delete</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
