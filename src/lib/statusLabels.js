/** Invoice / ticket / job status labels — Pro Studio Q3 */
export const INVOICE_STATUSES = [
  { id: 'draft', label: 'Draft', color: '#a89bc8' },
  { id: 'sent', label: 'Sent', color: '#38bdf8' },
  { id: 'unpaid', label: 'Unpaid', color: '#fbbf24' },
  { id: 'partial', label: 'Partial', color: '#fb923c' },
  { id: 'paid', label: 'Paid', color: '#34d399' },
  { id: 'overdue', label: 'Overdue', color: '#f87171' },
  { id: 'cancelled', label: 'Cancelled', color: '#6b7280' },
  { id: 'void', label: 'Void', color: '#4b5563' },
];

export const TICKET_STATUSES = [
  { id: 'new', label: 'New', color: '#38bdf8' },
  { id: 'diagnosing', label: 'Diagnosing', color: '#a78bfa' },
  { id: 'waiting_parts', label: 'Waiting parts', color: '#fbbf24' },
  { id: 'in_progress', label: 'In progress', color: '#e879f9' },
  { id: 'ready', label: 'Ready for collection', color: '#34d399' },
  { id: 'collected', label: 'Collected', color: '#6ee7b7' },
  { id: 'cancelled', label: 'Cancelled', color: '#6b7280' },
];

export function statusLabel(list, id) {
  const row = (list || []).find((s) => s.id === id);
  return row ? row.label : String(id || '—');
}

export function statusColor(list, id) {
  const row = (list || []).find((s) => s.id === id);
  return row ? row.color : '#a89bc8';
}
