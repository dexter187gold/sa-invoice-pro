import React from 'react'
import { Link } from 'react-router-dom'
import { APP_VERSION, APP_COPYRIGHT, SUPPORT_EMAIL, APP_LINKS } from '../config'
import AppLogo from '../components/AppLogo'

export default function About() {
  return (
    <div className="page-stack">
      <section className="card" style={{ padding: 'clamp(22px,4vw,40px)', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><AppLogo size={104} /></div>
        <div className="eyebrow">SOUTH AFRICAN BUSINESS WORKSPACE</div>
        <h1 style={{ margin: '8px 0' }}>SA Invoice Pro</h1>
        <p className="muted" style={{ maxWidth: 620, margin: '0 auto 18px' }}>A practical business management workspace for South African businesses — bringing invoicing, customers, job cards, payments, bookkeeping, documents and team workflows together.</p>
        <span className="badge">Version {APP_VERSION}</span>
      </section>
      <div className="grid-stats">
        <div className="stat-card"><div className="label">Built for</div><div className="value" style={{fontSize:20}}>South Africa</div><p className="muted">ZAR, VAT-aware workflows and local business operations.</p></div>
        <div className="stat-card"><div className="label">Designed for</div><div className="value" style={{fontSize:20}}>Growing teams</div><p className="muted">From owner-operated desks to multi-user workspaces.</p></div>
        <div className="stat-card"><div className="label">Data control</div><div className="value" style={{fontSize:20}}>Your workspace</div><p className="muted">Use backups and review sharing/sync settings to protect business records.</p></div>
      </div>
      <section className="card" style={{padding:20}}>
        <h2>Product links</h2>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <Link className="btn btn-primary" to="/license">View plans & buy a license</Link>
          <Link className="btn btn-outline" to="/support">Help & Support</Link>
          <a className="btn btn-outline" href={APP_LINKS.website} target="_blank" rel="noreferrer">Website</a>
          <a className="btn btn-outline" href={`mailto:${SUPPORT_EMAIL}`}>Email support</a>
        </div>
      </section>
      <p className="muted" style={{textAlign:'center',fontSize:12}}>{APP_COPYRIGHT}</p>
    </div>
  )
}
