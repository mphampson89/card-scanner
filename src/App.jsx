import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { getPin } from './lib/api.js'
import PinGate from './screens/PinGate.jsx'
import Library from './screens/Library.jsx'
import Capture from './screens/Capture.jsx'
import Review from './screens/Review.jsx'
import Contact from './screens/Contact.jsx'
import Settings from './screens/Settings.jsx'
import TabBar from './components/TabBar.jsx'

export default function App() {
  const [unlocked, setUnlocked] = useState(!!getPin())
  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />
  return (
    <>
      <div style={{ paddingBottom: 88 }}>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/scan" element={<Capture />} />
          <Route path="/review" element={<Review />} />
          <Route path="/contact/:id" element={<Contact />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <TabBar />
    </>
  )
}
