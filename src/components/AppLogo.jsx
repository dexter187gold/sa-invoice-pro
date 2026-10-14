import React from 'react'

export default function AppLogo({ size = 'md', showWordmark = false, className = '' }) {
  const px = typeof size === 'number' ? size : size === 'sm' ? 36 : size === 'lg' ? 88 : 56
  const font = Math.max(8, Math.round(px * 0.18))
  return (
    <div className={`app-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <div
        className="app-logo-glass"
        style={{ width: px, height: px, fontSize: font }}
        aria-hidden="true"
        title="SA Invoice Pro · Lab"
      >
        <span className="app-logo-text">SA</span>
      </div>
      {showWordmark && (
        <div className="app-logo-wordmark">
          <div className="app-logo-title">SA INVOICE PRO</div>
          <div className="app-logo-sub muted brain-ribbon">World Domination · Lab</div>
        </div>
      )}
    </div>
  )
}
