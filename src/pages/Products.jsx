import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, Segmented, downloadCsv,
} from '../components/ui'
import { IT_SERVICE_PRESETS, IT_PRODUCT_PRESETS, presetToServiceRow, presetToProductRow } from '../lib/itCatalog'
import { listBranches } from '../lib/branches'
import { applyStockTransfer, stockAt, stockTotal, formatBranchLabel, HQ_KEY } from '../lib/stockTransfer'

export default function Products() {
  const { products, services, refresh, toast } = useApp()
  const [tab, setTab] = useState('products')
  const [form, setForm] = useState({ name: '', price: '', sku: '', stock: '', description: '' })
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

  const duplicate = async (p) => {
    await db.add(store, {
      name: `${p.name || 'Item'} (copy)`,
      price: Number(p.price) || 0,
      description: p.description || '',
      sku: p.sku ? `${p.sku}-COPY` : '',
      stock: tab === 'products' ? (p.stock ?? null) : undefined,
    })
    await refresh()
    toast('Duplicated', 'success')
  }

  const adjustStock = async (p, delta) => {
    if (tab !== 'products') return
    const next = Math.max(0, (Number(p.stock) || 0) + delta)
    await db.put(store, { ...p, stock: next })
    await refresh()
    toast(`Stock → ${next}`, 'success')
  }

  const runTransfer = async (e) => {
    e?.preventDefault?.()
    const p = products.find((x) => String(x.id) === String(xfer.productId))
    if (!p) return toast('Select a product', 'error')
    try {
      const next = applyStockTransfer(p, {
        fromBranchId: xfer.from === HQ_KEY ? '' : xfer.from,
        toBranchId: xfer.to === HQ_KEY ? '' : xfer.to,
        qty: xfer.qty,
        note: xfer.note,
      })
      await db.put(STORES.products, next)
      await refresh()
      toast(
        `Moved ${xfer.qty} · ${formatBranchLabel(xfer.from, branches)} → ${formatBranchLabel(xfer.to, branches)}`,
        'success',
      )
      setXfer((s) => ({ ...s, qty: '1', note: '' }))
    } catch (err) {
      toast(err?.message || 'Transfer failed', 'error')
    }
  }

  const exportCsv = () => {
    const headers =
      tab === 'products'
        ? ['Name', 'SKU', 'Price', 'Stock total', 'Description']
        : ['Name', 'SKU', 'Price', 'Description']
    const rows = filtered.map((p) => {
      if (tab === 'products')
        return [p.name || '', p.sku || '', Number(p.price) || 0, stockTotal(p), p.description || '']
      return [p.name || '', p.sku || '', Number(p.price) || 0, p.description || '']
    })
    downloadCsv(`${tab}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    toast('CSV exported', 'success')
  }

  const lowStock = tab === 'products' ? filtered.filter((p) => p.stock != null && Number(p.stock) <= 5) : []

  return (
    <PageFade>
      <div className="card it-pack-banner" style={{ marginBottom: 12 }}>
        <strong>IT & repair pack</strong>
        <p className="muted" style={{ margin: '6px 0 10px', fontSize: 13 }}>
          One-tap catalog for PC, smartphone, FRP/lock assist (legal owner only), on-site, remote, workshop, retainers — rates you can edit.
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={installItPack}>
          Install IT service pack
        </button>
      </div>

      <div className="page-header">
        <div>
          <h1>Products & services</h1>
          <p className="subtitle">
            Catalog · inter-branch stock · {products.length} products · {services.length} services
            {lowStock.length ? ` · ${lowStock.length} low stock` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
          <Link className="btn btn-secondary" to="/invoices/new">
            Use on invoice
          </Link>
          <Link className="btn btn-outline" to="/quotes">
            Use on quote
          </Link>
        </div>
      </div>

      <div className="toolbar sticky-tools">
        <Segmented
          options={[
            { id: 'products', label: `Products (${products.length})` },
            { id: 'services', label: `Services (${services.length})` },
          ]}
          value={tab}
          onChange={(id) => {
            setTab(id)
            setQ('')
          }}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search name, SKU…" />
      </div>

      {tab === 'products' && branches.length > 0 && (
        <form className="card form-grid cols-2" onSubmit={runTransfer} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, gridColumn: '1 / -1', fontSize: 15 }}>Transfer stock between branches</h3>
          <div>
            <label className="label">Product</label>
            <select
              className="input select"
              value={xfer.productId}
              onChange={(e) => setXfer({ ...xfer, productId: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (total {stockTotal(p)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Qty</label>
            <input
              className="input"
              type="number"
              min={1}
              value={xfer.qty}
              onChange={(e) => setXfer({ ...xfer, qty: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">From</label>
            <select
              className="input select"
              value={xfer.from}
              onChange={(e) => setXfer({ ...xfer, from: e.target.value })}
            >
              <option value={HQ_KEY}>HQ / unassigned</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">To</label>
            <select
              className="input select"
              value={xfer.to}
              onChange={(e) => setXfer({ ...xfer, to: e.target.value })}
              required
            >
              <option value="">Select…</option>
              <option value={HQ_KEY}>HQ / unassigned</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              value={xfer.note}
              onChange={(e) => setXfer({ ...xfer, note: e.target.value })}
              placeholder="e.g. Sandton job board restock"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Transfer
          </button>
        </form>
      )}

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Name *</label>
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Price (excl. VAT)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
        <div>
          <label className="label">SKU / code</label>
          <input
            className="input"
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
        </div>
        {tab === 'products' && (
          <div>
            <label className="label">Stock level (HQ)</label>
            <input
              className="input"
              type="number"
              placeholder="Optional"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Description</label>
          <input
            className="input"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Add {tab === 'products' ? 'product' : 'service'}
        </button>
      </form>

      {!filtered.length ? (
        <EmptyState
          title={list.length ? 'No matches' : `No ${tab} yet`}
          hint={
            list.length
              ? 'Try another search.'
              : `Add your first ${tab === 'products' ? 'product' : 'service'} — or install the IT pack above.`
          }
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
          .map((p) => {
            const total = stockTotal(p)
            const stockLow = total <= 5 && (p.stock != null || p.branchStock)
            return (
              <div
                key={p.id}
                className="list-card"
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
              >
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
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {p.description}
                    </div>
                  ) : null}
                </div>
                <div className="list-card-actions">
                  {tab === 'products' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => adjustStock(p, -1)}
                        title="Stock −1"
                      >
                        −1
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => adjustStock(p, 1)}
                        title="Stock +1"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setXfer((s) => ({ ...s, productId: p.id }))}
                      >
                        Transfer
                      </button>
                    </>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => duplicate(p)}>
                    Dup
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => del(p.id)}>
                    Delete
                  </button>
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
