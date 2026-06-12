import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { CAMEL_KEYS } from '../../shared/fields.js'
import { contactToVCard, vcardFilename } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'
import Avatar from '../components/Avatar.jsx'

const LABELS = { workPhone: 'Work', mobilePhone: 'Mobile', email: 'Email', website: 'Website' }

export default function Contact() {
  const { id } = useParams()
  const nav = useNavigate()
  const [c, setC] = useState(null)
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    api.listContacts().then((rows) => setC(rows.find((x) => x.id === id) || null))
  }, [id])

  if (!c) return <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</p>

  async function saveEdit() { await api.updateContact(id, c); setEditing(false) }
  async function remove() { await api.deleteContact(id); nav('/') }

  return (
    <div style={{ padding: '24px 18px 0' }}>
      <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14 }}>‹ Cards</button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
        <Avatar contact={c} size={72} />
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
                  style={{ background: 'var(--warn)', color: '#1a1306', boxShadow: 'none' }}>Delete</button>
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
