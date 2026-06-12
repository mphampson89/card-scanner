import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearPin } from '../lib/api.js'
import { contactsToVCardFile } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'

export default function Settings() {
  const nav = useNavigate()
  const [msg, setMsg] = useState('')
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
      <button className="btn-primary" style={{ marginTop: 18 }} onClick={exportAll}>Export all contacts (.vcf)</button>
      {msg && <p role="status" style={{ color: 'var(--text-2)', fontSize: 13, margin: '12px 2px 0' }}>{msg}</p>}
      <button className="btn-ghost" style={{ marginTop: 12 }}
        onClick={() => { clearPin(); nav('/'); location.reload() }}>
        Lock app
      </button>
    </div>
  )
}
