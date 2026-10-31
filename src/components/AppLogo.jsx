import React from 'react'

/** Canonical SA Invoice Pro logo; user-uploaded white-label images cannot hide product branding. */
export default function AppLogo({ size = 'md', showWordmark = false, className = '' }) {
  const px = typeof size === 'number' ? size : size === 'sm' ? 36 : size === 'lg' ? 88 : 56
  return (
      <div className={`app-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <img
          src={logo}
          alt=""
          width={px}
          height={px}
          style={{ display: 'block', borderRadius: 12, objectFit: 'cover', width: px, height: px }}
        />
        {showWordmark && (
          <div className="app-logo-wordmark">
            <div className="app-logo-title">BRAND</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`app-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <svg width={px} height={px} viewBox="0 0 128 128" className="app-logo-svg" aria-hidden="true"
        style={{ display: 'block', filter: 'drop-shadow(0 6px 16px rgba(124,58,237,.45))' }}>
        <defs>
          <linearGradient id="saLabOrb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" /><stop offset="45%" stopColor="#059669" /><stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="saLabRing" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" /><stop offset="50%" stopColor="#e879f9" /><stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
          <radialGradient id="saLabCore" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#064e3b" /><stop offset="70%" stopColor="#022c22" /><stop offset="100%" stopColor="#011c17" />
          </radialGradient>
        </defs>
        <circle cx="64" cy="64" r="60" fill="none" stroke="url(#saLabRing)" strokeWidth="4" opacity="0.95" />
        <circle cx="64" cy="64" r="52" fill="url(#saLabCore)" stroke="url(#saLabOrb)" strokeWidth="2.5" />
        <ellipse cx="48" cy="44" rx="18" ry="10" fill="rgba(232,121,249,0.18)" />
        <text x="64" y="67" textAnchor="middle" fontFamily="Arial,system-ui,sans-serif" fontWeight="900" fontSize="53" fill="#f0fff6" letterSpacing="-4">SA</text>
        <path d="M25 77H103" stroke="#6ee7b7" strokeWidth="1.6" opacity=".9" />
        <text x="64" y="91" textAnchor="middle" fontFamily="Arial,system-ui,sans-serif" fontWeight="900" fontSize="10" fill="#a7f3d0" letterSpacing="2">INVOICE</text>
        <text x="64" y="103" textAnchor="middle" fontFamily="Arial,system-ui,sans-serif" fontWeight="800" fontSize="7" fill="#d1fae5" letterSpacing="2.8">PRO</text>
      </svg>
      {showWordmark && (
        <div className="app-logo-wordmark">
          <div className="app-logo-title">SA INVOICE PRO</div>
          <div className="app-logo-sub muted brain-ribbon">Professional business workspace</div>
        </div>
      )}
    </div>
  )
}
