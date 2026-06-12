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
      api.listContacts(query).then((rows) => { if (active) setContacts(rows) }).catch(() => {})
    }, query ? 250 : 0)
    return () => { active = false; clearTimeout(t) }
  }, [query])

  return (
    <div style={{ padding: '24px 18px 0' }}>
      <h1 style={{ fontSize: 23, fontWeight: 600, margin: 0 }}>Cards</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 12, margin: '2px 0 14px' }}>{contacts.length} contacts</p>
      <input className="input" placeholder="Search name, company…" value={query}
        onChange={(e) => setQuery(e.target.value)} />
      <div style={{ marginTop: 12 }}>
        {contacts.map((c) => (
          <button key={c.id} onClick={() => nav(`/contact/${c.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%',
              background: 'none', border: 'none', borderBottom: '1px solid var(--line)',
              padding: '11px 0', textAlign: 'left', color: 'var(--text)' }}>
            <Avatar contact={c} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{`${c.firstName} ${c.lastName}`.trim()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {[c.title, c.company].filter(Boolean).join(' · ')}
              </div>
            </div>
          </button>
        ))}
        {contacts.length === 0 && (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', marginTop: 48 }}>
            No contacts yet. Tap + to scan a card.
          </p>
        )}
      </div>
    </div>
  )
}
