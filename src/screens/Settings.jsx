import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearPin } from '../lib/api.js'
import { contactsToVCardFile } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'
import { getTheme, setTheme } from '../lib/theme.js'
import Segmented from '../components/Segmented.jsx'
import { updateApp, BUILD_TIME } from '../lib/update.js'

const pad = (n) => String(n).padStart(2, '0')
const formatBuilt = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

export default function Settings() {
  const nav = useNavigate()
  const [msg, setMsg] = useState('')
  const [theme, setThemeState] = useState(getTheme())
  const [updating, setUpdating] = useState(false)
  function changeTheme(t) { setTheme(t); setThemeState(t) }
  async function update() {
    setUpdating(true)
    try { await updateApp() } catch { setUpdating(false); setMsg('Update failed. Close the app fully and reopen it.') }
  }
  const built = BUILD_TIME ? formatBuilt(new Date(BUILD_TIME)) : ''
  async function exportAll() {
    setMsg('')
    const rows = await api.listContacts()
    if (!rows.length) { setMsg('No contacts to export yet.'); return }
    downloadVcf('card-scanner-contacts.vcf', contactsToVCardFile(rows))
    setMsg(`Exported ${rows.length} ${rows.length === 1 ? 'contact' : 'contacts'} to a .vcf file.`)
  }
  return (
    <div style={{ padding: '28px 18px 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>Settings</h1>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Appearance</span>
        <Segmented ariaLabel="Appearance" value={theme} onChange={changeTheme}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
      </div>
      <button className="btn-primary" style={{ marginTop: 18 }} onClick={exportAll}>Export all contacts (.vcf)</button>
      {msg && <p role="status" style={{ color: 'var(--text-2)', fontSize: 13, margin: '12px 2px 0' }}>{msg}</p>}
      <button className="btn-ghost" style={{ marginTop: 12 }}
        onClick={() => { clearPin(); nav('/'); location.reload() }}>
        Lock app
      </button>
      <button className="btn-ghost" style={{ marginTop: 12 }} disabled={updating} onClick={update}>
        {updating ? 'Updating…' : 'Update app'}
      </button>
      {built && <p style={{ color: 'var(--text-2)', fontSize: 12, margin: '10px 2px 0', textAlign: 'center' }}>
        Version built {built}
      </p>}
    </div>
  )
}
