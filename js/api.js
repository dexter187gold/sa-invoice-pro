/* Modern fetch helpers – timeouts, JSON, soft offline */
window.SA_API = {
  async fetch(url, opts = {}, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal, cache: opts.cache || 'no-store' });
      return res;
    } finally {
      clearTimeout(t);
    }
  },

  async json(url, opts = {}, timeoutMs = 12000) {
    const res = await this.fetch(url, opts, timeoutMs);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {
      const err = new Error('Invalid JSON from ' + url);
      err.status = res.status;
      err.body = text.slice(0, 200);
      throw err;
    }
    if (!res.ok) {
      const err = new Error((data && (data.error || data.message)) || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  }
};
