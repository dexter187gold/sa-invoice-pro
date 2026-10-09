import React from 'react'
import { useApp } from '../context/AppContext'

export default function ToastHost() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions text">
      {toasts.map((t) => {
        const isError = t.type === 'error' || t.type === 'danger'
        return (
          <div
            key={t.id}
            className={`toast ${t.type || ''}`}
            role={isError ? 'alert' : 'status'}
          >
            <span className="toast-msg">{t.message}</span>
            <button
              type="button"
              className="toast-dismiss"
              aria-label="Dismiss notification"
              onClick={() => dismissToast?.(t.id)}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
