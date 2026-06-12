import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import Avatar from '../components/Avatar.jsx'

export default function Library() {
  const nav = useNavigate()
  const [contacts, setContacts] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    const t = setTimeout(() => {
      api.listContacts(query)
        .then((rows) => { if (active) setContacts(Array.isArray(rows) ? rows : []) })
        .catch(() => { if (active) setContacts([]) })
    }, query ? 250 : 0)
    return () => { active = false; clearTimeout(t) }
  }, [query])

  return (
    <div style={{ padding: '28px 18px 0' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, margin: 0 }}>Cards</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '4px 0 0' }}>
          <span className="num">{contacts.length}</span> {contacts.length === 1 ? 'contact' : 'contacts'}
        </p>
      </header>
      <input className="input" placeholder="Search name, company…" value={query}
        onChange={(e) => setQuery(e.target.value)} />
      <div style={{ marginTop: 14 }}>
        {contacts.map((c) => (
          <button key={c.id} className="row" onClick={() => nav(`/contact/${c.id}`)}>
            <Avatar contact={c} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${c.firstName} ${c.lastName}`.trim()}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {[c.title, c.company].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span aria-hidden style={{ color: 'var(--text-3)', fontSize: 18, flex: 'none' }}>›</span>
          </button>
        ))}
        {contacts.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 64, padding: '0 24px' }}>
            <div aria-hidden style={{ width: 76, height: 50, margin: '0 auto 18px', borderRadius: 12,
              border: '2px dashed color-mix(in srgb, var(--accent) 45%, var(--line))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 7%, transparent)' }}>+</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>
              {query ? 'No matches' : 'No cards yet'}
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {query ? 'Try a different name or company.' : 'Tap the + button to scan your first business card.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
