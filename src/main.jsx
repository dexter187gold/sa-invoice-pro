import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import App from './App'
import { initFont } from './lib/fonts'
import { loadSavedTheme } from './lib/themes'
import { registerPwa } from './lib/registerPwa'
import { loadSavedBusinessType } from './lib/businessTypes'
import { applyWhiteLabel, loadWhiteLabel } from './lib/whiteLabel'

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
import './styles.form-scroll.css'
import './styles.tickets.css'
import './styles.table.css'
import './styles.invoice.css'
import './styles.modern.css'
import './styles.brain.css'
import './styles.sniper.css'
import './styles.theme-modes.css'
import './styles.business-types.css'
import './styles.modern-ux.css'
import './styles.pulse.css'
import './styles.nav-comfort.css'
import './styles.glass.css'

// Apply theme once, after styles load — never force-overwrite user choice
try { loadSavedTheme() } catch {}
try { loadSavedBusinessType() } catch {}
try { registerPwa() } catch {}
try { applyWhiteLabel(loadWhiteLabel()) } catch {}
try { initFont() } catch {}

try {
  document.documentElement.style.visibility = 'visible'
  if (document.body) {
    document.body.style.visibility = 'visible'
    document.body.style.opacity = '1'
  }
} catch {}

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
