import React, { useMemo, useState, useCallback } from 'react'
import { PageFade } from '../components/ui'

/**
 * In-app spreadsheet viewer for CSV / Excel (.xlsx) files.
 * CSV is parsed locally; XLSX uses dynamic import of the `xlsx` package when available.
 */
function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  const s = String(text || '').replace(/^\ufeff/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const next = s[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cell += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(cell); cell = '' }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else if (ch === '\r') { /* skip */ }
      else cell += ch
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

export default function ExcelViewer() {
  const [fileName, setFileName] = useState('')
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState('')
  const [tables, setTables] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  const rows = tables[activeSheet] || []
  const filtered = useMemo(() => {
    if (!q.trim()) return rows
    const needle = q.trim().toLowerCase()
    if (!rows.length) return rows
    const header = rows[0]
    const body = rows.slice(1).filter((r) => r.some((c) => String(c).toLowerCase().includes(needle)))
    return [header, ...body]
  }, [rows, q])

  const loadFile = useCallback(async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    setFileName(file.name)
    try {
      const name = file.name.toLowerCase()
      if (name.endsWith('.csv') || name.endsWith('.tsv') || file.type.includes('csv')) {
        const text = await file.text()
        const parsed = parseCsv(text)
        setTables({ Sheet1: parsed })
        setSheetNames(['Sheet1'])
        setActiveSheet('Sheet1')
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        let XLSX
        try {
          XLSX = await import('xlsx')
        } catch {
          throw new Error('Excel package not installed — use CSV, or add the xlsx dependency to the project')
        }
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const next = {}
        for (const sn of wb.SheetNames) {
          const sheet = wb.Sheets[sn]
          next[sn] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        }
        setTables(next)
        setSheetNames(wb.SheetNames)
        setActiveSheet(wb.SheetNames[0] || '')
      } else {
        throw new Error('Unsupported file — use .csv or .xlsx')
      }
    } catch (e) {
      setError(e.message || String(e))
      setTables({})
      setSheetNames([])
      setActiveSheet('')
    } finally {
      setBusy(false)
    }
  }, [])

  const onDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    if (f) loadFile(f)
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Excel viewer</h1>
          <p className="subtitle">Open CSV or Excel files inside the app</p>
        </div>
      </div>

      <div
        className="card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{ marginBottom: 12, borderStyle: 'dashed' }}
      >
        <p className="muted" style={{ marginTop: 0 }}>
          Drop a <strong>.csv</strong> or <strong>.xlsx</strong> file here, or choose one:
        </p>
        <input
          type="file"
          accept=".csv,.tsv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) loadFile(f)
          }}
        />
        {fileName ? <p style={{ marginBottom: 0 }}>Loaded: <strong>{fileName}</strong></p> : null}
        {error ? <p style={{ color: 'var(--danger, #f87171)' }}>{error}</p> : null}
      </div>

      {sheetNames.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {sheetNames.map((sn) => (
            <button
              key={sn}
              type="button"
              className={`btn btn-sm ${activeSheet === sn ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveSheet(sn)}
            >
              {sn}
            </button>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}>
            <input
              className="input"
              placeholder="Filter rows…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <span className="muted" style={{ marginLeft: 10, fontSize: 13 }}>
              {Math.max(0, filtered.length - 1)} data rows
            </span>
          </div>
          <div className="card" style={{ overflow: 'auto', maxHeight: '70vh', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {filtered.map((r, ri) => (
                  <tr key={ri} style={{ background: ri === 0 ? 'rgba(232,121,249,.12)' : undefined }}>
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        style={{
                          border: '1px solid var(--line, #2a2448)',
                          padding: '6px 10px',
                          whiteSpace: 'pre-wrap',
                          fontWeight: ri === 0 ? 700 : 400,
                          verticalAlign: 'top',
                        }}
                      >
                        {String(c ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!rows.length && !error && (
        <p className="muted">No sheet loaded yet. Export payments as CSV, then open the file here.</p>
      )}
    </PageFade>
  )
}
