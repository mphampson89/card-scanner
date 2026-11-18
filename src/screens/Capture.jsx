import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Images, X } from '@phosphor-icons/react'
import { resizeImage } from '../lib/camera.js'
import Segmented from '../components/Segmented.jsx'

export default function Capture() {
  const nav = useNavigate()
  const [batch, setBatch] = useState(false)
  const [shots, setShots] = useState([])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function onFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setAdding(true)
    setError('')
    const resized = []
    for (const file of files) {
      try {
        const r = await resizeImage(file)
        resized.push({ b64: r.b64, type: r.type, dataUrl: r.dataUrl })
      } catch { /* skip an image the browser can't decode */ }
    }
    setAdding(false)
    if (resized.length < files.length) {
      const bad = files.length - resized.length
      setError(resized.length
        ? `${bad} ${bad === 1 ? 'photo couldn’t be opened and was' : 'photos couldn’t be opened and were'} left out.`
        : 'That photo couldn’t be opened. Try another.')
    }
    if (!resized.length) return
    if (batch) setShots((s) => [...s, ...resized])
    else nav('/review', { state: { shots: resized } })
  }

  function removeShot(idx) {
    setShots((s) => s.filter((_, i) => i !== idx))
  }

  return (
    <div className="screen enter">
      <header className="screen-head">
        <h1 className="screen-title">Scan</h1>
        <Segmented ariaLabel="Capture mode" value={batch ? 'batch' : 'single'}
          onChange={(v) => setBatch(v === 'batch')}
          options={[{ value: 'single', label: 'Single' }, { value: 'batch', label: 'Batch' }]} />
      </header>

      <label className="finder" aria-disabled={adding}>
        <span className="mark tl" aria-hidden /><span className="mark tr" aria-hidden />
        <span className="mark bl" aria-hidden /><span className="mark br" aria-hidden />
        <span className="finder-icon" aria-hidden><Camera size={26} weight="bold" /></span>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          {adding ? 'Opening photo…' : batch && shots.length ? 'Take the next card' : 'Take a photo'}
        </span>
        <span className="small">Lay the card flat in good light</span>
        <input type="file" accept="image/*" capture="environment" onChange={onFiles} disabled={adding}
          className="sr-only" aria-label={batch ? 'Take a card photo' : 'Take a photo of the card'} />
      </label>

      <label className="btn btn-ghost" aria-disabled={adding} style={{ marginTop: 12, cursor: 'pointer' }}>
        <Images size={19} aria-hidden /> {batch ? 'Upload several photos' : 'Upload a photo'}
        <input type="file" accept="image/*" multiple={batch} onChange={onFiles} disabled={adding} className="sr-only" />
      </label>

      {error && <p role="alert" className="error-text" style={{ marginTop: 12 }}>{error}</p>}

      {batch && (
        <section style={{ marginTop: 26 }} aria-label="Cards to review">
          {shots.length === 0 ? (
            <p className="small muted">Snap cards one after another. They wait here until you review them together.</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>Ready to read</h2>
                <span className="num small muted">{shots.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {shots.map((s, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={s.dataUrl} alt={`Card ${i + 1}`}
                      style={{ width: '100%', aspectRatio: 1.75, objectFit: 'cover', borderRadius: 'var(--r-chip)',
                        display: 'block', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }} />
                    <button type="button" onClick={() => removeShot(i)} aria-label={`Remove card ${i + 1}`}
                      style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 999,
                        background: 'var(--text)', color: 'var(--bg)', border: '2px solid var(--bg)', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={13} weight="bold" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: 20 }} disabled={adding}
                onClick={() => nav('/review', { state: { shots } })}>
                Review {shots.length} {shots.length === 1 ? 'card' : 'cards'}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  )
}
