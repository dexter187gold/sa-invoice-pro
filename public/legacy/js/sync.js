/* SA Invoice Pro – Cloud Sync helper (multi-device + status API)
 * Talks to https://saip-sync.onrender.com
 */
window.SA_SYNC = {
  token: localStorage.getItem('saip_sync_token') || null,

  get base() {
    return (window.SA_CONFIG && window.SA_CONFIG.syncServerUrl) || 'https://saip-sync.onrender.com';
  },

  get enabled() {
    return !!(window.SA_CONFIG && window.SA_CONFIG.syncEnabled);
  },

  async request(path, opts = {}) {
    if (!this.base) throw new Error('syncServerUrl not configured');
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    const res = await fetch(this.base + path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
    return data;
  },

  async register(email, password, name) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.token = data.token;
    localStorage.setItem('saip_sync_token', data.token);
    return data;
  },

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    localStorage.setItem('saip_sync_token', data.token);
    return data;
  },

  logout() {
    this.token = null;
    localStorage.removeItem('saip_sync_token');
  },

  isLoggedIn() {
    return !!this.token;
  },

  async me() {
    return this.request('/api/auth/me');
  },

  async pull() {
    return this.request('/api/workspace');
  },

  async push(workspaceData) {
    return this.request('/api/workspace', {
      method: 'PUT',
      body: JSON.stringify({ data: workspaceData }),
    });
  },

  /** Call after create / pay / edit invoice */
  async pushInvoiceStatus(invoices) {
    const list = Array.isArray(invoices) ? invoices : [invoices];
    return this.request('/api/status/push', {
      method: 'POST',
      body: JSON.stringify({ invoices: list }),
    });
  },

  /** Convenience: build status object from typical invoice + client */
  statusFromInvoice(inv, client = {}) {
    const total = Number(inv.total || inv.grandTotal || 0);
    const paid = Number(inv.amountPaid || inv.paid || 0);
    const balance = Math.max(0, total - paid);
    let status = 'unpaid';
    if (balance <= 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    else if (inv.dueDate && new Date(inv.dueDate) < new Date()) status = 'overdue';

    return {
      invoice_number: inv.number || inv.invoiceNumber || inv.id,
      client_name: client.name || inv.clientName || null,
      client_phone: client.phone || inv.clientPhone || null,
      total,
      balance_due: balance,
      status,
      due_date: inv.dueDate || null,
      last_payment_at: inv.lastPaymentAt || null,
    };
  },
};
