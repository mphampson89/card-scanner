import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App.jsx'
import './theme.css'
import { applyTheme } from './lib/theme.js'

applyTheme()

const framed = window.parent !== window
const Router = framed ? MemoryRouter : BrowserRouter
// Shell embeds Scanner at /scan; MemoryRouter needs it as the initial entry.
const routerProps = framed ? { initialEntries: ['/scan'] } : {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router {...routerProps}>
      <App />
    </Router>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
