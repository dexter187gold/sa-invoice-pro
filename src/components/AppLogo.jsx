import React from 'react'

/** Canonical SA Invoice Pro mark. White-label assets never replace product identity. */
export default function AppLogo({ size = 'md', showWordmark = false, className = '' }) {
  const px = typeof size === 'number' ? size : size === 'sm' ? 36 : size === 'lg' ? 88 : 56

  return (
    <div className={`app-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 128 128"
        className="app-logo-svg"
        role="img"
        aria-label="SA Invoice Pro"
        style={{ display: 'block', filter: 'drop-shadow(0 4px 12px rgba(5,150,105,.35))' }}
      >
        <defs>
          <linearGradient id="saInvoiceOrb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="48%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="saInvoiceRing" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </linearGradient>
          <radialGradient id="saInvoiceCore" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="72%" stopColor="#022c22" />
            <stop offset="100%" stopColor="#011c17" />
          </radialGradient>
        </defs>
        <circle cx="64" cy="64" r="60" fill="none" stroke="url(#saInvoiceRing)" strokeWidth="4" />
        <circle cx="64" cy="64" r="52" fill="url(#saInvoiceCore)" stroke="url(#saInvoiceOrb)" strokeWidth="2.5" />
        <text x="64" y="65" textAnchor="middle" fontFamily="Arial,system-ui,sans-serif" fontWeight="900" fontSize="52" fill="#f0fff6" letterSpacing="-4">SA</text>
        <path d="M25 76H103" stroke="#6ee7b7" strokeWidth="1.6" />
        <text x="64" y="91" textAnchor="middle" fontFamily="Arial,system-ui,sans-serif" fontWeight="900" fontSize="10" fill="#a7f3d0" letterSpacing="2">INVOICE</text>
        <text x="64" y="103" textAnchor="middle" fontFamily="Arial,system-ui,sans-serif" fontWeight="800" fontSize="7" fill="#d1fae5" letterSpacing="2.8">PRO</text>
      </svg>
      {showWordmark ? (
        <div className="app-logo-wordmark">
          <div className="app-logo-title">SA INVOICE PRO</div>
          <div className="app-logo-sub muted brain-ribbon">Professional business workspace</div>
        </div>
      ) : null}
    </div>
  )
}
