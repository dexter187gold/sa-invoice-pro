// SA Invoice Pro v1.7 – Database
const DB_NAME = 'SAInvoicePro_v1';
const DB_VERSION = 2;
let db = null;

const STORES = {
  users: 'users', company: 'company', clients: 'clients',
  products: 'products', services: 'services',
  invoices: 'invoices', quotes: 'quotes', tickets: 'tickets',
  timeEntries: 'timeEntries', expenses: 'expenses',
  payments: 'payments', settings: 'settings',
  employees: 'employees', payslips: 'payslips', popiaRequests: 'popiaRequests'
};

const OPEN_TIMEOUT_MS = 4000;
async function openDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Database open timed out. Try closing other tabs or clear site data for this site.'));
    }, OPEN_TIMEOUT_MS);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => { clearTimeout(timer); reject(req.error); };
    req.onsuccess = () => { clearTimeout(timer); db = req.result; resolve(db); };
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      const c = (n, k='id', a=true) => {
        if (!d.objectStoreNames.contains(n))
          d.createObjectStore(n, a ? {keyPath:k, autoIncrement:true} : {keyPath:k});
      };
      c(STORES.users); c(STORES.company,'id',false);
      c(STORES.clients); c(STORES.products); c(STORES.services);
      c(STORES.invoices); c(STORES.quotes); c(STORES.tickets);
      c(STORES.timeEntries); c(STORES.expenses); c(STORES.payments);
      c(STORES.settings,'key',false);
      c(STORES.employees); c(STORES.payslips); c(STORES.popiaRequests);
    };
  });
}

async function getAll(s) {
  const d = await openDB();
  return new Promise((res,rej) => {
    const r = d.transaction(s,'readonly').objectStore(s).getAll();
    r.onsuccess = () => res(r.result||[]); r.onerror = () => rej(r.error);
  });
}
async function getById(s,id) {
  const d = await openDB();
  return new Promise((res,rej) => {
    const r = d.transaction(s,'readonly').objectStore(s).get(id);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function put(s,data) {
  const d = await openDB();
  return new Promise((res,rej) => {
    const r = d.transaction(s,'readwrite').objectStore(s).put(data);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function add(s,data) {
  const d = await openDB();
  return new Promise((res,rej) => {
    const r = d.transaction(s,'readwrite').objectStore(s).add(data);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function remove(s,id) {
  const d = await openDB();
  return new Promise((res,rej) => {
    const r = d.transaction(s,'readwrite').objectStore(s).delete(id);
    r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  });
}
async function getSetting(k,def=null) {
  const d = await openDB();
  return new Promise((res) => {
    const r = d.transaction(STORES.settings,'readonly').objectStore(STORES.settings).get(k);
    r.onsuccess = () => res(r.result ? r.result.value : def);
    r.onerror = () => res(def);
  });
}
async function setSetting(k,v) { return put(STORES.settings,{key:k,value:v}); }
async function getCompany() { const a = await getAll(STORES.company); return a[0]||null; }
async function saveCompany(data) { data.id=1; return put(STORES.company,data); }

async function getNextNumber(type) {
  const key = 'nextNum_' + type;
  let n = await getSetting(key, 1);
  await setSetting(key, n + 1);
  const year = new Date().getFullYear();
  const prefixes = { invoice:'INV', quote:'QUO', ticket:'TKT', expense:'EXP', payslip:'PAY', popia:'POP' };
  const p = prefixes[type] || 'DOC';
  return `${p}-${year}-${String(n).padStart(4,'0')}`;
}

async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function exportAllData() {
  const out = {};
  for (const key of Object.values(STORES)) {
    try { out[key] = await getAll(key); } catch(e) { out[key] = []; }
  }
  out._version = '1.7';
  out._exportedAt = new Date().toISOString();
  return out;
}

async function importAllData(payload) {
  if (!payload || !payload._version) throw new Error('Invalid backup file');
  for (const key of Object.values(STORES)) {
    if (!payload[key] || !Array.isArray(payload[key])) continue;
    const d = await openDB();
    await new Promise((res, rej) => {
      const tx = d.transaction(key, 'readwrite');
      const store = tx.objectStore(key);
      store.clear();
      for (const row of payload[key]) store.put(row);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
}

window.DB = {
  openDB, getAll, getById, put, add, remove,
  getSetting, setSetting, getCompany, saveCompany,
  getNextNumber, hashPassword, exportAllData, importAllData, STORES
};
