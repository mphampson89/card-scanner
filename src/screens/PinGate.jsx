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
    <form onSubmit={submit} style={{ padding: '120px 24px 0', display: 'flex',
      flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Card Scanner</h1>
      <input className="input" type="password" inputMode="numeric" value={value}
        onChange={(e) => setValue(e.target.value)} placeholder="Enter PIN" autoFocus
        style={{ maxWidth: 240, textAlign: 'center' }} />
      {error && <p style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</p>}
      <button className="btn-primary" style={{ maxWidth: 240 }}>Unlock</button>
    </form>
  )
}
