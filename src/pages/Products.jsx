
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'

export default function Products() {
  const { products, services, refresh, toast } = useApp()
  const [tab, setTab] = useState('products')
  const [form, setForm] = useState({ name: '', price: '', sku: '', stock: '', description: '' })

  const list = tab === 'products' ? products : services
  const store = tab === 'products' ? STORES.products : STORES.services

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    const row = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      description: form.description || '',
      sku: form.sku || '',
    }
    if (tab === 'products') row.stock = form.stock === '' ? null : Number(form.stock)
    await db.add(store, row)
    setForm({ name: '', price: '', sku: '', stock: '', description: '' })
    await refresh()
    toast('Saved', 'success')
  }

  const del = async (id) => {
    if (!confirm('Delete?')) return
    await db.remove(store, id)
    await refresh()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Products & services</h1>
          <p className="subtitle">Catalog for invoice lines · stock on products</p>
        </div>
      </div>
      <div className="tabs-row">
        <button type="button" className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setTab('products')}>Products</button>
        <button type="button" className={`btn ${tab === 'services' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setTab('services')}>Services</button>
      </div>
      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" type="number" step="0.01" placeholder="Price (excl. VAT)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="input" placeholder="SKU / code" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        {tab === 'products' && (
          <input className="input" type="number" placeholder="Stock level" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        )}
        <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="btn btn-primary" type="submit">Add {tab === 'products' ? 'product' : 'service'}</button>
      </form>
      {list.map((p) => (
        <div key={p.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong>{p.name}</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              {formatMoney(p.price)}
              {p.sku ? ` · ${p.sku}` : ''}
              {p.stock != null ? ` · stock ${p.stock}` : ''}
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => del(p.id)}>Del</button>
        </div>
      ))}
      {!list.length && <div className="card empty">No {tab} yet.</div>}
    </div>
  )
}
