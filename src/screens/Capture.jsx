import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Images, X } from '@phosphor-icons/react'
import { resizeImage, looksHeic } from '../lib/camera.js'
import Segmented from '../components/Segmented.jsx'

export const PICK_EVENT = 'card-scanner:pick'

export function describeFailure(failed, total) {
  const names = failed.map((f) => f.name || 'photo').join(', ')
  const lead = failed.length === total
    ? `Could not open ${names}.`
    : `Skipped ${failed.length} of ${total} photos: ${names}.`
  if (failed.some(looksHeic)) {
    return `${lead} It is an iPhone HEIC photo and could not be converted. Check your connection and try again, or upload a screenshot of it instead.`
  }
  return `${lead} The file may not be a photo or may be damaged. Try a screenshot of it instead.`
}

export default function Capture() {
  const nav = useNavigate()
  const [batch, setBatch] = useState(false)
  const [shots, setShots] = useState([])
  const [adding, setAdding] = useState(false)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const uploadRef = useRef(null)

  // The tab bar's Scan button fires this when the user is already on the scan screen.
  useEffect(() => {
    const open = () => { if (!adding) uploadRef.current?.click() }
    window.addEventListener(PICK_EVENT, open)
    return () => window.removeEventListener(PICK_EVENT, open)
  }, [adding])

  async function onFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setError('')
    setConverting(files.some(looksHeic))
    setAdding(true)
    const resized = []
    const failed = []
    for (const file of files) {
      try {
        const r = await resizeImage(file)
        resized.push({ b64: r.b64, type: r.type, dataUrl: r.dataUrl })
      } catch {
        failed.push(file)
      }
    }
    setAdding(false)
    if (failed.length) setError(describeFailure(failed, files.length))
    if (!resized.length) return
    if (batch) setShots((s) => [...s, ...resized])
    else nav('/review', { state: { shots: resized } })
  }

  function removeShot(idx) {
    setShots((s) => s.filter((_, i) => i !== idx))
  }

  const prompt = adding
    ? (converting ? 'Converting iPhone photo…' : 'Preparing photo…')
    : batch && shots.length ? 'Take the next card' : 'Take a photo'

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
        <span role={adding ? 'status' : undefined} style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{prompt}</span>
        <span className="small">Lay the card flat in good light</span>
        <input type="file" accept="image/*" capture="environment" onChange={onFiles} disabled={adding}
          className="sr-only" aria-label={batch ? 'Take a card photo' : 'Take a photo of the card'} />
      </label>

      {/* Never add capture= here: on Android it forces the camera and hides the file picker. */}
      <label className="btn btn-ghost" aria-disabled={adding} style={{ marginTop: 12, cursor: 'pointer' }}>
        <Images size={19} aria-hidden /> {batch ? 'Upload several photos' : 'Upload from files'}
        <input ref={uploadRef} type="file" accept="image/*,.heic,.heif" multiple={batch} onChange={onFiles}
          disabled={adding} className="sr-only" />
      </label>

      {error && (
        <div role="alert" className="notice" style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss"
            style={{ background: 'none', border: 0, padding: 2, display: 'flex' }}>
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      {batch && (
        <section style={{ marginTop: 26 }} aria-label="Cards to review">
          {shots.length === 0 ? (
            <p className="small muted">Snap cards one after another, or upload a stack of photos. They wait here until you review them together.</p>
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
