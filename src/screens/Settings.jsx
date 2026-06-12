import { useNavigate } from 'react-router-dom'
import { api, clearPin } from '../lib/api.js'
import { contactsToVCardFile } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'

export default function Settings() {
  const nav = useNavigate()
  async function exportAll() {
    const rows = await api.listContacts()
    if (!rows.length) return alert('No contacts to export.')
    downloadVcf('card-scanner-contacts.vcf', contactsToVCardFile(rows))
  }
  return (
    <div style={{ padding: '24px 18px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Settings</h1>
      <button className="btn-primary" style={{ marginTop: 16 }} onClick={exportAll}>Export all contacts (.vcf)</button>
      <button onClick={() => { clearPin(); nav('/'); location.reload() }}
        style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 14, border: '1px solid var(--line)', background: 'none', color: 'var(--text)' }}>
        Lock app
      </button>
    </div>
  )
}
