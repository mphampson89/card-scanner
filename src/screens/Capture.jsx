import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resizeImage } from '../lib/camera.js'
import Segmented from '../components/Segmented.jsx'

export default function Capture() {
  const nav = useNavigate()
  const [batch, setBatch] = useState(false)
  const [shots, setShots] = useState([])
  const [adding, setAdding] = useState(false)

  async function onFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setAdding(true)
    const resized = []
    for (const file of files) {
      try {
        const r = await resizeImage(file)
        resized.push({ b64: r.b64, type: r.type, dataUrl: r.dataUrl })
      } catch { /* skip an image the browser can't decode */ }
    }
    setAdding(false)
    if (!resized.length) return
    if (batch) setShots((s) => [...s, ...resized])
    else nav('/review', { state: { shots: resized } })
  }

  function removeShot(idx) {
    setShots((s) => s.filter((_, i) => i !== idx))
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
        {batch
          ? 'Snap cards one after another, or upload a whole stack of photos at once.'
          : 'Align the card in good light and take a clear photo.'}
      </div>

      {!batch && (
        <label className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 18 }}>
          Take or upload card photo
          <input type="file" accept="image/*" capture="environment" onChange={onFiles}
            style={{ display: 'none' }} />
        </label>
      )}

      {batch && (
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <label className="btn-primary" aria-disabled={adding}
            style={{ flex: 1, textAlign: 'center', opacity: adding ? 0.55 : 1 }}>
            {adding ? 'Adding…' : 'Take a card'}
            <input type="file" accept="image/*" capture="environment" onChange={onFiles}
              disabled={adding} style={{ display: 'none' }} />
          </label>
          <label className="btn-ghost" aria-disabled={adding}
            style={{ flex: 1, textAlign: 'center', opacity: adding ? 0.55 : 1 }}>
            Upload photos
            <input type="file" accept="image/*" multiple onChange={onFiles}
              disabled={adding} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {batch && shots.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {shots.map((s, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={s.dataUrl} alt={`Card ${i + 1}`}
                  style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                <button onClick={() => removeShot(i)} aria-label={`Remove card ${i + 1}`}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 999,
                    background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)',
                    fontSize: 13, lineHeight: 1, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 16 }} disabled={adding}
            onClick={() => nav('/review', { state: { shots } })}>
            Review {shots.length} {shots.length === 1 ? 'card' : 'cards'}
          </button>
        </>
      )}
    </div>
  )
}
