
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'

export default function Login() {
  const { login, register, toast, user, company } = useApp()
  const nav = useNavigate()
  const [mode, setMode] = useState('in')
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '' })
  const [busy, setBusy] = useState(false)

  React.useEffect(() => {
    if (user) nav(company?.name ? '/' : '/setup', { replace: true })
  }, [user, company, nav])

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'in') {
        await login(form.username || form.email, form.password)
        toast('Welcome back', 'success')
      } else {
        if (!form.username || !form.email || !form.password) throw new Error('Fill username, email and password')
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
        await register(form)
        toast('Account created', 'success')
      }
      nav('/setup', { replace: true })
    } catch (err) {
      toast(err.message || String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="logo-mark">SA</div>
        <h1 style={{ margin: '0 0 .25rem', textAlign: 'center', fontSize: '1.35rem' }}>SA Invoice Pro</h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>Modern · offline-first · South Africa · v{APP_VERSION}</p>
        <div className="tabs">
          <button type="button" className={`tab ${mode === 'in' ? 'active' : ''}`} onClick={() => setMode('in')}>Sign in</button>
          <button type="button" className={`tab ${mode === 'up' ? 'active' : ''}`} onClick={() => setMode('up')}>Create account</button>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          {mode === 'up' && (
            <>
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="label">{mode === 'in' ? 'Username or email' : 'Username'}</label>
            <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        </form>
      </div>
    </div>
  )
}
