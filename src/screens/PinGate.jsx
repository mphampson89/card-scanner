import { useState } from 'react'
import { api, setPin } from '../lib/api.js'

export default function PinGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    setError('')
    const ok = await api.verifyPin(value)
    if (ok) { setPin(value); onUnlock() } else setError('Wrong PIN')
  }
  return (
    <form onSubmit={submit} style={{ padding: '22dvh 24px 0', display: 'flex',
      flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div aria-hidden style={{ width: 64, height: 44, borderRadius: 12, marginBottom: 6,
        background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-pop)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700,
        transform: 'rotate(-4deg)' }}>⌗</div>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Card Scanner</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 8px', textAlign: 'center' }}>
        Enter your PIN to unlock your contacts.
      </p>
      <input className="input num" type="password" inputMode="numeric" value={value}
        onChange={(e) => setValue(e.target.value)} placeholder="• • • •" autoFocus
        style={{ maxWidth: 240, textAlign: 'center', letterSpacing: '0.3em', fontSize: 18 }} />
      {error && <p role="alert" style={{ color: 'var(--warn)', fontSize: 13, margin: 0 }}>{error}</p>}
      <button className="btn-primary" style={{ maxWidth: 240 }}>Unlock</button>
    </form>
  )
}
