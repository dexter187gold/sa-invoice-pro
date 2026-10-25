import { loadSavedTheme } from './lib/themes'
try { loadSavedTheme() } catch {}
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import App from './App'
import './styles.css'
import './styles.ux.css'
import './styles.tickets.css'
import './styles.table.css'
import './styles.invoice.css'
import './styles.modern.css'
import './styles.brain.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
