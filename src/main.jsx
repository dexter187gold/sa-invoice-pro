import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import App from './App'
import './styles.css'
import './styles.ux.css'
import './styles.table.css'
import './styles.invoice.css'
import './styles.modern.css'
import './styles.brain.css'

try {
  const saved = localStorage.getItem('sa_theme')
  if (saved === 'brain' || saved === 'dark' || !saved) {
    document.documentElement.classList.add('brain')
    if (saved !== 'light') document.documentElement.classList.add('dark')
  }
} catch {}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// Register Lab offline service worker (phone install / offline use)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
