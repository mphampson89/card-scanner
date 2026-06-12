import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resizeImage } from '../lib/camera.js'
import Segmented from '../components/Segmented.jsx'

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
    <div style={{ padding: '28px 18px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Scan a card</h1>
        <Segmented ariaLabel="Capture mode" value={batch ? 'batch' : 'single'}
          onChange={(v) => setBatch(v === 'batch')}
          options={[{ value: 'single', label: 'Single' }, { value: 'batch', label: 'Batch' }]} />
      </div>

      <div style={{ marginTop: 22, borderRadius: 20, aspectRatio: '16/10',
        border: '2px dashed color-mix(in srgb, var(--accent) 50%, var(--line))',
        background: 'radial-gradient(120% 100% at 50% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)',
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: 16 }}>
        <span aria-hidden style={{ fontSize: 30, color: 'var(--accent)' }}>⌗</span>
        Align the card in good light and take a clear photo.
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
