import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, Segmented, downloadCsv,
} from '../components/ui'

export default function Products() {
  const { products, services, refresh, toast } = useApp()
  const [tab, setTab] = useState('products')
  const [form, setForm] = useState({ name: '', price: '', sku: '', stock: '', description: '' })
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)

  const list = tab === 'products' ? products : services
  const store = tab === 'products' ? STORES.products : STORES.services

  const filtered = useMemo(
    () => list.filter((p) => matchesQuery(p, q, ['name', 'sku', 'description'])),
    [list, q]
  )

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

  const del = (id) => {
    setConfirm({
      title: `Delete ${tab === 'products' ? 'product' : 'service'}?`,
      message: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        await db.remove(store, id)
        await refresh()
        toast('Deleted', 'success')
        setConfirm(null)
      },
    })
  }


  const exportCsv = () => {
    const headers = tab === 'products'
      ? ['Name', 'SKU', 'Price', 'Stock', 'Description']
      : ['Name', 'SKU', 'Price', 'Description']
    const rows = filtered.map((p) => {
      if (tab === 'products') return [p.name || '', p.sku || '', Number(p.price) || 0, p.stock ?? '', p.description || '']
      return [p.name || '', p.sku || '', Number(p.price) || 0, p.description || '']
    })
    downloadCsv(`${tab}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    toast('CSV exported', 'success')
  }

  const lowStock = tab === 'products' ? filtered.filter((p) => p.stock != null && Number(p.stock) <= 5) : []

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Products & services</h1>
          <p className="subtitle">
            Catalog for invoice lines · {products.length} products · {services.length} services
            {lowStock.length ? ` · ${lowStock.length} low stock` : ''}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
      </div>

      <div className="toolbar sticky-tools">
        <Segmented
          options={[
            { id: 'products', label: `Products (${products.length})` },
            { id: 'services', label: `Services (${services.length})` },
          ]}
          value={tab}
          onChange={(id) => { setTab(id); setQ('') }}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search name, SKU…" />
      </div>

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Name *</label>
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Price (excl. VAT)</label>
          <input className="input" type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div>
          <label className="label">SKU / code</label>
          <input className="input" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        {tab === 'products' && (
          <div>
            <label className="label">Stock level</label>
            <input className="input" type="number" placeholder="Optional" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Description</label>
          <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit">Add {tab === 'products' ? 'product' : 'service'}</button>
      </form>

      {!filtered.length ? (
        <EmptyState
          title={list.length ? 'No matches' : `No ${tab} yet`}
          hint={list.length ? 'Try another search.' : `Add your first ${tab === 'products' ? 'product' : 'service'} for invoice lines.`}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
          .map((p) => {
            const stockLow = p.stock != null && Number(p.stock) <= 5
            return (
              <div key={p.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatMoney(p.price)}
                    {p.sku ? ` · ${p.sku}` : ''}
                    {p.stock != null ? ` · stock ${p.stock}` : ''}
                    {stockLow ? ' · low stock' : ''}
                  </div>
                  {p.description ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.description}</div> : null}
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => del(p.id)}>Delete</button>
              </div>
            )
          })
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action?.()}
      />
    </PageFade>
  )
}
