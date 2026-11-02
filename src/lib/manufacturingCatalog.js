/** Manufacturing / Production - SA SME presets (ZAR, indicative). */

export const MFG_ACCOUNT_TYPES = ['Cash', 'Net 7', 'Net 30', 'Deposit 50%', 'Contract']

export const MFG_SERVICE_PRESETS = [
  { name: 'Production run (from)', price: 5000, category: 'Production', sku: 'MFG-RUN', tags: ['manufacturing'] },
  { name: 'Tooling / setup', price: 1500, category: 'Setup', sku: 'MFG-SET', tags: ['manufacturing'] },
  { name: 'Quality inspection', price: 650, category: 'QC', sku: 'MFG-QC', tags: ['manufacturing'] },
  { name: 'Rework (hour)', price: 420, category: 'Rework', sku: 'MFG-RW', tags: ['manufacturing'] },
  { name: 'Design / drawing drawing support', price: 950, category: 'Engineering', sku: 'MFG-DES', tags: ['manufacturing'] },
]

export const MFG_PRODUCT_PRESETS = [
  { name: 'Raw material surcharge', price: 200, category: 'Materials', sku: 'MFG-RM', tags: ['manufacturing'] },
  { name: 'Finished unit (sample)', price: 150, category: 'Finished', sku: 'MFG-UNIT', tags: ['manufacturing'] },
]

export const MFG_DOCUMENT_STUBS = [
  { id: 'mfg_job', title: 'Production job card', purpose: 'Track a production order on the floor.', scope: 'SKU, qty, machine, operators, yield.' },
  { id: 'mfg_qc', title: 'QC inspection report', purpose: 'Record quality checks.', scope: 'Sample size, results, pass/fail, actions.' },
  { id: 'mfg_bom', title: 'Bill of materials note', purpose: 'List materials for a job.', scope: 'Components, quantities, batch refs.' },
  { id: 'mfg_delivery', title: 'Finished goods delivery note', purpose: 'Ship finished goods.', scope: 'Items, qty, packaging, receiver.' },
  { id: 'mfg_ncr', title: 'Non-conformance report', purpose: 'Log defects and corrective action.', scope: 'Defect, root cause, disposition.' },
  { id: 'mfg_quote', title: 'Manufacturing quote', purpose: 'Quote make-to-order work.', scope: 'Specs, qty breaks, lead time, tooling.' },
]
