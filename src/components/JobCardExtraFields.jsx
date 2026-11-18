import React from 'react'

/** Extra fields for job cards (site, schedule, labour, category). */
export default function JobCardExtraFields({ form, setForm }) {
  return (
    <div className="form-grid cols-2" style={{ gap: 8 }}>
      <input className="input" placeholder="Site / location address" value={form.siteAddress || ''} onChange={(e) => setForm({ ...form, siteAddress: e.target.value, location: e.target.value })} />
      <input className="input" placeholder="Reference / PO" value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
      <label className="label" style={{ margin: 0 }}>Scheduled date
        <input className="input" type="date" value={form.scheduledDate || ''} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
      </label>
      <label className="label" style={{ margin: 0 }}>Time
        <input className="input" type="time" value={form.scheduledTime || ''} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} />
      </label>
      <input className="input" type="number" min="0" step="0.01" placeholder="Labour amount (R)" value={form.labourAmount || ''} onChange={(e) => setForm({ ...form, labourAmount: e.target.value, amount: e.target.value })} />
      <input className="input" placeholder="Devices / asset tags" value={form.devices || ''} onChange={(e) => setForm({ ...form, devices: e.target.value })} />
      <input className="input" placeholder="Serial numbers" value={form.serials || ''} onChange={(e) => setForm({ ...form, serials: e.target.value })} />
      <select className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-label="Category">
        <option value="">Category…</option>
        <option value="Transformer maintenance">Transformer maintenance</option>
        <option value="Power cabling">Power cabling</option>
        <option value="Fault repair">Fault repair</option>
        <option value="Preventative">Preventative maintenance</option>
        <option value="Installation">Installation</option>
        <option value="Inspection">Inspection</option>
        <option value="Call-out">Call-out</option>
        <option value="Other">Other</option>
      </select>
    </div>
  )
}
