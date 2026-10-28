import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, Segmented, downloadCsv, ActionMenu,
} from '../components/ui'
import { IT_SERVICE_PRESETS, IT_PRODUCT_PRESETS, presetToServiceRow, presetToProductRow } from '../lib/itCatalog'
import { listBranches } from '../lib/branches'
import { applyStockTransfer, stockAt, stockTotal, formatBranchLabel, HQ_KEY } from '../lib/stockTransfer'

export default function Products() {
  const { products, services, refresh, toast } = useApp()
  const [tab, setTab] = useState('products')
  const blankForm = () => ({ id: undefined, name: '', price: '', sku: '', stock: '', description: '' })
  const [form, setForm] = useState(blankForm())
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [branches, setBranches] = useState([])
  const [xfer, setXfer] = useState({ productId: '', from: HQ_KEY, to: '', qty: '1', note: '' })

  useEffect(() => {
    listBranches().then(setBranches).catch(() => setBranches([]))
  }, [])

  const list = tab === 'products' ? products : services
  const store = tab === 'products' ? STORES.products : STORES.services

  const filtered = useMemo(
    () => list.filter((p) => matchesQuery(p, q, ['name', 'sku', 'description'])),
    [list, q],
  )

  const installItPack = async () => {
    try {
      let n = 0
      for (const s of IT_SERVICE_PRESETS) {
        await db.add(STORES.services, presetToServiceRow(s))
        n++
      }
      for (const pr of IT_PRODUCT_PRESETS) {
        await db.add(STORES.products, presetToProductRow(pr))
        n++
      }
      await refresh?.()
      toast?.(`Installed IT pack · ${n} items (edit prices anytime)`, 'success')
    } catch (e) {
      toast?.(e?.message || 'Install failed', 'error')
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    try {
      const row = {
        name: form.name.trim(),
        price: Number(form.price) || 0,
        description: form.description || '',
        sku: form.sku || '',
        updatedAt: new Date().toISOString(),
      }
      if (form.id) row.id = form.id
      if (tab === 'products') row.stock = form.stock === '' ? null : Number(form.stock)
      if (form.id) {
        const existing = (list || []).find((x) => String(x.id) === String(form.id))
        await db.put(store, { ...(existing || {}), ...row })
        toast('Updated', 'success')
      } else {
        await db.add(store, row)
        toast('Saved', 'success')
      }
      setForm(blankForm())
      await refresh()
    } catch (err) {
      toast(err?.message || 'Save failed', 'error')
    }
  }

  const startEdit = (item) => {
    setForm({
      id: item.id,
      name: item.name || '',
      price: item.price ?? '',
      sku: item.sku || '',
      stock: item.stock == null ? '' : item.stock,
      description: item.description || '',
    })
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }

  const duplicateItem = (item) => {
    setForm({
      id: undefined,
      name: `${item.name || 'Item'} (copy)`,
      price: item.price ?? '',
      sku: '',
      stock: item.stock == null ? '' : item.stock,
      description: item.description || '',
    })
    toast('Editing a copy — save to create', 'info')
  }

  const del = (item) => {
    const id = typeof item === 'object' ? item?.id : item
    setConfirm({
      title: 'Delete item?',
      message: `Remove ${typeof item === 'object' && item?.name ? item.name : 'this item'} permanently?`,
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        try {
          if (id == null) throw new Error('Missing id')
          await db.remove(store, id)
          await refresh()
          toast('Deleted', 'success')
          if (form.id != null && String(form.id) === String(id)) setForm(blankForm())
        } catch (err) {
          toast(err?.message || 'Delete failed', 'error')
        } finally {
          setConfirm(null)
        }
      },
    })
  }

  const adjustStock = async (p, delta) => {
    const total = stockTotal(p)
    const next = Math.max(0, (Number(p.stock) || 0) + delta)
    await db.put(STORES.products, { ...p, stock: next, updatedAt: new Date().toISOString() })
    await refresh()
    toast(delta > 0 ? `Stock +1 (${total + delta})` : `Stock −1 (${Math.max(0, total + delta)})`, 'success')
  }

  const doTransfer = async (e) => {
    e.preventDefault()
    try {
      const product = products.find((x) => String(x.id) === String(xfer.productId))
      if (!product) return toast('Pick a product', 'error')
      const qty = Number(xfer.qty) || 0
      if (qty <= 0) return toast('Qty required', 'error')
      const next = applyStockTransfer(product, { from: xfer.from, to: xfer.to, qty })
      await db.put(STORES.products, { ...next, updatedAt: new Date().toISOString() })
      await refresh()
      toast('Transfer applied', 'success')
    } catch (err) {
      toast(err?.message || 'Transfer failed', 'error')
    }
  }

  const exportCsv = () => {
    downloadCsv(
      `${tab}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'SKU', 'Price', 'Stock', 'Description'],
      filtered.map((p) => [p.name || '', p.sku || '', Number(p.price) || 0, tab === 'products' ? stockTotal(p) : '', p.description || '']),
    )
    toast('CSV exported', 'success')
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Catalog</h1>
          <p className="subtitle">Products & services · edit · stock · branches</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>Export</button>
          <button type="button" className="btn btn-secondary" onClick={installItPack}>Install IT pack</button>
          <Link className="btn btn-outline" to="/branches">Branches</Link>
        </div>
      </div>

      <Segmented
        options={[
          { id: 'products', label: `Products (${products.length})` },
          { id: 'services', label: `Services (${services.length})` },
        ]}
        value={tab}
        onChange={(id) => { setTab(id); setForm(blankForm()) }}
      />

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, SKU…" />
      </div>

      {tab === 'products' && branches.length > 0 && (
        <form className="card form-grid cols-2" onSubmit={doTransfer} style={{ marginBottom: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}><strong>Branch stock transfer</strong></div>
          <div>
            <label className="label">Product</label>
            <select className="input select" value={xfer.productId} onChange={(e) => setXfer({ ...xfer, productId: e.target.value })}>
              <option value="">Select…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Qty</label>
            <input className="input" type="number" min="1" value={xfer.qty} onChange={(e) => setXfer({ ...xfer, qty: e.target.value })} />
          </div>
          <div>
            <label className="label">From</label>
            <select className="input select" value={xfer.from} onChange={(e) => setXfer({ ...xfer, from: e.target.value })}>
              <option value={HQ_KEY}>{formatBranchLabel(HQ_KEY, branches)}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{formatBranchLabel(b.id, branches)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">To</label>
            <select className="input select" value={xfer.to} onChange={(e) => setXfer({ ...xfer, to: e.target.value })}>
              <option value="">Select…</option>
              <option value={HQ_KEY}>{formatBranchLabel(HQ_KEY, branches)}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{formatBranchLabel(b.id, branches)}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Transfer</button>
        </form>
      )}

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>{form.id ? 'Edit item' : `New ${tab === 'products' ? 'product' : 'service'}`}</strong>
        </div>
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
            <label className="label">Stock level (HQ)</label>
            <input className="input" type="number" placeholder="Optional" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Description</label>
          <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit">
          {form.id ? 'Update' : 'Add'} {tab === 'products' ? 'product' : 'service'}
        </button>
        {form.id ? (
          <button type="button" className="btn btn-outline" onClick={() => setForm(blankForm())}>Cancel edit</button>
        ) : null}
      </form>

      {!filtered.length ? (
        <EmptyState
          title={list.length ? 'No matches' : `No ${tab} yet`}
          hint={list.length ? 'Try another search.' : `Add your first ${tab === 'products' ? 'product' : 'service'} — or install the IT pack above.`}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
          .map((p) => {
            const total = stockTotal(p)
            const stockLow = total <= 5 && (p.stock != null || p.branchStock)
            return (
              <div key={p.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatMoney(p.price)}
                    {p.sku ? ` · ${p.sku}` : ''}
                    {tab === 'products' ? ` · stock ${total}` : ''}
                    {stockLow ? ' · low stock' : ''}
                  </div>
                  {tab === 'products' && branches.length > 0 ? (
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      HQ {stockAt(p, '')}
                      {branches.map((b) => ` · ${b.code || b.name}: ${stockAt(p, b.id)}`).join('')}
                    </div>
                  ) : null}
                  {p.description ? (
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.description}</div>
                  ) : null}
                </div>
                <div className="list-card-actions">
                  {tab === 'products' && (
                    <>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => adjustStock(p, -1)} title="Stock −1">−1</button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => adjustStock(p, 1)} title="Stock +1">+1</button>
                    </>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>Edit</button>
                  <ActionMenu
                    label="Actions"
                    items={[
                      { id: 'edit', label: 'Edit', onClick: () => startEdit(p) },
                      { id: 'dup', label: 'Duplicate', onClick: () => duplicateItem(p) },
                      { id: 'del', label: 'Delete', danger: true, onClick: () => del(p) },
                    ]}
                  />
                </div>
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
