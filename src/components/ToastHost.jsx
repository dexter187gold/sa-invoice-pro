import React from 'react'
import { useApp } from '../context/AppContext'

export default function ToastHost() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || ''}`} role="status">
          {t.message}
          <button
            type="button"
            className="toast-dismiss"
            aria-label="Dismiss"
            onClick={() => dismissToast?.(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
