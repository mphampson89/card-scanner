import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Export, ArrowsClockwise, LockSimple } from '@phosphor-icons/react'
import { api, clearPin } from '../lib/api.js'
import { contactsToVCardFile } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'
import { getTheme, setTheme } from '../lib/theme.js'
import Segmented from '../components/Segmented.jsx'

// Fetch the newest version: refresh the service worker, clear cached app files, reload. Offline = do nothing.
async function updateApp() {
  if (!navigator.onLine) return false
  try {
    await (await navigator.serviceWorker?.getRegistration())?.update()
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)))
  } catch { /* no service worker or cache here: the reload alone still fetches the new page */ }
  location.reload()
  return true
}

function Row({ Icon, title, hint, onClick, tone }) {
  return (
    <li>
      <button type="button" className="row" onClick={onClick} style={{ padding: '12px 14px', margin: 0 }}>
        <Icon size={21} aria-hidden style={{ flex: 'none', color: tone || 'var(--accent)' }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 600 }}>{title}</span>
          <span className="small muted" style={{ display: 'block' }}>{hint}</span>
        </span>
      </button>
    </li>
  )
}

export default function Settings() {
  const nav = useNavigate()
  const [msg, setMsg] = useState('')
  const [theme, setThemeState] = useState(getTheme())
  function changeTheme(t) { setTheme(t); setThemeState(t) }

  async function exportAll() {
    setMsg('')
    try {
      const rows = await api.listContacts()
      if (!rows.length) { setMsg('No cards to export yet.'); return }
      downloadVcf('card-scanner-contacts.vcf', contactsToVCardFile(rows))
      setMsg(`Exported ${rows.length} ${rows.length === 1 ? 'card' : 'cards'} to one contacts file.`)
    } catch { setMsg('Couldn’t export. Check your connection and try again.') }
  }
  async function onUpdate() {
    setMsg('')
    if (!(await updateApp())) setMsg('You’re offline. Connect to the internet to update.')
  }

  return (
    <div className="screen enter">
      <header className="screen-head">
        <h1 className="screen-title">Settings</h1>
      </header>

      <div className="panel" style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>Appearance</span>
        <Segmented ariaLabel="Appearance" value={theme} onChange={changeTheme}
          options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </div>

      <ul className="list panel" style={{ marginTop: 14, padding: '4px 0', overflow: 'hidden' }}>
        <Row Icon={Export} title="Export all cards" hint="One contacts file (.vcf) with everyone in it" onClick={exportAll} />
        <Row Icon={ArrowsClockwise} title="Update app" hint="Loads the newest version. Nothing you saved is lost." onClick={onUpdate} />
        <Row Icon={LockSimple} title="Lock app" hint="Asks for your PIN next time" tone="var(--text-2)"
          onClick={() => { clearPin(); nav('/'); location.reload() }} />
      </ul>

      {msg && <p role="status" className="small muted" style={{ margin: '14px 4px 0' }}>{msg}</p>}
    </div>
  )
}
