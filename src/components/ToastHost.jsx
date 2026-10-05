
import React from 'react'
import { useApp } from '../context/AppContext'

export default function ToastHost() {
  const { toasts } = useApp()
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || ''}`}>{t.message}</div>
      ))}
    </div>
  )
}
