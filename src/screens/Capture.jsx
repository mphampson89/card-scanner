import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resizeImage } from '../lib/camera.js'

export default function Capture() {
  const nav = useNavigate()
  const [batch, setBatch] = useState(false)
  const [shots, setShots] = useState([])

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const r = await resizeImage(file)
    const shot = { b64: r.b64, type: r.type, dataUrl: r.dataUrl }
    if (batch) setShots((s) => [...s, shot])
    else nav('/review', { state: { shots: [shot] } })
  }

  return (
    <div style={{ padding: '24px 18px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Scan card</h1>
        <label style={{ fontSize: 13, color: 'var(--text-2)' }}>
          <input type="checkbox" checked={batch} onChange={(e) => setBatch(e.target.checked)} /> Batch
        </label>
      </div>

      <div style={{ marginTop: 24, border: '2px dashed var(--accent)', borderRadius: 16,
        aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: 16 }}>
        Align the card and take a clear, well-lit photo
      </div>

      <label className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 18 }}>
        {batch ? 'Add a card' : 'Take or upload card photo'}
        <input type="file" accept="image/*" capture="environment" onChange={onFile}
          style={{ display: 'none' }} />
      </label>

      {batch && shots.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {shots.map((s, i) => (
              <img key={i} src={s.dataUrl} alt={`Card ${i + 1}`}
                style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 8 }} />
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 16 }}
            onClick={() => nav('/review', { state: { shots } })}>
            Review {shots.length} {shots.length === 1 ? 'card' : 'cards'}
          </button>
        </>
      )}
    </div>
  )
}
