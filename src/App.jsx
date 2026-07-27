import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { getPin, setPin, api } from './lib/api.js'
import { MY_APP_ID, pickTrustedParent, validateUnlock } from './lib/bridgeUnlock.js'
import PinGate from './screens/PinGate.jsx'
import Library from './screens/Library.jsx'
import Capture from './screens/Capture.jsx'
import Review from './screens/Review.jsx'
import Contact from './screens/Contact.jsx'
import Settings from './screens/Settings.jsx'
import TabBar from './components/TabBar.jsx'

export default function App() {
  const framed = window.parent !== window
  // Framed under Bridge: ignore the partitioned stored pin; the handshake authenticates (§6.3).
  const [unlocked, setUnlocked] = useState(framed ? false : !!getPin())
  const readySentRef = useRef(false)

  useEffect(() => {
    if (!framed) return
    const parentOrigin = pickTrustedParent()
    if (!parentOrigin) return
    let inFlight = false
    const onMessage = async (ev) => {
      const verdict = validateUnlock(
        { origin: ev.origin, source: ev.source, data: ev.data },
        { parentOrigin, parentWindow: window.parent },
      )
      if (!verdict.ok || inFlight) return
      inFlight = true
      let ok = false
      try {
        ok = await api.verifyPin(verdict.credential) // GET /api/contacts with the bearer
        if (ok) { setPin(verdict.credential); setUnlocked(true) }
      } finally {
        inFlight = false
        window.parent.postMessage(
          { type: 'bridge.unlock.ack', v: 1, app: MY_APP_ID, reqId: verdict.reqId, ok },
          parentOrigin,
        )
      }
    }
    window.addEventListener('message', onMessage)
    if (!readySentRef.current) {
      readySentRef.current = true
      window.parent.postMessage({ type: 'bridge.unlock.ready', v: 1, app: MY_APP_ID }, parentOrigin)
    }
    return () => window.removeEventListener('message', onMessage)
  }, [framed])

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />
  return (
    <>
      <main style={{ paddingBottom: 88 }}>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/scan" element={<Capture />} />
          <Route path="/review" element={<Review />} />
          <Route path="/contact/:id" element={<Contact />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <TabBar />
    </>
  )
}
