import { initFont } from './lib/fonts'
import { loadSavedTheme } from './lib/themes'
import { applyWhiteLabel, loadWhiteLabel } from './lib/whiteLabel'
try { loadSavedTheme() } catch {}
try { applyWhiteLabel(loadWhiteLabel()) } catch {}
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import App from './App'

try {
  const prefs = JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}')
  const layout = prefs.layout || 'bottom'
  if (layout !== 'side') document.documentElement.classList.add('nav-bottom')
} catch {
  document.documentElement.classList.add('nav-bottom')
}

import './styles.css'
import './styles.auth.css'
import './styles.ux.css'
import './styles.tickets.css'
import './styles.table.css'
import './styles.invoice.css'
import './styles.modern.css'
import './styles.brain.css'
import './styles.modern-ux.css'
import './styles.pulse.css'
import './styles.nav-comfort.css'

try {
  const saved = localStorage.getItem('sa_theme')
  if (saved === 'brain' || saved === 'dark' || !saved) {
    document.documentElement.classList.add('brain')
    if (saved !== 'light') document.documentElement.classList.add('dark')
  }
} catch {}

try {
  document.documentElement.style.visibility = 'visible'
  document.body && (document.body.style.visibility = 'visible')
  document.body && (document.body.style.opacity = '1')
} catch {}

const root = document.getElementById('root')
initFont()
createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
