import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { loadJsPdf } from '../lib/loadJsPdf'
import { downloadJsPdf } from '../lib/pdfOpen'

const makeBlock = (type) => {
  const id = `b-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
  if (type === 'table') return { id, type, title: 'Editable table', headers: ['Description', 'Quantity', 'Unit price'], rows: [['Service item', '1', '0.00'], ['Additional work', '1', '0.00']] }
  if (type === 'chart') return { id, type, title: 'Performance graph', labels: ['Jan', 'Feb', 'Mar', 'Apr'], values: [12, 18, 14, 24], chartType: 'bar', source: 'manual' }
  if (type === 'billable') return { id, type, title: 'Billable items', items: [{ description: 'Labour', qty: 1, rate: 450 }, { description: 'Materials', qty: 1, rate: 0 }], vat: 15 }
  if (type === 'selector') return { id, type, title: 'Customer selection', label: 'Choose an option', options: ['Standard', 'Priority', 'Premium'], selected: 'Standard', selectedValues: ['Standard'], mode: 'dropdown', required: false }
  if (type === 'checklist') return { id, type, title: 'Checklist', items: [{ text: 'Confirm requirements', done: false }, { text: 'Complete work', done: false }] }
  if (type === 'callout') return { id, type, title: 'Important information', text: 'Add a clear note for the reader.' }
  if (type === 'heading') return { id, type, title: 'Heading', text: 'Add a heading' }
  if (type === 'quote') return { id, type, title: 'Customer quote / note', text: 'Add a quoted note or customer statement.' }
  if (type === 'divider') return { id, type }
  return { id, type: 'text', title: 'Content block', text: 'Start writing your detailed content here.' }
}

const BILLABLE_CATALOG = [
  { description: 'Labour / technician time', qty: 1, rate: 450 },
  { description: 'Call-out fee', qty: 1, rate: 250 },
  { description: 'Diagnostics / assessment', qty: 1, rate: 180 },
  { description: 'Travel / distance', qty: 1, rate: 0 },
  { description: 'Consumables', qty: 1, rate: 0 },
  { description: 'Parts and materials', qty: 1, rate: 0 },
]

const BLOCK_TYPES = [
  ['text','Text'], ['heading','Heading'], ['quote','Quote / note'], ['callout','Callout'], ['checklist','Checklist'],
  ['table','Editable table'], ['chart','Graph / chart'], ['billable','Billable items'],
  ['selector','Selection field'], ['divider','Divider'],
]

export default function ContentStudio() {
  const { user, company, toast, invoices = [], expenses = [], payments = [], tickets = [] } = useApp()
  const navigate = useNavigate()
  const storageKey = `sa_content_studio_${user?.id || user?.email || 'workspace'}`
  const [title, setTitle] = useState('New business document')
  const [blocks, setBlocks] = useState([makeBlock('heading'), makeBlock('text'), makeBlock('billable')])
  const [selectedId, setSelectedId] = useState('')
  const [clipboardBlock, setClipboardBlock] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [tableSort, setTableSort] = useState({ column: -1, asc: true })
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [busy, setBusy] = useState(false)
  const selected = blocks.find((b) => b.id === selectedId) || blocks[0] || null

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved && Array.isArray(saved.blocks)) {
        setTitle(saved.title || 'New business document')
        setBlocks(saved.blocks)
        setSelectedId(saved.blocks[0]?.id || '')
      }
    } catch {}
  }, [storageKey])

  const commitBlocks = (change) => setBlocks(current => {
    const next = typeof change === 'function' ? change(current) : change
    if (next !== current) { setUndoStack(stack => [...stack, current].slice(-40)); setRedoStack([]) }
    return next
  })
  const undo = () => setUndoStack(stack => {
    if (!stack.length) return stack
    const previous = stack[stack.length - 1]
    setBlocks(current => { setRedoStack(items => [...items, current].slice(-40)); return previous })
    return stack.slice(0, -1)
  })
  const redo = () => setRedoStack(stack => {
    if (!stack.length) return stack
    const next = stack[stack.length - 1]
    setBlocks(current => { setUndoStack(items => [...items, current].slice(-40)); return next })
    return stack.slice(0, -1)
  })
  const applyTemplate = (kind) => {
    const templates = {
      service: [makeBlock('heading'), { ...makeBlock('text'), title: 'Customer concern', text: 'Describe the reported issue and customer requirements.' }, { ...makeBlock('text'), title: 'Assessment and work performed', text: 'Record diagnostics, actions taken and results.' }, makeBlock('table'), makeBlock('checklist'), makeBlock('billable')],
      quote: [makeBlock('heading'), { ...makeBlock('text'), title: 'Scope of work', text: 'Describe what is included and excluded.' }, makeBlock('table'), makeBlock('billable'), { ...makeBlock('callout'), title: 'Terms and conditions', text: 'Add validity, payment and acceptance terms.' }],
      report: [makeBlock('heading'), { ...makeBlock('text'), title: 'Executive summary', text: 'Summarise key findings.' }, makeBlock('chart'), makeBlock('table'), makeBlock('checklist')],
    }
    const next = templates[kind] || []
    commitBlocks(next); setSelectedId(next[0]?.id || '')
  }
  const update = (id, patch) => commitBlocks((old) => old.map((b) => b.id === id ? { ...b, ...patch } : b))
  const add = (type) => {
    const block = makeBlock(type)
    setBlocks((old) => [...old, block])
    setSelectedId(block.id)
  }
  const remove = (id) => {
    setBlocks((old) => {
      const next = old.filter((b) => b.id !== id)
      setSelectedId(next[0]?.id || '')
      return next
    })
  }
  const move = (id, delta) => setBlocks((old) => {
    const index = old.findIndex((b) => b.id === id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= old.length) return old
    const next = [...old]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const copyBlock = async (block, cut = false) => {
    if (!block) return
    setClipboardBlock({ ...block, id: `b-${Date.now()}` })
    try { await navigator.clipboard.writeText(JSON.stringify(block)) } catch {}
    if (cut) remove(block.id)
    toast?.(cut ? 'Block cut to the editor clipboard' : 'Block copied', 'success')
  }
  const pasteBlock = async () => {
    let block = clipboardBlock
    if (!block) {
      try { block = JSON.parse(await navigator.clipboard.readText()) } catch {}
    }
    if (!block?.type) return toast?.('Copy a block first, or copy block JSON from another editor.', 'info')
    const clone = { ...block, id: `b-${Date.now()}-${Math.random().toString(36).slice(2,6)}` }
    setBlocks((old) => [...old, clone])
    setSelectedId(clone.id)
    toast?.('Block pasted', 'success')
  }
  useEffect(() => {
    const onShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'z' && event.shiftKey) { event.preventDefault(); redo(); return }
      if (key === 'z') { event.preventDefault(); undo(); return }
      if (key === 'y') { event.preventDefault(); redo(); return }
      if (key === 'c' && selected) { event.preventDefault(); copyBlock(selected, false); return }
      if (key === 'x' && selected) { event.preventDefault(); copyBlock(selected, true); return }
      if (key === 'v') { event.preventDefault(); pasteBlock() }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [selected, undoStack, redoStack, clipboardBlock])
  const saveDraft = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ title, blocks, savedAt: new Date().toISOString() }))
      toast?.('Draft saved on this device for this workspace', 'success')
    } catch { toast?.('Could not save draft on this device', 'error') }
  }
  const convertTextToTable = () => {
    const rows = pasteText.split(/\r?\n/).map((line) => line.split(/[\t,;]/).map((v) => v.trim())).filter((r) => r.some(Boolean))
    if (!rows.length) return toast?.('Paste tab-, comma- or semicolon-separated content first', 'info')
    const width = Math.max(...rows.map((r) => r.length))
    const padded = rows.map((r) => [...r, ...Array(Math.max(0, width - r.length)).fill('')])
    const block = { id: `b-${Date.now()}`, type: 'table', title: 'Converted content table', headers: padded[0], rows: padded.slice(1).length ? padded.slice(1) : [['', ...Array(width - 1).fill('')]] }
    setBlocks((old) => [...old, block])
    setSelectedId(block.id)
    setPasteText('')
    toast?.('Content converted into an editable table', 'success')
  }
  const visibleTableRows = (block) => {
    let rows = [...(block.rows || [])]
    if (tableFilter.trim()) rows = rows.filter(row => row.some(cell => String(cell ?? '').toLowerCase().includes(tableFilter.toLowerCase())))
    if (tableSort.column >= 0) rows.sort((a,b) => String(a[tableSort.column] ?? '').localeCompare(String(b[tableSort.column] ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * (tableSort.asc ? 1 : -1))
    return rows
  }
  const exportTableCsv = (block) => {
    const quote = value => '"' + String(value ?? '').replace(/"/g, '""') + '"'
    const csv = [block.headers || [], ...(block.rows || [])].map(row => row.map(quote).join(',')).join('\\r\\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = (block.title || 'table').replace(/[^\\w.-]+/g, '_') + '.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const billableTotal = (b) => {
    const subtotal = (b.items || []).reduce((s, item) => s + Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.rate) || 0), 0)
    return { subtotal, vat: subtotal * (Math.max(0, Number(b.vat) || 0) / 100), total: subtotal * (1 + Math.max(0, Number(b.vat) || 0) / 100) }
  }
  const businessSeries = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().slice(0, 7) })
    const series = (rows, amount) => months.map((month) => rows.filter((r) => String(r.date || r.createdAt || '').slice(0, 7) === month).reduce((sum, r) => sum + (Number(amount(r)) || 0), 0))
    return { invoices: { labels: months, values: series(invoices, r => r.total) }, expenses: { labels: months, values: series(expenses, r => r.amount) }, payments: { labels: months, values: series(payments, r => r.amount) }, jobs: { labels: months, values: series(tickets, () => 1) } }
  }, [invoices, expenses, payments, tickets])
  const applyBusinessSeries = (block, source) => { const data = businessSeries[source]; update(block.id, data ? { source, labels: data.labels, values: data.values } : { source }) }
  const sendBillablesToInvoice = (block) => {
    const rows = (block.items || []).filter(item => String(item.description || '').trim()).map(item => ({ description: String(item.description).trim(), qty: Math.max(0, Number(item.qty) || 0), price: Math.max(0, Number(item.rate) || 0) }))
    if (!rows.length) return toast?.('Add at least one billable line first.', 'info')
    try { localStorage.setItem('sa_content_studio_invoice_lines', JSON.stringify({ owner: storageKey, rows, createdAt: new Date().toISOString() })); navigate('/invoices/new?fromStudio=1') }
    catch { toast?.('Could not prepare invoice lines on this device.', 'error') }
  }
  const totals = useMemo(() => blocks.filter((b) => b.type === 'billable').reduce((s, b) => {
    const t = billableTotal(b); s.subtotal += t.subtotal; s.vat += t.vat; s.total += t.total; return s
  }, { subtotal: 0, vat: 0, total: 0 }), [blocks])

  const exportPdf = async () => {
    setBusy(true)
    try {
      const jsPDF = await loadJsPdf()
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const left = 16, width = pageW - 32
      let y = 18
      const ensure = (h) => { if (y + h > pageH - 18) { doc.addPage(); y = 18 } }
      const line = (txt, size = 10, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size)
        const lines = doc.splitTextToSize(String(txt ?? ''), width)
        ensure(lines.length * 5 + 3); doc.text(lines, left, y); y += lines.length * 5 + 3
      }
      doc.setTextColor(0, 105, 68); line(company?.name || 'SA Invoice Pro', 10, true)
      doc.setTextColor(25, 35, 45); line(title, 19, true); line('Generated ' + new Date().toLocaleString('en-ZA'), 8)
      for (const b of blocks) {
        ensure(12)
        if (b.type === 'divider') { doc.setDrawColor(190); doc.line(left, y, pageW-left, y); y += 7; continue }
        if (b.type === 'heading') { line(b.text || b.title || 'Heading', 14, true); continue }
        if (b.type === 'text' || b.type === 'callout' || b.type === 'quote') { if (b.title) line(b.title, 11, true); line(b.text || '', 9); continue }
        if (b.type === 'checklist') { line(b.title, 11, true); (b.items || []).forEach((x) => line((x.done ? '[x] ' : '[ ] ') + x.text, 9)); continue }
        if (b.type === 'selector') { line(b.title, 11, true); line((b.label || 'Selection') + ': ' + ((b.mode === 'multi' ? (b.selectedValues || []).join(', ') : b.selected) || '—'), 9); continue }
        if (b.type === 'table') {
          line(b.title, 11, true)
          const headers = b.headers || []
          const rows = b.rows || []
          const colW = width / Math.max(1, headers.length)
          doc.setFillColor(225, 239, 232); doc.rect(left, y-4, width, 8, 'F')
          headers.forEach((h,i) => doc.text(doc.splitTextToSize(String(h), colW-2)[0] || '', left+i*colW+1, y))
          y += 7
          rows.forEach((row) => { ensure(7); row.forEach((v,i) => doc.text(doc.splitTextToSize(String(v), colW-2)[0] || '', left+i*colW+1, y)); y += 6; doc.setDrawColor(225); doc.line(left,y-3,pageW-left,y-3) })
          y += 3; continue
        }
        if (b.type === 'chart') {
          line(b.title, 11, true)
          const vals = (b.values || []).map(Number); const max = Math.max(1, ...vals)
          vals.forEach((v,i) => { ensure(7); doc.setFillColor(0,122,77); const barW = Math.max(1, width * Math.max(0,v) / max * .65); doc.rect(left,y-3,barW,4,'F'); doc.setTextColor(40); doc.text(String(b.labels?.[i] || i+1) + ': ' + v, left+Math.min(barW+2,width-25), y); y += 7 })
          continue
        }
        if (b.type === 'billable') {
          line(b.title, 11, true)
          ;(b.items || []).forEach((item) => line(`${item.description} | ${item.qty} × R${Number(item.rate||0).toFixed(2)} = R${(Number(item.qty||0)*Number(item.rate||0)).toFixed(2)}`, 9))
          const t = billableTotal(b); line(`Subtotal R${t.subtotal.toFixed(2)} · VAT R${t.vat.toFixed(2)} · Total R${t.total.toFixed(2)}`, 10, true)
        }
      }
      doc.setTextColor(90); doc.setFontSize(7); doc.text('Prepared with SA Invoice Pro Document & Content Studio', left, pageH-9)
      await downloadJsPdf(doc, (title || 'document').replace(/[^\w.-]+/g,'_') + '.pdf')
      toast?.('PDF exported', 'success')
    } catch (e) { toast?.(e?.message || 'PDF export failed', 'error') }
    finally { setBusy(false) }
  }

  return <div className="page" style={{maxWidth:1200,margin:'0 auto',padding:16}}>
    <div className="page-header" style={{display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
      <div><p className="muted">OWNER SUGGESTION · DOCUMENT & CONTENT STUDIO</p><h1>Content Studio</h1><p className="subtitle">Build detailed documents from editable blocks, tables, graphs, selectors and billable items.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="btn btn-outline" onClick={saveDraft}>Save draft</button><button className="btn btn-primary" disabled={busy} onClick={exportPdf}>{busy?'Preparing…':'Export PDF'}</button></div>
    </div>
    <div className="card" style={{padding:14,marginBottom:14}}>
      <label className="label">Document title</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Document title"/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>{BLOCK_TYPES.map(([type,label])=><button key={type} className="btn btn-outline btn-sm" onClick={()=>add(type)}>+ {label}</button>)}</div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}><span className="muted" style={{alignSelf:'center'}}>Start from template:</span><button className="btn btn-outline btn-sm" onClick={()=>applyTemplate('service')}>Service report</button><button className="btn btn-outline btn-sm" onClick={()=>applyTemplate('quote')}>Quotation</button><button className="btn btn-outline btn-sm" onClick={()=>applyTemplate('report')}>Business report</button></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(280px,1fr)',gap:14,alignItems:'start'}}>
      <section className="card" style={{padding:14,minWidth:0}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',alignItems:'center'}}><h2>Document blocks ({blocks.length})</h2><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="btn btn-outline btn-sm" onClick={undo} disabled={!undoStack.length}>Undo</button><button className="btn btn-outline btn-sm" onClick={redo} disabled={!redoStack.length}>Redo</button><button className="btn btn-outline btn-sm" onClick={pasteBlock}>Paste block</button><button className="btn btn-outline btn-sm" onClick={()=>selected&&copyBlock(selected,false)} disabled={!selected}>Copy</button><button className="btn btn-outline btn-sm" onClick={()=>selected&&copyBlock(selected,true)} disabled={!selected}>Cut</button></div></div>
        <div style={{display:'grid',gap:10}}>
        {blocks.map((b,index)=><article key={b.id} onClick={()=>setSelectedId(b.id)} style={{border:selectedId===b.id?'2px solid #07834f':'1px solid var(--border,#d7dedb)',borderRadius:12,padding:12,background:selectedId===b.id?'rgba(0,130,78,.06)':'transparent',minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:8}}><strong>{index+1}. {b.title || b.type}</strong><div style={{display:'flex',gap:4}}><button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();move(b.id,-1)}} disabled={!index}>↑</button><button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();move(b.id,1)}} disabled={index===blocks.length-1}>↓</button><button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();remove(b.id)}}>Remove</button></div></div>
          {b.type==='heading'&&<h2>{b.text || 'Heading'}</h2>}
          {(b.type==='text'||b.type==='callout'||b.type==='quote')&&<div style={{whiteSpace:'pre-wrap',padding:10,background:b.type==='callout'?'rgba(0,130,78,.09)':'transparent',borderRadius:8}}>{b.text}</div>}
          {b.type==='checklist'&&(b.items||[]).map((it,i)=><div key={i}>☐ {it.text}</div>)}
          {b.type==='table'&&<div><div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}><input className="input" style={{maxWidth:220}} value={tableFilter} onChange={e=>setTableFilter(e.target.value)} placeholder="Filter table rows…"/><button className="btn btn-outline btn-sm" onClick={()=>exportTableCsv(b)}>Export CSV</button></div><div style={{overflowX:'auto'}}><table className="table"><thead><tr>{(b.headers||[]).map((h,i)=><th key={i}><button type="button" className="btn btn-outline btn-sm" onClick={()=>setTableSort(s=>({column:i,asc:s.column===i?!s.asc:true}))}>{h} ↕</button></th>)}</tr></thead><tbody>{visibleTableRows(b).map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody><tfoot><tr>{(b.headers||[]).map((_,col)=><td key={col}><strong>{(b.rows||[]).some(row=>String(row[col]??'').trim()!==''&&!Number.isNaN(Number(row[col])))?((b.rows||[]).reduce((sum,row)=>sum+(Number(row[col])||0),0).toLocaleString('en-ZA')):''}</strong></td>)}</tr></tfoot></table></div></div>}
          {b.type==='chart'&&<div style={{display:'grid',gap:8}}><small className="muted">{b.source&&b.source!=='manual'?'Workspace data · '+b.source:'Manual data'} · {b.chartType||'bar'}</small>{b.chartType==='pie'?<div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><div style={{width:120,height:120,borderRadius:'50%',background:'conic-gradient('+((b.values||[]).map((v,i)=>{const total=(b.values||[]).reduce((s,x)=>s+Math.max(0,Number(x)||0),0)||1;const start=(b.values||[]).slice(0,i).reduce((s,x)=>s+Math.max(0,Number(x)||0),0)/total*100;const end=start+Math.max(0,Number(v)||0)/total*100;return ['#087f50','#3b82f6','#e0a126','#8b5cf6','#dc5b5b'][i%5]+' '+start+'% '+end+'%'})).join(',')+')'}}/><div style={{display:'grid',gap:3}}>{(b.values||[]).map((v,i)=><small key={i}>{b.labels?.[i]||i+1}: {v}</small>)}</div></div>:b.chartType==='line'?<div style={{overflow:'hidden'}}><svg viewBox="0 0 300 110" width="100%" role="img" aria-label={b.title}><polyline fill="none" stroke="#07834f" strokeWidth="3" points={(b.values||[]).map((v,i)=>`${(i/Math.max(1,b.values.length-1))*280+10},${100-(Math.max(0,Number(v)||0)/Math.max(1,...b.values.map(Number))*85)}`).join(' ')}/>{(b.values||[]).map((v,i)=><circle key={i} cx={(i/Math.max(1,b.values.length-1))*280+10} cy={100-(Math.max(0,Number(v)||0)/Math.max(1,...b.values.map(Number))*85)} r="4" fill="#07834f"/>)}</svg><div style={{display:'flex',justifyContent:'space-between',gap:4}}>{(b.labels||[]).map((label,i)=><small key={i}>{label}</small>)}</div></div>:<div style={{display:'grid',gap:5}}>{(b.values||[]).map((v,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'75px 1fr 55px',gap:8,alignItems:'center'}}><small>{b.labels?.[i]||i+1}</small><div style={{height:12,background:'var(--border,#ddd)',borderRadius:20,overflow:'hidden'}}><div style={{height:'100%',width:(Math.max(0,Number(v))/Math.max(1,...b.values.map(Number))*100)+'%',background:'#07834f'}}/></div><small>{Number(v).toLocaleString('en-ZA')}</small></div>)}</div>}</div>}
          {b.type==='billable'&&<div><div className="muted">{(b.items||[]).length} billable lines · Total R{billableTotal(b).total.toFixed(2)}</div>{(b.items||[]).map((it,i)=><div key={i}>{it.description} — {it.qty} × R{Number(it.rate||0).toFixed(2)}</div>)}</div>}
          {b.type==='selector'&&<div>{b.label}: <strong>{b.mode==='multi'?(b.selectedValues||[]).join(', '):b.selected}</strong></div>}
          {b.type==='divider'&&<hr/>}
        </article>)}
        </div>
        {!blocks.length&&<p className="muted">Add a block to start building your document.</p>}
      </section>
      <aside style={{display:'grid',gap:14,minWidth:0}}>
        <section className="card" style={{padding:14}}>
          <h2>Block editor</h2>
          {!selected?<p className="muted">Select a block to edit.</p>:<>
            <label className="label">Block title</label><input className="input" value={selected.title||''} onChange={e=>update(selected.id,{title:e.target.value})}/>
            {(selected.type==='text'||selected.type==='heading'||selected.type==='callout'||selected.type==='quote')&&<><label className="label">Content</label><textarea className="input" rows={7} value={selected.text||''} onChange={e=>update(selected.id,{text:e.target.value})}/></>}
            {selected.type==='checklist'&&<>{(selected.items||[]).map((it,i)=><div key={i} style={{display:'flex',gap:8,marginBottom:6}}><input type="checkbox" checked={!!it.done} onChange={e=>update(selected.id,{items:selected.items.map((x,j)=>j===i?{...x,done:e.target.checked}:x)})}/><input className="input" value={it.text} onChange={e=>update(selected.id,{items:selected.items.map((x,j)=>j===i?{...x,text:e.target.value}:x)})}/><button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{items:selected.items.filter((_,j)=>j!==i)})}>×</button></div>)}<button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{items:[...selected.items,{text:'New checklist item',done:false}]})}>Add checklist item</button></>}
            {selected.type==='table'&&<><label className="label">Column headings</label>{(selected.headers||[]).map((h,i)=><input key={i} className="input" style={{marginBottom:5}} value={h} onChange={e=>update(selected.id,{headers:selected.headers.map((x,j)=>j===i?e.target.value:x)})}/>)}<button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{headers:[...selected.headers,'New column'],rows:selected.rows.map(r=>[...r,''])})}>Add column</button><div style={{overflowX:'auto',marginTop:10}}><table className="table"><tbody>{(selected.rows||[]).map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}><input className="input" style={{minWidth:90}} value={v} onChange={e=>update(selected.id,{rows:selected.rows.map((r,k)=>k===i?r.map((x,l)=>l===j?e.target.value:x):r)})}/></td>)}<td><button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{rows:selected.rows.filter((_,k)=>k!==i)})}>×</button></td></tr>)}</tbody></table></div><button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{rows:[...selected.rows,selected.headers.map(()=> '')]})}>Add row</button></>}
            {selected.type==='chart'&&<><label className="label">Data source</label><select className="select" value={selected.source||'manual'} onChange={e=>applyBusinessSeries(selected,e.target.value)}><option value="manual">Manual data</option><option value="invoices">Invoice totals</option><option value="payments">Payments received</option><option value="expenses">Expenses</option><option value="jobs">Jobs created</option></select><label className="label">Chart type</label><select className="select" value={selected.chartType||'bar'} onChange={e=>update(selected.id,{chartType:e.target.value})}><option value="bar">Bar chart</option><option value="line">Line chart (summary)</option><option value="pie">Category breakdown (summary)</option></select>{(selected.values||[]).map((v,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 34px',gap:6,marginBottom:6}}><input className="input" value={selected.labels?.[i]||''} onChange={e=>update(selected.id,{labels:selected.labels.map((x,j)=>j===i?e.target.value:x)})}/><input className="input" type="number" value={v} onChange={e=>update(selected.id,{values:selected.values.map((x,j)=>j===i?Number(e.target.value):x)})}/><button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{labels:selected.labels.filter((_,j)=>j!==i),values:selected.values.filter((_,j)=>j!==i)})}>×</button></div>)}<button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{labels:[...selected.labels,'New'],values:[...selected.values,0]})}>Add data point</button></>}
            {selected.type==='billable'&&<><label className="label">VAT rate (%)</label><input className="input" type="number" value={selected.vat} onChange={e=>update(selected.id,{vat:Number(e.target.value)})}/>{(selected.items||[]).map((it,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1fr 65px 90px 34px',gap:5,marginBottom:6}}><input className="input" value={it.description} onChange={e=>update(selected.id,{items:selected.items.map((x,j)=>j===i?{...x,description:e.target.value}:x)})}/><input className="input" type="number" value={it.qty} onChange={e=>update(selected.id,{items:selected.items.map((x,j)=>j===i?{...x,qty:Number(e.target.value)}:x)})}/><input className="input" type="number" value={it.rate} onChange={e=>update(selected.id,{items:selected.items.map((x,j)=>j===i?{...x,rate:Number(e.target.value)}:x)})}/><button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{items:selected.items.filter((_,j)=>j!==i)})}>×</button></div>)}<div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:8}}>{BILLABLE_CATALOG.map((item,i)=><button key={i} className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{items:[...selected.items,{...item}]})}>+ {item.description}</button>)}</div><button className="btn btn-outline btn-sm" onClick={()=>update(selected.id,{items:[...selected.items,{description:'New billable item',qty:1,rate:0}]})}>Add billable line</button><p><strong>Subtotal R{billableTotal(selected).subtotal.toFixed(2)} · VAT R{billableTotal(selected).vat.toFixed(2)} · Total R{billableTotal(selected).total.toFixed(2)}</strong></p><button className="btn btn-primary" onClick={()=>sendBillablesToInvoice(selected)}>Use reviewed lines in new invoice</button></>}
            {selected.type==='selector'&&<><label className="label">Field label</label><input className="input" value={selected.label||''} onChange={e=>update(selected.id,{label:e.target.value})}/><label className="label">Options (one per line)</label><textarea className="input" rows={4} value={(selected.options||[]).join('\n')} onChange={e=>{const options=e.target.value.split('\n');update(selected.id,{options,selected:options.includes(selected.selected)?selected.selected:options[0]||''})}}/><label className="label">Selection control</label><select className="select" value={selected.mode||'dropdown'} onChange={e=>update(selected.id,{mode:e.target.value,selectedValues:selected.mode==='multi'?(selected.selectedValues||[]):[selected.selected||selected.options?.[0]||'']})}><option value="dropdown">Dropdown</option><option value="multi">Multiple selection</option><option value="radio">Radio choices</option><option value="checkbox">Checkbox choices</option></select>{selected.mode==='multi'||selected.mode==='checkbox'?<div>{(selected.options||[]).map((o,i)=><label key={i} style={{display:'block',padding:4}}><input type="checkbox" checked={(selected.selectedValues||[]).includes(o)} onChange={e=>{const values=e.target.checked?[...(selected.selectedValues||[]),o]:(selected.selectedValues||[]).filter(x=>x!==o);update(selected.id,{selectedValues:values})}}/> {o}</label>)}</div>:selected.mode==='radio'?<div>{(selected.options||[]).map((o,i)=><label key={i} style={{display:'block',padding:4}}><input type="radio" name={'selector-'+selected.id} checked={selected.selected===o} onChange={()=>update(selected.id,{selected:o})}/> {o}</label>)}</div>:<><label className="label">Selected value</label><select className="select" value={selected.selected||''} onChange={e=>update(selected.id,{selected:e.target.value})}>{(selected.options||[]).map((o,i)=><option key={i} value={o}>{o}</option>)}</select></>}<label><input type="checkbox" checked={!!selected.required} onChange={e=>update(selected.id,{required:e.target.checked})}/> Required field</label></>}
          </>}
        </section>
        <section className="card" style={{padding:14}}><h2>Paste & convert</h2><p className="muted">Paste rows from Excel, CSV or tab-separated text and turn them into an editable table.</p><textarea className="input" rows={5} value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={'Item\tQty\tPrice\nLabour\t2\t450'}/><button className="btn btn-primary" style={{marginTop:8}} onClick={convertTextToTable}>Convert pasted content to table</button></section>
        <section className="card" style={{padding:14}}><h2>Document totals</h2><div>Billable subtotal <strong>R{totals.subtotal.toFixed(2)}</strong></div><div>VAT <strong>R{totals.vat.toFixed(2)}</strong></div><div style={{fontSize:20,marginTop:6}}>Total <strong>R{totals.total.toFixed(2)}</strong></div><p className="muted">Billable blocks are document calculations only. They do not create or change an invoice until you deliberately transfer the reviewed items into an invoice.</p></section>
      </aside>
    </div>
    <style>{`@media(max-width:800px){.page > div[style*="grid-template-columns"]{grid-template-columns:1fr!important}} .page .input,.page .select{max-width:100%;box-sizing:border-box} .page button{min-height:36px} @media(max-width:520px){.page .card div[style*='grid-template-columns: 1fr 65px 90px 34px']{grid-template-columns:minmax(0,1fr) 54px 72px 30px!important;gap:4px!important}.page .card input{min-width:0}}`}</style>
  </div>
}
