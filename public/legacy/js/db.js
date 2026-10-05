// SA Invoice Pro – Database
const DB_NAME = 'SAInvoicePro_v1';
const DB_VERSION = 4;
let db = null;

const STORES = {
  users: 'users', company: 'company', clients: 'clients',
  products: 'products', services: 'services',
  invoices: 'invoices', quotes: 'quotes', tickets: 'tickets',
  timeEntries: 'timeEntries', expenses: 'expenses',
  payments: 'payments', settings: 'settings',
  employees: 'employees', payslips: 'payslips', popiaRequests: 'popiaRequests',
  bankTxns: 'bankTxns', journal: 'journal', accounts: 'accounts', reconciliations: 'reconciliations'
};

function ensureStores(d) {
  const c = (n, k, autoInc) => {
    if (d.objectStoreNames.contains(n)) return;
    try {
      if (autoInc === false) d.createObjectStore(n, { keyPath: k });
      else d.createObjectStore(n, { keyPath: k || 'id', autoIncrement: true });
    } catch (err) {
      console.warn('createObjectStore', n, err);
    }
  };
  c(STORES.users, 'id', true);
  c(STORES.company, 'id', false);
  c(STORES.clients, 'id', true);
  c(STORES.products, 'id', true);
  c(STORES.services, 'id', true);
  c(STORES.invoices, 'id', true);
  c(STORES.quotes, 'id', true);
  c(STORES.tickets, 'id', true);
  c(STORES.timeEntries, 'id', true);
  c(STORES.expenses, 'id', true);
  c(STORES.payments, 'id', true);
  c(STORES.settings, 'key', false);
  c(STORES.employees, 'id', true);
  c(STORES.payslips, 'id', true);
  c(STORES.popiaRequests, 'id', true);
  c(STORES.bankTxns, 'id', true);
  c(STORES.journal, 'id', true);
  c(STORES.accounts, 'id', true);
  c(STORES.reconciliations, 'id', true);
}

const OPEN_TIMEOUT_MS = 8000;
async function openDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Database open timed out. Close other tabs of this app, then reload.'));
    }, OPEN_TIMEOUT_MS);
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      clearTimeout(timer);
      settled = true;
      reject(err);
      return;
    }
    req.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(req.error || new Error('IndexedDB open failed'));
    };
    req.onsuccess = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      db = req.result;
      db.onversionchange = () => {
        try { db.close(); } catch (e) {}
        db = null;
      };
      resolve(db);
    };
    req.onupgradeneeded = (e) => {
      try {
        ensureStores(e.target.result);
      } catch (err) {
        console.error('upgrade', err);
      }
    };
    req.onblocked = () => {
      console.warn('IndexedDB open blocked – close other tabs');
    };
  });
}

async function getAll(s) {
  try {
    const d = await openDB();
    if (!d.objectStoreNames.contains(s)) return [];
    return new Promise((res, rej) => {
      try {
        const r = d.transaction(s, 'readonly').objectStore(s).getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => res([]);
      } catch (e) {
        res([]);
      }
    });
  } catch (e) {
    return [];
  }
}

async function getById(s, id) {
  try {
    const d = await openDB();
    if (!d.objectStoreNames.contains(s)) return null;
    return new Promise((res) => {
      try {
        const r = d.transaction(s, 'readonly').objectStore(s).get(id);
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch (e) {
        res(null);
      }
    });
  } catch (e) {
    return null;
  }
}

async function put(s, data) {
  const d = await openDB();
  if (!d.objectStoreNames.contains(s)) throw new Error('Store missing: ' + s);
  return new Promise((res, rej) => {
    const r = d.transaction(s, 'readwrite').objectStore(s).put(data);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function add(s, data) {
  const d = await openDB();
  if (!d.objectStoreNames.contains(s)) throw new Error('Store missing: ' + s + ' — reload the page once');
  return new Promise((res, rej) => {
    const r = d.transaction(s, 'readwrite').objectStore(s).add(data);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error('Could not save'));
  });
}

async function remove(s, id) {
  const d = await openDB();
  if (!d.objectStoreNames.contains(s)) return;
  return new Promise((res) => {
    try {
      const r = d.transaction(s, 'readwrite').objectStore(s).delete(id);
      r.onsuccess = () => res();
      r.onerror = () => res();
    } catch (e) {
      res();
    }
  });
}

async function getSetting(k, def = null) {
  try {
    const d = await openDB();
    if (!d.objectStoreNames.contains(STORES.settings)) return def;
    return new Promise((res) => {
      try {
        const r = d.transaction(STORES.settings, 'readonly').objectStore(STORES.settings).get(k);
        r.onsuccess = () => res(r.result ? r.result.value : def);
        r.onerror = () => res(def);
      } catch (e) {
        res(def);
      }
    });
  } catch (e) {
    return def;
  }
}

async function setSetting(k, v) {
  return put(STORES.settings, { key: k, value: v });
}

async function getCompany() {
  const a = await getAll(STORES.company);
  return a[0] || null;
}

async function saveCompany(data) {
  data.id = 1;
  return put(STORES.company, data);
}

async function getNextNumber(type) {
  const key = 'nextNum_' + type;
  let n = await getSetting(key, 1);
  await setSetting(key, n + 1);
  const year = new Date().getFullYear();
  const prefixes = { invoice: 'INV', quote: 'QUO', ticket: 'TKT', expense: 'EXP', payslip: 'PAY', popia: 'POP', credit: 'CN' };
  const p = prefixes[type] || 'DOC';
  return p + '-' + year + '-' + String(n).padStart(4, '0');
}

/** Works on HTTP and HTTPS (fallback if crypto.subtle missing) */
async function hashPassword(password) {
  const str = String(password || '');
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const enc = new TextEncoder().encode(str);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('subtle digest failed, using fallback hash', e);
  }
  // FNV-1a style fallback (not for high security; offline HTTP only)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let h2 = 0;
  for (let i = 0; i < str.length; i++) {
    h2 = ((h2 << 5) - h2) + str.charCodeAt(i);
    h2 |= 0;
  }
  return 'fb_' + (h >>> 0).toString(16) + '_' + (h2 >>> 0).toString(16) + '_' + str.length;
}

async function exportAllData() {
  const out = {};
  for (const k of Object.keys(STORES)) {
    out[k] = await getAll(STORES[k]);
  }
  return out;
}

const DB = {
  STORES,
  openDB,
  getAll,
  getById,
  put,
  add,
  remove,
  getSetting,
  setSetting,
  getCompany,
  saveCompany,
  getNextNumber,
  hashPassword,
  exportAllData
};
if (typeof window !== 'undefined') window.DB = DB;
