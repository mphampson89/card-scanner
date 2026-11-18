import { useState } from 'react'
import { IdentificationCard } from '@phosphor-icons/react'
import { api, setPin } from '../lib/api.js'

export default function PinGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  async function submit(e) {
    e.preventDefault()
    if (!value) return
    setError('')
    setChecking(true)
    const ok = await api.verifyPin(value).catch(() => null)
    setChecking(false)
    if (ok) { setPin(value); onUnlock() }
    else setError(ok === null ? 'Couldn’t reach the server. Check your connection.' : 'That PIN didn’t work. Try again.')
  }
  return (
    <form onSubmit={submit} className="enter" style={{ padding: '18dvh 28px 0', display: 'flex',
      flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div aria-hidden style={{ width: 72, height: 46, borderRadius: 'var(--r-chip)', marginBottom: 22,
        background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-5deg)' }}>
        <IdentificationCard size={28} weight="bold" />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>Card Scanner</h1>
      <p className="muted" style={{ marginBottom: 26 }}>Enter your PIN to open your cards.</p>
      <div className="field" style={{ width: '100%', maxWidth: 260, textAlign: 'left' }}>
        <label htmlFor="pin">PIN</label>
        <input id="pin" className="input num" type="password" inputMode="numeric" autoComplete="current-password"
          value={value} onChange={(e) => setValue(e.target.value)} autoFocus
          aria-invalid={!!error} aria-describedby={error ? 'pin-error' : undefined}
          style={{ textAlign: 'center', letterSpacing: '0.35em', fontSize: 20 }} />
        {error && <p id="pin-error" role="alert" className="error-text">{error}</p>}
      </div>
      <button className="btn btn-primary" disabled={checking} style={{ maxWidth: 260, marginTop: 16 }}>
        {checking ? 'Checking…' : 'Unlock'}
      </button>
    </form>
  )
}
