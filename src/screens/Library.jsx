import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, CaretRight, IdentificationCard, Camera } from '@phosphor-icons/react'
import { api } from '../lib/api.js'
import Avatar from '../components/Avatar.jsx'

export default function Library() {
  const nav = useNavigate()
  const [contacts, setContacts] = useState(null) // null = still loading
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const t = setTimeout(() => {
      api.listContacts(query)
        .then((rows) => { if (active) { setContacts(Array.isArray(rows) ? rows : []); setError(false) } })
        .catch(() => { if (active) { setContacts([]); setError(true) } })
    }, query ? 250 : 0)
    return () => { active = false; clearTimeout(t) }
  }, [query, attempt])

  const count = contacts?.length ?? 0
  return (
    <div className="screen enter">
      <header className="screen-head">
        <h1 className="screen-title">Cards</h1>
        {contacts && !error && (
          <span className="small muted"><span className="num">{count}</span> {count === 1 ? 'contact' : 'contacts'}</span>
        )}
      </header>

      <div style={{ position: 'relative' }}>
        <label htmlFor="search" className="sr-only">Search cards</label>
        <MagnifyingGlass size={18} aria-hidden style={{ position: 'absolute', left: 13, top: 14, color: 'var(--text-3)' }} />
        <input id="search" type="search" className="input" placeholder="Search name, company…" value={query}
          onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40 }} />
      </div>

      <div style={{ marginTop: 12 }}>
        {contacts === null && (
          <div aria-busy="true" aria-label="Loading cards">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 6px' }}>
                <div className="skel" style={{ width: 46, height: 30 }} />
                <div style={{ flex: 1 }}>
                  <div className="skel" style={{ width: `${58 - i * 7}%`, height: 14, marginBottom: 8 }} />
                  <div className="skel" style={{ width: `${40 - i * 4}%`, height: 11 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="panel" role="alert" style={{ padding: 18, marginTop: 8 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Couldn’t load your cards</p>
            <p className="small muted" style={{ marginBottom: 14 }}>Check your connection and try again.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setContacts(null); setAttempt((a) => a + 1) }}>
              Try again
            </button>
          </div>
        )}

        {contacts && contacts.length > 0 && (
          <ul className="list">
            {contacts.map((c) => {
              const name = `${c.firstName} ${c.lastName}`.trim() || c.company || 'No name'
              const sub = [c.title, c.company].filter(Boolean).join(' · ')
              return (
                <li key={c.id}>
                  <button type="button" className="row" onClick={() => nav(`/contact/${c.id}`)}>
                    <Avatar contact={c} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ellipsis" style={{ fontSize: 15.5, fontWeight: 600 }}>{name}</div>
                      {sub && <div className="ellipsis small muted">{sub}</div>}
                    </div>
                    <CaretRight size={16} aria-hidden style={{ color: 'var(--text-3)', flex: 'none' }} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {contacts && contacts.length === 0 && !error && (
          query ? (
            <div style={{ padding: '48px 12px', textAlign: 'center' }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No matches for “{query}”</p>
              <p className="small muted">Try a first name, last name or company.</p>
            </div>
          ) : (
            <div style={{ padding: '44px 8px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div aria-hidden style={{ width: 64, height: 40, borderRadius: 'var(--r-chip)', marginBottom: 18,
                background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IdentificationCard size={26} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>No cards yet</h2>
              <p className="muted" style={{ marginBottom: 20, maxWidth: '32ch' }}>
                Take a photo of a business card and it becomes a contact you can save to your phone.
              </p>
              <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => nav('/scan')}>
                <Camera size={19} weight="bold" aria-hidden /> Scan your first card
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
