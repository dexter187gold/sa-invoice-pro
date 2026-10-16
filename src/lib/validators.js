/** Shared form validators — Pro Studio Q3 */
export function isEmail(v) {
  const s = String(v || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isSaPhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) return true;
  if (d.length === 11 && d.startsWith('27')) return true;
  if (d.length === 9 && /^[6-8]/.test(d)) return true;
  return false;
}

export function normalizeSaPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) d = '27' + d.slice(1);
  if (d.length === 9 && /^[6-8]/.test(d)) d = '27' + d;
  return d || null;
}

export function required(v, label = 'Field') {
  if (v == null || String(v).trim() === '') return `${label} is required`;
  return null;
}

export function minLen(v, n, label = 'Field') {
  if (String(v || '').length < n) return `${label} must be at least ${n} characters`;
  return null;
}

export function validateClient(form) {
  const errors = {};
  const e1 = required(form.name, 'Name');
  if (e1) errors.name = e1;
  if (form.email && !isEmail(form.email)) errors.email = 'Invalid email';
  if (form.phone && !isSaPhone(form.phone)) errors.phone = 'Use SA format e.g. 0821234567';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateInvoiceHeader(form) {
  const errors = {};
  if (!form.clientId && !form.clientName) errors.client = 'Select or enter a client';
  if (!form.date) errors.date = 'Invoice date required';
  return { ok: Object.keys(errors).length === 0, errors };
}
