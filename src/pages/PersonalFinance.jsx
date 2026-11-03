import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { createVault, getVaultUsername, saveVault, unlockVault, vaultExists } from '../lib/personalFinanceVault'
import { currentRoleId } from '../lib/roleGate'

const money = (n) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(n) || 0)
const today = () => new Date().toISOString().slice(0, 10)
const categories = ['Groceries', 'Household', 'Transport', 'Utilities', 'Medical', 'Personal', 'Electronics', 'Income', 'Deposit', 'Other']

export default function PersonalFinance() {
  const { user } = useApp()
  const [configured, setConfigured] = React.useState(vaultExists())
  const [unlocked, setUnlocked] = React.useState(false)
  const [key, setKey] = React.useState(null)
  const [data, setData] = React.useState(null)
  const [username, setUsername] = React.useState(getVaultUsername())
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [entry, setEntry] = React.useState({ type: 'expense', category: 'Groceries', amount: '', date: today(), description: '', merchant: '', depositNote: '' })
  const [budget, setBudget] = React.useState({ month: today().slice(0, 7), category: 'Groceries', amount: '' })
  const [goal, setGoal] = React.useState({ name: '', target: '', saved: '' })
  const [tab, setTab] = React.useState('overview')
  const [ownerRole, setOwnerRole] = React.useState(null)
  React.useEffect(() => { let alive = true; currentRoleId().then(role => { if (alive) setOwnerRole(role) }); return () => { alive = false } }, [])

  const isOwner = ownerRole === 'owner'
  const persist = async (next) => { setData(next); await saveVault(key, next) }
  const signOut = () => { setUnlocked(false); setKey(null); setData(null); setPassword('') }
  React.useEffect(() => {
    if (!unlocked) return
    const onHide = () => { if (document.visibilityState === 'hidden') signOut() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [unlocked])

  if (!isOwner) return <main className="page"><section className="card"><h2>Private area</h2><p>This personal finance area is restricted to the owner account.</p><Link to="/">Return to workspace</Link></section></main>
  if (!unlocked) return <main className="page" style={{ maxWidth: 520, margin: '32px auto', padding: 16 }}>
    <section className="card" style={{ padding: 24 }}>
      <div style={{ fontSize: 12, letterSpacing: 2, opacity: .65 }}>OWNER ONLY · PRIVATE LEDGER</div>
      <h1>Personal Finance Vault</h1>
      <p className="muted">A separate encrypted space for personal income, spending, budgets, deposits and savings. It is not included in company reports.</p>
      {!configured ? <>
        <h3>Create your private sign-in</h3>
        <label>Username</label><input className="input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a private username" />
        <label style={{ display: 'block', marginTop: 12 }}>Strong password</label><input className="input" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="14+ characters, mixed case, number, symbol" />
        <label style={{ display: 'block', marginTop: 12 }}>Confirm password</label><input className="input" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={busy} onClick={async () => { setError(''); setBusy(true); try { if (password !== confirm) throw new Error('Passwords do not match.'); const initial = await createVault(username, password); const session = await unlockVault(username, password); setKey(session.key); setData(initial); setConfigured(true); setUnlocked(true) } catch (e) { setError(e.message) } finally { setBusy(false) } }}>Create encrypted vault</button>
        <p className="muted" style={{ fontSize: 12 }}>Your credentials are not pre-set or stored in the source code. If you forget this password, the encrypted vault cannot be recovered.</p>
      </> : <>
        <label>Username</label><input className="input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} />
        <label style={{ display: 'block', marginTop: 12 }}>Password</label><input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('vault-unlock')?.click() }} />
        <button id="vault-unlock" className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={busy} onClick={async () => { setError(''); setBusy(true); try { const session = await unlockVault(username, password); setKey(session.key); setData(session.data); setUnlocked(true) } catch (e) { setError(e.message) } finally { setBusy(false) } }}>Unlock vault</button>
      </>}
      {error && <p role="alert" style={{ color: 'var(--danger, #c33)' }}>{error}</p>}
      <p style={{ marginTop: 18 }}><Link to="/">Back to SA Invoice Pro</Link></p>
    </section>
  </main>

  const month = today().slice(0, 7)
  const rows = data.transactions || []
  const monthly = rows.filter(x => String(x.date || '').slice(0, 7) === month)
  const income = monthly.filter(x => x.type === 'income' || x.type === 'deposit').reduce((s, x) => s + Number(x.amount), 0)
  const expenses = monthly.filter(x => x.type === 'expense').reduce((s, x) => s + Number(x.amount), 0)
  const currentBudgets = (data.budgets || []).filter(x => x.month === month)
  const spentFor = (category) => monthly.filter(x => x.type === 'expense' && x.category === category).reduce((s, x) => s + Number(x.amount), 0)

  const addEntry = async (e) => {
    e.preventDefault()
    const amount = Number(entry.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !entry.description.trim()) return setError('Enter a valid amount and description.')
    await persist({ ...data, transactions: [{ ...entry, id: crypto.randomUUID(), amount, createdAt: new Date().toISOString() }, ...rows] })
    setEntry({ type: 'expense', category: 'Groceries', amount: '', date: today(), description: '', merchant: '', depositNote: '' })
    setError('')
  }
  const addBudget = async (e) => { e.preventDefault(); if (!(Number(budget.amount) > 0)) return; await persist({ ...data, budgets: [...(data.budgets || []).filter(x => !(x.month === budget.month && x.category === budget.category)), { ...budget, amount: Number(budget.amount) }] }) }
  const addGoal = async (e) => { e.preventDefault(); if (!goal.name.trim() || !(Number(goal.target) > 0)) return; await persist({ ...data, goals: [...(data.goals || []), { ...goal, id: crypto.randomUUID(), target: Number(goal.target), saved: Number(goal.saved) || 0 }] }); setGoal({ name: '', target: '', saved: '' }) }
  const exportData = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'personal-finance-vault-backup.json'; a.click(); URL.revokeObjectURL(url) }

  return <main className="page" style={{ maxWidth: 1100, margin: '20px auto', padding: 16 }}>
    <header className="card" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div><div style={{ fontSize: 12, letterSpacing: 2, opacity: .65 }}>OWNER ONLY · ENCRYPTED PERSONAL DATA</div><h1 style={{ margin: '6px 0' }}>Personal Finance</h1><p className="muted" style={{ margin: 0 }}>Private ledger · South African rand (ZAR)</p></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-outline" onClick={exportData}>Export backup</button><button className="btn btn-outline" onClick={signOut}>Lock vault</button><Link className="btn btn-outline" to="/">Business workspace</Link></div>
    </header>
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>{[['overview','Overview'],['entries','Transactions'],['budgets','Budgets'],['goals','Savings goals']].map(([id,label]) => <button key={id} className={tab === id ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === 'overview' && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
        {[['Income this month',income],['Expenses this month',expenses],['Net cash flow',income-expenses]].map(([label,value]) => <section className="card" key={label} style={{ padding: 18 }}><div className="muted">{label}</div><h2 style={{ marginBottom: 0 }}>{money(value)}</h2></section>)}
      </div>
      <section className="card" style={{ padding: 18, marginTop: 14 }}><h2>Quick entry</h2><form onSubmit={addEntry} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        <label>Type<select className="input" value={entry.type} onChange={e => setEntry({ ...entry, type: e.target.value, category: e.target.value === 'income' ? 'Income' : e.target.value === 'deposit' ? 'Deposit' : 'Groceries' })}><option value="expense">Expense</option><option value="income">Income</option><option value="deposit">Deposit / cash received</option></select></label>
        <label>Category<select className="input" value={entry.category} onChange={e => setEntry({ ...entry, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Amount (ZAR)<input className="input" type="number" min="0.01" step="0.01" value={entry.amount} onChange={e => setEntry({ ...entry, amount: e.target.value })} required /></label>
        <label>Date<input className="input" type="date" value={entry.date} onChange={e => setEntry({ ...entry, date: e.target.value })} required /></label>
        <label>Description<input className="input" value={entry.description} onChange={e => setEntry({ ...entry, description: e.target.value })} placeholder="e.g. Weekly groceries" required /></label>
        <label>Shop / source<input className="input" value={entry.merchant} onChange={e => setEntry({ ...entry, merchant: e.target.value })} placeholder="Optional" /></label>
        {entry.type === 'deposit' && <label>Deposit note<input className="input" value={entry.depositNote} onChange={e => setEntry({ ...entry, depositNote: e.target.value })} placeholder="Reference, cash deposit details" /></label>}
        <button className="btn btn-primary" type="submit">Save entry</button>
      </form></section>
      <section className="card" style={{ padding: 18, marginTop: 14 }}><h2>Monthly budget snapshot</h2>{currentBudgets.length ? currentBudgets.map(b => <div key={b.category} style={{ margin: '12px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{b.category}</strong><span>{money(spentFor(b.category))} / {money(b.amount)}</span></div><div style={{ height: 9, background: 'var(--border)', borderRadius: 20, overflow: 'hidden', marginTop: 6 }}><div style={{ height: '100%', width: Math.min(100, spentFor(b.category) / b.amount * 100) + '%', background: spentFor(b.category) > b.amount ? '#d65a5a' : '#25966d' }} /></div></div>) : <p className="muted">No budgets set yet. Add your category limits under Budgets.</p>}</section>
    </>}
    {tab === 'entries' && <section className="card" style={{ padding: 18 }}><h2>Transaction history</h2>{rows.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Date</th><th align="left">Description</th><th align="left">Category</th><th align="right">Amount</th><th></th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.date}</td><td>{r.description}<div className="muted">{r.merchant} {r.depositNote}</div></td><td>{r.category}</td><td align="right" style={{ color: r.type === 'expense' ? '#c45b5b' : '#21865e' }}>{r.type === 'expense' ? '−' : '+'}{money(r.amount)}</td><td><button className="btn btn-outline" onClick={() => persist({ ...data, transactions: rows.filter(x => x.id !== r.id) })}>Delete</button></td></tr>)}</tbody></table></div> : <p className="muted">No personal transactions recorded yet.</p>}</section>}
    {tab === 'budgets' && <section className="card" style={{ padding: 18 }}><h2>Monthly budgets</h2><form onSubmit={addBudget} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}><label>Month<input className="input" type="month" value={budget.month} onChange={e => setBudget({ ...budget, month: e.target.value })} /></label><label>Category<select className="input" value={budget.category} onChange={e => setBudget({ ...budget, category: e.target.value })}>{categories.filter(c => !['Income','Deposit'].includes(c)).map(c => <option key={c}>{c}</option>)}</select></label><label>Limit (ZAR)<input className="input" type="number" min="0.01" step="0.01" value={budget.amount} onChange={e => setBudget({ ...budget, amount: e.target.value })} required /></label><button className="btn btn-primary">Save budget</button></form><div style={{ marginTop: 18 }}>{(data.budgets || []).map(b => <p key={b.month + b.category}>{b.month} · {b.category}: <strong>{money(b.amount)}</strong></p>)}</div></section>}
    {tab === 'goals' && <section className="card" style={{ padding: 18 }}><h2>Savings goals</h2><form onSubmit={addGoal} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}><label>Goal name<input className="input" value={goal.name} onChange={e => setGoal({ ...goal, name: e.target.value })} placeholder="Emergency fund" required /></label><label>Target (ZAR)<input className="input" type="number" min="1" step="0.01" value={goal.target} onChange={e => setGoal({ ...goal, target: e.target.value })} required /></label><label>Already saved<input className="input" type="number" min="0" step="0.01" value={goal.saved} onChange={e => setGoal({ ...goal, saved: e.target.value })} /></label><button className="btn btn-primary">Add goal</button></form>{(data.goals || []).map(g => <div key={g.id} style={{ marginTop: 16 }}><strong>{g.name}</strong><div>{money(g.saved)} / {money(g.target)}</div><div style={{ height: 8, background: 'var(--border)', borderRadius: 10 }}><div style={{ height: 8, width: Math.min(100, g.saved / g.target * 100) + '%', background: '#25966d', borderRadius: 10 }} /></div><button className="btn btn-outline" style={{ marginTop: 6 }} onClick={() => persist({ ...data, goals: data.goals.filter(x => x.id !== g.id) })}>Remove goal</button></div>)}</section>}
    <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>Vault data is encrypted in this browser on this device. It is not synced to your business workspace or cloud. Export backups regularly and keep them somewhere private.</p>
  </main>
}
