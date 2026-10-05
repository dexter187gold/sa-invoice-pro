// SA Invoice Pro v1.1.0 – Modular business OS (SA)
const APP_VERSION = '1.0.18';
/** South Africa market pricing (ZAR, recommended retail — owner may adjust on license server) */
const LICENSE_PLANS_ZAR = [
  { id: 'trial', name: '7-day trial', price: 0, period: 'once', note: 'Via Google Sign-In or trial activation', features: ['Full features for 7 days', '1 company', 'Local data'] },
  { id: 'starter', name: 'Starter', price: 149, period: 'month', yearly: 1490, note: 'Solo / micro business', features: ['Unlimited invoices & quotes', 'Clients & basic tickets', 'PDF + WhatsApp share', '1 user'] },
  { id: 'pro', name: 'Professional', price: 299, period: 'month', yearly: 2990, note: 'Most popular for SA SMEs', features: ['Everything in Starter', 'Job cards + sub-jobs', 'Accounting tools', 'Payroll helpers', 'Multi-company'] },
  { id: 'business', name: 'Business', price: 499, period: 'month', yearly: 4990, note: 'Teams & multi-site', features: ['Everything in Pro', 'Up to 5 users (roadmap)', 'Priority license support', 'License portal PayFast'] },
  { id: 'lifetime', name: 'Lifetime (1 device)', price: 3999, period: 'once', yearly: null, note: 'One-time, single HWID', features: ['Pro features forever', '1 hardware profile', 'Updates for 12 months included'] }
];

const APP_COPYRIGHT = 'SA Invoice Pro  © ' + new Date().getFullYear() + '  ·  All rights reserved';
const APP_LEGAL_NAME = 'SA Invoice Pro';
const APP_CHANGELOG = [
  { v:'1.0.18', date:'2026-10-04', notes:'Helix ticketing hub under Tickets (embed/open); classic tickets fallback; frontend polish' },
  { v:'1.0.17', date:'2026-10-04', notes:'Bookkeeping backend: expanded SA CoA, GL/BS, period filters, auto-journals, richer Accounting GUI' },
  { v:'1.0.16', date:'2026-10-02', notes:'Portal Pay this invoice opens real PayFast checkout (was placeholder alert)' },
  { v:'1.0.15', date:'2026-10-02', notes:'Fix client-detail wipe on render; UUID onclick; handler gaps; loadAppSettings safety' },
  { v:'1.0.14', date:'2026-10-02', notes:'Triple audit + UUID-safe payments + savePayment syncs PDF amountPaid' },
  { v:'1.0.13', date:'2026-10-02', notes:'Single-page PDF layout; template+theme designer; live preview fix; license URL default' },
  { v:'1.0.12', date:'2026-10-02', notes:'Client portal opens without login/welcome toast; fetch from license server first' },
  { v:'1.0.11', date:'2026-10-02', notes:'Fix kind is not defined on New invoice' },
  { v:'1.0.10', date:'2026-10-02', notes:'Settings persist on reopen; invoice payments on form/PDF; portal PayFast; preview in menu' },
  { v:'1.0.9', date:'2026-10-02', notes:'Invoice PDF payments + balance due, live preview restored' },
  { v:'1.0.8', date:'2026-10-02', notes:'Stability: all ID lookups, safer render/modals, auth session validate' },
  { v:'1.0.7', date:'2026-10-02', notes:'Bugfix: License.init on boot, string IDs, lookup helpers, PayFast guard' },
  { v:'1.0.6', date:'2026-10-02', notes:'Visible client payment portal on Clients + Invoices' },
  { v:'1.0.5', date:'2026-10-02', notes:'Admin config push, license persist fix, splash once, remote PayFast' },
  { v:'1.0.4', date:'2026-10-02', notes:'License plan PayFast buy + client payment portal links' },
  { v:'1.0.3', date:'2026-10-02', notes:'PayFast sandbox checkout on invoices + payments settings' },
  { v:'1.0.2', date:'2026-10-02', notes:'SA licence pricing, Google Client ID persist, Google 7-day trial splash' },
  { v:'1.0.1', date:'2026-10-02', notes:'Capitec/EFT pay panel, copy bank details, invoice Pay EFT' },
  { v:'8.1.0', date:'2026-09-29', notes:'Forms UX, toasts, industry sample data, accounting calculator & tools' },
  { v:'8.0.0', date:'2026-09-29', notes:'Perf + WhatsApp/Email sales & tickets share hub' },
  { v:'7.0.5', date:'2026-09-29', notes:'Fix company setup screen after login (show onboarding or home reliably)' },
  { v:'7.0.4', date:'2026-09-28', notes:'Bulletproof enterApp after signup/login — never stick on workspace loading' },
  { v:'7.0.3', date:'2026-09-28', notes:'Fix create-account + stuck Loading workspace (DB upgrade, hash, login path)' },
  { v:'7.0.2', date:'2026-09-28', notes:'Auth create/login fix mobile Chrome, visible errors, Google Sign-In GIS' },
  { v:'7.0.1', date:'2026-09-28', notes:'Auth create-account form scroll fix mobile+desktop' },
  { v:'7.0.0', date:'2026-09-28', notes:'MEGA: auto-match, customer statements, AP/suppliers, assets, budgets, year-end close, pastel sage UI' },
  { v:'6.1.0', date:'2026-09-28', notes:'Bank CSV import (SA statement formats), duplicate skip, preview before import' },
  { v:'6.0.0', date:'2026-09-28', notes:'MAJOR: Bank recon, CoA, journals, VAT return helper, P&L/Trial balance, payment allocation, recurring pause, demo tags' },
  { v:'5.4.0', date:'2026-09-28', notes:'Batch payslips, recurring calendar, settings danger zone' },
  { v:'5.3.0', date:'2026-09-28', notes:'Expenses mobile menu, home quick-actions, offline banner' },
  { v:'5.2.0', date:'2026-09-28', notes:'Clients/tickets mobile menus, dashboard snapshot PDF' },
  { v:'5.1.0', date:'2026-09-28', notes:'Product/service mobile menus, richer snapshot, empty-state polish' },
  { v:'5.0.0', date:'2026-09-28', notes:'Stability audit, dashboard export snapshot, mobile row actions menu' },
  { v:'4.9.0', date:'2026-09-28', notes:'Filtered CSV export, column sort, print CSS polish' },
  { v:'4.8.0', date:'2026-09-28', notes:'Delete presets, client filter presets, print-friendly lists' },
  { v:'4.7.0', date:'2026-09-28', notes:'/ focus search, saved filter presets, ZAR-only badge' },
  { v:'4.6.0', date:'2026-09-28', notes:'Live search, quote duplicate, expense receipt lightbox' },
  { v:'4.5.0', date:'2026-09-28', notes:'Search/filter invoices & clients, duplicate invoice, expense receipt photo' },
  { v:'4.4.0', date:'2026-09-28', notes:'Product reorder level, payment history, batch mark paid, restored item/client/ticket modals' },
  { v:'4.3.0', date:'2026-09-28', notes:'Low-stock home alerts, partial payment amount, credit note PDF' },
  { v:'4.2.0', date:'2026-09-28', notes:'Quick status incl. partial, credit notes, stock decrement on paid' },
  { v:'4.1.0', date:'2026-09-28', notes:'Quote convert polish, expense categories on Reports, packing slip PDF' },
  { v:'4.0.0', date:'2026-09-28', notes:'Dashboard charts, recurring home reminder, client statement PDF' },
  { v:'3.9.0', date:'2026-09-28', notes:'Payslip PDF layout, Home overdue strip, backup/restore polish' },
  { v:'3.8.0', date:'2026-09-28', notes:'Connectivity status, full doc generator, SARS payroll CSV, safe helpers, login stability' },
  { v:'3.7.0', date:'2026-09-28', notes:'Restored Home–Services pages, license request+poll, update check, status bar, stability' },
  { v:'3.6.0', date:'2026-09-28', notes:'Fix License/Update buttons (action map bug), force config.js URLs, responsive breakpoints all screens' },
  { v:'3.5.0', date:'2026-09-28', notes:'Reports VAT+aged debtors, payroll EMP CSV, recurring safety, multi-company data isolation' },
  { v:'3.4.0', date:'2026-09-28', notes:'Login lockout (5 tries/5 min), password strength meter, logo-mark header, theme cycle polish' },
  { v:'3.3.0', date:'2026-09-24', notes:'Multi-theme GUI (light/dark/ocean/sunset/forest/slate), fuller bolder page layouts' },
  { v:'3.2.2', date:'2026-09-24', notes:'Home after login, simplified License/About (no URL fields), auto update check, license request+poll' },
  { v:'3.2.0', date:'2026-09-24', notes:'Mobile/desktop view toggle, login security (block owner-token passwords), auto server URLs' },
  { v:'3.1.0', date:'2026-09-12', notes:'Free online stack (FTP/Pages/Render), modern SA_API, PORT cloud bind, deeper UX' },
  { v:'3.0.0', date:'2026-09-12', notes:'Logic/UX harden, async page render fix, cloud deploy path, roadmap consolidation' },
  { v:'2.2.0', date:'2026-09-12', notes:'Auto SW reload no Ctrl+F5, silent update service, owner dashboard :5060, SARS export pack, industry shells, QES docs' },
  { v:'2.1.0', date:'2026-09-12', notes:'Splash fix SW, multi-company, backup UI, recurring, reports pack, mandatory update, feature flags, hardened owner token' },
  { v:'2.0.3', date:'2026-09-12', notes:'Auto in-folder update via launcher + progress window' },
  { v:'2.0.2', date:'2026-09-12', notes:'Advanced clause packs, PDF attestation signature, update download link guidance' },
  { v:'2.0.1', date:'2026-09-12', notes:'Auth startup flow, Home vs Dashboard, doc generator power, logo, security questions, guided tutorial' },
  { v:'2.0.0-beta', date:'2026-09-12', notes:'Preview fix, profile apply, update server, about/industry, reports P&L, owner mode, home UX' },
  { v:'1.8.0', date:'2026-09-11', notes:'Online status, profile terms auto, server device status, local vault encryption' },
  { v:'1.7.0', date:'2026-09-11', notes:'POPIA compliance module, SA payroll/payslips, folder structure docs' },
  { v:'1.6.0', date:'2026-09-11', notes:'Profile packs, strict business modules, SA template library, copyright footers, CSS pro theme' },
  { v:'1.5.0', date:'2026-09-11', notes:'Server-only license handshake, POPIA notices, CIPC status' },
  { v:'1.4.1', date:'2026-09-11', notes:'Doc generator themed PDF fix, realistic SA letter templates, demo data' },
  { v:'1.4.0', date:'2026-09-11', notes:'Server handshake license: HWID → request → vendor issue → claim' },
  { v:'1.3.0', date:'2026-09-11', notes:'OAuth2 Google Sign-In, client ID setting, auth hardening' },
  { v:'1.2.0', date:'2026-09-11', notes:'Skip onboarding if setup done, persistent login, home document hub, doc generator, license status fix, page restore on refresh' },
  { v:'1.1.0', date:'2026-09-11', notes:'Dashboard click-to-edit, ticket→invoice+resolve, categorized settings, tutorial, HW license client' },
  { v:'1.0.0', date:'2026-09-11', notes:'Modules by business type, offline licensing, expenses, payments, backup' },
];
const App = {
  currentPage: 'dashboard',
  company: null, clients: [], products: [], services: [],
  invoices: [], quotes: [], tickets: [], timeEntries: [], expenses: [], payments: [],
  employees: [], payslips: [], popiaRequests: [],
  invoiceFilter: 'all', quoteFilter: 'all', docSearch: '',
  deferredPrompt: null,
  theme: 'light', accent: 'green', template: 'classic',
  vatEnabled: true, vatRate: 0.15, onboardingDone: false,
  logoData: null,
  modalStack: [],
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  modules: null,
  businessTemplate: 'custom',
  licenseStatus: null,


  validateCompanyName(name) {
    const n = (name||'').trim();
    if (n.length < 2) return 'Company name is required (min 2 characters)';
    if (n.length > 120) return 'Company name too long';
    if (/^[\s\W]+$/.test(n)) return 'Company name needs real characters';
    return null;
  },

  validatePhone(phone) {
    if (!phone) return null;
    const p = phone.replace(/\s/g,'');
    if (p && !/^[+]?[0-9]{8,15}$/.test(p)) return 'Enter a valid phone number';
    return null;
  },

  validateEmail(email) {
    if (!email) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email';
    return null;
  },

  validateVatNo(vat) {
    if (!vat) return null;
    const v = vat.replace(/\s/g,'');
    if (v && !/^[0-9]{10}$/.test(v)) return 'SA VAT number should be 10 digits';
    return null;
  },


  hasModule(name) {
    if (!name) return true;
    const always = ['home','dashboard','settings','about','license','account','backup','companies','documents','industry'];
    if (always.includes(name)) return true;
    if (!this.modules) return true;
    return this.modules[name] !== false;
  },

  getProfileLabel(key, fallback) {
    const labels = (this.profilePack && this.profilePack.labels) || {};
    return labels[key] || fallback || key;
  },

  getDocTypesForProfile() {
    const all = [
      { id:'sla', name:'SLA / Service Level Agreement' },
      { id:'consulting', name:'Consulting agreement' },
      { id:'goodstanding', name:'Letter of good standing' },
      { id:'taxclearance', name:'Tax clearance support letter' },
      { id:'engagement', name:'Letter of engagement' },
      { id:'quotation_cover', name:'Quotation covering letter' },
      { id:'demand', name:'Payment demand / reminder' },
      { id:'completion', name:'Works completion certificate' }
    ];
    const allowed = (this.profilePack && this.profilePack.docTypes) || null;
    if (!allowed || !allowed.length) return all;
    return all.filter(t => allowed.includes(t.id));
  },

  async loadProfilePack(id) {
    const tid = id || this.businessTemplate || 'custom';
    try {
      const res = await fetch('profiles/' + tid + '.json', { cache: 'no-store' });
      if (res.ok) {
        this.profilePack = await res.json();
        if (this.profilePack.modules) {
          this.modules = this.profilePack.modules;
          await DB.setSetting('modules', this.modules);
        }
        if (this.profilePack.terms) {
          const co = await DB.getCompany() || { id: 1 };
          if (!co.terms || co.termsAuto !== false) {
            co.terms = this.profilePack.terms;
            co.termsAuto = true;
            await DB.saveCompany(co);
            this.company = co;
          }
        }
        return this.profilePack;
      }
    } catch (e) {}
    this.profilePack = {
      name: tid,
      modules: (window.BUSINESS_MODULES && window.BUSINESS_MODULES[tid]) || window.DEFAULT_MODULES,
      docTypes: null,
      labels: {}
    };
    this.modules = this.profilePack.modules;
    return this.profilePack;
  },

  requireLicense() {
    if (this.licenseStatus && !this.licenseStatus.canUse) {
      this.toast(this.licenseStatus.label + ' — open License and complete server handshake', 'error');
      this.navigate('license');
      return false;
    }
    return true;
  },

  async init() {
    const boot = document.getElementById('boot-status');
    if (boot) boot.textContent = 'Starting…';

    // Client payment portal: never require login or show "Welcome back"
    const portalTok = this.getPortalTokenFromUrl();
    if (portalTok) {
      this._portalGuest = true;
      try {
        try { await Promise.race([DB.openDB(), new Promise((_, rej) => setTimeout(() => rej(new Error('db timeout')), 2500))]); } catch (e) {}
        try { await this.applyCloudDefaults(); } catch (e) {}
        await this.openClientPortalView(portalTok);
        return;
      } catch (e) {
        console.error('portal boot', e);
        document.body.innerHTML = '<div style="padding:1.5rem;font-family:system-ui;max-width:28rem;margin:2rem auto"><h1>Payment portal</h1><p>Could not open portal. Ask the business to send a new link.</p><p style="color:#64748b;font-size:.85rem">' + (e.message || e) + '</p></div>';
        return;
      }
    }

    try { this.initViewMode(); } catch (e) {}
    let finished = false;
    const failsafe = setTimeout(() => {
      if (finished) return;
      if (boot) boot.textContent = 'Still loading – showing sign-in…';
      const auth = document.getElementById('auth-screen');
      if (auth) auth.classList.remove('hidden');
      try { Auth.renderAuthScreen(); } catch (e) {}
    }, 3500);
    try {
      if (boot) boot.textContent = 'Opening database…';
      try {
        await Promise.race([
          DB.openDB(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('db timeout')), 4000))
        ]);
        try { await this.applyCloudDefaults(); } catch (e) {}
      } catch (dbErr) {
        console.warn('DB boot:', dbErr);
        if (boot) boot.textContent = 'Could not open local database. You can still try sign-in.';
      }
      if (boot) boot.textContent = 'Checking session…';
      const loggedIn = await Promise.race([
        Auth.init(),
        new Promise(r => setTimeout(() => r(false), 5000))
      ]);
      finished = true;
      clearTimeout(failsafe);
      if (loggedIn) await this.onLoginSuccess();
      else await Auth.renderAuthScreen();
    } catch (e) {
      console.error(e);
      finished = true;
      clearTimeout(failsafe);
      try { await Auth.renderAuthScreen(); } catch (e2) {}
    } finally {
      finished = true;
      clearTimeout(failsafe);
    }
  },

  getPortalTokenFromUrl() {
    try {
      const q = new URLSearchParams(location.search || '');
      let t = q.get('portal') || q.get('clientPortal') || '';
      if (!t && location.hash) {
        const h = location.hash.replace(/^#/, '');
        if (h.startsWith('portal=')) t = decodeURIComponent(h.slice(7));
        else if (h.startsWith('/portal/')) t = h.slice(8);
      }
      return (t || '').trim();
    } catch (e) {
      return '';
    }
  },

  async onLoginSuccess() {
    return this.enterApp();
  },

  /** Always leave auth screen and show app chrome — never hang. */

  async handlePayFastReturn() {
    try {
      const portalTok = new URLSearchParams(location.search || '').get('portal');
      if (portalTok) {
        await this.openClientPortalView(portalTok);
        return;
      }
      if (!window.PayFast) return;
      const r = await PayFast.handleReturnFromQuery();
      if (!r) return;
      if (r.status === 'return') {
        this.toast('Returned from PayFast — confirm in sandbox Transactions, then record payment on the invoice', 'success');
        this.navigate('invoices');
      } else if (r.status === 'cancel') {
        this.toast('PayFast payment cancelled', 'warn');
      }
    } catch (e) {}
  },

  async showTrialSplashIfNeeded() {
    try {
      // Permanent dismiss
      if (localStorage.getItem('saip_trial_splash_never') === '1') return;
      // Session dismiss
      if (sessionStorage.getItem('saip_trial_splash_dismissed') === '1') return;

      const st = (window.License && License.getStatus()) || this.licenseStatus || {};
      // Already licensed or on active trial → never show
      if (st.canUse && (st.mode === 'licensed' || st.mode === 'trial')) return;

      const googleUser = !!(Auth.currentUser && (Auth.currentUser.googleSub || Auth.currentUser.authProvider === 'google'));
      const googleTrial = await DB.getSetting('googleTrialGranted', false);
      // Google user who already got trial → hide
      if (googleUser && googleTrial) return;
      if (googleUser && st.canUse) return;

      this.showModal(`
        <div class="p-5 max-w-md">
          <h3 class="font-bold text-lg mb-1">Start your 7-day free trial</h3>
          <p class="text-sm text-slate-600 mb-3">Optional. You can remind later or hide this permanently.</p>
          <div class="space-y-2 mb-3">
            <button type="button" class="btn btn-primary w-full" id="btn-trial-local">Start 7-day trial on this device</button>
            <button type="button" class="btn btn-secondary w-full" id="btn-trial-plans">View licence prices</button>
            <button type="button" class="btn btn-outline w-full" id="btn-trial-later">Remind me later</button>
            <button type="button" class="btn btn-ghost w-full" id="btn-trial-never">Don't show again</button>
          </div>
        </div>`);
      const close = () => { try { this.closeModal(); } catch (e) {} };
      document.getElementById('btn-trial-later')?.addEventListener('click', () => {
        sessionStorage.setItem('saip_trial_splash_dismissed', '1');
        close();
      });
      document.getElementById('btn-trial-never')?.addEventListener('click', () => {
        localStorage.setItem('saip_trial_splash_never', '1');
        sessionStorage.setItem('saip_trial_splash_dismissed', '1');
        close();
      });
      document.getElementById('btn-trial-plans')?.addEventListener('click', () => {
        sessionStorage.setItem('saip_trial_splash_dismissed', '1');
        close();
        this.navigate('license');
        setTimeout(() => this.showPricingPanel(), 200);
      });
      document.getElementById('btn-trial-local')?.addEventListener('click', async () => {
        try {
          await this.activateLocalTrial();
          localStorage.setItem('saip_trial_splash_never', '1');
          close();
          this.toast('7-day trial started', 'success');
        } catch (e) {
          this.toast(e.message || 'Could not start trial', 'error');
        }
      });
    } catch (e) {
      console.warn('trial splash', e);
    }
  },


  async activateLocalTrial() {
    const days = 7;
    const now = new Date().toISOString();
    const existing = await DB.getSetting('trialStartedAt', null);
    if (existing) {
      const st = License.getStatus();
      if (st.mode === 'expired') throw new Error('Trial already used on this device — please purchase a licence');
    }
    await DB.setSetting('trialStartedAt', existing || now);
    await DB.setSetting('trialSource', 'local');
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const key = 'TRIAL-LOCAL-' + (Auth.currentUser?.id || 'dev').toString().slice(0, 8);
    const record = {
      key, plan: 'trial', label: '7-day free trial', activatedAt: now, expiresAt,
      hwid: License.hwid || null, source: 'local-trial'
    };
    await DB.setSetting('licenseKey', key);
    await DB.setSetting('licenseMeta', record);
    License.licenseKey = key;
    License.licenseMeta = record;
    try { await License.persistOfflineLicense(key, record); } catch (e) {}
    this.licenseStatus = License.getStatus();
    this.setupUI();
    this.render();
  },

  showPricingPanel() {
    const plans = (typeof LICENSE_PLANS_ZAR !== 'undefined' ? LICENSE_PLANS_ZAR : []).filter(p => p.id !== 'trial');
    const html = plans.map(p => `
      <div class="card p-3 mb-2">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="font-bold">${p.name}</div>
            <div class="text-xs text-slate-500">${p.note || ''}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-sa-green">${p.price === 0 ? 'Free' : 'R' + p.price}${p.period === 'month' ? '/mo' : p.period === 'once' ? ' once' : ''}</div>
            ${p.yearly ? `<div class="text-xs text-slate-400">or R${p.yearly}/yr</div>` : ''}
          </div>
        </div>
        <ul class="text-xs text-slate-600 mt-2 list-disc pl-4">${(p.features||[]).map(f => `<li>${f}</li>`).join('')}</ul>
        <div class="flex flex-wrap gap-2 mt-3">
          ${p.period === 'month' ? `<button type="button" class="btn btn-primary btn-sm" data-buy-plan="${p.id}" data-period="month" data-amount="${p.price}">Pay R${p.price}/mo</button>` : ''}
          ${p.yearly ? `<button type="button" class="btn btn-secondary btn-sm" data-buy-plan="${p.id}" data-period="year" data-amount="${p.yearly}">Pay R${p.yearly}/yr</button>` : ''}
          ${p.period === 'once' ? `<button type="button" class="btn btn-primary btn-sm" data-buy-plan="${p.id}" data-period="once" data-amount="${p.price}">Pay R${p.price} once</button>` : ''}
        </div>
      </div>`).join('');
    this.showModal(`<div class="p-5 max-w-lg max-h-[80vh] overflow-y-auto">
      <h3 class="font-bold text-lg mb-2">Buy a licence (ZAR)</h3>
      <p class="text-xs text-slate-500 mb-3">Checkout opens PayFast (sandbox or live). After payment, activate from License with your HWID — or we match PayFast payment ID on the license server.</p>
      ${html}
      <button type="button" class="btn btn-outline w-full mt-2" onclick="App.closeModal()">Close</button>
    </div>`);
    document.querySelectorAll('[data-buy-plan]').forEach(btn => {
      btn.onclick = () => this.buyLicensePlan(btn.dataset.buyPlan, btn.dataset.period, parseFloat(btn.dataset.amount));
    });
  },


  async buildClientPortalPayload(clientId) {
    const c = this.clientById ? this.clientById(clientId) : (this.clients || []).find(x => String(x.id) === String(clientId));
    if (!c) throw new Error('Client not found');
    const invoices = (this.invoices || []).filter(i => String(i.clientId) === String(clientId) && !i.isCredit).map(i => ({
      id: i.id,
      number: i.number,
      total: i.total,
      amountDue: i.amountDue != null ? i.amountDue : (i.status === 'paid' ? 0 : i.total),
      status: i.status,
      dueDate: i.dueDate || i.date,
      date: i.date
    }));
    const quotes = (this.quotes || []).filter(q => String(q.clientId) === String(clientId)).map(q => ({
      id: q.id, number: q.number, total: q.total, status: q.status, date: q.date
    }));
    const pf = window.PayFast ? await PayFast.getConfig() : {};
    return {
      company: {
        name: this.company?.name || 'Business',
        email: this.company?.email || '',
        phone: this.company?.phone || '',
        bankName: this.company?.bankName || '',
        accountNumber: this.company?.accountNumber || '',
        branchCode: this.company?.branchCode || ''
      },
      client: { id: c.id, name: c.name, email: c.email, phone: c.phone },
      invoices,
      quotes,
      payfast: {
        merchantId: pf.merchantId || '',
        merchantKey: pf.merchantKey || '',
        passphrase: pf.passphrase || '',
        sandbox: pf.sandbox !== false
      },
      publishedAt: new Date().toISOString()
    };
  },

  async shareClientPortal(clientId) {
    try {
      const payload = await this.buildClientPortalPayload(clientId);
      const token = 'cp_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      // Always store locally for same-origin guest view
      const portals = (await DB.getSetting('clientPortals', {})) || {};
      portals[token] = { payload, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
      await DB.setSetting('clientPortals', portals);

      let publicUrl = location.origin + location.pathname + '?portal=' + encodeURIComponent(token);
      // Try publish to license server for real client phones
      try {
        const base = (await DB.getSetting('licenseServerUrl', '')) || (window.SA_CONFIG && SA_CONFIG.defaultLicenseServerUrl) || '';
        if (base) {
          const res = await fetch(String(base).replace(/\/$/, '') + '/api/portal/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, payload, expiresAt: portals[token].expiresAt })
          });
          if (res.ok) {
            const j = await res.json();
            if (j.token) {
              publicUrl = String(base).replace(/\/$/, '') + '/portal/' + j.token;
            }
          }
        }
      } catch (e) {
        console.warn('portal publish', e);
      }

      await DB.setSetting('lastClientPortalUrl', publicUrl);
      const client = payload.client;
      const open = (payload.invoices || []).filter(i => !['paid', 'cancelled'].includes((i.status || '').toLowerCase()));
      const total = open.reduce((s, i) => s + Number(i.amountDue != null ? i.amountDue : i.total || 0), 0);
      const msg = `Hi ${client.name || ''},\n\nView your invoices and pay online:\n${publicUrl}\n\nOpen amount: ${this.formatMoney(total)}\n\n${payload.company.name || ''}`;
      this.showModal(`
        <div class="p-5 max-w-md">
          <h3 class="font-bold text-lg mb-2">Client payment portal</h3>
          <p class="text-sm text-slate-600 mb-2">${client.name} · ${open.length} open invoice(s) · ${this.formatMoney(total)}</p>
          <input class="input text-xs mb-2" readonly value="${publicUrl.replace(/"/g, '&quot;')}" id="portal-url-field" />
          <div class="space-y-2">
            <button type="button" class="btn btn-primary w-full" id="btn-copy-portal">Copy link</button>
            <button type="button" class="btn btn-secondary w-full" id="btn-wa-portal">Send on WhatsApp</button>
            <button type="button" class="btn btn-outline w-full" id="btn-email-portal">Send by email</button>
            <button type="button" class="btn btn-ghost w-full" onclick="App.closeModal()">Close</button>
          </div>
          <p class="text-xs text-slate-400 mt-2">If license server is online, clients open the link on any phone. Otherwise the link works on devices that can reach your published portal URL.</p>
        </div>`);
      document.getElementById('btn-copy-portal')?.addEventListener('click', () => this.copyText(publicUrl));
      document.getElementById('btn-wa-portal')?.addEventListener('click', () => this.openWhatsApp(client.phone || '', msg));
      document.getElementById('btn-email-portal')?.addEventListener('click', () => this.openEmail(client.email || '', 'Your invoices – pay online', msg));
      this.toast('Portal link ready', 'success');
    } catch (e) {
      this.toast(e.message || 'Could not create portal', 'error');
    }
  },

  async openClientPortalView(token) {
    token = String(token || '').trim();
    if (!token) throw new Error('Missing portal token');

    // Hide full app chrome / auth splash
    try {
      const auth = document.getElementById('auth-screen');
      if (auth) { auth.classList.add('hidden'); auth.style.display = 'none'; }
      const boot = document.getElementById('boot-status');
      if (boot) boot.textContent = 'Loading payment portal…';
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.classList.remove('hidden');
        appEl.style.cssText = 'display:block!important;min-height:100vh;';
      }
      document.querySelectorAll('nav, header, #sidebar, .app-nav, .bottom-nav').forEach(el => {
        try { el.style.display = 'none'; } catch (e) {}
      });
    } catch (e) {}

    let payload = null;
    let source = '';

    // 1) License server first (works on client's phone)
    const bases = [];
    try {
      const fromDb = await DB.getSetting('licenseServerUrl', '');
      if (fromDb) bases.push(String(fromDb).replace(/\/$/, ''));
    } catch (e) {}
    if (window.SA_CONFIG && SA_CONFIG.defaultLicenseServerUrl) {
      bases.push(String(SA_CONFIG.defaultLicenseServerUrl).replace(/\/$/, ''));
    }
    // common deploy name from video
    bases.push('https://sa-invoice-license.onrender.com');

    for (const base of [...new Set(bases.filter(Boolean))]) {
      try {
        const r = await fetch(base + '/api/portal/' + encodeURIComponent(token), { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();
        if (j && j.ok && j.payload) {
          payload = j.payload;
          source = base;
          break;
        }
      } catch (e) {
        console.warn('portal fetch', base, e);
      }
    }

    // 2) Local IDB (same device that published)
    if (!payload) {
      try {
        const portals = (await DB.getSetting('clientPortals', {})) || {};
        if (portals[token] && portals[token].payload) {
          payload = portals[token].payload;
          source = 'local';
        }
      } catch (e) {}
    }

    const host = document.getElementById('main') || document.getElementById('app') || document.body;

    if (!payload) {
      host.innerHTML = `
        <div class="p-6 max-w-md mx-auto" style="font-family:system-ui">
          <h2 class="font-bold text-lg mb-2">Payment portal unavailable</h2>
          <p class="text-sm text-slate-600 mb-3">This link could not load invoice data. The business should open <strong>Clients → Payment portal link</strong> again while the license server is online, then resend the new link.</p>
          <p class="text-xs text-slate-400">Token: ${token.slice(0, 12)}…</p>
        </div>`;
      return;
    }

    const inv = (payload.invoices || []).filter(i => !['paid', 'cancelled'].includes(String(i.status || '').toLowerCase()));
    const bulk = inv.reduce((s, i) => s + Number(i.amountDue != null ? i.amountDue : i.total || 0), 0);
    const co = payload.company || {};
    const cl = payload.client || {};
    const pf = payload.payfast || {};
    const bankBits = [co.bankName, co.accountNumber && ('Acc ' + co.accountNumber), co.branchCode && ('Branch ' + co.branchCode)].filter(Boolean).join(' · ');

    host.innerHTML = `
      <div class="p-4 max-w-lg mx-auto" style="font-family:system-ui;padding-bottom:3rem">
        <div class="card p-4 mb-3" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff">
          <div style="font-size:.75rem;color:#64748b;margin-bottom:.25rem">Client payment portal</div>
          <h2 class="font-bold text-lg" style="margin:0">${co.name || 'Invoices'}</h2>
          <p class="text-sm text-slate-500" style="margin:.35rem 0 0">For ${cl.name || 'you'}${cl.email ? ' · ' + cl.email : ''}</p>
        </div>
        ${inv.length === 0 ? '<div class="card p-4">No open invoices.</div>' : inv.map(i => {
          const due = Number(i.amountDue != null ? i.amountDue : i.total || 0);
          return `<div class="card p-4 mb-2" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff;margin-bottom:.75rem">
            <div style="display:flex;justify-content:space-between;gap:.5rem"><strong>${i.number || i.id}</strong><span class="badge">${i.status || 'unpaid'}</span></div>
            <div class="text-sm mt-1">Due ${i.dueDate || '—'} · <strong>${this.formatMoney(due)}</strong></div>
            <button type="button" class="btn btn-primary w-full mt-2 btn-portal-pay" data-amt="${due}" data-ref="${(i.number || i.id)}" style="margin-top:.5rem;width:100%;padding:.75rem;border:0;border-radius:10px;background:#007A4D;color:#fff;font-weight:600">Pay this invoice</button>
          </div>`;
        }).join('')}
        ${inv.length > 1 ? `<button type="button" class="btn btn-secondary w-full mb-3" id="portal-pay-all" style="width:100%;padding:.75rem;border-radius:10px;margin-bottom:.75rem">Pay all open (${this.formatMoney(bulk)})</button>` : ''}
        ${bankBits ? `<div class="card p-3 text-sm" style="border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>EFT / bank deposit</strong><br>${bankBits}<br>Reference: your invoice number</div>` : ''}
        <p class="text-xs text-slate-400" style="text-align:center;margin-top:1.5rem">Powered by SA Invoice Pro · Secure checkout when the business enabled PayFast</p>
      </div>`;

    const pay = async (amt, ref) => {
      try {
        if (!window.PayFast) throw new Error('Payment module not loaded');
        // Prefer merchant from published portal payload (client phone has no local settings)
        if (pf.merchantId) {
          await PayFast.saveConfig({
            merchantId: pf.merchantId,
            merchantKey: pf.merchantKey || '',
            passphrase: pf.passphrase || '',
            sandbox: pf.sandbox !== false
          });
        }
        const cfg = await PayFast.getConfig();
        if (!cfg.merchantId) {
          alert('This business has not enabled online card/EFT yet. Please use the bank details on the invoice or contact them.');
          return;
        }
        await PayFast.startPayment({
          amount: amt,
          itemName: 'Invoice ' + ref,
          itemDescription: (co.name || '') + ' — ' + (cl.name || ''),
          mPaymentId: 'CLI-' + String(ref).replace(/\\s+/g, '') + '-' + Date.now().toString(36),
          email: cl.email || '',
          nameFirst: (cl.name || 'Client').split(' ')[0],
          nameLast: (cl.name || '').split(' ').slice(1).join(' ') || '',
          customStr1: String(cl.id || ''),
          customStr2: 'client-portal'
        });
      } catch (e) {
        alert(e.message || 'Payment unavailable — use EFT details if shown');
      }
    };
    host.querySelectorAll('.btn-portal-pay').forEach(b => {
      b.onclick = () => pay(parseFloat(b.dataset.amt), b.dataset.ref);
    });
    document.getElementById('portal-pay-all')?.addEventListener('click', () => pay(bulk, 'BULK-' + token.slice(0, 8)));
  },

  async buyLicensePlan(planId, period, amount) {
    try {
      if (!window.PayFast) throw new Error('PayFast not loaded');
      const plans = typeof LICENSE_PLANS_ZAR !== 'undefined' ? LICENSE_PLANS_ZAR : [];
      const plan = plans.find(p => String(p.id) === String(planId)) || { name: planId };
      const hwid = (window.License && (License.hwid || await License.getHardwareId())) || 'unknown';
      this.toast('Opening PayFast for ' + (plan.name || planId) + '…', 'info');
      await PayFast.startPayment({
        amount,
        itemName: 'SA Invoice Pro – ' + (plan.name || planId) + ' (' + period + ')',
        itemDescription: 'Software licence · HWID ' + hwid,
        mPaymentId: 'LIC-' + planId + '-' + period + '-' + hwid.replace(/[^A-Z0-9]/gi, '').slice(-10) + '-' + Date.now().toString(36),
        email: Auth.currentUser?.email || this.company?.email || '',
        nameFirst: (Auth.currentUser?.fullName || Auth.currentUser?.username || 'User').split(' ')[0],
        nameLast: (Auth.currentUser?.fullName || '').split(' ').slice(1).join(' ') || '',
        customStr1: planId,
        customStr2: 'license'
      });
    } catch (e) {
      this.toast(e.message || 'Could not start licence payment', 'error');
    }
  },



  async ensureServerUrls() {
    try {
      const cfg = window.SA_CONFIG || {};
      const lic = await DB.getSetting('licenseServerUrl', '');
      if (!lic && cfg.defaultLicenseServerUrl) {
        await DB.setSetting('licenseServerUrl', cfg.defaultLicenseServerUrl);
      } else if (!lic) {
        await DB.setSetting('licenseServerUrl', 'https://sa-invoice-license.onrender.com');
      }
      const upd = await DB.getSetting('updateServerUrl', '');
      if (!upd && cfg.defaultUpdateServerUrl) {
        await DB.setSetting('updateServerUrl', cfg.defaultUpdateServerUrl);
      }
      this._serverUrls = {
        license: (await DB.getSetting('licenseServerUrl', '')) || cfg.defaultLicenseServerUrl || 'https://sa-invoice-license.onrender.com',
        update: (await DB.getSetting('updateServerUrl', '')) || cfg.defaultUpdateServerUrl || ''
      };
    } catch (e) {
      this._serverUrls = { license: 'https://sa-invoice-license.onrender.com', update: '' };
    }
  },

  async enterApp() {
    const mark = (t) => {
      try {
        const b = document.getElementById('boot-status');
        if (b) b.textContent = t || '';
        const s = document.getElementById('auth-status');
        if (s) s.textContent = t || '';
      } catch (e) {}
    };
    mark('Opening app…');

    // Show app shell immediately
    try {
      const auth = document.getElementById('auth-screen');
      const appEl = document.getElementById('app');
      if (auth) {
        auth.classList.add('hidden');
        auth.style.cssText = 'display:none!important';
      }
      if (appEl) {
        appEl.classList.remove('hidden');
        appEl.style.cssText = 'display:flex!important;min-height:100vh;flex-direction:column;';
      }
    } catch (e) { console.warn(e); }

    try {
      await this.ensureServerUrls();
      await Promise.race([
        this.applyCloudDefaults(),
        new Promise((r) => setTimeout(r, 1500))
      ]);
    } catch (e) {}

    mark('Loading data…');
    try {
      await Promise.race([
        this.loadData(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
      ]);
    } catch (e) {
      console.warn('loadData', e);
      try { await this.loadAppSettings(); } catch (e2) {}
      this.company = this.company || null;
      this.clients = this.clients || [];
      this.invoices = this.invoices || [];
      this.quotes = this.quotes || [];
      this.products = this.products || [];
      this.services = this.services || [];
      this.tickets = this.tickets || [];
      this.expenses = this.expenses || [];
      this.payments = this.payments || [];
    }

    try {
      if (window.License) {
        this.licenseStatus = await Promise.race([
          License.init(),
          new Promise((r) => setTimeout(() => r(License.getStatus()), 5000))
        ]);
      }
    } catch (e) { console.warn('License.init', e); }

    try {
      this.onboardingDone = await Promise.race([
        DB.getSetting('onboardingDone', false),
        new Promise((r) => setTimeout(() => r(false), 2000))
      ]);
    } catch (e) {
      this.onboardingDone = false;
    }

    try { this.setupUI(); } catch (e) { console.warn('setupUI', e); }
    try { this.setupConnectivity(); } catch (e) {}
    try { this.setupKeyboardShortcuts(); } catch (e) {}
    try { this.setupPWA(); } catch (e) {}
    try { this.applyTheme(); } catch (e) {}
    try { await this.loadHelixUrlFromSettings(); } catch (e) {}
    try { this.applyAccent(); } catch (e) {}

    if (Auth.currentUser && Auth.currentUser.isNewRegistration) {
      Auth.currentUser.isNewRegistration = false;
      try { Auth._persistSession(Auth.currentUser, true); } catch (e) {}
    }

    mark('');

    // Route: company name present → Home; otherwise → company setup
    const hasCompany = !!(this.company && String(this.company.name || '').trim());
    const main = document.getElementById('main');

    try {
      if (hasCompany) {
        if (!this.onboardingDone) {
          try { await DB.setSetting('onboardingDone', true); } catch (e) {}
          this.onboardingDone = true;
        }
        this.currentPage = 'home';
        try { localStorage.setItem('sa_current_page', 'home'); } catch (e) {}
        try {
          await Promise.race([
            Promise.resolve(this.navigate('home')),
            new Promise((r) => setTimeout(r, 4000))
          ]);
        } catch (e) {
          if (main) {
            main.innerHTML = '<div class="p-6"><h2 class="text-xl font-bold mb-2">Home</h2><p>Welcome. Use the menu for invoices, clients, and more.</p></div>';
          }
        }
        if (!this._portalGuest) this.toast('Welcome back, ' + (Auth.currentUser?.username || '') + '!', 'success');
        this.licenseStatus = (window.License && License.getStatus()) || this.licenseStatus;
        try { if (window.License) await License.pullRemoteConfig(); } catch (e) {}
        setTimeout(() => this.showTrialSplashIfNeeded(), 800);
        setTimeout(() => this.handlePayFastReturn(), 400);
      } else {
        this.currentPage = 'onboarding';
        this.showOnboarding();
        this.toast('Complete your company profile to continue', 'info');
      }
    } catch (e) {
      console.error('enterApp route', e);
      try { this.showOnboarding(); } catch (e2) {
        if (main) {
          main.innerHTML = `<div class="p-6 max-w-lg mx-auto">
            <h2 class="text-xl font-bold mb-2">Company setup</h2>
            <p class="text-sm text-slate-600 mb-4">${(e && e.message) || 'Could not open setup form.'}</p>
            <button type="button" class="btn btn-primary" id="btn-retry-onboard">Open company setup</button>
            <button type="button" class="btn btn-outline mt-2" onclick="location.reload()">Reload</button>
          </div>`;
          document.getElementById('btn-retry-onboard')?.addEventListener('click', () => {
            try { this.showOnboarding(); } catch (x) { this.toast(String(x.message || x), 'error'); }
          });
        }
      }
    }

    if (main) {
      main.style.display = 'block';
      main.style.visibility = 'visible';
      main.style.minHeight = '60vh';
      try { main.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {}
    }
  },



  async loadAppSettings() {
    try {
      const g = async (k, d) => {
        try { return await DB.getSetting(k, d); } catch (e) { return d; }
      };
      this.vatEnabled = !!(await g('vatEnabled', true));
      const vr = await g('vatRate', 0.15);
      this.vatRate = Number(vr) || 0.15;
      this.template = (await g('template', 'classic')) || 'classic';
      this.accent = (await g('accent', 'green')) || 'green';
      this.theme = (await g('theme', 'sage')) || 'sage';
      this.logoData = await g('logoData', null);
      this.pdfSignName = (await g('pdfSignName', '')) || '';
      this.pdfSignTitle = (await g('pdfSignTitle', '')) || '';
      this.pdfAutoSign = (await g('pdfAutoSign', true)) !== false;
      this.businessTemplate = (await g('businessTemplate', null)) || this.company?.businessType || null;
      const mods = await g('modules', null);
      if (mods) this.modules = mods;
      if (this.businessTemplate) {
        try {
          await this.loadProfilePack(this.businessTemplate);
          if (this.profilePack?.modules && !mods) this.modules = this.profilePack.modules;
        } catch (e) {}
      }
      // localStorage backup if IDB returned defaults inconsistently
      try {
        const raw = localStorage.getItem('saip_settings_v1');
        if (raw) {
          const b = JSON.parse(raw);
          if (b.businessTemplate && !this.businessTemplate) this.businessTemplate = b.businessTemplate;
          if (b.theme) this.theme = b.theme;
          if (b.template) this.template = b.template;
          if (b.accent) this.accent = b.accent;
          if (typeof b.vatEnabled === 'boolean') this.vatEnabled = b.vatEnabled;
          if (b.modules && !mods) this.modules = b.modules;
        }
      } catch (e) {}
      try { this.applyTheme(); } catch (e) {}
    try { await this.loadHelixUrlFromSettings(); } catch (e) {}
      try { this.applyAccent(); } catch (e) {}
    } catch (e) {
      console.warn('loadAppSettings', e);
    }
  },

  async loadData(force) {
    const now = Date.now();
    if (!force && this._dataLoadedAt && (now - this._dataLoadedAt) < 2500 && this.clients) {
      return; // skip redundant reloads within 2.5s (speed)
    }
    const safe = async (store) => {
      try {
        if (!store) return [];
        return (await DB.getAll(store)) || [];
      } catch (e) {
        console.warn('getAll', store, e);
        return [];
      }
    };
    try {
      this.company = await DB.getCompany();
    } catch (e) {
      this.company = null;
    }
    this.clients = await safe(DB.STORES.clients);
    this.products = await safe(DB.STORES.products);
    this.services = await safe(DB.STORES.services);
    this.invoices = await safe(DB.STORES.invoices);
    this.quotes = await safe(DB.STORES.quotes);
    this.tickets = await safe(DB.STORES.tickets);
    this.timeEntries = await safe(DB.STORES.timeEntries);
    this.expenses = await safe(DB.STORES.expenses);
    this.payments = await safe(DB.STORES.payments);
    this.employees = await safe(DB.STORES.employees);
    this.payslips = await safe(DB.STORES.payslips);
    this.popiaRequests = await safe(DB.STORES.popiaRequests);
    this.bankTxns = await safe(DB.STORES.bankTxns);
    this.journal = await safe(DB.STORES.journal);
    this.accounts = await safe(DB.STORES.accounts);
    this.reconciliations = await safe(DB.STORES.reconciliations);
    try {
      this.recurring = (await DB.getSetting('recurringInvoices', [])) || [];
    } catch (e) {
      this.recurring = [];
    }
    try {
      this.supplierBills = (await DB.getSetting('supplierBills', [])) || [];
      this.fixedAssets = (await DB.getSetting('fixedAssets', [])) || [];
      const by = (await DB.getSetting('budgetsByYear', {})) || {};
      const y = new Date().getFullYear();
      this.budgets = by[y] || by[String(y)] || {};
      this.closedYears = (await DB.getSetting('closedYears', [])) || [];
    } catch (e2) {
      this.supplierBills = this.supplierBills || [];
      this.fixedAssets = this.fixedAssets || [];
      this.budgets = this.budgets || {};
      this.closedYears = this.closedYears || [];
    }
    this._dataLoadedAt = Date.now();
    this._clientMap = null;
    try { await this.loadAppSettings(); } catch (e) {}
  },


  showOnboarding() {
    try {
      const auth = document.getElementById('auth-screen');
      if (auth) {
        auth.classList.add('hidden');
        auth.style.cssText = 'display:none!important';
      }
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.classList.remove('hidden');
        appEl.style.cssText = 'display:flex!important;min-height:100vh;flex-direction:column;';
      }
    } catch (e) {}

    const main = document.getElementById('main');
    if (!main) {
      this.toast('App shell missing — reloading…', 'error');
      setTimeout(() => location.reload(), 600);
      return;
    }

    const templates = (typeof window !== 'undefined' && Array.isArray(window.BUSINESS_TEMPLATES) && window.BUSINESS_TEMPLATES.length)
      ? window.BUSINESS_TEMPLATES
      : [
          { id: 'custom', name: 'Custom / General', desc: 'Flexible setup for any SA business', icon: 'briefcase' },
          { id: 'it-services', name: 'IT & Services', desc: 'Support, SLA, consulting', icon: 'monitor' },
          { id: 'retail', name: 'Retail / POS', desc: 'Products and stock', icon: 'shopping-cart' },
          { id: 'professional', name: 'Professional services', desc: 'Fees, retainers, quotes', icon: 'scale' },
          { id: 'construction', name: 'Construction', desc: 'Jobs, materials, progress', icon: 'hard-hat' },
          { id: 'startup', name: 'Startup', desc: 'Lean invoicing to start', icon: 'rocket' }
        ];

    const provinces = ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Free State','Limpopo','Mpumalanga','North West','Northern Cape'];
    const c = this.company || {};

    main.innerHTML = `
      <div class="max-w-3xl mx-auto pb-16" id="onboarding-root">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-sa-green rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">SA</div>
          <h1 class="text-3xl font-bold mb-2">Welcome aboard!</h1>
          <p class="text-slate-500">Tell us about your business, pick a template, choose your look — then tap <strong>Let's Go</strong>.</p>
        </div>

        <div class="card p-6 mb-6">
          <h2 class="text-xl font-semibold mb-1">1. Your Business Details</h2>
          <p class="text-sm text-slate-500 mb-4">Shown on invoices and quotes</p>
          <form id="onboard-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2"><label class="label">Company / Trading Name *</label>
                <input name="name" class="input" required placeholder="e.g. Acme Solutions (Pty) Ltd" value="${(c.name||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">CIPC Registration No</label>
                <input name="regNo" class="input" placeholder="2020/123456/07" value="${(c.regNo||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">VAT Number</label>
                <input name="vatNo" class="input" placeholder="4123456789" value="${(c.vatNo||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">Phone</label>
                <input name="phone" class="input" value="${(c.phone||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">Email</label>
                <input name="email" type="email" class="input" value="${(c.email||'').replace(/"/g,'&quot;')}" /></div>
              <div class="sm:col-span-2"><label class="label">Address</label>
                <input name="address" class="input" value="${(c.address||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">City</label>
                <input name="city" class="input" value="${(c.city||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">Province</label>
                <select name="province" class="input">
                  <option value="">— Select —</option>
                  ${provinces.map(p => `<option value="${p}" ${c.province===p?'selected':''}>${p}</option>`).join('')}
                </select>
              </div>
            </div>
            <h3 class="font-semibold text-sa-green pt-2">Banking (optional)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label class="label">Bank</label><input name="bankName" class="input" placeholder="Capitec / FNB / Standard / Absa" value="${(c.bankName||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">Account holder name</label><input name="accountHolder" class="input" placeholder="As registered at Capitec" /></div>
              <div><label class="label">Account Number</label><input name="accountNumber" class="input" value="${(c.accountNumber||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">Branch Code</label><input name="branchCode" class="input" value="${(c.branchCode||'').replace(/"/g,'&quot;')}" /></div>
              <div><label class="label">Account Type</label>
                <select name="accountType" class="input">
                  <option value="">—</option>
                  <option ${c.accountType==='Cheque / Current'?'selected':''}>Cheque / Current</option>
                  <option ${c.accountType==='Savings'?'selected':''}>Savings</option>
                  <option ${c.accountType==='Business'?'selected':''}>Business</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div class="card p-6 mb-6">
          <h2 class="text-xl font-semibold mb-1">2. Business Type</h2>
          <p class="text-sm text-slate-500 mb-4">Pre-loads useful defaults</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="template-grid">
            ${templates.map(t => `
              <label class="template-card border rounded-xl p-4 cursor-pointer hover:border-sa-green transition flex gap-3 items-start">
                <input type="radio" name="bizTemplate" value="${t.id}" class="mt-1" ${t.id==='custom'?'checked':''} />
                <div>
                  <div class="font-semibold">${t.name || t.id}</div>
                  <div class="text-xs text-slate-500 mt-1">${t.desc || ''}</div>
                </div>
              </label>`).join('')}
          </div>
        </div>

        <div class="card p-6 mb-6">
          <h2 class="text-xl font-semibold mb-1">3. Look &amp; Feel</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Invoice style</label>
              <select id="ob-template" class="input">
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            <div>
              <label class="label">Accent colour</label>
              <select id="ob-accent" class="input">
                ${['green','navy','blue','purple','teal','orange','red','gold'].map(c =>
                  `<option value="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label">VAT</label>
              <select id="ob-vat" class="input">
                <option value="true">Enable 15% VAT</option>
                <option value="false">Disable VAT (not registered)</option>
              </select>
            </div>
            <div>
              <label class="label">Theme</label>
              <select id="ob-theme" class="input">
                <option value="sage">Sage</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="ocean">Ocean</option>
                <option value="sunset">Sunset</option>
                <option value="forest">Forest</option>
                <option value="slate">Slate</option>
              </select>
            </div>
          </div>
        </div>

        <button type="button" id="btn-lets-go" class="btn btn-primary w-full text-lg py-3">
          Let's Go
        </button>
        <p class="text-center text-xs text-slate-400 mt-3">You can change these later in Settings</p>
      </div>`;

    try {
      if (typeof lucide !== 'undefined') { try { const root = document.getElementById('main') || document.body; lucide.createIcons({ nodes: root.querySelectorAll ? [root] : undefined }); } catch (e) { try { lucide.createIcons(); } catch (e2) {} } }
    } catch (e) {}

    const btn = document.getElementById('btn-lets-go');
    if (btn) {
      btn.onclick = (ev) => {
        ev.preventDefault();
        this.finishOnboarding().catch(err => {
          console.error(err);
          this.toast(err.message || 'Could not save company profile', 'error');
        });
      };
    } else {
      this.toast('Setup button missing — try reload', 'error');
    }

    try {
      main.scrollTop = 0;
      document.getElementById('onboarding-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {}
  },


  async finishOnboarding() {
    const form = document.getElementById('onboard-form');
    if (!form) {
      this.toast('Company form not found — reopen setup', 'error');
      return this.showOnboarding();
    }
    const data = Object.fromEntries(new FormData(form));
    const nameErr = this.validateCompanyName(data.name);
    if (nameErr) return this.toast(nameErr, 'error');
    // Email / phone optional on first setup
    if ((data.email || '').trim()) {
      const emailErr = this.validateEmail(data.email);
      if (emailErr) return this.toast(emailErr, 'error');
    }
    if ((data.phone || '').trim()) {
      const phoneErr = this.validatePhone(data.phone);
      if (phoneErr) return this.toast(phoneErr, 'error');
    }
    if ((data.vatNo || '').trim() && this.validateVatNo) {
      const vatErr = this.validateVatNo(data.vatNo);
      if (vatErr) return this.toast(vatErr, 'error');
    }

    await DB.saveCompany(data);
    this.company = data;

    const tplId = document.querySelector('input[name="bizTemplate"]:checked')?.value || 'custom';
    await applyBusinessTemplate(tplId);
    await this.loadProfilePack(tplId);

    const template = document.getElementById('ob-template').value;
    const accent = document.getElementById('ob-accent').value;
    const vatEnabled = document.getElementById('ob-vat').value === 'true';
    const theme = document.getElementById('ob-theme').value;

    await DB.setSetting('template', template);
    await DB.setSetting('accent', accent);

    const bizType = document.getElementById('business-type-select')?.value;
    if (bizType && bizType !== this.businessTemplate) {
      await applyBusinessTemplate(bizType);
      this.businessTemplate = bizType;
      await this.loadProfilePack(bizType);
      this.modules = await DB.getSetting('modules', this.modules);
      this.setupUI();
      this.toast('Profile: ' + (this.profilePack?.name || bizType));
    }
    await DB.setSetting('vatEnabled', vatEnabled);
    await DB.setSetting('theme', theme);
    await DB.setSetting('onboardingDone', true);

    this.template = template;
    this.accent = accent;
    this.vatEnabled = vatEnabled;
    this.theme = theme;
    this.onboardingDone = true;

    await this.loadData(true);
    this.applyTheme();
    this.applyAccent();
    this.setupUI();
    this.navigate('home');
    this.toast('Company setup complete — welcome!', 'success');
    const guided = await DB.getSetting('guidedTutorialDone', false);
    if (!guided) setTimeout(() => this.startGuidedTutorial(), 600);
  },

  // ========== UI SETUP ==========
  setupUI() {
    const allNav = [
      { page: 'home', icon: 'home', label: 'Home', module: null },
      { page: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard', module: null },
      { page: 'documents', icon: 'files', label: 'Doc generator', module: null },
      { page: 'invoices', icon: 'file-text', label: this.getProfileLabel('invoices','Invoices'), module: 'invoices' },
      { page: 'quotes', icon: 'file-pen', label: this.getProfileLabel('quotes','Quotes'), module: 'quotes' },
      { page: 'tickets', icon: 'ticket', label: this.getProfileLabel('tickets', this.hasModule('sla') ? 'Tickets / SLA' : 'Jobs / Tickets'), module: 'tickets' },
      { page: 'clients', icon: 'users', label: this.getProfileLabel('clients','Clients'), module: 'clients' },
      { page: 'products', icon: 'package', label: this.getProfileLabel('products', this.hasModule('pos') ? 'Products / POS' : 'Products'), module: 'products' },
      { page: 'services', icon: 'wrench', label: this.getProfileLabel('services','Services'), module: 'services' },
      { page: 'expenses', icon: 'wallet', label: 'Expenses', module: 'expenses' },
      { page: 'payroll', icon: 'banknote', label: 'Payroll', module: 'payroll' },
      { page: 'popia', icon: 'shield', label: 'POPIA', module: 'popia' },
      { page: 'reports', icon: 'bar-chart-3', label: 'Reports', module: 'reports' },
      { page: 'accounting', icon: 'scale', label: 'Accounting', module: 'reports' },
      { page: 'industry', icon: 'building-2', label: 'Industry docs', module: null },
      { page: 'about', icon: 'info', label: 'About / Updates', module: null },
      { page: 'license', icon: 'key', label: 'License', module: null },
      { page: 'settings', icon: 'settings', label: 'Settings', module: null }
    ];
    const navItems = allNav.filter(n => !n.module || this.hasModule(n.module));
    const html = navItems.map(n =>
      `<button type="button" data-page="${n.page}" class="nav-btn"><i data-lucide="${n.icon}" class="w-5 h-5"></i> <span>${n.label}</span></button>`
    ).join('');

    const navDesktop = document.getElementById('nav-desktop');
    const navMobile = document.getElementById('nav-mobile');
    if (navDesktop) navDesktop.innerHTML = html + '<div class="app-copyright mt-auto px-3 py-4 opacity-70">' + (typeof APP_COPYRIGHT!=='undefined'?APP_COPYRIGHT:'SA Invoice Pro') + '</div>';
    if (navMobile) navMobile.innerHTML = html;

    const closeMobile = () => {
      document.getElementById('mobile-sidebar')?.classList.add('-translate-x-full');
      document.getElementById('sidebar-overlay')?.classList.add('hidden');
    };
    const go = (page) => { if (page) { this.navigate(page); closeMobile(); } };

    if (navDesktop && !navDesktop._navBound) {
      navDesktop._navBound = true;
      navDesktop.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (btn) go(btn.dataset.page);
      });
    }
    if (navMobile && !navMobile._navBound) {
      navMobile._navBound = true;
      navMobile.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (btn) go(btn.dataset.page);
      });
    }

    const bindOnce = (id, fn) => {
      const el = document.getElementById(id);
      if (el && !el._bound) { el._bound = true; el.addEventListener('click', fn); }
    };
    bindOnce('btn-menu', () => {
      document.getElementById('mobile-sidebar')?.classList.remove('-translate-x-full');
      document.getElementById('sidebar-overlay')?.classList.remove('hidden');
    });
    bindOnce('btn-close-menu', closeMobile);
    bindOnce('sidebar-overlay', closeMobile);
    bindOnce('btn-theme', () => this.toggleTheme());
    bindOnce('btn-home', () => this.navigate('home'));
    bindOnce('btn-lock', () => { Auth.logout(); location.reload(); });

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
      const st = this.licenseStatus;
      const lic = st ? st.label : '';
      const on = this.isOnline !== false;
      userDisplay.innerHTML = `User: ${Auth.currentUser?.username || ''}<br><span style="color:var(--sa-green)">${lic}</span><br><span id="connectivity-badge" class="connectivity-badge ${on?'online':'offline'}">${on?'Online':'Offline'}</span>`;
    }
    if (typeof lucide !== 'undefined') { try { lucide.createIcons(); } catch (e) {} }
  },



  clientStatementPdf(clientId) {
    const c = (this.clients || []).find(x => String(x.id) === String(clientId));
    if (!c) return this.toast('Client not found', 'error');
    const inv = (this.invoices || []).filter(i => String(i.clientId) === String(clientId) && i.status !== 'cancelled');
    if (!inv.length) return this.toast('No invoices for this client', 'error');
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const co = this.company || {};
      doc.setFillColor(0, 122, 77);
      doc.rect(0, 0, 210, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(co.name || 'SA Invoice Pro', 14, 12);
      doc.setFontSize(10);
      doc.text('CLIENT STATEMENT', 14, 20);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      doc.text('Client: ' + (c.name || ''), 14, 36);
      doc.text('Date: ' + new Date().toLocaleDateString('en-ZA'), 14, 42);
      if (c.email) doc.text(String(c.email), 14, 48);
      const body = inv.sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).map(i => [
        i.number || '',
        i.date || '',
        i.dueDate || '',
        i.status || '',
        'R ' + Number(i.total || 0).toFixed(2)
      ]);
      const outstanding = inv.filter(i => i.status !== 'paid').reduce((s, i) => s + (Number(i.total) || 0), 0);
      const paid = inv.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.total) || 0), 0);
      if (doc.autoTable) {
        doc.autoTable({
          startY: 56,
          head: [['Invoice', 'Date', 'Due', 'Status', 'Total']],
          body,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [0, 122, 77] }
        });
        let y = doc.lastAutoTable.finalY + 10;
        doc.setFont(undefined, 'bold');
        doc.text('Paid: R ' + paid.toFixed(2), 14, y);
        doc.text('Outstanding: R ' + outstanding.toFixed(2), 14, y + 7);
      }
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text((typeof APP_COPYRIGHT !== 'undefined' ? APP_COPYRIGHT : 'SA Invoice Pro'), 14, 285);
      doc.save('Statement-' + (c.name || 'client').replace(/\s+/g, '-') + '.pdf');
      this.toast('Client statement PDF downloaded', 'success');
    } catch (e) {
      this.toast(e.message || 'Statement failed', 'error');
    }
  },


  packingSlipPdf(id) {
    const inv = (this.invoices || []).find(x => String(x.id) === String(id));
    if (!inv) return this.toast('Invoice not found', 'error');
    const c = (this.clients || []).find(x => String(x.id) === String(inv.clientId)) || { name: inv.clientName || 'Client' };
    const co = this.company || {};
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFillColor(0, 122, 77);
      doc.rect(0, 0, 210, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(co.name || 'SA Invoice Pro', 14, 12);
      doc.setFontSize(10);
      doc.text('PACKING SLIP / DELIVERY NOTE', 14, 20);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      let y = 36;
      doc.setFont(undefined, 'bold');
      doc.text('Ship to', 14, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(String(c.name || ''), 14, y); y += 5;
      if (c.address) { doc.text(String(c.address), 14, y); y += 5; }
      if (c.city) { doc.text(String(c.city), 14, y); y += 5; }
      if (c.phone) { doc.text(String(c.phone), 14, y); y += 5; }
      y += 4;
      doc.text('Invoice ref: ' + (inv.number || ''), 14, y); y += 5;
      doc.text('Date: ' + (inv.date || new Date().toISOString().slice(0, 10)), 14, y); y += 8;
      const items = inv.items || [];
      const body = items.map((it, i) => [
        String(i + 1),
        it.description || it.name || '',
        String(it.qty ?? 1),
        it.unit || ''
      ]);
      if (doc.autoTable) {
        doc.autoTable({
          startY: y,
          head: [['#', 'Description', 'Qty', 'Unit']],
          body: body.length ? body : [['—', 'No line items', '', '']],
          styles: { fontSize: 9 },
          headStyles: { fillColor: [0, 122, 77] }
        });
        y = doc.lastAutoTable.finalY + 16;
      }
      doc.text('Received in good order: ______________________  Date: __________', 14, y);
      y += 10;
      doc.text('Print name: ______________________  Signature: __________', 14, y);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text((typeof APP_COPYRIGHT !== 'undefined' ? APP_COPYRIGHT : 'SA Invoice Pro') + ' · Not a tax invoice', 14, 285);
      doc.save('PackingSlip-' + (inv.number || id) + '.pdf');
      this.toast('Packing slip PDF downloaded', 'success');
    } catch (e) {
      this.toast(e.message || 'Packing slip failed', 'error');
    }
  },


  // ========== ENTITY MODALS (restored) ==========
  showItemModal(kind, id) {
    const isProduct = kind === 'product';
    const list = isProduct ? this.products : this.services;
    const item = id ? (list || []).find(x => String(x.id) === String(id)) : null;
    this.showModal(`
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">${id ? 'Edit' : 'New'} ${isProduct ? 'product' : 'service'}</h3>
        <form id="item-form" class="space-y-3">
          <div><label class="label">Name *</label><input name="name" class="input" value="${item?.name || ''}" required /></div>
          <div><label class="label">Description</label><textarea name="description" class="input" rows="2">${item?.description || ''}</textarea></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Unit price (excl VAT)</label>
              <input name="unitPrice" type="number" step="0.01" min="0" class="input" value="${item?.unitPrice ?? item?.price ?? ''}" /></div>
            <div><label class="label">SKU / code</label><input name="sku" class="input" value="${item?.sku || ''}" /></div>
          </div>
          ${isProduct ? `
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Stock on hand</label>
              <input name="stock" type="number" step="1" class="input" value="${item?.stock != null ? item.stock : ''}" placeholder="Leave blank if not tracked" /></div>
            <div><label class="label">Reorder level</label>
              <input name="reorderLevel" type="number" step="1" min="0" class="input" value="${item?.reorderLevel != null ? item.reorderLevel : 5}" /></div>
          </div>
          <p class="text-xs text-slate-500">Low-stock alert on Home when stock ≤ reorder level.</p>` : ''}
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.saveItem('${kind}', ${id ? id : 'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveItem(kind, id) {
    const form = document.getElementById('item-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const isProduct = kind === 'product';
    const data = {
      name: (fd.name || '').trim(),
      description: (fd.description || '').trim(),
      unitPrice: parseFloat(fd.unitPrice) || 0,
      sku: (fd.sku || '').trim()
    };
    if (!data.name) return this.toast('Name required', 'error');
    if (isProduct) {
      if (fd.stock !== '' && fd.stock != null) data.stock = parseFloat(fd.stock);
      else data.stock = null;
      data.reorderLevel = fd.reorderLevel !== '' ? parseFloat(fd.reorderLevel) : 5;
    }
    const store = isProduct ? DB.STORES.products : DB.STORES.services;
    try {
      if (id) { data.id = id; await DB.put(store, data); }
      else await DB.add(store, data);
      await this.loadData();
      this.closeModal();
      this.render();
      this.toast((isProduct ? 'Product' : 'Service') + ' saved', 'success');
    } catch (e) {
      this.toast(e.message || 'Save failed', 'error');
    }
  },

  async deleteItem(kind, id) {
    if (!confirm('Delete this ' + kind + '?')) return;
    const store = kind === 'product' ? DB.STORES.products : DB.STORES.services;
    await DB.remove(store, id);
    await this.loadData();
    this.render();
    this.toast('Deleted', 'success');
  },

  showClientModal(id) {
    const c = id ? (this.clients || []).find(x => String(x.id) === String(id)) : null;
    this.showModal(`
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">${id ? 'Edit' : 'New'} client</h3>
        <form id="client-form" class="space-y-3">
          <div><label class="label">Name *</label><input name="name" class="input" value="${c?.name || ''}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Email</label><input name="email" type="email" class="input" value="${c?.email || ''}" /></div>
            <div><label class="label">Phone</label><input name="phone" class="input" value="${c?.phone || ''}" /></div>
          </div>
          <div><label class="label">Address</label><input name="address" class="input" value="${c?.address || ''}" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">City</label><input name="city" class="input" value="${c?.city || ''}" /></div>
            <div><label class="label">VAT number</label><input name="vatNo" class="input" value="${c?.vatNo || ''}" /></div>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary" onclick="App.saveClient(${id ? id : 'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveClient(id) {
    const form = document.getElementById('client-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const data = {
      name: (fd.name || '').trim(),
      email: (fd.email || '').trim(),
      phone: (fd.phone || '').trim(),
      address: (fd.address || '').trim(),
      city: (fd.city || '').trim(),
      vatNo: (fd.vatNo || '').trim()
    };
    if (!data.name) return this.toast('Name required', 'error');
    try {
      if (id) { data.id = id; await DB.put(DB.STORES.clients, data); }
      else await DB.add(DB.STORES.clients, data);
      await this.loadData();
      this.closeModal();
      this.render();
      this.toast('Client saved', 'success');
    } catch (e) {
      this.toast(e.message || 'Save failed', 'error');
    }
  },

  async deleteClient(id) {
    if (!confirm('Delete this client?')) return;
    await DB.remove(DB.STORES.clients, id);
    await this.loadData();
    this.render();
    this.toast('Client deleted', 'success');
  },

  showTicketModal(id) {
    const t = id ? (this.tickets || []).find(x => String(x.id) === String(id)) : null;
    const clients = this.clients || [];
    this.showModal(`
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">${id ? 'Edit' : 'New'} ticket</h3>
        <form id="ticket-form" class="space-y-3">
          <div><label class="label">Title *</label><input name="title" class="input" value="${t?.title || t?.subject || ''}" required /></div>
          <div><label class="label">Client</label>
            <select name="clientId" class="input">
              <option value="">—</option>
              ${clients.map(c => `<option value="${c.id}" ${t && String(t.clientId)===String(c.id)?'selected':''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Status</label>
              <select name="status" class="input">
                ${['open','in_progress','waiting','resolved','closed'].map(s =>
                  `<option value="${s}" ${((t?.status)||'open')===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div><label class="label">Priority</label>
              <select name="priority" class="input">
                ${['low','normal','high','urgent'].map(s =>
                  `<option value="${s}" ${((t?.priority)||'normal')===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div><label class="label">Details</label><textarea name="notes" class="input" rows="3">${t?.notes || t?.description || ''}</textarea></div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary" onclick="App.saveTicket(${id ? id : 'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveTicket(id) {
    const form = document.getElementById('ticket-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const data = {
      title: (fd.title || '').trim(),
      clientId: fd.clientId ? Number(fd.clientId) || fd.clientId : null,
      status: fd.status || 'open',
      priority: fd.priority || 'normal',
      notes: (fd.notes || '').trim()
    };
    if (!data.title) return this.toast('Title required', 'error');
    try {
      if (id) {
        data.id = id;
        const existing = (this.tickets || []).find(x => String(x.id) === String(id)) || {};
        await DB.put(DB.STORES.tickets, { ...existing, ...data });
      } else {
        data.number = await DB.getNextNumber('ticket');
        data.createdAt = new Date().toISOString();
        await DB.add(DB.STORES.tickets, data);
      }
      await this.loadData();
      this.closeModal();
      this.render();
      this.toast('Ticket saved', 'success');
    } catch (e) {
      this.toast(e.message || 'Save failed', 'error');
    }
  },

  async deleteTicket(id) {
    if (!confirm('Delete this ticket?')) return;
    await DB.remove(DB.STORES.tickets, id);
    await this.loadData();
    this.render();
    this.toast('Ticket deleted', 'success');
  },

  showTimeModal(ticketId) {
    this.showModal(`
      <div class="p-6">
        <h3 class="text-xl font-bold mb-4">Log time</h3>
        <form id="time-form" class="space-y-3">
          <div><label class="label">Minutes</label><input name="minutes" type="number" min="1" class="input" value="60" required /></div>
          <div><label class="label">Note</label><input name="note" class="input" /></div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary" onclick="App.saveTime(${JSON.stringify(String(ticketId))})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveTime(ticketId) {
    const form = document.getElementById('time-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const minutes = parseInt(fd.minutes, 10) || 0;
    if (minutes <= 0) return this.toast('Enter minutes', 'error');
    await DB.add(DB.STORES.timeEntries, {
      ticketId, minutes, note: fd.note || '', at: new Date().toISOString()
    });
    await this.loadData();
    this.closeModal();
    this.render();
    this.toast('Time logged', 'success');
  },

  // Payment history + batch paid
  async recordPayment(invoiceId, amount, note) {
    const inv = this.byId(this.invoices, invoiceId);
    if (!inv) return;
    const amt = Number(amount) || 0;
    const payments = Array.isArray(inv.payments) ? inv.payments.slice() : [];
    payments.push({
      amount: amt,
      note: note || '',
      at: new Date().toISOString()
    });
    inv.payments = payments;
    const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    inv.amountPaid = totalPaid;
    const total = Number(inv.total) || 0;
    inv.amountDue = Math.max(0, total - totalPaid);
    if (totalPaid >= total && total > 0) {
      const prev = inv.status;
      inv.status = 'paid';
      inv.paidDate = new Date().toISOString().slice(0, 10);
      if (prev !== 'paid') await this.applyStockForInvoice(inv, -1);
    } else if (totalPaid > 0) {
      inv.status = 'partial';
    }
    await DB.put(DB.STORES.invoices, inv);
  },

  showPaymentHistory(id) {
    const inv = (this.invoices || []).find(x => String(x.id) === String(id));
    if (!inv) return this.toast('Invoice not found', 'error');
    const payments = inv.payments || [];
    this.showModal(`
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold mb-2">Payments – ${inv.number || ''}</h3>
        <p class="text-sm text-slate-500 mb-3">Total ${this.formatMoney(inv.total)} · Paid ${this.formatMoney(inv.amountPaid || 0)} · Due ${this.formatMoney(inv.amountDue != null ? inv.amountDue : inv.total)}</p>
        ${payments.length ? `<div class="space-y-2 text-sm mb-4">${payments.map(p => `
          <div class="list-card flex justify-between">
            <span>${(p.at || '').slice(0, 10)} ${p.note ? '· ' + p.note : ''}</span>
            <strong>${this.formatMoney(p.amount)}</strong>
          </div>`).join('')}</div>` : '<p class="text-sm text-slate-400 mb-4">No payments logged yet.</p>'}
        <div class="grid grid-cols-2 gap-2 mb-3">
          <input id="pay-amt" type="number" step="0.01" min="0" class="input" placeholder="Amount" />
          <input id="pay-note" class="input" placeholder="Note (optional)" />
        </div>
        <button type="button" class="btn btn-primary w-full mb-2" onclick="App.addPaymentToInvoice(${JSON.stringify(String(id))})">Add payment</button>
        <button type="button" class="btn btn-outline w-full" onclick="App.closeModal()">Close</button>
      </div>`);
  },

  async addPaymentToInvoice(id) {
    const amt = parseFloat(document.getElementById('pay-amt')?.value || '0');
    const note = document.getElementById('pay-note')?.value || '';
    if (!(amt > 0)) return this.toast('Enter a payment amount', 'error');
    await this.recordPayment(id, amt, note);
    await this.loadData();
    this.toast('Payment recorded', 'success');
    this.showPaymentHistory(id);
  },

  async batchMarkPaid() {
    const boxes = document.querySelectorAll('.inv-select:checked');
    if (!boxes.length) return this.toast('Select one or more invoices first', 'error');
    if (!confirm('Mark ' + boxes.length + ' invoice(s) as paid?')) return;
    let n = 0;
    for (const box of boxes) {
      const id = Number(box.value) || box.value;
      const inv = (this.invoices || []).find(x => String(x.id) === String(id));
      if (!inv || inv.status === 'paid' || inv.isCredit) continue;
      const prev = inv.status;
      inv.status = 'paid';
      inv.paidDate = new Date().toISOString().slice(0, 10);
      inv.amountPaid = Number(inv.total) || 0;
      inv.amountDue = 0;
      if (prev !== 'paid') await this.applyStockForInvoice(inv, -1);
      await DB.put(DB.STORES.invoices, inv);
      n++;
    }
    await this.loadData();
    this.render();
    this.toast(n + ' invoice(s) marked paid', 'success');
  },


  async duplicateInvoice(id) {
    const src = (this.invoices || []).find(x => String(x.id) === String(id));
    if (!src) return this.toast('Invoice not found', 'error');
    try {
      this.toast('Duplicating…', 'info');
      const number = await DB.getNextNumber('invoice');
      const today = new Date().toISOString().slice(0, 10);
      const due = new Date(); due.setDate(due.getDate() + 30);
      const copy = {
        clientId: src.clientId,
        clientName: src.clientName,
        items: (src.items || []).map(it => ({ ...it })),
        subtotal: src.subtotal,
        vatAmount: src.vatAmount,
        total: src.total,
        notes: src.notes,
        number,
        type: 'invoice',
        status: 'draft',
        date: today,
        dueDate: due.toISOString().slice(0, 10),
        duplicatedFrom: src.number
      };
      await DB.add(DB.STORES.invoices, copy);
      await this.loadData();
      this.render();
      this.toast('Duplicated as ' + number, 'success');
    } catch (e) {
      this.toast(e.message || 'Duplicate failed', 'error');
    }
  },


  async duplicateQuote(id) {
    const src = (this.quotes || []).find(x => String(x.id) === String(id));
    if (!src) return this.toast('Quote not found', 'error');
    try {
      this.toast('Duplicating quote…', 'info');
      const number = await DB.getNextNumber('quote');
      const today = new Date().toISOString().slice(0, 10);
      const due = new Date(); due.setDate(due.getDate() + 14);
      const copy = {
        clientId: src.clientId,
        clientName: src.clientName,
        items: (src.items || []).map(it => ({ ...it })),
        subtotal: src.subtotal,
        vatAmount: src.vatAmount,
        total: src.total,
        notes: src.notes,
        number,
        type: 'quote',
        status: 'open',
        date: today,
        dueDate: due.toISOString().slice(0, 10),
        duplicatedFrom: src.number
      };
      await DB.add(DB.STORES.quotes, copy);
      await this.loadData();
      this.render();
      this.toast('Quote duplicated as ' + number, 'success');
    } catch (e) {
      this.toast(e.message || 'Duplicate failed', 'error');
    }
  },


  setupKeyboardShortcuts() {
    if (this._keysBound) return;
    this._keysBound = true;
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const el = document.getElementById('doc-search')
          || document.getElementById('client-search')
          || document.querySelector('input[type="search"]');
        if (el) { el.focus(); el.select?.(); this.toast('Search focused', 'info'); }
        else this.toast('Open Invoices or Clients to search', 'info');
      }
    });
  },


  async getDocPresets() {
    return (await DB.getSetting('docFilterPresets', [])) || [];
  },

  async getClientPresets() {
    return (await DB.getSetting('clientFilterPresets', [])) || [];
  },

  async saveDocPreset() {
    const q = document.getElementById('doc-search')?.value || this._docFilter || '';
    const st = document.getElementById('doc-status-filter')?.value || this._docStatusFilter || '';
    if (!q && !st) return this.toast('Set a search or status first', 'error');
    const name = prompt('Name this filter preset', (st || 'search') + (q ? ': ' + q.slice(0, 20) : ''));
    if (!name) return;
    const list = await this.getDocPresets();
    list.push({ name: name.trim(), q, st, at: new Date().toISOString() });
    await DB.setSetting('docFilterPresets', list.slice(-20));
    this.toast('Preset saved', 'success');
    this.render();
  },

  async deleteDocPreset() {
    const sel = document.getElementById('doc-preset-select');
    if (!sel || !sel.value) return this.toast('Select a preset first', 'error');
    let p;
    try { p = JSON.parse(sel.value); } catch (e) { return this.toast('Invalid preset', 'error'); }
    if (!confirm('Delete preset "' + (p.name || '') + '"?')) return;
    let list = await this.getDocPresets();
    list = list.filter(x => !(x.name === p.name && x.q === p.q && x.st === p.st));
    await DB.setSetting('docFilterPresets', list);
    this.toast('Preset deleted', 'success');
    this.render();
  },

  async loadDocPreset() {
    const sel = document.getElementById('doc-preset-select');
    if (!sel || !sel.value) return;
    try {
      const p = JSON.parse(sel.value);
      this._docFilter = p.q || '';
      this._docStatusFilter = p.st || '';
      this.render();
      this.toast('Preset: ' + (p.name || 'loaded'), 'info');
    } catch (e) {
      this.toast('Invalid preset', 'error');
    }
  },

  async fillDocPresetSelect() {
    const sel = document.getElementById('doc-preset-select');
    if (!sel) return;
    const list = await this.getDocPresets();
    sel.innerHTML = '<option value="">Presets…</option>' + list.map(p =>
      `<option value='${JSON.stringify({ name: p.name, q: p.q, st: p.st }).replace(/'/g, '&#39;')}'>${(p.name || 'Preset').replace(/</g, '')}</option>`
    ).join('');
    if (!sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', () => this.loadDocPreset());
    }
  },

  async saveClientPreset() {
    const q = document.getElementById('client-search')?.value || this._clientFilter || '';
    if (!q) return this.toast('Enter a client search first', 'error');
    const name = prompt('Name this client filter', q.slice(0, 24));
    if (!name) return;
    const list = await this.getClientPresets();
    list.push({ name: name.trim(), q, at: new Date().toISOString() });
    await DB.setSetting('clientFilterPresets', list.slice(-20));
    this.toast('Client preset saved', 'success');
    this.render();
  },

  async deleteClientPreset() {
    const sel = document.getElementById('client-preset-select');
    if (!sel || !sel.value) return this.toast('Select a client preset first', 'error');
    let p;
    try { p = JSON.parse(sel.value); } catch (e) { return this.toast('Invalid preset', 'error'); }
    if (!confirm('Delete client preset "' + (p.name || '') + '"?')) return;
    let list = await this.getClientPresets();
    list = list.filter(x => !(x.name === p.name && x.q === p.q));
    await DB.setSetting('clientFilterPresets', list);
    this.toast('Client preset deleted', 'success');
    this.render();
  },

  async loadClientPreset() {
    const sel = document.getElementById('client-preset-select');
    if (!sel || !sel.value) return;
    try {
      const p = JSON.parse(sel.value);
      this._clientFilter = p.q || '';
      this.render();
      this.toast('Client preset: ' + (p.name || 'loaded'), 'info');
    } catch (e) {
      this.toast('Invalid preset', 'error');
    }
  },

  async fillClientPresetSelect() {
    const sel = document.getElementById('client-preset-select');
    if (!sel) return;
    const list = await this.getClientPresets();
    sel.innerHTML = '<option value="">Client presets…</option>' + list.map(p =>
      `<option value='${JSON.stringify({ name: p.name, q: p.q }).replace(/'/g, '&#39;')}'>${(p.name || 'Preset').replace(/</g, '')}</option>`
    ).join('');
    if (!sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', () => this.loadClientPreset());
    }
  },


  sortDocs(key) {
    if (!key) return;
    if (this._docSort === key) {
      this._docSortDir = this._docSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._docSort = key;
      this._docSortDir = key === 'date' || key === 'number' ? 'desc' : 'asc';
    }
    this.render();
  },

  getFilteredDocsList(isQuote) {
    let list = [...(isQuote ? this.quotes : this.invoices) || []];
    const q = (this._docFilter || '').trim().toLowerCase();
    const st = this._docStatusFilter || '';
    if (q) {
      list = list.filter(doc => {
        const c = (this.clients || []).find(x => String(x.id) === String(doc.clientId));
        const hay = [doc.number, doc.status, doc.clientName, c?.name, c?.email].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    if (st) list = list.filter(doc => (doc.status || '') === st || (st === 'credit' && doc.isCredit));
    const sortKey = this._docSort || 'date';
    const sortDir = this._docSortDir || 'desc';
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'total') return ((Number(a.total)||0) - (Number(b.total)||0)) * dir;
      if (sortKey === 'status') {
        return String(a.isCredit ? 'credit' : (a.status || '')).localeCompare(String(b.isCredit ? 'credit' : (b.status || ''))) * dir;
      }
      if (sortKey === 'number') return String(a.number||'').localeCompare(String(b.number||''), undefined, { numeric: true }) * dir;
      return String(a.date||'').localeCompare(String(b.date||'')) * dir;
    });
    return list;
  },

  exportFilteredDocs() {
    const isQuote = this.currentPage === 'quotes';
    const list = this.getFilteredDocsList(isQuote);
    if (!list.length) return this.toast('Nothing to export', 'error');
    const rows = [['Number', 'Client', 'Date', 'Due', 'Subtotal', 'VAT', 'Total', 'Status', 'AmountPaid']];
    for (const doc of list) {
      const c = (this.clients || []).find(x => String(x.id) === String(doc.clientId));
      rows.push([
        doc.number || '',
        c?.name || doc.clientName || '',
        doc.date || '',
        doc.dueDate || '',
        doc.subtotal ?? '',
        doc.vatAmount ?? '',
        doc.total ?? '',
        doc.isCredit ? 'credit' : (doc.status || ''),
        doc.amountPaid ?? ''
      ]);
    }
    const csv = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = (isQuote ? 'Quotes' : 'Invoices') + '-filtered-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    this.toast('Exported ' + list.length + ' row(s)', 'success');
  },


  printCurrentList() {
    document.body.classList.add('print-list-mode');
    const title = (this.currentPage || 'list').replace(/^\w/, c => c.toUpperCase());
    const prev = document.title;
    document.title = 'SA Invoice Pro – ' + title;
    this.toast('Opening print dialog…', 'info');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('print-list-mode');
      document.title = prev;
    }, 200);
  },

  async exportDashboardSnapshot() {
    const inv = this.invoices || [];
    const paid = inv.filter(i => i.status === 'paid' && !i.isCredit);
    const unpaid = inv.filter(i => !i.isCredit && ['unpaid', 'partial', 'overdue', 'draft'].includes(i.status));
    const recent = [...inv]
      .filter(i => !i.isCredit)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 10)
      .map(i => ({
        number: i.number,
        client: i.clientName || ((this.clients || []).find(c => String(c.id) === String(i.clientId)) || {}).name || '',
        date: i.date,
        total: i.total,
        status: i.status,
        amountPaid: i.amountPaid
      }));
    const lowStock = (this.products || []).filter(p => {
      if (p.stock == null || p.stock === '') return false;
      const min = p.reorderLevel != null ? Number(p.reorderLevel) : 5;
      return Number(p.stock) <= min;
    }).map(p => ({ name: p.name, stock: p.stock, reorderLevel: p.reorderLevel ?? 5 }));
    const snapshot = {
      version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '5.1.0',
      exportedAt: new Date().toISOString(),
      company: this.company?.name || '',
      businessType: this.company?.businessType || '',
      totals: {
        invoices: inv.length,
        quotes: (this.quotes || []).length,
        clients: (this.clients || []).length,
        products: (this.products || []).length,
        services: (this.services || []).length,
        tickets: (this.tickets || []).length,
        expenses: (this.expenses || []).length
      },
      revenuePaid: paid.reduce((s, i) => s + (Number(i.total) || 0), 0),
      outstanding: unpaid.reduce((s, i) => s + (Number(i.amountDue != null ? i.amountDue : i.total) || 0), 0),
      recentInvoices: recent,
      lowStock,
      vat: typeof this.vatSummary === 'function' ? this.vatSummary() : null,
      aged: typeof this.agedDebtorsBuckets === 'function' ? this.agedDebtorsBuckets() : null
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dashboard-snapshot-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    this.toast('Dashboard snapshot downloaded', 'success');
  },

  toggleRowMenu(el) {
    const cell = el?.closest('td') || el?.closest('.row-actions-cell') || el?.parentElement;
    if (!cell) return;
    const menu = cell.querySelector('.row-menu');
    document.querySelectorAll('.row-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
    if (menu) menu.classList.toggle('open');
  },


  exportDashboardSnapshotPdf() {
    try {
      const inv = this.invoices || [];
      const paid = inv.filter(i => i.status === 'paid' && !i.isCredit);
      const unpaid = inv.filter(i => !i.isCredit && ['unpaid', 'partial', 'overdue', 'draft'].includes(i.status));
      const revenue = paid.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const outstanding = unpaid.reduce((s, i) => s + (Number(i.amountDue != null ? i.amountDue : i.total) || 0), 0);
      const recent = [...inv].filter(i => !i.isCredit)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 10);
      const co = this.company || {};
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFillColor(0, 122, 77);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text(co.name || 'SA Invoice Pro', 14, 14);
      doc.setFontSize(10);
      doc.text('Dashboard snapshot · ' + new Date().toLocaleString(), 14, 22);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      let y = 40;
      doc.setFont(undefined, 'bold');
      doc.text('Summary', 14, y); y += 8;
      doc.setFont(undefined, 'normal');
      const lines = [
        ['Invoices', String(inv.length)],
        ['Quotes', String((this.quotes || []).length)],
        ['Clients', String((this.clients || []).length)],
        ['Products / Services', String((this.products || []).length) + ' / ' + String((this.services || []).length)],
        ['Tickets', String((this.tickets || []).length)],
        ['Expenses', String((this.expenses || []).length)],
        ['Revenue (paid)', this.formatMoney(revenue)],
        ['Outstanding', this.formatMoney(outstanding)]
      ];
      for (const [k, v] of lines) {
        doc.text(k, 14, y);
        doc.text(v, 100, y);
        y += 7;
      }
      y += 6;
      doc.setFont(undefined, 'bold');
      doc.text('Recent invoices', 14, y); y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      if (doc.autoTable) {
        doc.autoTable({
          startY: y,
          head: [['Number', 'Client', 'Date', 'Total', 'Status']],
          body: recent.map(i => [
            i.number || '',
            i.clientName || ((this.clients || []).find(c => String(c.id) === String(i.clientId)) || {}).name || '',
            i.date || '',
            this.formatMoney(i.total),
            i.status || ''
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 122, 77] }
        });
      }
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text((typeof APP_COPYRIGHT !== 'undefined' ? APP_COPYRIGHT : 'SA Invoice Pro') + ' · v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), 14, 285);
      doc.save('Dashboard-Snapshot-' + new Date().toISOString().slice(0, 10) + '.pdf');
      this.toast('Snapshot PDF downloaded', 'success');
    } catch (e) {
      this.toast(e.message || 'PDF snapshot failed', 'error');
    }
  },

  showOfflineBanner(show) {
    let bar = document.getElementById('offline-banner');
    if (!show) {
      if (bar) bar.remove();
      return;
    }
    if (bar) return;
    bar = document.createElement('div');
    bar.id = 'offline-banner';
    bar.className = 'offline-banner';
    bar.innerHTML = 'Offline mode · Changes save on this device and sync when online is available for license/updates.';
    document.body.prepend(bar);
  },


  async batchPayslipsPdf() {
    const slips = this.payslips || [];
    if (!slips.length) return this.toast('No payslips to export', 'error');
    const period = prompt('Export payslips for period (YYYY-MM). Leave blank for all:', new Date().toISOString().slice(0, 7));
    if (period === null) return;
    let list = slips;
    if (period.trim()) {
      list = slips.filter(s => String(s.period || '').startsWith(period.trim()));
    }
    if (!list.length) return this.toast('No payslips for that period', 'error');
    if (!confirm('Generate PDF for ' + list.length + ' payslip(s)?')) return;
    this.toast('Generating ' + list.length + ' payslip(s)…', 'info');
    let n = 0;
    for (const s of list) {
      try {
        if (typeof this.pdfPayslip === 'function') {
          await this.pdfPayslip(s.id);
          n++;
        }
      } catch (e) {
        console.warn(e);
      }
    }
    this.toast('Exported ' + n + ' payslip PDF(s)', 'success');
  },

  renderRecurringCalendar() {
    const rec = this.recurring || this.recurringInvoices || [];
    if (!Array.isArray(rec) || !rec.length) {
      return `<div class="card p-4 text-sm text-slate-500">No recurring invoices set up yet. Mark an invoice as recurring when creating/editing, or use Run recurring.</div>`;
    }
    const months = {};
    for (const r of rec) {
      const next = r.nextRun || r.nextDate || r.date || '';
      const key = String(next).slice(0, 7) || 'unscheduled';
      if (!months[key]) months[key] = [];
      months[key].push(r);
    }
    const keys = Object.keys(months).sort();
    return `
      <div class="card p-4 mt-4">
        <h3 class="font-bold mb-3">Recurring calendar</h3>
        <div class="space-y-3 text-sm">
          ${keys.map(k => `
            <div>
              <div class="font-semibold text-slate-600 mb-1">${k}</div>
              ${months[k].map(r => `
                <div class="list-card flex justify-between py-2">
                  <span>${r.clientName || r.name || r.number || 'Recurring'} · every ${r.interval || r.frequency || 'month'}</span>
                  <span class="text-xs text-slate-500">next ${r.nextRun || r.nextDate || '—'} ${r.paused ? '· PAUSED' : ''}</span>
                  <span class="no-print">
                    <button type="button" class="btn btn-outline p-1" data-action="pause-recurring" data-id="${r.id}">${r.paused ? 'Resume' : 'Pause'}</button>
                    <button type="button" class="btn btn-outline p-1" data-action="skip-recurring" data-id="${r.id}">Skip</button>
                  </span>
                </div>`).join('')}
            </div>`).join('')}
        </div>
      </div>`;
  },

  async wipeDemoData() {
    if (!confirm('DANGER: Delete demo/sample data (demo clients, products, invoices marked as demo)?\n\nYour real company profile and login stay.')) return;
    if (!confirm('Type-confirm: this cannot be undone. Continue?')) return;
    try {
      const isDemo = (x) => x && (x.isDemo || x.demo || String(x.notes || '').includes('[DEMO]') || String(x.name || '').startsWith('Demo '));
      let removed = 0;
      for (const [store, arr] of [
        [DB.STORES.invoices, this.invoices],
        [DB.STORES.quotes, this.quotes],
        [DB.STORES.clients, this.clients],
        [DB.STORES.products, this.products],
        [DB.STORES.services, this.services],
        [DB.STORES.expenses, this.expenses],
        [DB.STORES.tickets, this.tickets]
      ]) {
        for (const row of (arr || [])) {
          if (isDemo(row)) {
            await DB.remove(store, row.id);
            removed++;
          }
        }
      }
      // If nothing tagged demo, offer full transactional wipe of invoices only
      if (removed === 0) {
        if (confirm('No rows tagged as demo. Wipe ALL invoices, quotes, expenses, and tickets? (clients/products kept)')) {
          for (const store of [DB.STORES.invoices, DB.STORES.quotes, DB.STORES.expenses, DB.STORES.tickets]) {
            const rows = await DB.getAll(store);
            for (const row of rows) {
              await DB.remove(store, row.id);
              removed++;
            }
          }
        }
      }
      await this.loadData();
      this.render();
      this.toast('Removed ' + removed + ' record(s)', 'success');
    } catch (e) {
      this.toast(e.message || 'Wipe failed', 'error');
    }
  },


  // ========== ACCOUNTING v6 (major pack) ==========
  defaultChartOfAccounts() {
    return [
      { code: '1000', name: 'Bank / Cash', type: 'asset' },
      { code: '1010', name: 'Petty Cash', type: 'asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset' },
      { code: '1200', name: 'Inventory / Stock', type: 'asset' },
      { code: '1300', name: 'Deposits & Prepayments', type: 'asset' },
      { code: '1500', name: 'Fixed Assets – Equipment', type: 'asset' },
      { code: '1510', name: 'Fixed Assets – Vehicles', type: 'asset' },
      { code: '1590', name: 'Accumulated Depreciation', type: 'asset' },
      { code: '2000', name: 'Accounts Payable', type: 'liability' },
      { code: '2100', name: 'VAT Control (Output/Input)', type: 'liability' },
      { code: '2200', name: 'PAYE / UIF / SDL Control', type: 'liability' },
      { code: '2300', name: 'Loans Payable', type: 'liability' },
      { code: '3000', name: 'Owner Equity / Capital', type: 'equity' },
      { code: '3100', name: 'Retained Earnings', type: 'equity' },
      { code: '3200', name: 'Owner Drawings', type: 'equity' },
      { code: '4000', name: 'Sales / Service Revenue', type: 'income' },
      { code: '4100', name: 'Other Income', type: 'income' },
      { code: '4200', name: 'Interest Received', type: 'income' },
      { code: '5000', name: 'Cost of Sales / Materials', type: 'expense' },
      { code: '5100', name: 'Subcontractors', type: 'expense' },
      { code: '6000', name: 'Operating Expenses', type: 'expense' },
      { code: '6100', name: 'Salaries & Wages', type: 'expense' },
      { code: '6150', name: 'Staff Benefits / UIF contrib.', type: 'expense' },
      { code: '6200', name: 'Rent & Premises', type: 'expense' },
      { code: '6300', name: 'Fuel & Travel', type: 'expense' },
      { code: '6400', name: 'Utilities & Communications', type: 'expense' },
      { code: '6500', name: 'Insurance', type: 'expense' },
      { code: '6600', name: 'Marketing & Advertising', type: 'expense' },
      { code: '6700', name: 'Bank Charges & Interest', type: 'expense' },
      { code: '6800', name: 'Repairs & Maintenance', type: 'expense' },
      { code: '6900', name: 'General & Admin Expenses', type: 'expense' },
      { code: '6950', name: 'Depreciation', type: 'expense' }
    ];
  },

  async ensureChartOfAccounts() {
    if ((this.accounts || []).length) return this.accounts;
    const defaults = this.defaultChartOfAccounts();
    for (const acc of defaults) {
      await DB.add(DB.STORES.accounts, { ...acc, system: true });
    }
    this.accounts = await DB.getAll(DB.STORES.accounts) || [];
    this.toast('Chart of accounts initialised', 'info');
    return this.accounts;
  },

  renderAccounting() {
    const tab = this.acctTab || 'overview';
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'tools', label: 'Tools & calculator' },
      { id: 'bank', label: 'Bank recon' },
      { id: 'statements', label: 'Customer statements' },
      { id: 'suppliers', label: 'Suppliers / AP' },
      { id: 'assets', label: 'Fixed assets' },
      { id: 'budgets', label: 'Budgets' },
      { id: 'yearend', label: 'Year-end close' },
      { id: 'coa', label: 'Chart of accounts' },
      { id: 'journal', label: 'Journal' },
      { id: 'vat', label: 'VAT return' },
      { id: 'reports', label: 'P&L / TB' },
      { id: 'allocate', label: 'Payment allocation' }
    ];
    return `
      <div class="page-header">
        <div>
          <h2>Accounting</h2>
          <p class="subtitle">Bookkeeping hub · CoA · journals · bank · VAT · TB / P&amp;L / BS · ZAR</p>
        </div>
        <div class="page-actions">
          <button type="button" data-action="seed-coa" class="btn btn-outline">Seed CoA</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mb-4 no-print">
        ${tabs.map(t => `<button type="button" class="btn ${tab===t.id?'btn-primary':'btn-outline'} btn-sm" data-action="acct-tab" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      ${tab === 'overview' ? this.renderAcctOverview() : ''}
      ${tab === 'tools' ? this.renderAcctTools() : ''}
      ${tab === 'bank' ? this.renderBankRecon() : ''}
      ${tab === 'coa' ? this.renderChartOfAccounts() : ''}
      ${tab === 'journal' ? this.renderJournal() : ''}
      ${tab === 'vat' ? this.renderVatReturnHelper() : ''}
      ${tab === 'reports' ? this.renderAcctReports() : ''}
      ${tab === 'allocate' ? this.renderPaymentAllocation() : ''}
      ${tab === 'statements' ? this.renderCustomerStatements() : ''}
      ${tab === 'suppliers' ? this.renderSuppliersAP() : ''}
      ${tab === 'assets' ? this.renderFixedAssets() : ''}
      ${tab === 'budgets' ? this.renderBudgets() : ''}
      ${tab === 'yearend' ? this.renderYearEndClose() : ''}
    `;
  },


  renderAcctTools() {
    return `
      <div class="acct-tools-grid mb-4">
        <div class="tool-card">
          <h3>Calculator</h3>
          <div class="calc-display" id="calc-display">0</div>
          <div class="calc-grid" id="calc-pad">
            ${['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(k => {
              const cls = k==='=' ? 'eq wide' : ('÷×−+%±'.includes(k) ? 'op' : (k==='C'?'op':''));
              return `<button type="button" data-calc="${k}" class="${cls}">${k}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="tool-card">
          <h3>VAT helper (15%)</h3>
          <div class="field mb-2"><label class="label">Amount (ZAR)</label>
            <input id="vat-tool-amt" class="input" type="number" step="0.01" placeholder="1000" /></div>
          <div class="field mb-2"><label class="label">Mode</label>
            <select id="vat-tool-mode" class="input">
              <option value="add">Amount is exclusive — add VAT</option>
              <option value="extract">Amount includes VAT — extract</option>
            </select>
          </div>
          <button type="button" class="btn btn-primary w-full" data-action="vat-tool-run">Calculate VAT</button>
          <div id="vat-tool-out" class="mt-3 text-sm font-semibold text-slate-700"></div>
        </div>
        <div class="tool-card">
          <h3>Markup / margin</h3>
          <div class="form-grid">
            <div class="field"><label class="label">Cost</label><input id="mk-cost" class="input" type="number" step="0.01" /></div>
            <div class="field"><label class="label">Markup %</label><input id="mk-pct" class="input" type="number" step="0.1" value="25" /></div>
          </div>
          <button type="button" class="btn btn-primary w-full mt-2" data-action="markup-tool-run">Calculate sell price</button>
          <div id="mk-out" class="mt-3 text-sm font-semibold"></div>
        </div>
        <div class="tool-card">
          <h3>Invoice total quick-add</h3>
          <div class="form-grid">
            <div class="field"><label class="label">Line total excl.</label><input id="qt-excl" class="input" type="number" step="0.01" /></div>
            <div class="field"><label class="label">Discount %</label><input id="qt-disc" class="input" type="number" step="0.1" value="0" /></div>
          </div>
          <label class="flex items-center gap-2 text-sm mt-2"><input type="checkbox" id="qt-vat" checked /> Apply 15% VAT</label>
          <button type="button" class="btn btn-primary w-full mt-2" data-action="quick-total-run">Compute</button>
          <div id="qt-out" class="mt-3 text-sm font-semibold"></div>
        </div>
        <div class="tool-card">
          <h3>Days between dates</h3>
          <div class="form-grid">
            <div class="field"><label class="label">From</label><input id="dt-from" class="input" type="date" /></div>
            <div class="field"><label class="label">To</label><input id="dt-to" class="input" type="date" /></div>
          </div>
          <button type="button" class="btn btn-primary w-full mt-2" data-action="days-tool-run">Calculate days</button>
          <div id="dt-out" class="mt-3 text-sm font-semibold"></div>
        </div>
        <div class="tool-card">
          <h3>Industry sample data</h3>
          <p class="text-xs text-slate-500 mb-2">Load demo clients / products / services for a business type.</p>
          <select id="sample-industry" class="input mb-2">
            ${(window.BUSINESS_TEMPLATES||[]).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-secondary w-full" data-action="load-industry-samples">Load samples for type</button>
        </div>
      </div>
      <p class="text-xs text-slate-400">Helpers only — verify before SARS or your accountant.</p>`;
  },

  calcPress(key) {
    if (!this._calc) this._calc = { display: '0', op: null, acc: null, fresh: true };
    const c = this._calc;
    const el = document.getElementById('calc-display');
    const ops = { '÷': '/', '×': '*', '−': '-', '+': '+' };
    if (key === 'C') { c.display = '0'; c.op = null; c.acc = null; c.fresh = true; }
    else if (key === '±') { c.display = String(-(parseFloat(c.display) || 0)); }
    else if (key === '%') { c.display = String((parseFloat(c.display) || 0) / 100); }
    else if (ops[key]) { c.acc = parseFloat(c.display) || 0; c.op = ops[key]; c.fresh = true; }
    else if (key === '=') {
      if (c.op && c.acc != null) {
        const b = parseFloat(c.display) || 0;
        let r = c.acc;
        if (c.op === '+') r = c.acc + b;
        if (c.op === '-') r = c.acc - b;
        if (c.op === '*') r = c.acc * b;
        if (c.op === '/') r = b === 0 ? NaN : c.acc / b;
        c.display = String(Math.round(r * 1e8) / 1e8);
        c.op = null; c.acc = null; c.fresh = true;
      }
    } else if (key === '.') {
      if (c.fresh) { c.display = '0.'; c.fresh = false; }
      else if (!c.display.includes('.')) c.display += '.';
    } else {
      if (c.fresh || c.display === '0') { c.display = key; c.fresh = false; }
      else c.display += key;
    }
    if (el) el.textContent = c.display;
  },

  vatToolRun() {
    const amt = parseFloat(document.getElementById('vat-tool-amt')?.value) || 0;
    const mode = document.getElementById('vat-tool-mode')?.value || 'add';
    const rate = 0.15;
    let excl, vat, incl;
    if (mode === 'add') { excl = amt; vat = amt * rate; incl = amt + vat; }
    else { incl = amt; excl = amt / (1 + rate); vat = incl - excl; }
    const out = document.getElementById('vat-tool-out');
    if (out) out.innerHTML = `Excl: <strong>${this.formatMoney(excl)}</strong><br>VAT 15%: <strong>${this.formatMoney(vat)}</strong><br>Incl: <strong>${this.formatMoney(incl)}</strong>`;
  },

  markupToolRun() {
    const cost = parseFloat(document.getElementById('mk-cost')?.value) || 0;
    const pct = parseFloat(document.getElementById('mk-pct')?.value) || 0;
    const sell = cost * (1 + pct / 100);
    const margin = sell ? ((sell - cost) / sell) * 100 : 0;
    const out = document.getElementById('mk-out');
    if (out) out.innerHTML = `Sell price: <strong>${this.formatMoney(sell)}</strong><br>Gross margin: <strong>${margin.toFixed(1)}%</strong>`;
  },

  quickTotalRun() {
    let excl = parseFloat(document.getElementById('qt-excl')?.value) || 0;
    const disc = parseFloat(document.getElementById('qt-disc')?.value) || 0;
    excl = excl * (1 - disc / 100);
    const vatOn = document.getElementById('qt-vat')?.checked;
    const vat = vatOn ? excl * 0.15 : 0;
    const out = document.getElementById('qt-out');
    if (out) out.innerHTML = `After discount excl: <strong>${this.formatMoney(excl)}</strong><br>VAT: <strong>${this.formatMoney(vat)}</strong><br>Total: <strong>${this.formatMoney(excl + vat)}</strong>`;
  },

  daysToolRun() {
    const a = document.getElementById('dt-from')?.value;
    const b = document.getElementById('dt-to')?.value;
    const out = document.getElementById('dt-out');
    if (!a || !b) return this.toast('Pick both dates', 'warn');
    const days = Math.round((new Date(b) - new Date(a)) / 86400000);
    if (out) out.textContent = days + ' day(s)' + (days < 0 ? ' (end before start)' : '');
  },

  async loadIndustrySamples() {
    const id = document.getElementById('sample-industry')?.value;
    if (!id) return;
    try {
      const t = (window.BUSINESS_TEMPLATES || []).find(x => String(x.id) === String(id));
      if (t) {
        for (const p of (t.sampleProducts || [])) await DB.add(DB.STORES.products, { ...p, demo: true });
        for (const s of (t.sampleServices || [])) await DB.add(DB.STORES.services, { ...s, demo: true });
        const clients = t.sampleClients || window.DEFAULT_SAMPLE_CLIENTS || [];
        for (const c of clients) await DB.add(DB.STORES.clients, { ...c, demo: true });
      }
      try { await applyBusinessTemplate(id); } catch (e) {}
      await this.loadData(true);
      this.toast('Sample data loaded for ' + id, 'success');
      this.render();
    } catch (e) {
      this.toast(e.message || 'Could not load samples', 'error');
    }
  },

  renderAcctOverview() {
    const period = this._acctPeriod || '';
    const inPeriod = (d) => !period || String(d || '').startsWith(period);
    const inv = (this.invoices || []).filter(i => !i.isCredit && inPeriod(i.date));
    const paid = inv.filter(i => i.status === 'paid');
    const openAll = (this.invoices || []).filter(i => !i.isCredit && ['unpaid','partial','overdue'].includes(i.status));
    const exp = (this.expenses || []).filter(e => inPeriod(e.date));
    const bank = this.bankTxns || [];
    const unrec = bank.filter(t => !t.reconciled);
    const pl = this.buildProfitAndLoss(period || null);
    const tb = this.buildTrialBalance(period || null);
    const balDiff = Math.abs((tb.totalDr || 0) - (tb.totalCr || 0));
    const ar = openAll.reduce((s,i)=>s+(i.amountDue!=null?Number(i.amountDue):Number(i.total)||0),0);
    const paidRev = paid.reduce((s,i)=>s+(Number(i.total)||0),0);
    const expTot = exp.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const jn = (this.journal || []).filter(j => inPeriod(j.date));
    return `
      <div class="card p-4 mb-4 no-print flex flex-wrap gap-3 items-end justify-between">
        <div>
          <h3 class="font-bold text-lg">Bookkeeping hub</h3>
          <p class="text-xs text-slate-500">ZAR · period filter applies to revenue, expenses &amp; journals on this screen</p>
        </div>
        <div class="flex flex-wrap gap-2 items-end">
          <div>
            <label class="label text-xs">Period (YYYY-MM)</label>
            <input id="acct-period" class="input" style="min-width:8rem" value="${period}" placeholder="All time" />
          </div>
          <button type="button" class="btn btn-secondary" data-action="acct-apply-period">Apply</button>
          <button type="button" class="btn btn-outline" data-action="acct-clear-period">All time</button>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div class="stat-card acct-kpi"><div class="label">Paid revenue</div><div class="value text-emerald-700">${this.formatMoney(paidRev)}</div></div>
        <div class="stat-card acct-kpi"><div class="label">Outstanding AR</div><div class="value text-amber-700">${this.formatMoney(ar)}</div></div>
        <div class="stat-card acct-kpi"><div class="label">Expenses</div><div class="value">${this.formatMoney(expTot)}</div></div>
        <div class="stat-card acct-kpi"><div class="label">Net (P&amp;L lite)</div><div class="value ${pl.net>=0?'text-emerald-700':'text-red-600'}">${this.formatMoney(pl.net)}</div></div>
        <div class="stat-card acct-kpi"><div class="label">Unreconciled</div><div class="value">${unrec.length}</div></div>
        <div class="stat-card acct-kpi"><div class="label">TB balanced?</div><div class="value text-sm">${balDiff < 0.02 ? '✓ Yes' : 'Δ ' + this.formatMoney(balDiff)}</div></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="card p-4">
          <h4 class="font-semibold mb-2">Quick actions</h4>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary btn-sm" data-action="acct-tab" data-tab="bank">Bank recon</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="acct-tab" data-tab="journal">Journals</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="acct-tab" data-tab="vat">VAT return</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="acct-tab" data-tab="reports">P&amp;L / TB / BS</button>
            <button type="button" class="btn btn-outline btn-sm" data-action="seed-coa">Seed CoA</button>
            <button type="button" class="btn btn-outline btn-sm" data-action="auto-post-journals">Auto-post ops → journals</button>
            <button type="button" class="btn btn-outline btn-sm" data-action="export-tb-csv">Export TB CSV</button>
          </div>
          <p class="text-xs text-slate-500 mt-3">Auto-post creates balancing journals from paid invoices (Dr Bank / Cr Revenue) and expenses (Dr Expense / Cr Bank) for the period — skips duplicates tagged auto-post.</p>
        </div>
        <div class="card p-4">
          <h4 class="font-semibold mb-2">Activity ${period ? '('+period+')' : ''}</h4>
          <ul class="text-sm space-y-1 text-slate-600">
            <li>Invoices in view: <strong>${inv.length}</strong> · Paid: <strong>${paid.length}</strong></li>
            <li>Expenses: <strong>${exp.length}</strong> · Journal lines: <strong>${jn.length}</strong></li>
            <li>Bank lines: <strong>${bank.length}</strong> · Unreconciled: <strong>${unrec.length}</strong></li>
            <li>CoA accounts: <strong>${(this.accounts||[]).length}</strong></li>
          </ul>
        </div>
      </div>
      <div class="card p-4 text-sm text-slate-600 border-l-4" style="border-left-color:#007A4D">
        <p class="mb-1"><strong>Bookkeeping pack 1.0.17</strong> — expanded SA chart of accounts, general ledger roll-up, balance sheet snapshot, period filter, auto-journals from operations, TB CSV export.</p>
        <p class="text-xs">Helpers only — not a full ERP or SARS eFiling substitute. Always review journals before relying on reports.</p>
      </div>`;
  },

  renderBankRecon() {
    const list = [...(this.bankTxns || [])].sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
    return `
      <div class="card p-4 mb-4 no-print">
        <h3 class="font-bold mb-2">Add bank line</h3>
        <form id="bank-txn-form" class="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
          <input name="date" type="date" class="input" value="${new Date().toISOString().slice(0,10)}" required />
          <input name="description" class="input" placeholder="Description" required />
          <input name="amount" type="number" step="0.01" class="input" placeholder="Amount (+in / -out)" required />
          <input name="reference" class="input" placeholder="Bank ref" />
          <button type="button" class="btn btn-primary" data-action="save-bank-txn">Add</button>
        </form>
        <p class="text-xs text-slate-500 mt-2">Positive = money in (receipt). Negative = money out (payment).</p>
        <hr class="my-4 border-slate-200" />
        <h3 class="font-bold mb-2">Import bank CSV</h3>
        <p class="text-xs text-slate-500 mb-2">Supports common SA exports (Date, Description, Amount) — FNB / Standard Bank / Nedbank / Capitec-style columns. Duplicates (same date+amount+description) are skipped.</p>
        <div class="flex flex-wrap gap-2 items-center">
          <input type="file" id="bank-csv-file" accept=".csv,text/csv,text/plain" class="input flex-1 min-w-[180px]" />
          <button type="button" class="btn btn-secondary" data-action="preview-bank-csv">Preview</button>
          <button type="button" class="btn btn-primary" data-action="import-bank-csv">Import</button>
        </div>
        <div id="bank-csv-preview" class="mt-3 text-xs"></div>
      </div>
      ${list.length === 0 ? `<div class="card empty-state"><div class="empty-icon">🏦</div><h3>No bank lines</h3><p>Add statement lines to match against invoices and expenses.</p></div>` : `
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr>
            <th class="text-left p-2">Date</th><th class="text-left p-2">Description</th>
            <th class="text-right p-2">Amount</th><th class="text-left p-2">Match</th>
            <th class="text-left p-2">Status</th><th class="text-right p-2 no-print">Actions</th>
          </tr></thead>
          <tbody>
            ${list.map(t => `
              <tr class="border-t">
                <td class="p-2">${t.date || ''}</td>
                <td class="p-2">${t.description || ''}<div class="text-xs text-slate-400">${t.reference || ''}</div></td>
                <td class="p-2 text-right font-medium">${this.formatMoney(t.amount)}</td>
                <td class="p-2 text-xs">${t.matchLabel || '—'}</td>
                <td class="p-2"><span class="badge">${t.reconciled ? 'reconciled' : 'open'}</span></td>
                <td class="p-2 text-right no-print whitespace-nowrap">
                  ${!t.reconciled ? `<button type="button" data-action="match-bank" data-id="${t.id}" class="btn btn-outline p-1.5">Match</button>
                  <button type="button" data-action="recon-bank" data-id="${t.id}" class="btn btn-outline p-1.5">Mark recon</button>` : ''}
                  <button type="button" data-action="delete-bank" data-id="${t.id}" class="btn btn-outline p-1.5 text-red-600">Del</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;
  },

  async saveBankTxn() {
    const form = document.getElementById('bank-txn-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const amount = parseFloat(fd.amount);
    if (!fd.description || isNaN(amount)) return this.toast('Description and amount required', 'error');
    await DB.add(DB.STORES.bankTxns, {
      date: fd.date,
      description: fd.description.trim(),
      amount,
      reference: (fd.reference || '').trim(),
      reconciled: false,
      createdAt: new Date().toISOString()
    });
    await this.loadData();
    this.render();
    this.toast('Bank line added', 'success');
  },

  matchBankTxn(id) {
    const t = (this.bankTxns || []).find(x => String(x.id) === String(id));
    if (!t) return;
    const amt = Math.abs(Number(t.amount) || 0);
    const txnDate = t.date ? new Date(t.date) : null;
    const desc = String(t.description || '').toLowerCase();
    const scoreInv = (i) => {
      let s = 0;
      const total = Math.abs(Number(i.total) || 0);
      const diff = Math.abs(total - amt);
      if (diff < 0.05) s += 50;
      else if (diff < 1) s += 30;
      else if (diff < total * 0.05) s += 15;
      else return -1;
      if (txnDate && i.date) {
        const days = Math.abs((txnDate - new Date(i.date)) / 86400000);
        if (days <= 3) s += 25;
        else if (days <= 14) s += 12;
        else if (days <= 45) s += 5;
      }
      const name = String(i.clientName || '').toLowerCase();
      const num = String(i.number || '').toLowerCase();
      if (name && desc.includes(name.slice(0, Math.min(6, name.length)))) s += 20;
      if (num && desc.includes(num)) s += 30;
      return s;
    };
    const scoreExp = (e) => {
      let s = 0;
      const total = Math.abs(Number(e.amount) || 0);
      const diff = Math.abs(total - amt);
      if (diff < 0.05) s += 50;
      else if (diff < 1) s += 30;
      else return -1;
      const d = String(e.description || e.vendor || '').toLowerCase();
      if (d && desc.includes(d.slice(0, Math.min(6, d.length)))) s += 20;
      if (e.vendor && desc.includes(String(e.vendor).toLowerCase())) s += 15;
      return s;
    };
    const invHits = (this.invoices || [])
      .filter(i => !i.isCredit && i.status !== 'paid')
      .map(i => ({ i, s: scoreInv(i) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8);
    const expHits = (this.expenses || [])
      .map(e => ({ e, s: scoreExp(e) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8);
    this.showModal(`
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold mb-2">Smart match</h3>
        <p class="text-sm mb-3">${t.date} · ${t.description} · <strong>${this.formatMoney(t.amount)}</strong></p>
        <p class="text-xs text-slate-500 mb-2">Ranked by amount, date window, and name/ref in description.</p>
        <h4 class="text-sm font-semibold mb-1">Invoices</h4>
        ${invHits.length ? invHits.map(({ i, s }) => `
          <button type="button" class="btn btn-outline w-full mb-1 justify-between" onclick="App.applyBankMatch(${id},'invoice',${i.id})">
            <span>${i.number} · ${i.clientName || ''} · ${this.formatMoney(i.total)}</span>
            <span class="badge">score ${s}</span>
          </button>`).join('') : '<p class="text-xs text-slate-400 mb-2">No strong matches</p>'}
        <h4 class="text-sm font-semibold mb-1 mt-3">Expenses</h4>
        ${expHits.length ? expHits.map(({ e, s }) => `
          <button type="button" class="btn btn-outline w-full mb-1 justify-between" onclick="App.applyBankMatch(${id},'expense',${e.id})">
            <span>${e.description || e.number} · ${this.formatMoney(e.amount)}</span>
            <span class="badge">score ${s}</span>
          </button>`).join('') : '<p class="text-xs text-slate-400">No strong matches</p>'}
        <button type="button" class="btn btn-secondary w-full mt-3" onclick="App.closeModal()">Close</button>
      </div>`);
  },


  async applyBankMatch(txnId, type, refId) {
    const t = (this.bankTxns || []).find(x => String(x.id) === String(txnId));
    if (!t) return;
    if (type === 'invoice') {
      const inv = (this.invoices || []).find(i => String(i.id) === String(refId));
      t.matchType = 'invoice';
      t.matchId = refId;
      t.matchLabel = inv ? ('INV ' + (inv.number || refId)) : String(refId);
    } else {
      const exp = (this.expenses || []).find(e => String(e.id) === String(refId));
      t.matchType = 'expense';
      t.matchId = refId;
      t.matchLabel = exp ? (exp.description || exp.number || String(refId)) : String(refId);
    }
    await DB.put(DB.STORES.bankTxns, t);
    await this.loadData();
    this.closeModal();
    this.render();
    this.toast('Matched to ' + t.matchLabel, 'success');
  },

  async reconBankTxn(id) {
    const t = (this.bankTxns || []).find(x => String(x.id) === String(id));
    if (!t) return;
    t.reconciled = true;
    t.reconciledAt = new Date().toISOString();
    await DB.put(DB.STORES.bankTxns, t);
    await this.loadData();
    this.render();
    this.toast('Marked reconciled', 'success');
  },

  async deleteBankTxn(id) {
    if (!confirm('Delete this bank line?')) return;
    await DB.remove(DB.STORES.bankTxns, id);
    await this.loadData();
    this.render();
    this.toast('Deleted', 'success');
  },

  renderChartOfAccounts() {
    const list = [...(this.accounts || [])].sort((a,b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
    return `
      <div class="card p-4 mb-3 no-print flex flex-wrap gap-2">
        <button type="button" data-action="seed-coa" class="btn btn-secondary">Reset / seed SA CoA</button>
        <button type="button" data-action="add-account" class="btn btn-primary">Add account</button>
      </div>
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr><th class="text-left p-2">Code</th><th class="text-left p-2">Name</th><th class="text-left p-2">Type</th></tr></thead>
          <tbody>
            ${list.map(acc => `<tr class="border-t"><td class="p-2 font-mono">${acc.code}</td><td class="p-2">${acc.name}</td><td class="p-2"><span class="badge">${acc.type}</span></td></tr>`).join('') || '<tr><td class="p-4" colspan="3">No accounts – seed CoA</td></tr>'}
          </tbody>
        </table>
      </div>`;
  },

  async seedCoa() {
    if ((this.accounts || []).length && !confirm('Replace/add default SA chart of accounts?')) return;
    if (!(this.accounts || []).length) {
      await this.ensureChartOfAccounts();
    } else {
      for (const acc of this.defaultChartOfAccounts()) {
        if (!(this.accounts || []).some(a => a.code === acc.code)) {
          await DB.add(DB.STORES.accounts, { ...acc, system: true });
        }
      }
      this.accounts = await DB.getAll(DB.STORES.accounts) || [];
    }
    this.render();
    this.toast('Chart of accounts ready', 'success');
  },

  addAccount() {
    const code = prompt('Account code (e.g. 6500)');
    if (!code) return;
    const name = prompt('Account name');
    if (!name) return;
    const type = prompt('Type: asset, liability, equity, income, expense', 'expense') || 'expense';
    DB.add(DB.STORES.accounts, { code: code.trim(), name: name.trim(), type: type.trim() }).then(async () => {
      await this.loadData();
      this.render();
      this.toast('Account added', 'success');
    });
  },

  renderJournal() {
    const list = [...(this.journal || [])].sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
    return `
      <div class="card p-4 mb-3 no-print">
        <button type="button" data-action="add-journal" class="btn btn-primary">New journal entry</button>
        <p class="text-xs text-slate-500 mt-2">Simple two-line journals (debit / credit must balance).</p>
      </div>
      ${list.length === 0 ? `<div class="card empty-state"><div class="empty-icon">📒</div><h3>No journal entries</h3></div>` : `
      <div class="space-y-2">
        ${list.map(j => `
          <div class="list-card text-sm">
            <div class="font-medium">${j.date} · ${j.memo || 'Journal'}</div>
            <div class="text-xs text-slate-500">Dr ${j.debitCode} ${this.formatMoney(j.debit)} · Cr ${j.creditCode} ${this.formatMoney(j.credit)}</div>
            <button type="button" data-action="delete-journal" data-id="${j.id}" class="btn btn-outline p-1 text-red-600 mt-1">Del</button>
          </div>`).join('')}
      </div>`}`;
  },

  addJournalEntry() {
    const date = prompt('Date YYYY-MM-DD', new Date().toISOString().slice(0,10));
    if (!date) return;
    const memo = prompt('Memo') || '';
    const debitCode = prompt('Debit account code', '6000');
    const creditCode = prompt('Credit account code', '1000');
    const amount = parseFloat(prompt('Amount', '0') || '0');
    if (!(amount > 0)) return this.toast('Amount must be > 0', 'error');
    DB.add(DB.STORES.journal, {
      date, memo, debitCode, creditCode, debit: amount, credit: amount, createdAt: new Date().toISOString()
    }).then(async () => {
      await this.loadData();
      this.render();
      this.toast('Journal saved', 'success');
    });
  },

  async deleteJournal(id) {
    if (!confirm('Delete journal entry?')) return;
    await DB.remove(DB.STORES.journal, id);
    await this.loadData();
    this.render();
  },

  renderVatReturnHelper() {
    const period = this._vatPeriod || new Date().toISOString().slice(0, 7);
    const inv = (this.invoices || []).filter(i => !i.isCredit && String(i.date||'').startsWith(period));
    const credits = (this.invoices || []).filter(i => i.isCredit && String(i.date||'').startsWith(period));
    const exp = (this.expenses || []).filter(e => String(e.date||'').startsWith(period));
    const rate = (this.vatRate != null ? this.vatRate : 15) / 100;
    const output = inv.reduce((s,i) => s + (Number(i.vatAmount) || 0), 0) - credits.reduce((s,i) => s + (Number(i.vatAmount)||0), 0);
    // Input VAT estimate if exclusive amounts assumed at rate
    const inputEst = exp.reduce((s,e) => {
      const amt = Number(e.amount) || 0;
      return s + (e.vatAmount != null ? Number(e.vatAmount) : (amt - amt / (1 + rate)));
    }, 0);
    const net = output - inputEst;
    return `
      <div class="card p-4 mb-3 flex flex-wrap gap-2 items-end no-print">
        <div><label class="label">Period (YYYY-MM)</label>
          <input id="vat-period" class="input" value="${period}" /></div>
        <button type="button" class="btn btn-secondary" data-action="apply-vat-period">Apply</button>
        <button type="button" class="btn btn-outline" data-action="export-vat-csv">Export CSV</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="stat-card"><div class="text-xs">Output VAT (sales)</div><div class="text-xl font-bold">${this.formatMoney(output)}</div></div>
        <div class="stat-card"><div class="text-xs">Input VAT (est. expenses)</div><div class="text-xl font-bold">${this.formatMoney(inputEst)}</div></div>
        <div class="stat-card"><div class="text-xs">Net VAT</div><div class="text-xl font-bold">${this.formatMoney(net)}</div></div>
      </div>
      <div class="card p-4 mt-4 text-sm text-slate-600">
        <p>Indicative only for period <strong>${period}</strong>. Confirm with your practitioner / SARS eFiling. Credit notes reduce output VAT.</p>
      </div>`;
  },

  exportVatCsv() {
    const period = this._vatPeriod || new Date().toISOString().slice(0, 7);
    const inv = (this.invoices || []).filter(i => String(i.date||'').startsWith(period));
    const rows = [['Type','Number','Date','Client','Subtotal','VAT','Total']];
    for (const i of inv) {
      rows.push([i.isCredit ? 'credit' : 'invoice', i.number, i.date, i.clientName||'', i.subtotal, i.vatAmount, i.total]);
    }
    const csv = rows.map(r => r.map(c => '"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'VAT-' + period + '.csv';
    a.click();
    this.toast('VAT CSV exported', 'success');
  },

  renderAcctReports() {
    const period = this._acctPeriod || '';
    const tb = this.buildTrialBalance(period || null);
    const pl = this.buildProfitAndLoss(period || null);
    const bs = this.buildBalanceSheet(period || null);
    const gl = this.buildGeneralLedger(period || null);
    return `
      <div class="card p-3 mb-3 no-print flex flex-wrap gap-2 items-center justify-between">
        <div class="text-sm text-slate-600">Reports ${period ? '· period <strong>'+period+'</strong>' : '· all time'} · set period on Overview</div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline btn-sm" data-action="export-tb-csv">Export TB CSV</button>
          <button type="button" class="btn btn-outline btn-sm" data-action="export-pl-csv">Export P&amp;L CSV</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="auto-post-journals">Auto-post ops</button>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div class="card p-4 overflow-x-auto">
          <h3 class="font-bold mb-3">Trial balance</h3>
          <table class="w-full text-sm">
            <thead><tr><th class="text-left p-1">Account</th><th class="text-right p-1">Debit</th><th class="text-right p-1">Credit</th></tr></thead>
            <tbody>
              ${tb.rows.map(r => `<tr class="border-t"><td class="py-1.5">${r.code} ${r.name}</td><td class="text-right">${r.debit?this.formatMoney(r.debit):''}</td><td class="text-right">${r.credit?this.formatMoney(r.credit):''}</td></tr>`).join('') || '<tr><td colspan="3" class="p-3 text-slate-400">No movements — seed CoA and post journals or auto-post</td></tr>'}
              <tr class="border-t font-bold"><td class="py-2">Totals</td><td class="text-right">${this.formatMoney(tb.totalDr)}</td><td class="text-right">${this.formatMoney(tb.totalCr)}</td></tr>
            </tbody>
          </table>
          <p class="text-xs mt-2 ${Math.abs(tb.totalDr-tb.totalCr)<0.02?'text-emerald-600':'text-amber-600'}">${Math.abs(tb.totalDr-tb.totalCr)<0.02?'Balanced':'Out of balance by '+this.formatMoney(Math.abs(tb.totalDr-tb.totalCr))}</p>
        </div>
        <div class="card p-4">
          <h3 class="font-bold mb-3">Profit &amp; loss</h3>
          <div class="text-sm space-y-2">
            <div class="flex justify-between"><span>Revenue (paid invoices)</span><strong>${this.formatMoney(pl.revenue)}</strong></div>
            <div class="flex justify-between text-slate-500"><span class="pl-2">+ Journal income accounts</span><span>${this.formatMoney(pl.journalIncome||0)}</span></div>
            <div class="flex justify-between"><span>Expenses (ops)</span><strong>${this.formatMoney(pl.expenses)}</strong></div>
            <div class="flex justify-between text-slate-500"><span class="pl-2">+ Journal expense accounts</span><span>${this.formatMoney(pl.journalExpense||0)}</span></div>
            <div class="flex justify-between border-t pt-2 font-bold text-base"><span>Net profit / (loss)</span><span class="${pl.net>=0?'text-emerald-700':'text-red-600'}">${this.formatMoney(pl.net)}</span></div>
          </div>
          <p class="text-xs text-slate-500 mt-3">Ops figures from invoices/expenses; journal lines by CoA type deepen the picture after auto-post or manual journals.</p>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div class="card p-4">
          <h3 class="font-bold mb-3">Balance sheet snapshot</h3>
          <div class="text-sm space-y-1">
            <div class="font-semibold text-slate-500 text-xs uppercase">Assets</div>
            <div class="flex justify-between"><span>Assets (TB)</span><strong>${this.formatMoney(bs.assets)}</strong></div>
            <div class="font-semibold text-slate-500 text-xs uppercase mt-2">Equity &amp; liabilities</div>
            <div class="flex justify-between"><span>Liabilities</span><strong>${this.formatMoney(bs.liabilities)}</strong></div>
            <div class="flex justify-between"><span>Equity</span><strong>${this.formatMoney(bs.equity)}</strong></div>
            <div class="flex justify-between border-t pt-2 font-bold"><span>Total L+E</span><span>${this.formatMoney(bs.liabilities + bs.equity)}</span></div>
          </div>
          <p class="text-xs text-slate-500 mt-2">Derived from trial balance account types. Net P&amp;L is folded into equity for the snapshot.</p>
        </div>
        <div class="card p-4 overflow-x-auto max-h-80">
          <h3 class="font-bold mb-3">General ledger (recent)</h3>
          <table class="w-full text-xs">
            <thead><tr><th class="text-left p-1">Date</th><th class="text-left p-1">Memo</th><th class="text-left p-1">Dr</th><th class="text-left p-1">Cr</th><th class="text-right p-1">Amount</th></tr></thead>
            <tbody>
              ${gl.slice(0,40).map(g => `<tr class="border-t"><td class="p-1 whitespace-nowrap">${(g.date||'').slice(0,10)}</td><td class="p-1">${(g.memo||'').slice(0,40)}</td><td class="p-1 font-mono">${g.debitCode||''}</td><td class="p-1 font-mono">${g.creditCode||''}</td><td class="p-1 text-right">${this.formatMoney(g.amount)}</td></tr>`).join('') || '<tr><td colspan="5" class="p-3 text-slate-400">No journal lines yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  buildTrialBalance(period) {
    const map = {};
    const nameOf = (code) => {
      const acc = (this.accounts || []).find(a => String(a.code) === String(code));
      return acc ? acc.name : code;
    };
    const bump = (code, debit, credit) => {
      if (!code) return;
      const c = String(code);
      if (!map[c]) map[c] = { code: c, name: nameOf(c), debit: 0, credit: 0 };
      map[c].debit += Number(debit) || 0;
      map[c].credit += Number(credit) || 0;
    };
    for (const j of (this.journal || [])) {
      if (period && !String(j.date || '').startsWith(period)) continue;
      const amt = Number(j.debit) || Number(j.credit) || Number(j.amount) || 0;
      bump(j.debitCode, j.debit != null ? j.debit : amt, 0);
      bump(j.creditCode, 0, j.credit != null ? j.credit : amt);
    }
    for (const acc of (this.accounts || [])) {
      if (!map[acc.code]) continue;
      map[acc.code].name = acc.name;
      map[acc.code].type = acc.type;
    }
    const rows = Object.values(map).filter(r => r.debit || r.credit).sort((a,b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
    return {
      rows,
      totalDr: rows.reduce((s,r)=>s+r.debit,0),
      totalCr: rows.reduce((s,r)=>s+r.credit,0)
    };
  },

  buildProfitAndLoss(period) {
    const inP = (d) => !period || String(d || '').startsWith(period);
    const revenue = (this.invoices || []).filter(i => i.status === 'paid' && !i.isCredit && inP(i.date)).reduce((s,i)=>s+(Number(i.total)||0),0);
    const expenses = (this.expenses || []).filter(e => inP(e.date)).reduce((s,e)=>s+(Number(e.amount)||0),0);
    let journalIncome = 0, journalExpense = 0;
    const typeOf = (code) => {
      const acc = (this.accounts || []).find(a => String(a.code) === String(code));
      return (acc && acc.type) || '';
    };
    for (const j of (this.journal || [])) {
      if (!inP(j.date)) continue;
      if (j.autoPost) continue; // already reflected in ops totals when from auto-post
      const amt = Number(j.debit) || Number(j.credit) || Number(j.amount) || 0;
      if (typeOf(j.creditCode) === 'income') journalIncome += amt;
      if (typeOf(j.debitCode) === 'expense') journalExpense += amt;
    }
    const net = revenue + journalIncome - expenses - journalExpense;
    return { revenue, expenses, journalIncome, journalExpense, net };
  },

  buildBalanceSheet(period) {
    const tb = this.buildTrialBalance(period);
    const typeOf = (code) => {
      const acc = (this.accounts || []).find(a => String(a.code) === String(code));
      return (acc && acc.type) || '';
    };
    let assets = 0, liabilities = 0, equity = 0;
    for (const r of tb.rows) {
      const t = typeOf(r.code) || r.type;
      const bal = (r.debit || 0) - (r.credit || 0);
      if (t === 'asset') assets += bal;
      else if (t === 'liability') liabilities += -bal;
      else if (t === 'equity') equity += -bal;
    }
    const pl = this.buildProfitAndLoss(period);
    equity += pl.net;
    return { assets, liabilities, equity, period: period || 'all' };
  },

  buildGeneralLedger(period) {
    const rows = [];
    for (const j of (this.journal || [])) {
      if (period && !String(j.date || '').startsWith(period)) continue;
      const amt = Number(j.debit) || Number(j.credit) || Number(j.amount) || 0;
      rows.push({
        date: j.date,
        memo: j.memo || j.narration || j.reference || (j.autoPost ? 'Auto-post' : ''),
        debitCode: j.debitCode,
        creditCode: j.creditCode,
        amount: amt,
        id: j.id,
        autoPost: !!j.autoPost
      });
    }
    return rows.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
  },

  async autoPostJournalsFromOps() {
    await this.ensureChartOfAccounts();
    const period = this._acctPeriod || '';
    const inP = (d) => !period || String(d || '').startsWith(period);
    const existingKeys = new Set(
      (this.journal || []).filter(j => j.autoPost && j.sourceKey).map(j => j.sourceKey)
    );
    let n = 0;
    for (const inv of (this.invoices || [])) {
      if (inv.isCredit || inv.status !== 'paid') continue;
      if (!inP(inv.date || inv.paidDate)) continue;
      const key = 'inv-paid-' + inv.id;
      if (existingKeys.has(key)) continue;
      const amt = Number(inv.total) || 0;
      if (!(amt > 0)) continue;
      await DB.add(DB.STORES.journal, {
        date: (inv.paidDate || inv.date || new Date().toISOString()).slice(0, 10),
        memo: 'Auto: paid ' + (inv.number || inv.id),
        debitCode: '1000',
        creditCode: '4000',
        debit: amt,
        credit: amt,
        amount: amt,
        autoPost: true,
        sourceKey: key,
        createdAt: new Date().toISOString()
      });
      n++;
    }
    for (const exp of (this.expenses || [])) {
      if (!inP(exp.date)) continue;
      const key = 'exp-' + exp.id;
      if (existingKeys.has(key)) continue;
      const amt = Number(exp.amount) || 0;
      if (!(amt > 0)) continue;
      const expCode = exp.accountCode || '6900';
      await DB.add(DB.STORES.journal, {
        date: (exp.date || new Date().toISOString()).slice(0, 10),
        memo: 'Auto: expense ' + (exp.description || exp.category || exp.id),
        debitCode: expCode,
        creditCode: '1000',
        debit: amt,
        credit: amt,
        amount: amt,
        autoPost: true,
        sourceKey: key,
        createdAt: new Date().toISOString()
      });
      n++;
    }
    await this.loadData();
    this.render();
    this.toast(n ? ('Posted ' + n + ' journal(s)') : 'Nothing new to post', n ? 'success' : 'info');
  },

  exportTrialBalanceCsv() {
    const tb = this.buildTrialBalance(this._acctPeriod || null);
    const lines = ['Code,Name,Debit,Credit'];
    for (const r of tb.rows) {
      lines.push([r.code, '"' + String(r.name||'').replace(/"/g,'""') + '"', (r.debit||0).toFixed(2), (r.credit||0).toFixed(2)].join(','));
    }
    lines.push(['TOTAL','', tb.totalDr.toFixed(2), tb.totalCr.toFixed(2)].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trial-balance-' + (this._acctPeriod || 'all') + '.csv';
    a.click();
    this.toast('TB CSV downloaded', 'success');
  },

  exportProfitLossCsv() {
    const pl = this.buildProfitAndLoss(this._acctPeriod || null);
    const lines = [
      'Line,Amount',
      'Revenue,' + (pl.revenue||0).toFixed(2),
      'Journal income,' + (pl.journalIncome||0).toFixed(2),
      'Expenses,' + (pl.expenses||0).toFixed(2),
      'Journal expenses,' + (pl.journalExpense||0).toFixed(2),
      'Net,' + (pl.net||0).toFixed(2)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'profit-loss-' + (this._acctPeriod || 'all') + '.csv';
    a.click();
    this.toast('P&L CSV downloaded', 'success');
  },


  renderPaymentAllocation() {
    const open = (this.invoices || []).filter(i => !i.isCredit && ['unpaid','partial','overdue'].includes(i.status));
    return `
      <div class="card p-4 mb-3 text-sm text-slate-600">Allocate a customer payment across open invoices (updates amount paid / status).</div>
      <div class="card p-4 mb-4 no-print">
        <form id="alloc-form" class="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input name="amount" type="number" step="0.01" class="input" placeholder="Payment amount" required />
          <input name="date" type="date" class="input" value="${new Date().toISOString().slice(0,10)}" />
          <input name="reference" class="input" placeholder="Payment ref" />
          <button type="button" class="btn btn-primary" data-action="run-allocation">Allocate to selected</button>
        </form>
      </div>
      ${open.length === 0 ? `<div class="card empty-state"><div class="empty-icon">✅</div><h3>No open invoices</h3></div>` : `
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr><th></th><th class="text-left p-2">Invoice</th><th class="text-left p-2">Client</th><th class="text-right p-2">Due</th></tr></thead>
          <tbody>
            ${open.map(i => {
              const due = Number(i.amountDue != null ? i.amountDue : i.total) || 0;
              return `<tr class="border-t">
                <td class="p-2"><input type="checkbox" class="alloc-select" value="${i.id}" /></td>
                <td class="p-2">${i.number}</td>
                <td class="p-2">${i.clientName || ''}</td>
                <td class="p-2 text-right">${this.formatMoney(due)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`}`;
  },

  async runPaymentAllocation() {
    const form = document.getElementById('alloc-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    let remaining = parseFloat(fd.amount);
    if (!(remaining > 0)) return this.toast('Enter payment amount', 'error');
    const ids = [...document.querySelectorAll('.alloc-select:checked')].map(cb => Number(cb.value) || cb.value);
    if (!ids.length) return this.toast('Select at least one invoice', 'error');
    for (const id of ids) {
      if (remaining <= 0) break;
      const inv = (this.invoices || []).find(x => String(x.id) === String(id));
      if (!inv) continue;
      const due = Number(inv.amountDue != null ? inv.amountDue : inv.total) || 0;
      const pay = Math.min(due, remaining);
      if (pay <= 0) continue;
      if (typeof this.recordPayment === 'function') {
        await this.recordPayment(inv.id, pay, fd.reference || 'Allocation');
      } else {
        inv.amountPaid = (Number(inv.amountPaid) || 0) + pay;
        inv.amountDue = Math.max(0, due - pay);
        inv.status = inv.amountDue <= 0.009 ? 'paid' : 'partial';
        if (inv.status === 'paid') inv.paidDate = fd.date || new Date().toISOString().slice(0,10);
        await DB.put(DB.STORES.invoices, inv);
      }
      remaining -= pay;
    }
    await this.loadData();
    this.render();
    this.toast('Allocation complete' + (remaining > 0.01 ? (' · unallocated ' + this.formatMoney(remaining)) : ''), 'success');
  },


  parseCsvText(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { headers: [], rows: [] };
    const split = (line) => {
      const out = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i+1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if ((ch === ',' || ch === ';') && !inQ) {
          out.push(cur.trim()); cur = '';
        } else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    const headers = split(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const rows = lines.slice(1).map(split).filter(r => r.some(c => c));
    return { headers, rows };
  },

  normalizeBankHeader(h) {
    return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  detectBankColumns(headers) {
    const norms = headers.map(h => this.normalizeBankHeader(h));
    const find = (...cands) => {
      for (const c of cands) {
        const i = norms.findIndex(n => n === c || n.includes(c));
        if (i >= 0) return i;
      }
      return -1;
    };
    let dateIdx = find('date', 'transactiondate', 'postingdate', 'valuedate', 'trandate');
    let descIdx = find('description', 'narrative', 'details', 'transactiondescription', 'memo', 'particulars');
    let amountIdx = find('amount', 'transactionamount', 'value');
    let debitIdx = find('debit', 'withdrawal', 'payments', 'moneyout', 'paidout');
    let creditIdx = find('credit', 'deposit', 'receipts', 'moneyin', 'paidin');
    let refIdx = find('reference', 'ref', 'cheque', 'chequenumber', 'transactionreference', 'bankreference');
    // fallback positional: date, desc, amount
    if (dateIdx < 0) dateIdx = 0;
    if (descIdx < 0) descIdx = Math.min(1, headers.length - 1);
    if (amountIdx < 0 && debitIdx < 0 && creditIdx < 0) amountIdx = Math.min(2, headers.length - 1);
    return { dateIdx, descIdx, amountIdx, debitIdx, creditIdx, refIdx };
  },

  parseBankDate(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    // ISO or yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // dd/mm/yyyy or dd-mm-yyyy
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (m) {
      const d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0');
      return `${m[3]}-${mo}-${d}`;
    }
    // yyyy/mm/dd
    m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    const t = Date.parse(s);
    if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
    return s.slice(0, 10);
  },

  parseBankAmount(raw) {
    if (raw == null || raw === '') return null;
    let s = String(raw).trim();
    // (1,234.56) accounting negative
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/R\s*/i, '').replace(/\s/g, '');
    // 1.234,56 European
    if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    // 1,234.56
    else s = s.replace(/,/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    return neg ? -Math.abs(n) : n;
  },

  rowsFromBankCsv(text) {
    const { headers, rows } = this.parseCsvText(text);
    const col = this.detectBankColumns(headers);
    const out = [];
    for (const r of rows) {
      const date = this.parseBankDate(r[col.dateIdx]);
      const description = String(r[col.descIdx] || '').trim();
      let amount = null;
      if (col.amountIdx >= 0) amount = this.parseBankAmount(r[col.amountIdx]);
      if ((amount == null || amount === 0) && (col.debitIdx >= 0 || col.creditIdx >= 0)) {
        const debit = col.debitIdx >= 0 ? this.parseBankAmount(r[col.debitIdx]) : null;
        const credit = col.creditIdx >= 0 ? this.parseBankAmount(r[col.creditIdx]) : null;
        if (credit && Math.abs(credit) > 0) amount = Math.abs(credit);
        else if (debit && Math.abs(debit) > 0) amount = -Math.abs(debit);
      }
      if (!date || !description || amount == null || amount === 0) continue;
      const reference = col.refIdx >= 0 ? String(r[col.refIdx] || '').trim() : '';
      out.push({ date, description, amount, reference });
    }
    return { headers, mapped: col, items: out };
  },

  async readBankCsvFile() {
    const input = document.getElementById('bank-csv-file');
    if (!input || !input.files || !input.files[0]) {
      this.toast('Choose a CSV file first', 'error');
      return null;
    }
    const text = await input.files[0].text();
    return this.rowsFromBankCsv(text);
  },

  async previewBankCsv() {
    const parsed = await this.readBankCsvFile();
    if (!parsed) return;
    const box = document.getElementById('bank-csv-preview');
    if (!box) return;
    const sample = parsed.items.slice(0, 8);
    box.innerHTML = `
      <div class="card p-3 bg-slate-50">
        <div class="font-semibold mb-1">${parsed.items.length} row(s) detected</div>
        <div class="text-slate-500 mb-2">Headers: ${parsed.headers.join(' | ')}</div>
        <table class="w-full"><thead><tr><th class="text-left">Date</th><th class="text-left">Description</th><th class="text-right">Amount</th></tr></thead>
        <tbody>${sample.map(i => `<tr><td>${i.date}</td><td>${i.description.slice(0,40)}</td><td class="text-right">${this.formatMoney(i.amount)}</td></tr>`).join('')}</tbody></table>
        ${parsed.items.length > 8 ? `<p class="mt-1 text-slate-400">…and ${parsed.items.length - 8} more</p>` : ''}
      </div>`;
    this.toast('Preview ready – ' + parsed.items.length + ' lines', 'info');
  },

  async importBankCsv() {
    const parsed = await this.readBankCsvFile();
    if (!parsed) return;
    if (!parsed.items.length) return this.toast('No valid rows found in CSV', 'error');
    if (!confirm('Import ' + parsed.items.length + ' bank line(s)? Duplicates will be skipped.')) return;
    const existing = this.bankTxns || [];
    const key = (t) => [t.date, Number(t.amount).toFixed(2), String(t.description || '').toLowerCase()].join('|');
    const seen = new Set(existing.map(key));
    let added = 0, skipped = 0;
    this.toast('Importing…', 'info');
    for (const item of parsed.items) {
      const k = key(item);
      if (seen.has(k)) { skipped++; continue; }
      seen.add(k);
      await DB.add(DB.STORES.bankTxns, {
        ...item,
        reconciled: false,
        importedAt: new Date().toISOString(),
        source: 'csv'
      });
      added++;
    }
    await this.loadData();
    this.render();
    this.toast('Imported ' + added + ' · skipped ' + skipped + ' duplicate(s)', 'success');
  },


  // ========== v7 MEGA MODULES ==========
  renderCustomerStatements() {
    const clients = this.clients || [];
    return `
      <div class="acct-hero">
        <h3 class="font-bold text-lg mb-1">Customer statements</h3>
        <p class="text-sm opacity-80">Running balance, invoices, payments and allocations.</p>
      </div>
      <div class="card p-4 mb-3 no-print flex flex-wrap gap-2 items-end">
        <div class="flex-1 min-w-[180px]">
          <label class="label">Client</label>
          <select id="stmt-client" class="input">
            <option value="">Select client…</option>
            ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn btn-primary" data-action="build-customer-statement">Build statement</button>
        <button type="button" class="btn btn-outline" data-action="pdf-customer-statement">PDF</button>
      </div>
      <div id="customer-statement-out"></div>`;
  },

  buildCustomerStatementData(clientId) {
    const c = (this.clients || []).find(x => String(x.id) === String(clientId));
    if (!c) return null;
    const invs = (this.invoices || []).filter(i => String(i.clientId) === String(clientId));
    const lines = [];
    for (const i of invs) {
      lines.push({
        date: i.date || '',
        type: i.isCredit ? 'Credit' : 'Invoice',
        ref: i.number || '',
        debit: i.isCredit ? 0 : (Number(i.total) || 0),
        credit: i.isCredit ? (Number(i.total) || 0) : 0,
        note: i.status || ''
      });
      const paid = Number(i.amountPaid) || 0;
      if (paid > 0) {
        lines.push({
          date: i.paidDate || i.date || '',
          type: 'Payment',
          ref: i.number || '',
          debit: 0,
          credit: paid,
          note: 'Allocated'
        });
      }
      for (const p of (i.payments || [])) {
        lines.push({
          date: (p.at || '').slice(0, 10),
          type: 'Payment',
          ref: i.number || '',
          debit: 0,
          credit: Number(p.amount) || 0,
          note: p.note || ''
        });
      }
    }
    lines.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let bal = 0;
    for (const l of lines) {
      bal += (l.debit || 0) - (l.credit || 0);
      l.balance = bal;
    }
    return { client: c, lines, balance: bal };
  },

  buildCustomerStatement() {
    const id = document.getElementById('stmt-client')?.value;
    if (!id) return this.toast('Select a client', 'error');
    const data = this.buildCustomerStatementData(id);
    if (!data) return;
    this._lastStatement = data;
    const out = document.getElementById('customer-statement-out');
    if (!out) return;
    out.innerHTML = `
      <div class="card p-4">
        <div class="flex justify-between mb-3">
          <div>
            <div class="font-bold text-lg">${data.client.name}</div>
            <div class="text-xs text-slate-500">${data.client.email || ''} ${data.client.phone || ''}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-500">Balance due</div>
            <div class="text-xl font-bold">${this.formatMoney(data.balance)}</div>
          </div>
        </div>
        <table class="w-full text-sm">
          <thead><tr>
            <th class="text-left p-2">Date</th><th class="text-left p-2">Type</th><th class="text-left p-2">Ref</th>
            <th class="text-right p-2">Debit</th><th class="text-right p-2">Credit</th><th class="text-right p-2">Balance</th>
          </tr></thead>
          <tbody>
            ${data.lines.map(l => `<tr class="border-t">
              <td class="p-2">${l.date}</td><td class="p-2">${l.type}</td><td class="p-2">${l.ref}</td>
              <td class="p-2 text-right">${l.debit ? this.formatMoney(l.debit) : ''}</td>
              <td class="p-2 text-right">${l.credit ? this.formatMoney(l.credit) : ''}</td>
              <td class="p-2 text-right font-medium">${this.formatMoney(l.balance)}</td>
            </tr>`).join('') || '<tr><td colspan="6" class="p-4 text-slate-400">No activity</td></tr>'}
          </tbody>
        </table>
      </div>`;
    this.toast('Statement built', 'success');
  },

  pdfCustomerStatement() {
    const data = this._lastStatement;
    if (!data) return this.toast('Build a statement first', 'error');
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFillColor(91, 138, 114);
      doc.rect(0, 0, 210, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text((this.company || {}).name || 'SA Invoice Pro', 14, 12);
      doc.setFontSize(10);
      doc.text('Customer statement', 14, 20);
      doc.setTextColor(30, 40, 35);
      doc.text(data.client.name, 14, 36);
      doc.text('Balance: ' + this.formatMoney(data.balance), 14, 42);
      if (doc.autoTable) {
        doc.autoTable({
          startY: 48,
          head: [['Date', 'Type', 'Ref', 'Debit', 'Credit', 'Balance']],
          body: data.lines.map(l => [
            l.date, l.type, l.ref,
            l.debit ? this.formatMoney(l.debit) : '',
            l.credit ? this.formatMoney(l.credit) : '',
            this.formatMoney(l.balance)
          ]),
          headStyles: { fillColor: [91, 138, 114] },
          styles: { fontSize: 8 }
        });
      }
      doc.save('Statement-' + (data.client.name || 'client').replace(/\s+/g, '_') + '.pdf');
      this.toast('Statement PDF downloaded', 'success');
    } catch (e) {
      this.toast(e.message || 'PDF failed', 'error');
    }
  },

  renderSuppliersAP() {
    const bills = [...(this.supplierBills || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const due = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + (Number(b.amount) || 0), 0);
    return `
      <div class="acct-hero">
        <h3 class="font-bold text-lg">Suppliers & accounts payable</h3>
        <p class="text-sm opacity-80">Open AP: <strong>${this.formatMoney(due)}</strong></p>
      </div>
      <div class="card p-4 mb-3 no-print">
        <form id="supplier-bill-form" class="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
          <input name="date" type="date" class="input" value="${new Date().toISOString().slice(0,10)}" />
          <input name="supplier" class="input" placeholder="Supplier name" required />
          <input name="description" class="input" placeholder="Description" />
          <input name="amount" type="number" step="0.01" class="input" placeholder="Amount" required />
          <button type="button" class="btn btn-primary" data-action="save-supplier-bill">Add bill</button>
        </form>
      </div>
      ${bills.length === 0 ? `<div class="card empty-state"><div class="empty-icon">🏭</div><h3>No supplier bills</h3></div>` : `
      <div class="space-y-2">${bills.map(b => `
        <div class="list-card flex justify-between gap-2">
          <div>
            <div class="font-medium">${b.supplier}</div>
            <div class="text-xs text-slate-500">${b.date} · ${b.description || ''} · <span class="badge">${b.status || 'open'}</span></div>
          </div>
          <div class="text-right">
            <div class="font-bold">${this.formatMoney(b.amount)}</div>
            <div class="no-print mt-1 flex gap-1 justify-end">
              ${b.status !== 'paid' ? `<button type="button" class="btn btn-outline p-1.5" data-action="pay-supplier-bill" data-id="${b.id}">Mark paid</button>` : ''}
              <button type="button" class="btn btn-outline p-1.5 text-red-600" data-action="delete-supplier-bill" data-id="${b.id}">Del</button>
            </div>
          </div>
        </div>`).join('')}</div>`}`;
  },

  async saveSupplierBill() {
    const form = document.getElementById('supplier-bill-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const amount = parseFloat(fd.amount);
    if (!fd.supplier || !(amount > 0)) return this.toast('Supplier and amount required', 'error');
    const bills = (await DB.getSetting('supplierBills', [])) || [];
    bills.push({ id: Date.now(), date: fd.date, supplier: fd.supplier.trim(), description: (fd.description || '').trim(), amount, status: 'open', createdAt: new Date().toISOString() });
    await DB.setSetting('supplierBills', bills);
    this.supplierBills = bills;
    this.render();
    this.toast('Supplier bill added', 'success');
  },

  async paySupplierBill(id) {
    const bills = (await DB.getSetting('supplierBills', [])) || [];
    const b = bills.find(x => String(x.id) === String(id));
    if (!b) return;
    b.status = 'paid';
    b.paidAt = new Date().toISOString();
    await DB.setSetting('supplierBills', bills);
    this.supplierBills = bills;
    this.render();
    this.toast('Bill marked paid', 'success');
  },

  async deleteSupplierBill(id) {
    if (!confirm('Delete supplier bill?')) return;
    let bills = (await DB.getSetting('supplierBills', [])) || [];
    bills = bills.filter(x => String(x.id) !== String(id));
    await DB.setSetting('supplierBills', bills);
    this.supplierBills = bills;
    this.render();
  },

  renderFixedAssets() {
    const assets = this.fixedAssets || [];
    const totalCost = assets.reduce((s, x) => s + (Number(x.cost) || 0), 0);
    return `
      <div class="acct-hero">
        <h3 class="font-bold text-lg">Fixed asset register</h3>
        <p class="text-sm opacity-80">Cost total: <strong>${this.formatMoney(totalCost)}</strong></p>
      </div>
      <div class="card p-4 mb-3 no-print">
        <form id="asset-form" class="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
          <input name="name" class="input" placeholder="Asset name" required />
          <input name="cost" type="number" step="0.01" class="input" placeholder="Cost" required />
          <input name="date" type="date" class="input" value="${new Date().toISOString().slice(0,10)}" />
          <input name="lifeYears" type="number" class="input" placeholder="Life (years)" value="5" />
          <input name="category" class="input" placeholder="Category" />
          <button type="button" class="btn btn-primary" data-action="save-asset">Add asset</button>
        </form>
      </div>
      ${assets.length === 0 ? `<div class="card empty-state"><div class="empty-icon">🖥️</div><h3>No assets yet</h3></div>` : `
      <div class="card overflow-x-auto"><table class="w-full text-sm">
        <thead><tr><th class="text-left p-2">Asset</th><th class="text-left p-2">Bought</th><th class="text-right p-2">Cost</th><th class="text-right p-2">Annual dep.</th><th class="text-right p-2">Book value</th><th></th></tr></thead>
        <tbody>${assets.map(x => {
          const life = Number(x.lifeYears) || 5;
          const cost = Number(x.cost) || 0;
          const annual = cost / life;
          const years = x.date ? Math.max(0, (Date.now() - new Date(x.date)) / (365.25 * 86400000)) : 0;
          const book = Math.max(0, cost - annual * years);
          return `<tr class="border-t"><td class="p-2">${x.name}<div class="text-xs text-slate-400">${x.category || ''}</div></td>
            <td class="p-2">${x.date || ''}</td><td class="p-2 text-right">${this.formatMoney(cost)}</td>
            <td class="p-2 text-right">${this.formatMoney(annual)}</td><td class="p-2 text-right font-medium">${this.formatMoney(book)}</td>
            <td class="p-2 text-right no-print"><button type="button" class="btn btn-outline p-1 text-red-600" data-action="delete-asset" data-id="${x.id}">Del</button></td></tr>`;
        }).join('')}</tbody></table></div>`}`;
  },

  async saveAsset() {
    const form = document.getElementById('asset-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const cost = parseFloat(fd.cost);
    if (!fd.name || !(cost > 0)) return this.toast('Name and cost required', 'error');
    const assets = (await DB.getSetting('fixedAssets', [])) || [];
    assets.push({ id: Date.now(), name: fd.name.trim(), cost, date: fd.date, lifeYears: parseFloat(fd.lifeYears) || 5, category: (fd.category || '').trim() });
    await DB.setSetting('fixedAssets', assets);
    this.fixedAssets = assets;
    this.render();
    this.toast('Asset added', 'success');
  },

  async deleteAsset(id) {
    if (!confirm('Delete asset?')) return;
    let assets = (await DB.getSetting('fixedAssets', [])) || [];
    assets = assets.filter(x => String(x.id) !== String(id));
    await DB.setSetting('fixedAssets', assets);
    this.fixedAssets = assets;
    this.render();
  },

  renderBudgets() {
    const budgets = this.budgets || {};
    const year = this._budgetYear || new Date().getFullYear();
    const expByCat = {};
    for (const e of (this.expenses || [])) {
      if (String(e.date || '').startsWith(String(year))) {
        const k = e.category || 'general';
        expByCat[k] = (expByCat[k] || 0) + (Number(e.amount) || 0);
      }
    }
    return `
      <div class="acct-hero">
        <h3 class="font-bold text-lg">Budgets vs actual</h3>
        <p class="text-sm opacity-80">Year ${year}</p>
      </div>
      <div class="card p-3 mb-3 no-print flex gap-2 items-end">
        <div><label class="label">Year</label><input id="budget-year" class="input" value="${year}" /></div>
        <button type="button" class="btn btn-secondary" data-action="apply-budget-year">Apply</button>
      </div>
      <div class="card p-4 mb-3 no-print">
        <form id="budget-form" class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input name="category" class="input" placeholder="Category (rent, fuel…)" />
          <input name="amount" type="number" step="0.01" class="input" placeholder="Annual budget (R)" />
          <button type="button" class="btn btn-primary" data-action="save-budget">Save budget</button>
        </form>
      </div>
      <div class="space-y-2">
        ${[...new Set([...Object.keys(budgets), ...Object.keys(expByCat)])].map(cat => {
          const budget = Number(budgets[cat]) || 0;
          const actual = Number(expByCat[cat]) || 0;
          const pct = budget > 0 ? Math.min(100, Math.round(actual / budget * 100)) : 0;
          const over = budget > 0 && actual > budget;
          return `<div class="list-card">
            <div class="flex justify-between mb-1"><span class="font-medium capitalize">${cat}</span>
              <span class="text-sm">${this.formatMoney(actual)} / ${budget ? this.formatMoney(budget) : '—'}</span></div>
            <div style="height:8px;background:#E8F0EC;border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${over ? '#DC2626' : '#5B8A72'};border-radius:99px"></div>
            </div>
            <div class="text-xs mt-1 ${over ? 'text-red-600' : 'text-slate-500'}">${budget ? pct + '% of budget' : 'No budget set'}</div>
          </div>`;
        }).join('') || '<div class="card empty-state"><div class="empty-icon">🎯</div><h3>No budgets yet</h3></div>'}
      </div>`;
  },

  async saveBudget() {
    const form = document.getElementById('budget-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const cat = (fd.category || '').trim().toLowerCase();
    const amount = parseFloat(fd.amount);
    if (!cat || !(amount >= 0)) return this.toast('Category and amount required', 'error');
    const year = this._budgetYear || new Date().getFullYear();
    const all = (await DB.getSetting('budgetsByYear', {})) || {};
    if (!all[year]) all[year] = {};
    all[year][cat] = amount;
    await DB.setSetting('budgetsByYear', all);
    this.budgets = all[year];
    this.render();
    this.toast('Budget saved', 'success');
  },

  renderYearEndClose() {
    const year = this._closeYear || (new Date().getFullYear() - 1);
    const closed = this.closedYears || [];
    const isClosed = closed.map(Number).includes(Number(year));
    const inv = (this.invoices || []).filter(i => String(i.date || '').startsWith(String(year)));
    const exp = (this.expenses || []).filter(e => String(e.date || '').startsWith(String(year)));
    return `
      <div class="acct-hero">
        <h3 class="font-bold text-lg">Year-end close checklist</h3>
        <p class="text-sm opacity-80">Close ${year} after reconciling bank, VAT, AR and AP.</p>
      </div>
      <div class="card p-3 mb-3 no-print flex gap-2 items-end">
        <div><label class="label">Year</label><input id="close-year" class="input" value="${year}" /></div>
        <button type="button" class="btn btn-secondary" data-action="apply-close-year">Apply</button>
      </div>
      <div class="card p-5 mb-4">
        <h4 class="font-bold mb-3">Checklist for ${year}</h4>
        <ul class="text-sm space-y-2 list-disc pl-5">
          <li>Bank reconciliation complete</li>
          <li>VAT periods reviewed</li>
          <li>Open invoices checked (${inv.filter(i=>['unpaid','partial','overdue'].includes(i.status)).length} open)</li>
          <li>Supplier bills settled or accrued</li>
          <li>Backup downloaded</li>
        </ul>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm">
          <div class="stat-card"><div class="text-xs">Invoices</div><strong>${inv.length}</strong></div>
          <div class="stat-card"><div class="text-xs">Expenses</div><strong>${exp.length}</strong></div>
          <div class="stat-card"><div class="text-xs">Paid revenue</div><strong>${this.formatMoney(inv.filter(i=>i.status==='paid'&&!i.isCredit).reduce((s,i)=>s+(i.total||0),0))}</strong></div>
          <div class="stat-card"><div class="text-xs">Status</div><strong>${isClosed ? 'CLOSED' : 'Open'}</strong></div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2 no-print">
          ${!isClosed ? `<button type="button" class="btn btn-primary" data-action="close-financial-year">Mark ${year} closed</button>` : `<button type="button" class="btn btn-secondary" data-action="reopen-financial-year">Reopen ${year}</button>`}
        </div>
      </div>`;
  },

  async closeFinancialYear() {
    const year = Number(document.getElementById('close-year')?.value || this._closeYear || (new Date().getFullYear() - 1));
    if (!confirm('Mark year ' + year + ' closed? Backup first.')) return;
    const closed = (await DB.getSetting('closedYears', [])) || [];
    if (!closed.map(Number).includes(year)) closed.push(year);
    await DB.setSetting('closedYears', closed);
    this.closedYears = closed;
    this.render();
    this.toast('Year ' + year + ' closed', 'success');
  },

  async reopenFinancialYear() {
    const year = Number(document.getElementById('close-year')?.value || this._closeYear);
    let closed = (await DB.getSetting('closedYears', [])) || [];
    closed = closed.filter(y => Number(y) !== year);
    await DB.setSetting('closedYears', closed);
    this.closedYears = closed;
    this.render();
    this.toast('Year reopened', 'info');
  },

  setupConnectivity() {
    try { this.setupKeyboardShortcuts(); } catch (e) {}
    const paint = () => {
      const online = navigator.onLine;
      document.querySelectorAll('.status-online, .status-offline, .status-pill').forEach(el => {
        if (el.classList.contains('status-lic')) return;
        if (el.textContent && /Online|Offline/i.test(el.textContent)) {
          el.textContent = online ? 'Online' : 'Offline';
          el.classList.toggle('status-online', online);
          el.classList.toggle('status-offline', !online);
        }
      });
      const header = document.getElementById('conn-status');
      if (header) {
        header.textContent = online ? 'Online' : 'Offline';
        header.className = online ? 'text-green-400 text-xs' : 'text-amber-400 text-xs';
      }
    };
    if (this._connBound) { paint(); this.showOfflineBanner(!navigator.onLine); return; }
    this._connBound = true;
    this.showOfflineBanner(!navigator.onLine);
    window.addEventListener('online', () => {
      paint();
      this.showOfflineBanner(false);
      this.toast('Back online', 'success');
    });
    window.addEventListener('offline', () => {
      paint();
      this.showOfflineBanner(true);
      this.toast('You are offline – local data still works', 'info');
    });
    paint();
  },

  drawFinancePie() {
    // Optional chart hook – safe no-op if canvas missing
    const el = document.getElementById('finance-pie');
    if (!el) return;
  },

  bindClausePack() {
    const sel = document.getElementById('clause-pack-select');
    if (!sel || sel.dataset.bound) return;
    sel.dataset.bound = '1';
  },

  exportSarsPayrollCsv() {
    const slips = this.payslips || [];
    if (!slips.length) return this.toast('No payslips to export', 'error');
    const rows = [['Period', 'Employee', 'Gross', 'UIF', 'PAYE', 'Net', 'Tax number', 'ID number']];
    for (const s of slips) {
      const emp = (this.employees || []).find(e => String(e.id) === String(s.employeeId)) || {};
      rows.push([
        s.period || '', s.employeeName || emp.fullName || '',
        s.gross ?? '', s.uif ?? '', s.paye ?? '', s.netPay ?? '',
        emp.taxNumber || '', emp.idNumber || ''
      ]);
    }
    const csv = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'SA-Payroll-EMP-style-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    this.toast('Payroll CSV downloaded (indicative – not official e@syFile)', 'success');
  },

  setupPWA() {
    // Service worker registered from index.html (versioned). Avoid double register here.
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); this.deferredPrompt = e;
      document.getElementById('btn-install')?.classList.remove('hidden');
    });
    document.getElementById('btn-install')?.addEventListener('click', async () => {
      if (this.deferredPrompt) { this.deferredPrompt.prompt(); this.deferredPrompt = null;
        document.getElementById('btn-install').classList.add('hidden'); }
    });
  },

  THEMES: ['sage', 'light', 'dark', 'ocean', 'sunset', 'forest', 'slate'],

  async toggleTheme() {
    const list = this.THEMES || ['light', 'dark'];
    const i = list.indexOf(this.theme);
    this.theme = list[(i + 1) % list.length];
    await DB.setSetting('theme', this.theme);
    this.applyTheme();
    this.toast('Theme: ' + this.theme);
  },

  applyTheme() {
    const t = this.theme || 'light';
    const root = document.documentElement;
    root.classList.toggle('dark', t === 'dark' || t === 'ocean' || t === 'slate' || t === 'forest');
    root.setAttribute('data-theme', t);
    document.body.setAttribute('data-theme', t);
    const icon = document.querySelector('#btn-theme i');
    if (icon) {
      const icons = { light: 'moon', dark: 'sun', ocean: 'waves', sunset: 'sunset', forest: 'trees', slate: 'mountain' };
      icon.setAttribute('data-lucide', icons[t] || 'palette');
      if (typeof lucide !== 'undefined') { try { lucide.createIcons(); } catch (e) {} }
    }
  },
  applyAccent() {
    const map = { green:'#007A4D', navy:'#0f172a', blue:'#2563eb', purple:'#7c3aed', teal:'#0d9488', orange:'#ea580c', red:'#b91c1c', gold:'#b48214' };
    document.documentElement.style.setProperty('--sa-green', map[this.accent] || '#007A4D');
  },

  navigate(page) {
    if (!page) page = 'home';
    const moduleMap = {
      invoices: 'invoices', quotes: 'quotes', tickets: 'tickets',
      clients: 'clients', products: 'products', services: 'services',
      expenses: 'expenses', reports: 'reports', payroll: 'payroll', popia: 'popia'
    };
    if (moduleMap[page] && !this.hasModule(moduleMap[page])) {
      this.toast('Not available for your business profile', 'error');
      page = 'home';
    }
    this.currentPage = page;
    try {
      localStorage.setItem('sa_current_page', page);
      document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.page === page);
      });
      // Async-safe render (companies/backup return Promises)
      Promise.resolve(this.render()).catch(err => {
        console.error('Navigate/render error:', err);
        this.toast('Navigation error: ' + (err.message || err), 'error');
      });
    } catch (err) {
      console.error('Navigate error:', err);
      this.toast('Navigation error: ' + (err.message || err), 'error');
    }
  },

  async refreshPageData() {
    try {
      await this.loadData();
      // re-render only if still on same page (avoid flicker loops)
      if (this._lastRenderPage !== this.currentPage) {
        this._lastRenderPage = this.currentPage;
      }
    } catch (e) {
      window.__SA_DEBUG = window.__SA_DEBUG || [];
      window.__SA_DEBUG.push('refresh: ' + (e.message || e));
    }
  },

  toast(msg, type='success') {
    let host = document.getElementById('toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast';
      document.body.appendChild(host);
    }
    host.classList.remove('hidden');
    host.style.display = 'flex';
    const icons = { success: '✓', error: '!', info: 'i', warn: '⚠' };
    const item = document.createElement('div');
    item.className = 'toast ' + (type || 'success');
    item.innerHTML = `<span class="toast-ico">${icons[type] || '•'}</span><span class="toast-msg">${String(msg || '')}</span><button type="button" class="toast-x" aria-label="Dismiss">×</button>`;
    item.querySelector('.toast-x').onclick = () => item.remove();
    host.appendChild(item);
    const ms = type === 'error' ? 7000 : type === 'warn' ? 5500 : 3800;
    setTimeout(() => { try { item.remove(); } catch (e) {} }, ms);
  },


  getPaymentInstructions(invoice) {
    const co = this.company || {};
    const bank = (co.bankName || '').trim() || 'Capitec';
    const acc = (co.accountNumber || '').trim();
    const branch = (co.branchCode || '').trim();
    const accType = (co.accountType || '').trim();
    const holder = (co.accountHolder || co.name || '').trim();
    const ref = (invoice && (invoice.number || invoice.id)) || 'INVOICE';
    const amount = invoice ? this.formatMoney(invoice.total) : '';
    if (!acc) {
      return 'Add Capitec (or bank) account number under Company profile so clients can pay by EFT.';
    }
    let lines = [
      'PAY BY EFT (South Africa)',
      'Bank: ' + bank,
      holder ? ('Account name: ' + holder) : null,
      'Account number: ' + acc,
      branch ? ('Branch code: ' + branch) : 'Branch code: (Capitec universal often 470010 — confirm on your profile)',
      accType ? ('Account type: ' + accType) : null,
      'Reference: ' + ref,
      amount ? ('Amount: ' + amount) : null,
      'Use the invoice number as payment reference so we can allocate your payment.'
    ];
    return lines.filter(Boolean).join('\n');
  },

  getPaymentDetailsObject(invoice) {
    const co = this.company || {};
    return {
      bank: (co.bankName || 'Capitec').trim(),
      accountHolder: (co.accountHolder || co.name || '').trim(),
      accountNumber: (co.accountNumber || '').trim(),
      branchCode: (co.branchCode || '').trim() || '470010',
      accountType: (co.accountType || 'Business').trim(),
      reference: (invoice && (invoice.number || String(invoice.id))) || '',
      amount: invoice ? Number(invoice.total) || 0 : 0,
      amountLabel: invoice ? this.formatMoney(invoice.total) : ''
    };
  },

  async copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.toast('Copied', 'success');
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      this.toast('Copied', 'success');
      return true;
    } catch (e2) {
      this.toast('Copy failed — select text manually', 'warn');
      return false;
    }
  },

  showPayEft(id) {
    const inv = (this.invoices || []).find(x => String(x.id) === String(id));
    if (!inv) return this.toast('Invoice not found', 'error');
    if (inv.isCredit) return this.toast('Credit notes are not payable', 'info');
    const d = this.getPaymentDetailsObject(inv);
    const full = this.getPaymentInstructions(inv);
    const hasBank = !!d.accountNumber;
    this.showModal(`
      <div class="p-5 max-w-md">
        <h3 class="font-bold text-lg mb-1">Collect payment</h3>
        <p class="text-xs text-slate-500 mb-3">Invoice <strong>${inv.number || inv.id}</strong> · ${d.amountLabel}</p>
        <div class="space-y-2 mb-3">
          <button type="button" class="btn btn-primary w-full" id="btn-payfast-pay">Pay with PayFast (card / Instant EFT)</button>
          <button type="button" class="btn btn-secondary w-full" id="btn-copy-pay" ${hasBank ? '' : 'disabled style="opacity:0.5"'}>Copy Capitec / EFT details</button>
          <button type="button" class="btn btn-outline w-full" id="btn-wa-pay">WhatsApp payment request</button>
          <button type="button" class="btn btn-outline w-full" id="btn-email-pay">Email payment request</button>
          <button type="button" class="btn btn-ghost w-full" data-action="payment-history" data-id="${inv.id}">Record payment received</button>
          <button type="button" class="btn btn-ghost w-full" onclick="App.closeModal()">Close</button>
        </div>
        <p class="text-xs text-slate-400">PayFast sandbox uses test money. Configure Merchant ID under Settings → Payments. After real verification, turn off sandbox.</p>
      </div>`);
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    bind('btn-copy-pay', () => {
      if (!hasBank) return this.toast('Add bank details in company profile first', 'warn');
      this.copyText(full);
    });
    bind('btn-wa-pay', () => {
      const client = this.clientById ? this.clientById(inv.clientId) : null;
      const text = hasBank
        ? `Hi ${client?.name || ''},\n\nPlease pay invoice ${d.reference}:\n\n${full}\n\nThank you,\n${this.companySignOff ? this.companySignOff() : ''}`
        : `Hi ${client?.name || ''},\n\nPlease pay invoice ${d.reference} for ${d.amountLabel}.\n\nThank you,\n${this.companySignOff ? this.companySignOff() : ''}`;
      this.openWhatsApp(client?.phone || client?.mobile || '', text);
    });
    bind('btn-email-pay', () => {
      const client = this.clientById ? this.clientById(inv.clientId) : null;
      this.openEmail(client?.email || '', `Payment: ${d.reference}`, hasBank ? full : `Please pay ${d.amountLabel} for ${d.reference}`);
    });
    bind('btn-payfast-pay', async () => {
      try {
        if (!window.PayFast) throw new Error('PayFast module not loaded');
        const client = this.clientById ? this.clientById(inv.clientId) : null;
        const nameParts = String(client?.name || 'Customer').trim().split(/\s+/);
        this.toast('Redirecting to PayFast…', 'info');
        await PayFast.startPayment({
          amount: inv.total,
          itemName: 'Invoice ' + (inv.number || inv.id),
          itemDescription: (this.company?.name || 'SA Invoice Pro') + ' invoice',
          mPaymentId: 'INV-' + (inv.number || inv.id),
          email: client?.email || '',
          nameFirst: nameParts[0] || 'Customer',
          nameLast: nameParts.slice(1).join(' ') || '',
          customStr1: String(inv.id),
          customStr2: 'invoice'
        });
      } catch (e) {
        this.toast(e.message || 'PayFast error', 'error');
      }
    });
  },


  formatMoney(n) { return 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2}); },
  formatDate(d) { return d ? new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}) : '—'; },

  // ========== RENDER ==========
  async render() {
    const main = document.getElementById('main');
    if (!main) return;
    const pages = {
      home: () => this.renderHome(),
      dashboard: () => this.renderDashboard(),
      documents: () => this.renderDocGenerator(),
      invoices: () => this.renderDocs('invoice'),
      quotes: () => this.renderDocs('quote'),
      tickets: () => this.renderTickets(),
      clients: () => this.renderClients(),
      'client-detail': () => {
        if (this._viewClientId != null) return this.renderClientDetail(this._viewClientId);
        return this.renderClients();
      },
      products: () => this.renderItems('product'),
      services: () => this.renderItems('service'),
      expenses: () => this.renderExpenses(),
      payroll: () => this.renderPayroll(),
      popia: () => this.renderPopia(),
      reports: () => this.renderReports(),
      accounting: () => this.renderAccounting(),
      industry: () => this.renderIndustryHub(),
      about: () => this.renderAbout(),
      account: () => this.renderAccount(),
      companies: () => this.renderCompanies(),
      backup: () => this.renderBackup(),
      license: () => this.renderLicense(),
      payments: () => this.renderPaymentsPage(),
      settings: () => this.renderSettings()
    };
    let body = '';
    try {
      const fn = pages[this.currentPage] || pages.home;
      const result = fn.call(this);
      body = (result && typeof result.then === 'function') ? await result : result;
      if (body == null) body = '';
    } catch (err) {
      console.error('Render page error:', err);
      body = `<div class="card p-6"><p class="text-red-600">Could not load this page.</p>
        <p class="text-sm text-slate-500 mt-2">${(err && err.message) || err}</p>
        <button type="button" data-action="go-home" class="btn btn-primary mt-4">Back to Home</button></div>`;
    }
    const online = navigator.onLine;
    const licLabel = (this.licenseStatus && this.licenseStatus.label) || '—';
    main.innerHTML = `
      <div class="flex flex-wrap items-center gap-2 mb-4 text-sm page-crumb">
        <button type="button" data-action="go-home" class="btn btn-outline p-1.5" title="Home"><i data-lucide="home" class="w-4 h-4"></i></button>
        <span class="text-slate-400">/</span>
        <span class="font-medium capitalize">${this.currentPage}</span>
        <span class="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <span class="status-pill ${online ? 'status-online' : 'status-offline'}">${online ? 'Online' : 'Offline'}</span>
          <span class="status-pill status-lic">${licLabel}</span>
          <span class="status-pill status-zar" title="South African Rand only">ZAR</span>
          <span class="text-slate-400">v${APP_VERSION}</span>
        </span>
      </div>
      ${body}`;
    if (typeof lucide !== 'undefined') { try { lucide.createIcons(); } catch (e) {} }
    try { document.body.classList.add('sage-ui'); document.documentElement.setAttribute('data-theme', this.theme || 'sage'); } catch(e) {}
    this.bindActions();
    try { if (typeof this.drawFinancePie === 'function') this.drawFinancePie(); } catch (e) {}
    try { if (typeof this.bindClausePack === 'function') this.bindClausePack(); } catch (e) {}
    const all = document.getElementById('inv-select-all');
    if (all) {
      all.onchange = () => {
        document.querySelectorAll('.inv-select:not(:disabled)').forEach(cb => { cb.checked = all.checked; });
      };
    }
    // Live search (debounced) – no Filter click required
    const live = (el, fn) => {
      if (!el || el.dataset.liveBound) return;
      el.dataset.liveBound = '1';
      let t;
      el.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(fn, 220);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); fn(); }
      });
    };
    live(document.getElementById('doc-search'), () => this.applyDocFilter());
    const st = document.getElementById('doc-status-filter');
    if (st && !st.dataset.liveBound) {
      st.dataset.liveBound = '1';
      st.addEventListener('change', () => this.applyDocFilter());
    }
    live(document.getElementById('client-search'), () => this.applyClientFilter());
    try { this.fillDocPresetSelect(); } catch (e) {}
    try { this.fillClientPresetSelect(); } catch (e) {}
    if (!this._rowMenuDocBound) {
      this._rowMenuDocBound = true;
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.row-actions-cell')) {
          document.querySelectorAll('.row-menu.open').forEach(m => m.classList.remove('open'));
        }
      });
    }
    // Auto-fill server URLs (from config / saved settings – no manual paste needed)
    const fillUrl = async (id, key, cfgKey) => {
      const el = document.getElementById(id);
      if (!el) return;
      let v = await DB.getSetting(key, '');
      if (!v && window.SA_CONFIG && SA_CONFIG[cfgKey]) v = SA_CONFIG[cfgKey];
      if (v) el.value = v;
      el.readOnly = false;
      el.placeholder = v || el.placeholder;
    };
    fillUrl('update-server-url', 'updateServerUrl', 'defaultUpdateServerUrl');
    fillUrl('license-server-url', 'licenseServerUrl', 'defaultLicenseServerUrl');
  },

  bindActions() {
    // Calculator pad (accounting tools)
    document.querySelectorAll('[data-calc]').forEach(btn => {
      if (btn._calcBound) return;
      btn._calcBound = true;
      btn.addEventListener('click', () => this.calcPress(btn.dataset.calc)); // calc
    });

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const raw = btn.dataset.id;
        let id = null;
        if (raw != null && raw !== '') {
          // Keep string IDs; only use number when it is purely numeric
          id = /^\d+$/.test(String(raw)) ? Number(raw) : raw;
        }
        this.handleAction(btn.dataset.action, id, btn);
      };
    });
  },

  async handleAction(action, id, el) {
    // Normalise id (buttons may pass number or string)
    if (id != null && id !== '' && Number.isNaN(id)) id = el?.dataset?.id || id;
    if (action && action.startsWith('new-') && !this.requireLicense()) return;
    const actions = {
      'go-home': () => this.navigate('home'),
      'new-invoice': () => this.showDocModal('invoice'),
      'edit-invoice': () => this.showDocModal('invoice', id),
      'new-quote': () => this.showDocModal('quote'),
      'edit-quote': () => this.showDocModal('quote', id),
      'preview-invoice': () => this.doPreview(id, false),
      'preview-quote': () => this.doPreview(id, true),
      'pdf-invoice': () => this.doPdf(id, false),
      'pdf-quote': () => this.doPdf(id, true),
      'status-invoice': () => this.changeStatus('invoice', id),
      'status-quote': () => this.changeStatus('quote', id),
      'convert-quote': () => this.convertQuote(id),
      'packing-slip': () => this.packingSlipPdf(id),
      'duplicate-invoice': () => this.duplicateInvoice(id),
      'duplicate-quote': () => this.duplicateQuote(id),
      'view-receipt': () => this.viewExpenseReceipt(id),
      'apply-doc-filter': () => this.applyDocFilter(),
      'apply-client-filter': () => this.applyClientFilter(),
      'save-doc-preset': () => this.saveDocPreset(),
      'delete-doc-preset': () => this.deleteDocPreset(),
      'save-client-preset': () => this.saveClientPreset(),
      'delete-client-preset': () => this.deleteClientPreset(),
      'print-list': () => this.printCurrentList(),
      'delete-expense': () => this.deleteExpense(id),
      'dismiss-tutorial': () => this.dismissTutorial(),
      'dismiss-popia-tut': () => this.dismissPopiaTut(),
      'new-popia-request': () => this.showPopiaRequestModal && this.showPopiaRequestModal(),
      'pdf-privacy-notice': () => this.pdfPrivacyNotice && this.pdfPrivacyNotice(),
      'resolve-popia': () => this.resolvePopiaRequest && this.resolvePopiaRequest(id),
      'save-google-client': () => this.saveGoogleClient && this.saveGoogleClient(),
      'save-popia-settings': () => this.savePopiaSettings && this.savePopiaSettings(),
      'export-dashboard-snapshot': () => this.exportDashboardSnapshot(),
      'export-dashboard-pdf': () => this.exportDashboardSnapshotPdf(),
      'toggle-row-menu': () => this.toggleRowMenu(el),

      'export-filtered-docs': () => this.exportFilteredDocs(),
      'sort-docs': () => this.sortDocs(el?.dataset?.sort),
      'load-doc-preset': () => this.loadDocPreset(),
      'email-doc': () => this.emailDoc(id, el?.dataset?.type === 'quote'),
      'share-whatsapp': () => this.shareWhatsApp(id, el?.dataset?.type === 'quote'),
      'share-ticket-wa': () => this.shareTicketWhatsApp(id),
      'share-ticket-email': () => this.shareTicketEmail(id),
      'share-client-wa': () => this.shareClientWhatsApp(id),
      'share-client-email': () => this.shareClientEmail(id),
      'payment-reminder-wa': () => this.paymentReminderWhatsApp(id),
      'payment-reminder-email': () => this.paymentReminderEmail(id),
      'share-sheet': () => this.showShareSheet(el?.dataset?.kind || 'invoice', id),
      'delete-invoice': () => this.deleteDoc('invoice', id),
      'delete-quote': () => this.deleteDoc('quote', id),
      'tickets-native': () => { this._ticketsNative = true; this._forceHelixPanel = false; this.render(); },
      'tickets-helix': () => { this._ticketsNative = false; this._forceHelixPanel = true; this.currentPage = 'tickets'; this.render(); },
      'save-helix-url': () => this.saveHelixUrl(),
      'new-ticket': () => this.showTicketModal(),
      'edit-ticket': () => this.showTicketModal(id),
      'delete-ticket': () => this.deleteTicket(id),
      'log-time': () => this.showTimeModal(id),
      'new-client': () => this.showClientModal(),
      'view-client': () => this.viewClient(id),
      'share-client-portal': () => this.shareClientPortal(id),
      'share-invoice-portal': () => {
        const inv = (this.invoices || []).find(x => String(x.id) === String(id));
        if (!inv || !inv.clientId) return this.toast('Invoice has no client', 'warn');
        this.shareClientPortal(inv.clientId);
      },
      'add-sub-ticket': () => this.addSubTicket(id),
      'edit-client': () => this.showClientModal(id),
      'delete-client': () => this.deleteClient(id),
      'client-statement': () => this.clientStatementPdf(id),
      'payment-history': () => this.showPaymentHistory(id),
      'pay-eft': () => this.showPayEft(id),
      'batch-mark-paid': () => this.batchMarkPaid(),
      'new-product': () => this.showItemModal('product'),
      'edit-product': () => this.showItemModal('product', id),
      'delete-product': () => this.deleteItem('product', id),
      'new-service': () => this.showItemModal('service'),
      'edit-service': () => this.showItemModal('service', id),
      'delete-service': () => this.deleteItem('service', id),
      'save-settings': () => this.saveSettings(),
      'export-excel': () => this.exportExcel(),
      'export-report-pdf': () => this.exportReportPdf(),
      'send-reminders': () => this.sendPaymentReminders(),
      'generate-recurring': () => this.generateRecurring(),
      'check-updates': () => this.checkForUpdates(false),
      'docgen-pdf': () => this.docgenPdf(),
      'docgen-demo': () => this.docgenDemo(),
      'save-update-server': () => this.saveUpdateServerUrl(),
      'owner-unlock': () => this.ownerUnlock(),
      'set-owner-token': () => this.setOwnerToken(),
      'get-hwid': () => this.doGetHwid(),
      'license-request': () => this.doLicenseRequest(),
      'license-request-refresh': () => this.doLicenseRequestAndRefresh(),
      'license-claim': () => this.doLicenseClaim(),
      'activate-license': () => this.doServerActivate(),
      'save-payfast': () => this.savePayFastSettings(),
      'show-pricing': () => this.showPricingPanel(),
      'export-license-file': () => {
        try {
          if (!window.License || !License.licenseKey) return this.toast('No active license to export', 'warn');
          License.exportLicenseFile();
          this.toast('License file saved — keep sa-invoice-license.json safe', 'success');
        } catch (e) { this.toast(String(e.message || e), 'error'); }
      },
      'import-license-file': () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = async () => {
          try {
            if (!inp.files || !inp.files[0]) return;
            await License.importLicenseFile(inp.files[0]);
            this.licenseStatus = License.getStatus();
            this.setupUI();
            this.toast('License restored offline', 'success');
            this.render();
          } catch (e) { this.toast(String(e.message || e), 'error'); }
        };
        inp.click();
      },
      'save-license-server': () => this.saveLicenseServerUrl(),
      'export-backup': () => this.exportBackup(),
      'backup-data': () => this.exportBackup(),
      'restore-data': () => this.importBackup(),
      'import-backup': () => this.importBackup(),
      'save-company-slot': () => this.saveCompanySlot(),
      'switch-company': (cid) => this.switchCompany(cid || id),
      'new-employee': () => this.showEmployeeModal(),
      'edit-employee': () => this.showEmployeeModal(id),
      'delete-employee': () => this.deleteEmployee(id),
      'new-payslip': () => this.showPayslipModal(),
      'pdf-payslip': () => this.pdfPayslip(id),
      'delete-payslip': () => this.deletePayslip(id),
      'export-sars-csv': () => this.exportSarsPayrollCsv(),
      'settings-tab': () => { this.settingsTab = el?.dataset?.tab || 'company'; this.render(); },
      'go-home': () => this.navigate('home'),
      'go-dashboard': () => this.navigate('dashboard'),
      'go-invoices': () => this.navigate('invoices'),
      'go-quotes': () => this.navigate('quotes'),
      'go-tickets': () => this.navigate('tickets'),
      'go-clients': () => this.navigate('clients'),
      'go-products': () => this.navigate('products'),
      'go-services': () => this.navigate('services'),
      'go-reports': () => this.navigate('reports'),
      'go-accounting': () => this.navigate('accounting'),
      'batch-payslips-pdf': () => this.batchPayslipsPdf(),
      'toggle-recurring-cal': () => { this._showRecurringCal = !this._showRecurringCal; this.render(); },
      'close-modal': () => this.closeModal(),
      'pick-theme': () => this.pickTheme(id),
      'preview-template-sample': () => this.previewTemplateSample(),
      'wipe-demo-data': () => this.wipeDemoData(),
      'vat-tool-run': () => this.vatToolRun(),
      'markup-tool-run': () => this.markupToolRun(),
      'quick-total-run': () => this.quickTotalRun(),
      'days-tool-run': () => this.daysToolRun(),
      'load-industry-samples': () => this.loadIndustrySamples(),
      'acct-tab': () => { this.acctTab = el?.dataset?.tab || 'overview'; this.render(); },
      'seed-coa': () => this.seedCoa(),
      'auto-post-journals': () => this.autoPostJournalsFromOps(),
      'export-tb-csv': () => this.exportTrialBalanceCsv(),
      'export-pl-csv': () => this.exportProfitLossCsv(),
      'acct-apply-period': () => { this._acctPeriod = (document.getElementById('acct-period')?.value || '').trim(); this.render(); },
      'acct-clear-period': () => { this._acctPeriod = ''; this.render(); },
      'add-account': () => this.addAccount(),
      'save-bank-txn': () => this.saveBankTxn(),
      'preview-bank-csv': () => this.previewBankCsv(),
      'import-bank-csv': () => this.importBankCsv(),
      'build-customer-statement': () => this.buildCustomerStatement(),
      'pdf-customer-statement': () => this.pdfCustomerStatement(),
      'save-supplier-bill': () => this.saveSupplierBill(),
      'pay-supplier-bill': () => this.paySupplierBill(id),
      'delete-supplier-bill': () => this.deleteSupplierBill(id),
      'save-asset': () => this.saveAsset(),
      'delete-asset': () => this.deleteAsset(id),
      'save-budget': () => this.saveBudget(),
      'apply-budget-year': () => {
        this._budgetYear = document.getElementById('budget-year')?.value || new Date().getFullYear();
        DB.getSetting('budgetsByYear', {}).then(all => {
          this.budgets = (all || {})[this._budgetYear] || {};
          this.render();
        });
      },
      'apply-close-year': () => { this._closeYear = document.getElementById('close-year')?.value; this.render(); },
      'close-financial-year': () => this.closeFinancialYear(),
      'reopen-financial-year': () => this.reopenFinancialYear(),

      'match-bank': () => this.matchBankTxn(id),
      'recon-bank': () => this.reconBankTxn(id),
      'delete-bank': () => this.deleteBankTxn(id),
      'add-journal': () => this.addJournalEntry(),
      'delete-journal': () => this.deleteJournal(id),
      'apply-vat-period': () => { this._vatPeriod = document.getElementById('vat-period')?.value || this._vatPeriod; this.render(); },
      'export-vat-csv': () => this.exportVatCsv(),
      'run-allocation': () => this.runPaymentAllocation(),
      'pause-recurring': () => this.pauseRecurring(id),
      'skip-recurring': () => this.skipRecurring(id),
      'toggle-demo-flag': () => this.toggleDemoFlag(el?.dataset?.store, id),

      'apply-industry': () => this.applyIndustry && this.applyIndustry(id, el),
      'go-expenses': () => this.navigate('expenses'),
      'go-documents': () => this.navigate('documents'),
      'go-industry': () => this.navigate('industry'),
      'go-payments': () => this.navigate('payments'),
      'go-settings': () => this.navigate('settings'),
      'go-account': () => this.navigate('account'),
      'go-payroll': () => this.navigate('payroll'),
      'go-popia': () => this.navigate('popia'),
      'new-invoice': () => this.showDocModal('invoice'),
      'new-quote': () => this.showDocModal('quote'),
      'new-expense': () => this.showExpenseModal(),
      'edit-expense': () => this.showExpenseModal(id),
    };
    const fn = actions[action];
    if (!fn) {
      console.warn('Unknown action:', action);
      return;
    }
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        result.catch(err => {
          console.error(action, err);
          this.toast(err.message || String(err), 'error');
        });
      }
    } catch (err) {
      console.error(action, err);
      this.toast(err.message || String(err), 'error');
    }
  },

  exportExcel() {
    const vat = this.vatSummary();
    const aged = this.agedDebtorsBuckets();
    const rows = [['Section','Number','Client','Date','Due','Days','Subtotal','VAT','Total','Status']];
    for (const i of (this.invoices || [])) {
      const c = (this.clients || []).find(x => String(x.id) === String(i.clientId));
      const due = i.dueDate || i.date || '';
      let days = '';
      if (due && i.status !== 'paid' && i.status !== 'cancelled') {
        days = Math.max(0, Math.floor((Date.now() - new Date(due)) / 86400000));
      }
      rows.push(['Invoice', i.number, c?.name || i.clientName || '', i.date || '', due, days,
        i.subtotal ?? '', i.vatAmount ?? '', i.total ?? '', i.status || '']);
    }
    rows.push([]);
    rows.push(['VAT Summary','Sales excl', vat.salesExcl, 'Output VAT', vat.vat, 'Paid VAT', vat.paidVat, 'Unpaid VAT', vat.unpaidVat]);
    rows.push([]);
    rows.push(['Aged','Current', aged.current, '1-30', aged.d30, '31-60', aged.d60, '61-90', aged.d90, '90+', aged.older]);
    const csv = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'SA-Reports-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    this.toast('CSV exported (invoices + VAT + aged debtors)');
  },

  // ========== SETTINGS (categorized) v1.1 ==========
  settingsTab: 'company',

  renderSettings() {
    const c = this.company || {};
    const tab = this.settingsTab || 'company';
    const tabs = [
      { id:'company', label:'Company' },
      { id:'invoicing', label:'Invoicing' },
      { id:'profile', label:'Business profile' },
      { id:'appearance', label:'Appearance' },
      { id:'data', label:'Backup' },
      { id:'about', label:'About / Debug' },
      { id:'danger', label:'Danger zone' }
    ];
    const tabBar = `<div class="search-bar mb-4">${tabs.map(t =>
      `<button type="button" class="filter-chip ${tab===t.id?'active':''}" data-action="settings-tab" data-tab="${t.id}">${t.label}</button>`
    ).join('')}</div>`;

    let body = '';
    if (tab === 'company') {
      body = `
        <form id="settings-form" class="space-y-4">
          <h3 class="font-semibold text-sa-green">Company (South Africa)</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2"><label class="label">Company Name *</label><input name="name" class="input" value="${c.name||''}" required /></div>
            <div><label class="label">CIPC Reg No</label><input name="regNo" class="input" value="${c.regNo||''}" /></div>
            <div><label class="label">CIPC registration status</label>
              <select name="cipcStatus" class="input">
                ${['In business','Registered','In deregistration','Final deregistration','Business rescue','Liquidation','Unknown'].map(s=>`<option value="${s}" ${(c.cipcStatus||'')===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div><label class="label">VAT Number</label><input name="vatNo" class="input" value="${c.vatNo||''}" /></div>
            <div><label class="label">B-BBEE Level</label>
              <select name="beeLevel" class="input"><option value="">—</option>
                ${[1,2,3,4,5,6,7,8,'Non-compliant'].map(l=>`<option value="${l}" ${String(c.beeLevel)===String(l)?'selected':''}>Level ${l}</option>`).join('')}</select>
            </div>
            <div><label class="label">Phone</label><input name="phone" class="input" value="${c.phone||''}" /></div>
            <div class="sm:col-span-2"><label class="label">Email</label><input name="email" type="email" class="input" value="${c.email||''}" /></div>
            <div class="sm:col-span-2"><label class="label">Address</label><input name="address" class="input" value="${c.address||''}" /></div>
            <div><label class="label">City</label><input name="city" class="input" value="${c.city||''}" /></div>
            <div><label class="label">Postal Code</label><input name="postalCode" class="input" value="${c.postalCode||''}" /></div>
            <div><label class="label">Province</label>
              <select name="province" class="input"><option value="">—</option>
                ${['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Free State','Limpopo','Mpumalanga','North West','Northern Cape'].map(pr=>`<option value="${pr}" ${c.province===pr?'selected':''}>${pr}</option>`).join('')}</select>
            </div>
          </div>
          <h3 class="font-semibold text-sa-green">Bank accounts</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="label">Bank</label><input name="bankName" class="input" value="${c.bankName||''}" /></div>
            <div><label class="label">Account name</label><input name="bankAccountName" class="input" value="${c.bankAccountName||''}" /></div>
            <div><label class="label">Account number</label><input name="bankAccountNo" class="input" value="${c.bankAccountNo||''}" /></div>
            <div><label class="label">Branch code</label><input name="bankBranch" class="input" value="${c.bankBranch||''}" /></div>
            <div class="sm:col-span-2"><label class="label">Second account (optional)</label><input name="bank2" class="input" value="${c.bank2||''}" placeholder="Bank / Acc / Branch" /></div>
          </div>
          <div><label class="label">Logo</label>
            <input type="file" id="logo-upload" accept="image/*" class="input" />
            ${this.logoData ? `<img src="${this.logoData}" alt="Logo" style="max-height:60px;margin-top:8px" class="rounded" />` : ''}
          </div>
          <button type="button" data-action="save-settings" class="btn btn-primary">Save company</button>
        </form>`;
    } else if (tab === 'invoicing') {
      body = `
        <form id="settings-form" class="space-y-4">
          <h3 class="font-semibold text-sa-green">VAT</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="label">Charge 15% VAT</label>
              <select id="vat-enabled" class="input">
                <option value="true" ${this.vatEnabled?'selected':''}>Yes</option>
                <option value="false" ${!this.vatEnabled?'selected':''}>No</option>
              </select>
            </div>
            <div><label class="label">VAT rate</label>
              <select id="vat-rate" class="input">
                <option value="0.15" ${this.vatRate==0.15?'selected':''}>15%</option>
                <option value="0" ${this.vatRate==0?'selected':''}>0%</option>
              </select>
            </div>
          </div>
          <div><label class="label">Terms / messages on invoices</label>
            <textarea name="terms" class="input" rows="3">${c.terms||''}</textarea>
          </div>
          <p class="text-sm text-slate-500">Tax Invoice · Quote · Proforma · Credit note · ZAR · Duplicate from existing invoice supported.</p>
          <button type="button" data-action="save-settings" class="btn btn-primary">Save invoicing</button>
        </form>`;
    } else if (tab === 'profile') {
      body = `
        <div class="space-y-4">
          <h3 class="font-semibold text-sa-green">Business type modules</h3>
          <p class="text-sm text-slate-500">Controls which menu items appear.</p>
          <select id="business-type-select" class="input">
            ${(window.BUSINESS_TEMPLATES||[]).map(t =>
              `<option value="${t.id}" ${this.businessTemplate===t.id?'selected':''}>${t.name}</option>`
            ).join('')}
          </select>
          <div class="flex flex-wrap gap-2 mt-2">
            ${Object.entries(this.modules||{}).map(([k,v]) =>
              `<span class="filter-chip ${v?'active':''}">${k}: ${v?'ON':'off'}</span>`
            ).join('')}
          </div>
          <button type="button" data-action="save-settings" class="btn btn-primary">Apply profile</button>
        </div>`;
    } else if (tab === 'appearance') {
      const themes = this.THEMES || ['sage','light','dark','ocean','sunset','forest','slate'];
      body = `
        <form id="settings-form" class="space-y-5">
          <div>
            <h3 class="font-semibold text-lg mb-1">Theme designer</h3>
            <p class="text-xs text-slate-500 mb-3">App UI look &amp; feel (saved to this device).</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="theme-designer-grid">
              ${themes.map(t => `
                <button type="button" class="theme-chip ${this.theme===t?'active':''}" data-action="pick-theme" data-id="${t}"
                  style="padding:.75rem;border-radius:12px;border:2px solid ${this.theme===t?'#007A4D':'#e2e8f0'};background:${t==='dark'||t==='slate'||t==='ocean'||t==='forest'?'#1e293b':'#f8fafc'};color:${t==='dark'||t==='slate'||t==='ocean'||t==='forest'?'#f1f5f9':'#0f172a'};font-weight:600;text-transform:capitalize">
                  ${t}
                </button>`).join('')}
            </div>
          </div>
          <div class="pt-4 border-t">
            <h3 class="font-semibold text-lg mb-1">Invoice / quote template designer</h3>
            <p class="text-xs text-slate-500 mb-3">PDF layout style + accent colour. Signature sits under terms (no overlap). Layout prefers one page.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label class="label">PDF template</label>
                <select id="template-select" class="input">
                  ${['classic','modern','minimal','bold'].map(x=>`<option value="${x}" ${this.template===x?'selected':''}>${x}</option>`).join('')}
                </select>
              </div>
              <div><label class="label">Accent colour</label>
                <select id="accent-select" class="input">
                  ${['green','navy','blue','purple','teal','orange','red','gold'].map(col=>`<option value="${col}" ${this.accent===col?'selected':''}>${col}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              <button type="button" data-action="preview-template-sample" class="btn btn-secondary">Live sample preview</button>
              <button type="button" data-action="save-settings" class="btn btn-primary">Save appearance</button>
            </div>
          </div>
          <div class="mt-2 pt-4 border-t">
            <h4 class="font-semibold mb-2">PDF attestation (signatory)</h4>
            <p class="text-xs text-slate-500 mb-2">Placed below notes/terms with clear spacing. Not a cryptographic QES under the ECT Act.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="label">Signatory name</label><input id="pdf-sign-name" class="input" value="${this.pdfSignName||''}" placeholder="e.g. Director name" /></div>
              <div><label class="label">Title</label><input id="pdf-sign-title" class="input" value="${this.pdfSignTitle||''}" placeholder="e.g. Managing Director" /></div>
            </div>
            <label class="flex gap-2 items-center mt-2 text-sm"><input type="checkbox" id="pdf-auto-sign" ${this.pdfAutoSign!==false?'checked':''}/> Auto-add signature block on generate</label>
          </div>
        </form>`;
    } else if (tab === 'data') {
      body = `
        <div class="space-y-4">
          <p class="text-sm text-slate-500">Full JSON backup of all local data.</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-action="backup-data" class="btn btn-secondary">Download backup</button>
            <button type="button" data-action="restore-data" class="btn btn-outline">Restore backup</button>
          </div>
        </div>`;
    } else {
      const st = this.licenseStatus || {};
      body = `
        <div class="space-y-3 text-sm">
          <div class="flex justify-between border-b py-2"><span>App version</span><strong>${typeof APP_VERSION!=='undefined'?APP_VERSION:'1.1.0'}</strong></div>
          <div class="flex justify-between border-b py-2"><span>License</span><strong>${st.label||'—'}</strong></div>
          <div class="flex justify-between border-b py-2"><span>Business profile</span><strong>${this.businessTemplate}</strong></div>
          <div class="flex justify-between py-2"><span>User</span><strong>${Auth.currentUser?.username||''}</strong></div>
          <h4 class="font-semibold mt-4">Changelog</h4>
          <ul class="pl-5" style="list-style:disc">
            ${(typeof APP_CHANGELOG!=='undefined'?APP_CHANGELOG:[]).map(x=>`<li><strong>${x.v}</strong> (${x.date}) – ${x.notes}</li>`).join('')}
          </ul>
          <p class="text-xs text-slate-500 mb-3">POPIA: This app stores business data locally in your browser/device. We do not upload personal information except optional license handshake (hardware id) to your chosen license server.</p>
          <h4 class="font-semibold mt-4">Google OAuth2 Client ID</h4>
          <p class="text-xs text-slate-500 mb-2">From Google Cloud Console → OAuth Web client. Leave empty to hide Google login requirement.</p>
          <input id="google-client-id" class="input mb-2" placeholder="xxxx.apps.googleusercontent.com" value="${typeof Auth!=='undefined'?(Auth.getGoogleClientId&&Auth.getGoogleClientId())||'':''}" />
          <button type="button" class="btn btn-secondary" data-action="save-google-client">Save Google Client ID</button>
          <h4 class="font-semibold mt-4">Debug (session)</h4>
          <pre class="text-xs p-3 rounded-lg overflow-auto" style="max-height:160px;background:#f1f5f9">${(window.__SA_DEBUG||['No errors']).slice(-20).join(String.fromCharCode(10))}</pre>
        </div>`;
    }

    return `
      <div class="mb-4"><h2 class="text-2xl font-bold">Settings</h2>
        <p class="text-slate-500 text-sm">Organised by category</p></div>
      ${tabBar}
      <div class="card p-6 max-w-3xl">${body}</div>
      ${tab === 'danger' ? `
        <div class="card p-5 border border-red-200">
          <h3 class="font-bold text-red-800 mb-2">Danger zone</h3>
          <p class="text-sm text-slate-600 mb-4">These actions permanently delete data on this device. Export a backup first.</p>
          <ul class="text-sm list-disc pl-5 mb-4 text-slate-600">
            <li>Demo-tagged clients, products, and documents are removed first.</li>
            <li>If none are tagged, you can wipe invoices, quotes, expenses, and tickets.</li>
            <li>Your login and company profile are not deleted.</li>
          </ul>
          <button type="button" data-action="wipe-demo-data" class="btn btn-outline text-red-700 border-red-400">Wipe demo / sample data</button>
        </div>` : ''}
`;
  },


  async saveSettings() {
    // Company form (optional – only on Company tab)
    const form = document.getElementById('settings-form');
    if (form) {
      const data = Object.fromEntries(new FormData(form));
      if (data.name !== undefined) {
        const nameErr = this.validateCompanyName(data.name);
        if (nameErr) return this.toast(nameErr, 'error');
        const emailErr = this.validateEmail(data.email);
        if (emailErr) return this.toast(emailErr, 'error');
        const phoneErr = this.validatePhone(data.phone);
        if (phoneErr) return this.toast(phoneErr, 'error');
        const vatErr = this.validateVatNo(data.vatNo);
        if (vatErr) return this.toast(vatErr, 'error');
        const prev = this.company || {};
        const merged = { ...prev, ...data, id: 1 };
        await DB.saveCompany(merged);
        this.company = merged;
      }
      if (data.terms !== undefined) {
        const co = { ...(this.company||{}), id:1, terms: data.terms, termsAuto: false };
        await DB.saveCompany(co);
        this.company = co;
      }
    }

    const vatEl = document.getElementById('vat-enabled');
    if (vatEl) {
      const vatEnabled = vatEl.value === 'true';
      const vatRate = parseFloat(document.getElementById('vat-rate')?.value || '0.15');
      await DB.setSetting('vatEnabled', vatEnabled);
      await DB.setSetting('vatRate', vatRate);
      this.vatEnabled = vatEnabled; this.vatRate = vatRate;
    }

    const template = document.getElementById('template-select')?.value;
    const accent = document.getElementById('accent-select')?.value;
    if (template) { await DB.setSetting('template', template); this.template = template; }
    if (accent) { await DB.setSetting('accent', accent); this.accent = accent; this.applyAccent(); }
    const signName = document.getElementById('pdf-sign-name');
    if (signName) {
      this.pdfSignName = signName.value.trim();
      this.pdfSignTitle = document.getElementById('pdf-sign-title')?.value?.trim() || '';
      this.pdfAutoSign = !!document.getElementById('pdf-auto-sign')?.checked;
      await DB.setSetting('pdfSignName', this.pdfSignName);
      await DB.setSetting('pdfSignTitle', this.pdfSignTitle);
      await DB.setSetting('pdfAutoSign', this.pdfAutoSign);
    }

    // Visual theme chips if container exists
    const chipHost = document.getElementById('theme-chips');
    if (chipHost && !chipHost.dataset.ready) {
      chipHost.dataset.ready = '1';
      const themes = this.THEMES || ['sage','light','dark','ocean','sunset','forest','slate'];
      chipHost.innerHTML = themes.map(th =>
        `<button type="button" class="theme-chip ${this.theme===th?'active':''}" data-theme-pick="${th}">${th}</button>`
      ).join('');
      chipHost.querySelectorAll('[data-theme-pick]').forEach(btn => {
        btn.onclick = async () => {
          this.theme = btn.getAttribute('data-theme-pick');
          await DB.setSetting('theme', this.theme);
          this.applyTheme();
          chipHost.querySelectorAll('.theme-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-theme-pick')===this.theme));
          this.toast('Theme: ' + this.theme);
        };
      });
    }
    const themeSel = document.getElementById('theme-select');
    if (themeSel) {
      this.theme = themeSel.value;
      await DB.setSetting('theme', this.theme);
      this.applyTheme();
    }

    // Logo
    const fileInput = document.getElementById('logo-upload');
    if (fileInput?.files?.[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = async (e) => {
        await DB.setSetting('logoData', e.target.result);
        this.logoData = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    // Business profile
    const bizType = document.getElementById('business-type-select')?.value;
    if (bizType) {
      try {
        if (typeof applyBusinessTemplate === 'function') await applyBusinessTemplate(bizType);
      } catch (e) { console.warn(e); }
      this.businessTemplate = bizType;
      await DB.setSetting('businessTemplate', bizType);
      await this.loadProfilePack(bizType);
      this.modules = this.profilePack?.modules || (window.BUSINESS_MODULES && window.BUSINESS_MODULES[bizType]) || this.modules;
      await DB.setSetting('modules', this.modules);
      // Persist on company too
      try {
        const co = { ...(this.company || {}), id: 1, businessType: bizType };
        await DB.saveCompany(co);
        this.company = co;
      } catch (e) {}
      this.setupUI();
      this.toast('Business profile applied: ' + (this.profilePack?.name || bizType), 'success');
      this.render();
      return;
    }

    // Persist settings snapshot to localStorage as backup (survives odd IDB clears)
    try {
      localStorage.setItem('saip_settings_v1', JSON.stringify({
        vatEnabled: this.vatEnabled,
        vatRate: this.vatRate,
        template: this.template,
        accent: this.accent,
        theme: this.theme,
        businessTemplate: this.businessTemplate,
        modules: this.modules,
        at: new Date().toISOString()
      }));
    } catch (e) {}

    this.toast('Settings saved', 'success');
    this.render();
  },

  // ========== PDF / PREVIEW / STATUS / SHARE ==========
  doPreview(id, isQuote) {
    const doc = isQuote ? this.byId(this.quotes, id) : this.byId(this.invoices, id);
    if (!doc) return this.toast('Document not found', 'error');
    const client = (typeof this.clientById === 'function' ? this.clientById(doc.clientId) : null) || (this.clients || []).find(c => String(c.id) === String(doc.clientId)) || { name: doc.clientName || 'Client' };
    const paid = Number(doc.amountPaid) || (Array.isArray(doc.payments) ? doc.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0);
    const due = doc.amountDue != null ? Number(doc.amountDue) : Math.max(0, (Number(doc.total) || 0) - paid);
    try {
      if (this._previewUrl) { try { URL.revokeObjectURL(this._previewUrl); } catch (e) {} }
      const payload = {
        ...doc,
        type: isQuote ? 'quote' : 'invoice',
        amountPaid: paid,
        amountDue: due,
        payments: Array.isArray(doc.payments) ? doc.payments : []
      };
      let blob;
      if (typeof generateInvoicePDF === 'function') {
        blob = generateInvoicePDF(payload, this.company, client, {
          returnBlob: true,
          template: this.template || 'classic',
          colour: this.accent || 'green',
          vatEnabled: this.vatEnabled !== false,
          vatRate: this.vatRate || 0.15,
          logoData: this.logoData,
          autoSign: this.pdfAutoSign !== false,
          signName: this.pdfSignName || '',
          signTitle: this.pdfSignTitle || ''
        });
      } else if (typeof previewPDFBlob === 'function') {
        blob = previewPDFBlob(payload, this.company, client, this.template, this.accent, this.vatEnabled, this.logoData);
      } else {
        throw new Error('PDF preview engine not loaded');
      }
      if (!blob || !(blob instanceof Blob)) {
        // some builds return jsPDF doc
        if (blob && typeof blob.output === 'function') blob = blob.output('blob');
        else throw new Error('Preview did not return a PDF blob');
      }
      this._previewUrl = URL.createObjectURL(blob);
      const idLit = typeof id === 'string' ? JSON.stringify(id) : id;
      this.showModal(`
        <div class="p-4 flex flex-col" style="height:85vh;min-height:480px">
          <div class="flex justify-between items-center mb-2 gap-2 flex-wrap">
            <div>
              <h3 class="font-bold text-lg">${doc.number || ''} Preview</h3>
              ${!isQuote ? `<p class="text-xs text-slate-500">Total ${this.formatMoney(doc.total)} · Paid ${this.formatMoney(paid)} · <strong>Due ${this.formatMoney(due)}</strong></p>` : ''}
            </div>
            <div class="flex gap-2">
              <button type="button" class="btn btn-primary" data-action="${isQuote ? 'pdf-quote' : 'pdf-invoice'}" data-id="${doc.id}">Download PDF</button>
              <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            </div>
          </div>
          <iframe src="${this._previewUrl}" title="PDF Preview" class="flex-1 w-full rounded-lg border bg-white"
            style="min-height:400px;background:#fff"></iframe>
        </div>`, true);
      this.bindActions();
    } catch (e) {
      console.error(e);
      this.toast('Preview failed: ' + (e.message || e), 'error');
    }
  },

  doPdf(id, isQuote) {
    const doc = isQuote ? this.byId(this.quotes, id) : this.byId(this.invoices, id);
    if (!doc) return this.toast('Document not found', 'error');
    const client = (this.clients || []).find(c => String(c.id) === String(doc.clientId)) || { name: doc.clientName };
    // Distinct credit note layout
    if (!isQuote && (doc.isCredit || doc.type === 'credit' || String(doc.number || '').startsWith('CN-'))) {
      try {
        this.creditNotePdf(doc, client);
      } catch (e) {
        this.toast(e.message || 'Credit note PDF failed', 'error');
      }
      return;
    }
    if (typeof generateInvoicePDF === 'function') {
      const paid = Number(doc.amountPaid) || (Array.isArray(doc.payments) ? doc.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0);
      const due = doc.amountDue != null ? Number(doc.amountDue) : Math.max(0, (Number(doc.total) || 0) - paid);
      generateInvoicePDF({
        ...doc,
        type: isQuote ? 'quote' : 'invoice',
        amountPaid: paid,
        amountDue: due,
        payments: Array.isArray(doc.payments) ? doc.payments : []
      }, this.company, client, {
        template: this.template, colour: this.accent, vatEnabled: this.vatEnabled, vatRate: this.vatRate, logoData: this.logoData
      });
      this.toast('PDF downloaded', 'success');
    } else {
      this.toast('PDF engine not loaded', 'error');
    }
  },

  creditNotePdf(doc, client) {
    const co = this.company || {};
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    // Red-ish header to distinguish from tax invoice
    pdf.setFillColor(153, 27, 27);
    pdf.rect(0, 0, 210, 28, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text(co.name || 'SA Invoice Pro', 14, 14);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text('CREDIT NOTE', 14, 22);
    pdf.text(String(doc.number || ''), 196, 22, { align: 'right' });

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(10);
    let y = 40;
    pdf.setFont(undefined, 'bold');
    pdf.text('Credit to', 14, y);
    pdf.setFont(undefined, 'normal');
    y += 6;
    pdf.text(String(client?.name || doc.clientName || '—'), 14, y); y += 5;
    if (client?.email) { pdf.text(String(client.email), 14, y); y += 5; }
    y += 3;
    pdf.text('Date: ' + (doc.date || ''), 14, y); y += 5;
    if (doc.creditForInvoiceNumber) {
      pdf.setFont(undefined, 'bold');
      pdf.text('Against invoice: ' + doc.creditForInvoiceNumber, 14, y);
      pdf.setFont(undefined, 'normal');
      y += 8;
    }
    const items = doc.items || [];
    const body = items.map(it => [
      it.description || it.name || '',
      String(it.qty ?? 1),
      'R ' + Number(it.unitPrice || 0).toFixed(2),
      'R ' + Number((it.qty || 1) * (it.unitPrice || 0)).toFixed(2)
    ]);
    if (pdf.autoTable) {
      pdf.autoTable({
        startY: y,
        head: [['Description', 'Qty', 'Unit', 'Line']],
        body: body.length ? body : [['—', '', '', '']],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [153, 27, 27] }
      });
      y = pdf.lastAutoTable.finalY + 10;
    }
    pdf.setFont(undefined, 'bold');
    pdf.text('Credit total: ' + this.formatMoney(doc.total), 14, y);
    y += 8;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);
    const note = doc.notes || 'This credit note reduces the amount payable on the related tax invoice.';
    const lines = pdf.splitTextToSize(note, 180);
    pdf.text(lines, 14, y);
    y += lines.length * 5 + 10;
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text('Not a tax invoice · ' + (typeof APP_COPYRIGHT !== 'undefined' ? APP_COPYRIGHT : 'SA Invoice Pro'), 14, 285);
    pdf.save('CreditNote-' + (doc.number || 'CN') + '.pdf');
    this.toast('Credit note PDF downloaded', 'success');
  },


  async deleteDoc(type, id) {
    if (!confirm('Delete this document?')) return;
    await DB.remove(type==='quote'?DB.STORES.quotes:DB.STORES.invoices, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  changeStatus(type, id) {
    const isQuote = type === 'quote';
    const doc = (isQuote ? this.byId(this.quotes, id) : this.byId(this.invoices, id));
    if (!doc) return this.toast('Document not found', 'error');
    const statuses = isQuote
      ? ['open', 'accepted', 'rejected', 'converted', 'expired']
      : ['draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled', 'credited'];
    this.showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold mb-2">Status – ${doc.number || ''}</h3>
        <p class="text-xs text-slate-500 mb-4">Current: <strong>${doc.status || '—'}</strong>${doc.isCredit ? ' · Credit note' : ''}</p>
        <div class="grid grid-cols-2 gap-2">
          ${statuses.map(s => `<button type="button" class="btn ${doc.status===s?'btn-primary':'btn-outline'} justify-center capitalize" onclick="App.setStatus('${type}',${id},'${s}')">${s}</button>`).join('')}
        </div>
        ${!isQuote ? `<button type="button" class="btn btn-secondary w-full mt-3" onclick="App.closeModal();App.createCreditNote(${id})">Issue credit note</button>` : ''}
        <button type="button" class="btn btn-outline w-full mt-2" onclick="App.closeModal()">Cancel</button>
      </div>`);
  },

  async setStatus(type, id, status) {
    const isQuote = type === 'quote';
    const store = isQuote ? DB.STORES.quotes : DB.STORES.invoices;
    const doc = (isQuote ? this.byId(this.quotes, id) : this.byId(this.invoices, id));
    if (!doc) return this.toast('Document not found', 'error');
    const prev = doc.status;
    if (status === 'partial' && !isQuote) {
      const total = Number(doc.total) || 0;
      const prevPaid = Number(doc.amountPaid) || 0;
      const raw = prompt(
        'Amount paid so far (ZAR). Invoice total: R ' + total.toFixed(2) + (prevPaid ? ' (was R ' + prevPaid.toFixed(2) + ')' : ''),
        String(prevPaid || (total ? (total / 2).toFixed(2) : '0'))
      );
      if (raw === null) return; // cancelled
      const paidAmt = Math.max(0, parseFloat(String(raw).replace(/,/g, '')) || 0);
      if (paidAmt <= 0) return this.toast('Enter a payment amount greater than 0', 'error');
      if (paidAmt >= total && total > 0) {
        status = 'paid';
        doc.amountPaid = total;
        this.toast('Amount covers full total – marking paid', 'info');
      } else {
        doc.amountPaid = paidAmt;
        doc.amountDue = Math.max(0, total - paidAmt);
      }
    }
    doc.status = status;
    if (status === 'paid') {
      doc.paidDate = new Date().toISOString().slice(0, 10);
      doc.amountPaid = Number(doc.total) || doc.amountPaid || 0;
      doc.amountDue = 0;
      if (!isQuote && prev !== 'paid') {
        await this.applyStockForInvoice(doc, -1);
      }
    }
    if (status !== 'paid' && prev === 'paid' && !isQuote) {
      await this.applyStockForInvoice(doc, +1);
      delete doc.paidDate;
    }
    if (status === 'unpaid' || status === 'draft') {
      doc.amountPaid = 0;
      doc.amountDue = Number(doc.total) || 0;
    }
    await DB.put(store, doc);
    await this.loadData();
    this.closeModal();
    this.render();
    const extra = status === 'partial' && doc.amountPaid != null
      ? ' (paid R ' + Number(doc.amountPaid).toFixed(2) + ')'
      : '';
    this.toast('Status → ' + status + extra, 'success');
  },

  async applyStockForInvoice(doc, direction) {
    if (!doc || !Array.isArray(doc.items) || !doc.items.length) return;
    if (direction < 0 && doc.stockApplied) return;
    if (direction > 0 && !doc.stockApplied) return;
    let changed = 0;
    for (const line of doc.items) {
      const pid = line.productId || line.itemId;
      let p = pid ? (this.products || []).find(x => String(x.id) === String(pid)) : null;
      if (!p && line.description) {
        p = (this.products || []).find(x =>
          (x.name || '') === line.description || (x.description || '') === line.description
        );
      }
      if (!p || p.stock == null || p.stock === '') continue;
      const qty = Number(line.qty) || 1;
      const cur = Number(p.stock) || 0;
      p.stock = Math.max(0, direction > 0 ? cur + qty : cur - qty);
      await DB.put(DB.STORES.products, p);
      changed++;
    }
    doc.stockApplied = direction < 0;
    if (changed) {
      this.toast((direction < 0 ? 'Stock reduced' : 'Stock restored') + ' on ' + changed + ' product(s)', 'info');
    }
  },


  async createCreditNote(invoiceId) {
    const inv = this.byId(this.invoices, invoiceId);
    if (!inv) return this.toast('Invoice not found', 'error');
    if (!confirm('Create a credit note from invoice ' + (inv.number || '') + '?')) return;
    try {
      this.toast('Creating credit note…', 'info');
      const number = await DB.getNextNumber('credit');
      const today = new Date().toISOString().slice(0, 10);
      const credit = {
        clientId: inv.clientId,
        clientName: inv.clientName,
        items: (inv.items || []).map(it => ({ ...it })),
        subtotal: inv.subtotal,
        vatAmount: inv.vatAmount,
        total: inv.total,
        notes: (inv.notes || '') + (inv.notes ? '\n' : '') + 'Credit against invoice ' + (inv.number || ''),
        number: number.startsWith('CN') ? number : ('CN-' + number),
        type: 'credit',
        isCredit: true,
        status: 'credited',
        date: today,
        dueDate: today,
        creditForInvoiceId: inv.id,
        creditForInvoiceNumber: inv.number
      };
      await DB.add(DB.STORES.invoices, credit);
      inv.status = 'credited';
      await DB.put(DB.STORES.invoices, inv);
      await this.loadData();
      this.toast('Credit note ' + credit.number + ' created', 'success');
      this.navigate('invoices');
    } catch (e) {
      this.toast(e.message || 'Credit note failed', 'error');
    }
  },


  async convertQuote(id) {
    const quote = this.byId(this.quotes, id);
    if (!quote) return this.toast('Quote not found', 'error');
    if (quote.status === 'converted') {
      return this.toast('This quote was already converted', 'info');
    }
    if (!confirm('Convert quote ' + (quote.number || '') + ' to a tax invoice?\n\nThe quote will be marked as converted.')) return;
    try {
      this.toast('Converting quote…', 'info');
      const number = await DB.getNextNumber('invoice');
      const today = new Date().toISOString().slice(0, 10);
      const due = new Date(); due.setDate(due.getDate() + 30);
      const inv = {
        clientId: quote.clientId,
        clientName: quote.clientName,
        items: quote.items || [],
        subtotal: quote.subtotal,
        vatAmount: quote.vatAmount,
        total: quote.total,
        notes: quote.notes,
        number,
        type: 'invoice',
        status: 'unpaid',
        date: today,
        dueDate: due.toISOString().slice(0, 10),
        fromQuoteId: quote.id,
        fromQuoteNumber: quote.number
      };
      await DB.add(DB.STORES.invoices, inv);
      quote.status = 'converted';
      quote.convertedAt = new Date().toISOString();
      await DB.put(DB.STORES.quotes, quote);
      await this.loadData(true);
      this.toast('Invoice ' + number + ' created from quote ' + (quote.number || ''), 'success');
      this.navigate('invoices');
    } catch (e) {
      this.toast(e.message || 'Convert failed', 'error');
    }
  },


  // ===== Messaging: WhatsApp + Email (sales & tickets) =====
  byId(list, id) {
    if (id == null || !list) return null;
    return list.find(x => String(x.id) === String(id)) || null;
  },

  clientById(id) {
    if (id == null) return null;
    if (!this._clientMap || this._clientMapTs !== (this.clients || []).length) {
      this._clientMap = new Map((this.clients || []).map(c => [String(c.id), c]));
      this._clientMapTs = (this.clients || []).length;
    }
    return this._clientMap.get(String(id)) || (this.clients || []).find(c => String(c.id) === String(id)) || null;
  },

  saPhoneDigits(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0') && d.length === 10) d = '27' + d.slice(1);
    if (d.length === 9 && d[0] === '6' || d.length === 9 && d[0] === '7' || d.length === 9 && d[0] === '8') d = '27' + d;
    return d;
  },

  openWhatsApp(phone, text) {
    const msg = encodeURIComponent(text || '');
    const digits = this.saPhoneDigits(phone);
    const url = digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  openEmail(to, subject, body) {
    const s = encodeURIComponent(subject || '');
    const b = encodeURIComponent(body || '');
    const t = encodeURIComponent((to || '').trim());
    window.location.href = `mailto:${t}?subject=${s}&body=${b}`;
  },

  companySignOff() {
    const co = this.company || {};
    return [co.name, co.phone, co.email].filter(Boolean).join(' · ') || 'SA Invoice Pro';
  },

  shareWhatsApp(id, isQuote) {
    const list = isQuote ? (this.quotes || []) : (this.invoices || []);
    const doc = list.find(x => String(x.id) === String(id));
    if (!doc) return this.toast('Document not found', 'error');
    const client = this.clientById(doc.clientId);
    try { this.doPdf(id, !!isQuote); } catch (e) { console.warn(e); }
    const kind = isQuote ? 'quotation' : 'tax invoice';
    const text = `Hi ${client?.name || 'there'},\n\nPlease find ${kind} *${doc.number || ''}* for ${this.formatMoney(doc.total)}.\n\n${doc.dueDate ? 'Due: ' + this.formatDate(doc.dueDate) + '\n' : ''}Regards,\n${this.companySignOff()}`;
    this.openWhatsApp(client?.phone || client?.mobile || '', text);
    this.toast('WhatsApp opened — attach the PDF if needed', 'success');
  },

  emailDoc(id, isQuote) {
    const list = isQuote ? (this.quotes || []) : (this.invoices || []);
    const doc = list.find(x => String(x.id) === String(id));
    if (!doc) return this.toast('Document not found', 'error');
    const client = this.clientById(doc.clientId);
    try { this.doPdf(id, !!isQuote); } catch (e) {}
    const kind = isQuote ? 'Quotation' : 'Tax Invoice';
    const subject = `${kind} ${doc.number || ''} — ${this.company?.name || 'SA Invoice Pro'}`;
    let body = `Hi ${client?.name || ''},\n\nPlease find ${kind.toLowerCase()} ${doc.number || ''} for ${this.formatMoney(doc.total)}.\n\n`;
    if (!isQuote) body += this.getPaymentInstructions(doc) + '\n\n';
    body += `Kind regards,\n${this.companySignOff()}`;
    if (!client?.email) this.toast('No client email on file — fill recipient in your mail app', 'info');
    this.openEmail(client?.email || '', subject, body);
  },

  shareTicketWhatsApp(id) {
    const t = (this.tickets || []).find(x => String(x.id) === String(id));
    if (!t) return this.toast('Ticket not found', 'error');
    const client = this.clientById(t.clientId);
    const text = `Hi ${client?.name || 'there'},\n\nUpdate on ticket *${t.number || t.id}*: ${t.subject || t.title || 'Support request'}\nStatus: ${(t.status || 'open').toUpperCase()}\n${t.priority ? 'Priority: ' + t.priority + '\n' : ''}\n${t.resolution || t.notes || t.description || ''}\n\nRegards,\n${this.companySignOff()}`;
    this.openWhatsApp(client?.phone || client?.mobile || t.contactPhone || '', text);
    this.toast('WhatsApp ticket message ready', 'success');
  },

  shareTicketEmail(id) {
    const t = (this.tickets || []).find(x => String(x.id) === String(id));
    if (!t) return this.toast('Ticket not found', 'error');
    const client = this.clientById(t.clientId);
    const subject = `Ticket ${t.number || t.id}: ${t.subject || t.title || 'Update'} — ${this.company?.name || ''}`;
    const body = `Hi ${client?.name || ''},\n\nTicket: ${t.number || t.id}\nSubject: ${t.subject || t.title || ''}\nStatus: ${t.status || 'open'}\n\n${t.resolution || t.notes || t.description || ''}\n\nKind regards,\n${this.companySignOff()}`;
    this.openEmail(client?.email || t.contactEmail || '', subject, body);
  },

  shareClientWhatsApp(id) {
    const c = this.clientById(id);
    if (!c) return this.toast('Client not found', 'error');
    const text = `Hi ${c.name || ''},\n\nGreetings from ${this.company?.name || 'us'}.\n\n${this.companySignOff()}`;
    this.openWhatsApp(c.phone || c.mobile || '', text);
  },

  shareClientEmail(id) {
    const c = this.clientById(id);
    if (!c) return this.toast('Client not found', 'error');
    this.openEmail(c.email || '', `Message from ${this.company?.name || 'SA Invoice Pro'}`, `Hi ${c.name || ''},\n\n`);
  },

  paymentReminderWhatsApp(id) {
    const inv = (this.invoices || []).find(x => String(x.id) === String(id));
    if (!inv) return this.toast('Invoice not found', 'error');
    const client = this.clientById(inv.clientId);
    const owed = Math.max(0, (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0));
    const text = `Hi ${client?.name || 'there'},\n\nFriendly reminder: invoice *${inv.number || ''}* has ${this.formatMoney(owed)} outstanding${inv.dueDate ? ' (due ' + this.formatDate(inv.dueDate) + ')' : ''}.\n\nPlease arrange payment at your earliest convenience.\n\n${this.companySignOff()}`;
    this.openWhatsApp(client?.phone || '', text);
    this.toast('Payment reminder opened in WhatsApp', 'success');
  },

  paymentReminderEmail(id) {
    const inv = (this.invoices || []).find(x => String(x.id) === String(id));
    if (!inv) return this.toast('Invoice not found', 'error');
    const client = this.clientById(inv.clientId);
    const owed = Math.max(0, (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0));
    const subject = `Payment reminder: ${inv.number || ''} — ${this.formatMoney(owed)}`;
    const body = `Hi ${client?.name || ''},\n\nThis is a reminder that invoice ${inv.number || ''} has ${this.formatMoney(owed)} outstanding${inv.dueDate ? ' (due ' + this.formatDate(inv.dueDate) + ')' : ''}.\n\nKind regards,\n${this.companySignOff()}`;
    this.openEmail(client?.email || '', subject, body);
  },

  showShareSheet(kind, id) {
    // kind: invoice | quote | ticket | client
    const actions = [];
    if (kind === 'invoice' || kind === 'quote') {
      const isQ = kind === 'quote';
      actions.push({ label: 'WhatsApp', fn: () => this.shareWhatsApp(id, isQ) });
      actions.push({ label: 'Email', fn: () => this.emailDoc(id, isQ) });
      if (kind === 'invoice') {
        actions.push({ label: 'Payment reminder (WA)', fn: () => this.paymentReminderWhatsApp(id) });
        actions.push({ label: 'Payment reminder (Email)', fn: () => this.paymentReminderEmail(id) });
      }
    } else if (kind === 'ticket') {
      actions.push({ label: 'WhatsApp', fn: () => this.shareTicketWhatsApp(id) });
      actions.push({ label: 'Email', fn: () => this.shareTicketEmail(id) });
    } else if (kind === 'client') {
      actions.push({ label: 'WhatsApp', fn: () => this.shareClientWhatsApp(id) });
      actions.push({ label: 'Email', fn: () => this.shareClientEmail(id) });
    }
    if (typeof this.showModal === 'function') {
      this.showModal(`
        <div class="p-5">
          <h3 class="font-bold text-lg mb-3">Share / notify</h3>
          <div class="space-y-2">
            ${actions.map((a, i) => `<button type="button" class="btn btn-outline w-full share-sheet-btn" data-i="${i}">${a.label}</button>`).join('')}
          </div>
          <button type="button" class="btn btn-secondary w-full mt-3" onclick="App.closeModal()">Close</button>
        </div>`);
      document.querySelectorAll('.share-sheet-btn').forEach(btn => {
        btn.onclick = () => { try { actions[Number(btn.dataset.i)].fn(); } catch (e) { this.toast(e.message || 'Share failed', 'error'); } };
      });
    } else {
      actions[0] && actions[0].fn();
    }
  },


  agedDebtorsBuckets() {
    const now = new Date();
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, older: 0, rows: [] };
    for (const inv of (this.invoices || [])) {
      if (inv.status === 'paid' || inv.status === 'cancelled') continue;
      const due = inv.dueDate || inv.date;
      let days = 0;
      if (due) days = Math.floor((now - new Date(due)) / 86400000);
      const total = Number(inv.total) || 0;
      let bucket = 'current';
      if (days > 90) bucket = 'older';
      else if (days > 60) bucket = 'd90';
      else if (days > 30) bucket = 'd60';
      else if (days > 0) bucket = 'd30';
      buckets[bucket] += total;
      const c = (this.clients || []).find(x => String(x.id) === String(inv.clientId));
      buckets.rows.push({
        number: inv.number, client: c?.name || inv.clientName || '',
        due: due || '', days: Math.max(0, days), total, status: inv.status, bucket
      });
    }
    return buckets;
  },

  vatSummary() {
    const inv = this.invoices || [];
    const salesExcl = inv.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const vat = inv.reduce((s, i) => s + (Number(i.vatAmount) || 0), 0);
    const salesIncl = inv.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const paidVat = inv.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.vatAmount) || 0), 0);
    const unpaidVat = inv.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (Number(i.vatAmount) || 0), 0);
    return { salesExcl, vat, salesIncl, paidVat, unpaidVat, rate: this.vatEnabled ? 15 : 0 };
  },

  renderReports() {
    const unpaid = (this.invoices || []).filter(i => i.status !== 'paid' && i.status !== 'cancelled');
    const paid = (this.invoices || []).filter(i => i.status === 'paid');
    const totalOut = unpaid.reduce((s, i) => s + (i.total || 0), 0);
    const totalPaid = paid.reduce((s, i) => s + (i.total || 0), 0);
    const totalInvoiced = (this.invoices || []).reduce((s, i) => s + (i.total || 0), 0);
    const vat = this.vatSummary();
    const aged = this.agedDebtorsBuckets();
    const openT = (this.tickets || []).filter(t => !['closed', 'resolved'].includes(t.status)).length;
    return `
      <div class="page-header">
        <div>
          <h2>Reports &amp; Statistics</h2>
          <p class="subtitle">VAT · aged debtors · bookkeeping overview</p>
        </div>
        <div class="page-actions">
          <button type="button" data-action="send-reminders" class="btn btn-outline">Payment reminders</button>
          <button type="button" data-action="export-excel" class="btn btn-secondary">Export CSV</button>
          <button type="button" data-action="export-report-pdf" class="btn btn-primary">Report PDF</button>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="stat-card"><div class="value text-sa-green">${this.formatMoney(totalOut)}</div><div class="label">Outstanding</div></div>
        <div class="stat-card"><div class="value">${this.formatMoney(totalPaid)}</div><div class="label">Paid</div></div>
        <div class="stat-card"><div class="value">${this.formatMoney(vat.vat)}</div><div class="label">VAT output</div></div>
        <div class="stat-card"><div class="value">${totalInvoiced ? Math.round(totalPaid / totalInvoiced * 100) : 0}%</div><div class="label">Collection rate</div></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card p-5">
          <h3 class="font-bold text-lg mb-3">VAT summary</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between border-b py-2"><span>Sales excl. VAT</span><strong>${this.formatMoney(vat.salesExcl)}</strong></div>
            <div class="flex justify-between border-b py-2"><span>Output VAT</span><strong>${this.formatMoney(vat.vat)}</strong></div>
            <div class="flex justify-between border-b py-2"><span>VAT on paid</span><strong class="text-sa-green">${this.formatMoney(vat.paidVat)}</strong></div>
            <div class="flex justify-between py-2"><span>VAT on outstanding</span><strong>${this.formatMoney(vat.unpaidVat)}</strong></div>
          </div>
          <p class="text-xs text-slate-500 mt-3">Indicative only — confirm with SARS records.</p>
        </div>
        <div class="card p-5">
          <h3 class="font-bold text-lg mb-3">Aged debtors</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="p-2 rounded-lg" style="background:var(--bg-elevated,#f8fafc)"><div class="text-xs text-slate-500">Current</div><div class="font-bold">${this.formatMoney(aged.current)}</div></div>
            <div class="p-2 rounded-lg" style="background:var(--bg-elevated,#f8fafc)"><div class="text-xs text-slate-500">1–30 days</div><div class="font-bold">${this.formatMoney(aged.d30)}</div></div>
            <div class="p-2 rounded-lg bg-amber-50"><div class="text-xs text-slate-500">31–60</div><div class="font-bold">${this.formatMoney(aged.d60)}</div></div>
            <div class="p-2 rounded-lg bg-orange-50"><div class="text-xs text-slate-500">61–90</div><div class="font-bold">${this.formatMoney(aged.d90)}</div></div>
            <div class="p-2 rounded-lg bg-red-50 col-span-2"><div class="text-xs text-slate-500">90+ days</div><div class="font-bold">${this.formatMoney(aged.older)}</div></div>
          </div>
          <p class="text-xs text-slate-500 mt-2">${openT} open ticket(s) · ${this.invoices.length} invoice(s)</p>
        </div>
      </div>
      <div class="card p-5 overflow-x-auto">
        <h3 class="font-bold mb-3">Outstanding invoices</h3>
        ${aged.rows.length ? `<table class="w-full text-sm"><thead><tr>
          <th class="text-left p-2">Invoice</th><th class="text-left p-2">Client</th><th class="text-left p-2">Due</th>
          <th class="text-right p-2">Days</th><th class="text-right p-2">Total</th><th class="text-left p-2">Age</th>
        </tr></thead><tbody>
          ${aged.rows.sort((x,y)=>y.days-x.days).map(r=>`<tr class="border-t">
            <td class="p-2">${r.number||''}</td><td class="p-2">${r.client}</td><td class="p-2">${r.due}</td>
            <td class="p-2 text-right">${r.days}</td><td class="p-2 text-right">${this.formatMoney(r.total)}</td>
            <td class="p-2">${r.bucket}</td></tr>`).join('')}
        </tbody></table>` : '<p class="text-slate-400 text-sm">No outstanding invoices</p>'}
      </div>
      ${(() => {
        const exp = this.expenses || [];
        if (!exp.length) return '';
        const byCat = {};
        for (const e of exp) {
          const cat = (e.category || e.type || 'Uncategorised').trim() || 'Uncategorised';
          byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
        }
        const rows = Object.entries(byCat).sort((x, y) => y[1] - x[1]);
        const totalE = rows.reduce((s, r) => s + r[1], 0);
        return `
      <div class="card p-5 mt-6">
        <h3 class="font-bold mb-3">Expense by category</h3>
        <div class="space-y-2 text-sm">
          ${rows.map(([cat, amt]) => `
            <div class="flex justify-between border-b py-2">
              <span>${cat}</span>
              <strong>${this.formatMoney(amt)}</strong>
            </div>`).join('')}
          <div class="flex justify-between py-2 font-bold">
            <span>Total expenses</span>
            <span>${this.formatMoney(totalE)}</span>
          </div>
        </div>
      </div>`;
      })()}
`;
  },

  exportReportPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const paid = (this.invoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const out = (this.invoices || []).filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0);
    const vat = this.vatSummary();
    const aged = this.agedDebtorsBuckets();
    doc.setFontSize(16);
    doc.text(this.company?.name || 'SA Invoice Pro', 14, 20);
    doc.setFontSize(12);
    doc.text('Business Report', 14, 28);
    doc.setFontSize(10);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-ZA'), 14, 36);
    doc.text('Outstanding: R ' + out.toFixed(2), 14, 48);
    doc.text('Paid: R ' + paid.toFixed(2), 14, 56);
    doc.text('VAT output: R ' + vat.vat.toFixed(2) + ' (paid R ' + vat.paidVat.toFixed(2) + ')', 14, 64);
    doc.text('Aged Current R ' + aged.current.toFixed(2) + ' | 30 R ' + aged.d30.toFixed(2) + ' | 60 R ' + aged.d60.toFixed(2) + ' | 90 R ' + aged.d90.toFixed(2) + ' | 90+ R ' + aged.older.toFixed(2), 14, 72);
    if (aged.rows.length && doc.autoTable) {
      doc.autoTable({
        startY: 82,
        head: [['Invoice', 'Client', 'Due', 'Days', 'Total', 'Bucket']],
        body: aged.rows.sort((x, y) => y.days - x.days).map(r => [
          r.number, r.client, r.due, String(r.days), 'R ' + r.total.toFixed(2), r.bucket
        ]),
        styles: { fontSize: 8 }
      });
    }
    doc.save('SA-Report-' + new Date().toISOString().slice(0, 10) + '.pdf');
    this.toast('Report PDF downloaded');
  },

  // ========== RECURRING ==========
  async generateRecurring() {
    const recurring = this.invoices.filter(i => i.recurring && i.status !== 'cancelled');
    if (recurring.length === 0) return this.toast('No recurring invoices set up. Edit an invoice and enable Recurring.', 'error');
    const monthKey = new Date().toISOString().slice(0, 7);
    let created = 0, skipped = 0;
    for (const inv of recurring) {
      if (inv.lastRecurringMonth === monthKey) { skipped++; continue; }
      // Avoid duplicate if same client+amount already exists this month as unpaid child
      const already = this.invoices.some(x =>
        x.id !== inv.id && x.clientId === inv.clientId &&
        (x.date || '').startsWith(monthKey) &&
        Math.abs((x.total || 0) - (inv.total || 0)) < 0.01 &&
        x.status !== 'cancelled' && x.parentRecurringId === inv.id
      );
      if (already) { skipped++; continue; }
      const number = await DB.getNextNumber('invoice');
      const next = {
        clientId: inv.clientId, clientName: inv.clientName, items: inv.items,
        subtotal: inv.subtotal, vatAmount: inv.vatAmount, total: inv.total,
        notes: inv.notes, recurring: false, parentRecurringId: inv.id,
        number, date: new Date().toISOString().slice(0, 10), status: 'unpaid',
        dueDate: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })()
      };
      await DB.add(DB.STORES.invoices, next);
      inv.lastRecurringMonth = monthKey;
      await DB.put(DB.STORES.invoices, inv);
      created++;
    }
    await this.loadData(); this.render();
    this.toast(`Recurring: ${created} created` + (skipped ? `, ${skipped} skipped (already this month)` : ''));
  },

  async sendPaymentReminders() {
    const aged = this.agedDebtorsBuckets();
    const overdue = aged.rows.filter(r => r.days > 0);
    if (!overdue.length) return this.toast('No overdue invoices');
    const lines = overdue.map(r =>
      `${r.number} · ${r.client} · ${this.formatMoney(r.total)} · ${r.days} days overdue`
    ).join('%0A');
    const subject = encodeURIComponent('Payment reminder — ' + (this.company?.name || 'SA Invoice Pro'));
    const body = encodeURIComponent(
      'Dear Client,\n\nPlease find overdue invoices:\n\n' +
      overdue.map(r => `- ${r.number} (${r.client}): ${this.formatMoney(r.total)}, ${r.days} days overdue`).join('\n') +
      '\n\nKindly arrange payment.\n\n' + (this.company?.name || '')
    );
    // Open mail client with summary; user can edit recipients
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    this.toast('Mail client opened with ' + overdue.length + ' overdue item(s)');
  },

  // ========== DOC MODAL ==========
  async showDocModal(type, id=null) {
    const isQuote = type === 'quote';
    let doc = id ? (isQuote ? this.quotes.find(q => String(q.id) === String(id)) : this.invoices.find(i => String(i.id) === String(id))) : null;
    const number = doc?.number || await DB.getNextNumber(type);
    const today = new Date().toISOString().slice(0,10);
    const due = new Date(); due.setDate(due.getDate()+30);
    const items = doc?.items || [{description:'', qty:1, unitPrice:0}];
    const allItems = [...this.products.map(p=>({...p,kind:'product'})), ...this.services.map(s=>({...s,kind:'service'}))];

    this.showModal(`
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">${id?'Edit':'New'} ${isQuote?'Quote':'Tax Invoice'}</h3>
          <button onclick="App.closeModal()" class="p-2"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="invoice-form" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label class="label">Number</label><input name="number" class="input" value="${number}" readonly /></div>
            <div><label class="label">Date *</label><input name="date" type="date" class="input" value="${doc?.date||today}" required /></div>
            <div><label class="label">Due Date</label><input name="dueDate" type="date" class="input" value="${doc?.dueDate||due.toISOString().slice(0,10)}" /></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="label">Client *</label>
              <div class="flex gap-2">
                <select name="clientId" class="input flex-1" required>
                  <option value="">— Select —</option>
                  ${this.clients.map(c=>`<option value="${c.id}" ${doc?.clientId==c.id?'selected':''}>${c.name}</option>`).join('')}
                </select>
                <button type="button" class="btn btn-secondary" onclick="App.showClientModal()" title="Add client"><i data-lucide="user-plus" class="w-4 h-4"></i></button>
              </div>
            </div>
            <div><label class="label">Reference / PO</label><input name="reference" class="input" value="${doc?.reference||''}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Payment Terms</label>
              <select name="paymentTerms" class="input">${['','30 days','14 days','COD','Immediate','EOM'].map(t=>`<option value="${t}" ${doc?.paymentTerms===t?'selected':''}>${t||'—'}</option>`).join('')}</select>
            </div>
            <div><label class="label">COD?</label>
              <select name="cod" class="input"><option value="false" ${!doc?.cod?'selected':''}>No</option><option value="true" ${doc?.cod?'selected':''}>Yes</option></select>
            </div>
          </div>
          ${!isQuote ? `<div class="grid grid-cols-2 gap-3">
            <div><label class="label">Recurring Invoice?</label>
              <select name="recurring" class="input"><option value="false" ${!doc?.recurring?'selected':''}>No</option><option value="true" ${doc?.recurring?'selected':''}>Yes</option></select>
            </div>
            <div><label class="label">Interval</label>
              <select name="recurringInterval" class="input">
                <option value="monthly" ${doc?.recurringInterval==='monthly'?'selected':''}>Monthly</option>
                <option value="weekly" ${doc?.recurringInterval==='weekly'?'selected':''}>Weekly</option>
                <option value="yearly" ${doc?.recurringInterval==='yearly'?'selected':''}>Yearly</option>
              </select>
            </div>
          </div>` : ''}
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="label mb-0">Line Items</label>
              <div class="flex gap-2">
                <button type="button" class="btn btn-secondary text-xs" onclick="App.showItemModal('product')"><i data-lucide="package" class="w-3 h-3"></i> Product</button>
                <button type="button" class="btn btn-secondary text-xs" onclick="App.showItemModal('service')"><i data-lucide="wrench" class="w-3 h-3"></i> Service</button>
                <button type="button" class="btn btn-secondary text-xs" onclick="App.addLineItem()"><i data-lucide="plus" class="w-3 h-3"></i> Line</button>
              </div>
            </div>
            <div id="line-items" class="space-y-2">${items.map((it,idx)=>this.renderLineItem(it,idx,allItems)).join('')}</div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label class="label">Discount (R)</label><input name="discount" type="number" step="0.01" min="0" class="input" value="${doc?.discount||0}" onchange="App.recalcTotals()" /></div>
            <div class="sm:col-span-2"><label class="label">Notes</label><textarea name="notes" class="input" rows="2">${doc?.notes||''}</textarea>
      ${!isQuote && doc && doc.id ? `
      <div id="doc-payments-panel" class="card p-3 bg-slate-50 border border-slate-200 rounded-lg mt-2">
        <div class="font-semibold text-sm mb-1">Payments on this invoice</div>
        <p class="text-xs text-slate-500 mb-2">Use <strong>⋯ → Payments</strong> on the invoice list to record payments. They appear on the PDF as Amount paid + Balance due.</p>
        <div class="text-sm">Total: <strong>${this.formatMoney(doc.total||0)}</strong>
         · Paid: <strong class="text-emerald-700">${this.formatMoney(doc.amountPaid||0)}</strong>
         · Due: <strong class="text-amber-700">${this.formatMoney(doc.amountDue!=null?doc.amountDue:Math.max(0,(doc.total||0)-(doc.amountPaid||0)))}</strong></div>
        ${(doc.payments||[]).length ? `<ul class="text-xs mt-2 space-y-1">${(doc.payments||[]).map(p=>`<li>${(p.at||'').toString().slice(0,10)} · ${this.formatMoney(p.amount)} ${p.note?('· '+p.note):''}</li>`).join('')}</ul>` : '<p class="text-xs text-slate-400 mt-1">No payments recorded yet.</p>'}
      </div>` : ''}
</div>
          </div>
          ${id ? `<div><label class="label">Status</label>
            <select name="status" class="input">${(isQuote?['open','accepted','rejected','converted','expired']:['draft','unpaid','paid','overdue','cancelled']).map(s=>`<option value="${s}" ${doc.status===s?'selected':''}>${s}</option>`).join('')}</select></div>` : ''}
          <div class="bg-slate-50 rounded-lg p-4 flex flex-wrap gap-6 justify-end text-sm">
            <div>Subtotal: <strong id="disp-subtotal">R 0.00</strong></div>
            ${this.vatEnabled?`<div>VAT: <strong id="disp-vat">R 0.00</strong></div>`:'<div class="text-slate-400">VAT off</div>'}
            <div class="text-lg">Total: <strong id="disp-total" class="text-sa-green">R 0.00</strong></div>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.saveDoc(${id||'null'},'${type}')"><i data-lucide="save" class="w-4 h-4"></i> Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`, true);

    setTimeout(() => {
      this.recalcTotals();
      document.querySelectorAll('.product-select').forEach(sel => {
        sel.onchange = (e) => {
          const opt = e.target.selectedOptions[0];
          if (opt?.dataset.price) {
            const row = e.target.closest('.line-item-row');
            row.querySelector('.item-price').value = opt.dataset.price;
            row.querySelector('.item-desc').value = opt.dataset.desc || opt.text;
            this.recalcTotals();
          }
        };
      });
      document.querySelectorAll('.item-qty, .item-price').forEach(inp => inp.oninput = () => this.recalcTotals());
    }, 50);
  },

  renderLineItem(item, idx, allItems=[]) {
    const items = allItems.length ? allItems : [...this.products, ...this.services];
    return `
      <div class="line-item-row border rounded-lg p-2" data-idx="${idx}">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
          <div class="sm:col-span-5">
            <select class="input product-select text-sm mb-1">
              <option value="">— Select or type —</option>
              ${items.map(p=>`<option value="${p.id}" data-price="${p.unitPrice}" data-desc="${(p.description||p.name||'').replace(/"/g,'&quot;')}">${p.name}${p.kind?` (${p.kind})`:''}</option>`).join('')}
            </select>
            <input type="text" class="input item-desc text-sm" placeholder="Description" value="${(item.description||'').replace(/"/g,'&quot;')}" />
          </div>
          <div class="sm:col-span-2"><input type="number" class="input item-qty text-sm" min="0.01" step="0.01" value="${item.qty||1}" /></div>
          <div class="sm:col-span-2"><input type="number" class="input item-price text-sm" min="0" step="0.01" value="${item.unitPrice||0}" /></div>
          <div class="sm:col-span-2 flex items-center justify-end font-medium text-sm item-amount">${this.formatMoney((item.qty||1)*(item.unitPrice||0))}</div>
          <div class="sm:col-span-1 flex justify-end">
            <button type="button" class="btn btn-outline p-1.5 text-red-500" onclick="this.closest('.line-item-row').remove(); App.recalcTotals();"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </div>
      </div>`;
  },

  addLineItem() {
    const container = document.getElementById('line-items');
    const allItems = [...this.products.map(p=>({...p,kind:'product'})), ...this.services.map(s=>({...s,kind:'service'}))];
    const div = document.createElement('div');
    div.innerHTML = this.renderLineItem({description:'',qty:1,unitPrice:0}, container.children.length, allItems);
    container.appendChild(div.firstElementChild);
    if (typeof lucide !== 'undefined') { try { lucide.createIcons(); } catch (e) {} }
    const row = container.lastElementChild;
    row.querySelector('.product-select').onchange = (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt?.dataset.price) {
        row.querySelector('.item-price').value = opt.dataset.price;
        row.querySelector('.item-desc').value = opt.dataset.desc || opt.text;
        this.recalcTotals();
      }
    };
    row.querySelectorAll('.item-qty, .item-price').forEach(inp => inp.oninput = () => this.recalcTotals());
  },

  recalcTotals() {
    let subtotal = 0;
    document.querySelectorAll('.line-item-row').forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty')?.value)||0;
      const price = parseFloat(row.querySelector('.item-price')?.value)||0;
      const amount = qty * price;
      subtotal += amount;
      const el = row.querySelector('.item-amount');
      if (el) el.textContent = this.formatMoney(amount);
    });
    const discount = parseFloat(document.querySelector('[name="discount"]')?.value)||0;
    const taxable = Math.max(0, subtotal - discount);
    const vat = this.vatEnabled ? taxable * this.vatRate : 0;
    const total = taxable + vat;
    document.getElementById('disp-subtotal').textContent = this.formatMoney(subtotal);
    const vatEl = document.getElementById('disp-vat');
    if (vatEl) vatEl.textContent = this.formatMoney(vat);
    document.getElementById('disp-total').textContent = this.formatMoney(total);
  },

  async saveDoc(id, type) {
    const form = document.getElementById('invoice-form');
    const data = Object.fromEntries(new FormData(form));
    if (!data.clientId) return this.toast('Select a client','error');
    const items = [];
    document.querySelectorAll('.line-item-row').forEach(row => {
      const desc = row.querySelector('.item-desc')?.value || '';
      const qty = parseFloat(row.querySelector('.item-qty')?.value)||0;
      const price = parseFloat(row.querySelector('.item-price')?.value)||0;
      if (desc || price > 0) items.push({description:desc, qty, unitPrice:price});
    });
    if (items.length===0) return this.toast('Add at least one line item','error');

    const subtotal = items.reduce((s,i)=>s+i.qty*i.unitPrice,0);
    const discount = parseFloat(data.discount)||0;
    const taxable = Math.max(0, subtotal-discount);
    const vatAmount = this.vatEnabled ? taxable * this.vatRate : 0;
    const total = taxable + vatAmount;
    const client = this.clients.find(c=>c.id==data.clientId);

    // Stock reduction for products on invoices
    if (type === 'invoice' && !id) {
      for (const item of items) {
        const prod = this.products.find(p => p.name === item.description || (item.description||'').includes(p.name));
        if (prod && prod.stock != null) {
          prod.stock = Math.max(0, (prod.stock||0) - item.qty);
          await DB.put(DB.STORES.products, prod);
        }
      }
    }

    const record = {
      number: data.number, date: data.date, dueDate: data.dueDate||null,
      clientId: Number(data.clientId), clientName: client?.name||'',
      reference: data.reference||'', notes: data.notes||'',
      paymentTerms: data.paymentTerms||'', cod: data.cod==='true',
      recurring: data.recurring==='true', recurringInterval: data.recurringInterval||'monthly',
      items, discount, subtotal, vatAmount, total,
      status: data.status || (type==='quote'?'open':'unpaid'), type
    };

    const store = type==='quote' ? DB.STORES.quotes : DB.STORES.invoices;
    if (id) { record.id=id; await DB.put(store, record); }
    else await DB.add(store, record);
    await this.loadData(); this.closeAllModals();
    this.navigate(type==='quote'?'quotes':'invoices');
    this.toast(type==='quote'?'Quote saved':'Invoice saved');
  },



  filterList(type) {
    this.navigate(type === 'quote' ? 'quotes' : 'invoices');
  },

  setDocFilter(type, status) {
    if (type === 'quote') this.quoteFilter = status;
    else this.invoiceFilter = status;
    this.render();
  },

  searchDocs(type, q) {
    this.docSearch = (q || '').toLowerCase();
    this.render();
  },

  
  renderLicense() {
    const st = this.licenseStatus || (window.License && License.getStatus()) || { mode:'unlicensed', label:'…', canUse:false };
    const hwid = (window.License && License.hwid) || '';
    const handshakeOk = !!(window.License && License.handshakeOk);
    const pendingKey = (window.License && License.pendingKey) || '';
    const serverMsg = (window.License && License.serverMessage) || '';
    const canRequest = handshakeOk && !!hwid;
    const canActivate = !!pendingKey && handshakeOk;
    const serverUrl = (this._serverUrls && this._serverUrls.license) || (window.SA_CONFIG && SA_CONFIG.defaultLicenseServerUrl) || '';
    return `
      <div class="page-header">
        <div>
          <h2>License</h2>
          <p class="subtitle">Automatic server · no URL typing needed</p>
        </div>
      </div>
      <div class="card p-5 max-w-3xl space-y-4">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between border-b py-2"><span>Status</span>
            <strong class="${st.mode==='licensed'?'text-sa-green':'text-amber-600'}">${st.label}</strong></div>
          <div class="flex justify-between border-b py-2"><span>Hardware ID</span>
            <strong class="font-mono text-xs">${hwid || '—'}</strong></div>
          <div class="flex justify-between border-b py-2"><span>Handshake</span>
            <strong class="${handshakeOk?'text-sa-green':''}">${handshakeOk?'Connected':'Not yet'}</strong></div>
          <div class="flex justify-between py-2"><span>Server</span>
            <span class="text-xs text-right max-w-xs truncate">${serverMsg || serverUrl || 'Using config.js URL'}</span></div>
        </div>

        <div class="flex flex-col gap-2">
          <button type="button" class="btn btn-primary w-full" data-action="get-hwid">Handshake</button>
          <button type="button" class="btn ${canRequest?'btn-primary':'btn-secondary'} w-full" data-action="license-request-refresh"
            ${canRequest?'':'disabled style="opacity:0.45;cursor:not-allowed"'}>
            Request license &amp; auto-refresh
          </button>
          <p class="text-xs text-slate-500">After request, status refreshes every 1 minute until a key is ready or you leave this page.</p>
        </div>

        <label class="label">Server-issued key</label>
        <input id="license-key-input" class="input mb-2 font-mono text-sm" readonly
          value="${pendingKey || ''}" placeholder="Appears when vendor issues a key" />
        <button type="button" class="btn ${canActivate?'btn-primary':'btn-secondary'} w-full" data-action="activate-license"
          ${canActivate?'':'disabled style="opacity:0.45;cursor:not-allowed"'}>
          Activate
        </button>
        <button type="button" class="btn btn-secondary w-full mt-2" data-action="show-pricing">View plans &amp; prices (ZAR)</button>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button type="button" class="btn btn-outline btn-sm" data-action="export-license-file">Export offline license</button>
          <button type="button" class="btn btn-outline btn-sm" data-action="import-license-file">Import license file</button>
        </div>
        <p class="text-xs text-slate-400 mt-2">License is saved in browser storage and localStorage. Export a file for desktop backup / Android Downloads. Stays valid offline until expiry.</p>
      </div>`;
  },

  async doGetHwid() {
    try {
      this.toast('Connecting to license server…', 'info');
      await this.applyCloudDefaults();
      let serverUrl = (this._serverUrls && this._serverUrls.license) || '';
      if (!serverUrl) serverUrl = await License.getServerUrl();
      if (!serverUrl && window.SA_CONFIG && SA_CONFIG.defaultLicenseServerUrl) {
        serverUrl = String(SA_CONFIG.defaultLicenseServerUrl).replace(/\/$/, '');
        await DB.setSetting('licenseServerUrl', serverUrl);
      }
      if (!serverUrl) {
        this.toast('No license server URL in config.js', 'error');
        this.render();
        return;
      }
      this.toast('Server: ' + serverUrl, 'info');
      await License.getHardwareId();
      await License.handshake();
      this.licenseStatus = License.getStatus();
      this.toast(License.serverMessage || 'Handshake OK', 'success');
      this.render();
    } catch (e) {
      this.toast(e.message || 'Handshake failed – is the server running?', 'error');
      this.render();
    }
  },

  async doLicenseRequestAndRefresh() {
    this.toast('Requesting license from server…', 'info');
    try {
      await this.applyCloudDefaults();
      if (!License.handshakeOk) {
        this.toast('Running handshake first…', 'info');
        await this.doGetHwid();
      }
      if (!License.handshakeOk) throw new Error('Handshake required first');
      const data = await License.requestLicense('T');
      this.toast(data.message || 'Request sent – approve on server', 'success');
      if (data.key) {
        License.pendingKey = data.key;
        await DB.setSetting('pendingLicenseKey', data.key);
        this.toast('Key received – tap Activate', 'success');
      } else {
        try { await License.claimKey(); } catch (_) {}
        if (License.pendingKey) this.toast('Key claimed – Activate now', 'success');
        else this.toast('Waiting for vendor to issue key (auto-refresh 60s)', 'info');
      }
      this.licenseStatus = License.getStatus();
      this.render();
      this.startLicensePoll();
    } catch (e) {
      this.toast(e.message || 'Request failed', 'error');
      this.render();
    }
  },

  startLicensePoll() {
    if (this._licensePoll) clearInterval(this._licensePoll);
    this._licensePoll = setInterval(async () => {
      if (this.currentPage !== 'license') {
        clearInterval(this._licensePoll);
        this._licensePoll = null;
        return;
      }
      try {
        await License.claimKey();
        this.licenseStatus = License.getStatus();
        if (License.pendingKey) {
          this.toast('License key received – tap Activate', 'success');
          clearInterval(this._licensePoll);
          this._licensePoll = null;
        }
        this.render();
      } catch (e) {}
    }, 60000);
  },

  async doLicenseRequest() {
    try {
      if (!License.handshakeOk) throw new Error('Get HWID / handshake first');
      const data = await License.requestLicense('T');
      this.toast(data.message || 'Request sent');
      if (data.key) {
        License.pendingKey = data.key;
        await DB.setSetting('pendingLicenseKey', data.key);
      } else {
        try { await License.claimKey(); } catch (_) {}
      }
      this.licenseStatus = License.getStatus();
      this.render();
    } catch (e) {
      this.toast(e.message || 'Request failed', 'error');
    }
  },

  async doLicenseClaim() {
    try {
      await License.claimKey();
      this.toast('Key received – click Activate');
      this.render();
    } catch (e) {
      this.toast(e.message || 'No key yet – approve on server first', 'error');
      this.render();
    }
  },

  async doServerActivate() {
    try {
      await License.activateWithServer();
      try {
        if (License.licenseKey && License.licenseMeta) {
          await License.persistOfflineLicense(License.licenseKey, License.licenseMeta);
          License.exportLicenseFile();
        }
      } catch (e2) {}
      this.licenseStatus = License.getStatus();
      this.setupUI();
      this.toast('Activation successful – offline copy saved', 'success');
      this.render();
    } catch (e) {
      this.toast(e.message || 'Activation failed', 'error');
    }
  },


  async savePayFastSettings() {
    const id = document.getElementById('pf-merchant-id')?.value || '';
    const key = document.getElementById('pf-merchant-key')?.value || '';
    const pass = document.getElementById('pf-passphrase')?.value || '';
    const sandbox = !!document.getElementById('pf-sandbox')?.checked;
    if (!window.PayFast) return this.toast('PayFast module missing', 'error');
    await PayFast.saveConfig({ merchantId: id, merchantKey: key, passphrase: pass, sandbox });
    this.toast('PayFast settings saved', 'success');
  },

  async fillPayFastForm() {
    if (!window.PayFast) return '';
    const c = await PayFast.getConfig();
    return `
      <div class="card p-4 mb-4 form-shell">
        <div class="form-section-title">PayFast payments</div>
        <p class="text-xs text-slate-500 mb-3">Sandbox: use credentials from sandbox.payfast.co.za. Live: only after verification. Settlement goes to your linked Capitec account.</p>
        <div class="form-grid">
          <div class="field"><label class="label">Merchant ID</label><input id="pf-merchant-id" class="input" value="${(c.merchantId||'').replace(/"/g,'&quot;')}" placeholder="10055207" /></div>
          <div class="field"><label class="label">Merchant Key</label><input id="pf-merchant-key" class="input" value="${(c.merchantKey||'').replace(/"/g,'&quot;')}" placeholder="••••••••" /></div>
          <div class="field span-2"><label class="label">Salt passphrase</label><input id="pf-passphrase" class="input" type="password" value="${(c.passphrase||'').replace(/"/g,'&quot;')}" placeholder="Your sandbox passphrase" /></div>
        </div>
        <label class="flex items-center gap-2 text-sm mt-3"><input type="checkbox" id="pf-sandbox" ${c.sandbox !== false ? 'checked' : ''}/> Sandbox mode (test money)</label>
        <button type="button" class="btn btn-primary mt-3" data-action="save-payfast">Save PayFast settings</button>
      </div>`;
  },


  async renderPaymentsPage() {
    try { if (window.License) await License.pullRemoteConfig(); } catch (e) {}

    const form = await this.fillPayFastForm();
    return `
      <div class="page-header"><div><h2>Payments</h2><p class="subtitle">PayFast + Capitec EFT</p></div>
        <div class="page-actions"><button type="button" class="btn btn-outline" data-action="go-settings">Settings</button></div></div>
      ${form}
      <div class="card p-4">
        <h3 class="font-bold mb-2">How testing works</h3>
        <ol class="text-sm text-slate-600 list-decimal pl-5 space-y-1">
          <li>Paste sandbox Merchant ID, Key, and passphrase from sandbox.payfast.co.za</li>
          <li>Keep <strong>Sandbox mode</strong> on</li>
          <li>Open an unpaid invoice → <strong>EFT</strong> → <strong>Pay with PayFast</strong></li>
          <li>Complete the sandbox payment (test wallet)</li>
          <li>You return to the app; confirm under PayFast → Transactions, then record payment on the invoice</li>
        </ol>
      </div>`;
  },

  async saveLicenseServerUrl() {
    const input = document.getElementById('license-server-url');
    const url = (input?.value || '').trim().replace(/\/$/, '');
    await DB.setSetting('licenseServerUrl', url);
    this.toast(url ? 'Server URL saved' : 'Server URL cleared');
    if (url && window.License) {
      try {
        await License.connectWithRetries(3);
        this.toast(License.serverMessage || 'Connected');
      } catch (e) {
        this.toast(e.message || 'Could not reach server', 'error');
      }
    }
    this.licenseStatus = License.getStatus();
    this.render();
  },



  // ===== Restored: updates, backup, companies, plans =====
  planAllows(feature) {
    const st = this.licenseStatus || {};
    if (st.canUse === false) {
      const demoOk = ['clients','invoices','quotes','home','dashboard','settings','about','license','documents','backup'];
      return demoOk.includes(feature);
    }
    const plan = (st.plan || 'T').toString().toUpperCase().charAt(0);
    const flags = {
      T: { payroll:false, popia:true, reports:true, recurring:false, multiCompany:false },
      S: { payroll:true, popia:true, reports:true, recurring:true, multiCompany:false },
      P: { payroll:true, popia:true, reports:true, recurring:true, multiCompany:true },
      E: { payroll:true, popia:true, reports:true, recurring:true, multiCompany:true },
      L: { payroll:true, popia:true, reports:true, recurring:true, multiCompany:true }
    };
    const f = flags[plan] || flags.T;
    if (feature in f) return f[feature];
    return true;
  },

  async applyCloudDefaults() {
    try {
      const cfg = window.SA_CONFIG || {};
      const dLic = (cfg.defaultLicenseServerUrl || '').trim().replace(/\/$/, '');
      const dUpd = (cfg.defaultUpdateServerUrl || '').trim().replace(/\/$/, '');
      let lic = ((await DB.getSetting('licenseServerUrl', '')) || '').trim().replace(/\/$/, '');
      let upd = ((await DB.getSetting('updateServerUrl', '')) || '').trim().replace(/\/$/, '');
      // config.js wins when set (deployed cloud URLs)
      if (dLic) { lic = dLic; await DB.setSetting('licenseServerUrl', lic); }
      if (dUpd) { upd = dUpd; await DB.setSetting('updateServerUrl', upd); }
      const host = (location.hostname || '');
      if (!lic && (host === 'localhost' || host === '127.0.0.1')) {
        lic = 'http://127.0.0.1:5055';
        await DB.setSetting('licenseServerUrl', lic);
      }
      if (!upd && (host === 'localhost' || host === '127.0.0.1')) {
        upd = 'http://127.0.0.1:5056';
        await DB.setSetting('updateServerUrl', upd);
      }
      this._serverUrls = { license: lic, update: upd };
    } catch (e) { console.warn('applyCloudDefaults', e); }
  },

  async checkMandatoryUpdate() {
    const url = (await DB.getSetting('updateServerUrl', '') || '').replace(/\/$/, '');
    if (!url) return false;
    try {
      const res = await Promise.race([
        fetch(url + '/api/latest', { cache: 'no-store' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]);
      if (!res.ok) return false;
      const data = await res.json();
      this._updateInfo = data;
      if (data.mandatory && data.version && data.version !== APP_VERSION) {
        // Non-blocking notice only — never freeze login
        this.toast('Update available: ' + data.version, 'info');
        return false;
      }
    } catch (e) {}
    return false;
  },

  async installUpdateNow() {
    const updateServerUrl = (await DB.getSetting('updateServerUrl', '') || '').replace(/\/$/, '');
    if (!updateServerUrl) {
      this.toast('Set Update server URL in About first', 'error');
      return;
    }
    const info = this._updateInfo || {};
    try {
      const probe = await Promise.race([
        fetch('http://127.0.0.1:8080/api/self-update/status'),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
      ]);
      if (!probe.ok) throw new Error('no launcher');
    } catch (e) {
      this.showModal(`
        <div class="p-6 max-w-md">
          <h3 class="text-xl font-bold mb-2">Launcher required</h3>
          <p class="text-sm text-slate-600 mb-3">Auto-install only works when the app is started with <strong>Start-SA-Invoice.bat</strong>.</p>
          <p class="text-sm mb-3">Or double-click <strong>Apply-Update-Now.bat</strong> in the app folder (uses the same update server URL from config).</p>
          ${info.downloadUrl?`<a class="btn btn-primary w-full text-center" href="${info.downloadUrl}" target="_blank">Manual ZIP download</a>`:''}
          <button type="button" class="btn btn-outline w-full mt-2" onclick="App.closeModal()">OK</button>
        </div>`);
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:8080/api/self-update/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateServerUrl, downloadUrl: info.downloadUrl || '' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('HTTP ' + res.status));
      }
      this.closeModal();
      this.showModal(`
        <div class="p-6 max-w-md">
          <h3 class="text-xl font-bold mb-2">Updating…</h3>
          <p class="text-sm text-slate-600 mb-2" id="upd-msg">Starting…</p>
          <div class="w-full bg-slate-200 rounded-full h-3 mb-3"><div id="upd-bar" class="bg-sa-green h-3 rounded-full" style="width:5%"></div></div>
        </div>`);
      const poll = async () => {
        try {
          const s = await fetch('http://127.0.0.1:8080/api/self-update/status').then(r => r.json());
          const msg = document.getElementById('upd-msg');
          const bar = document.getElementById('upd-bar');
          if (msg) msg.textContent = s.message || s.state;
          if (bar) bar.style.width = (s.progress || 0) + '%';
          if (s.state === 'done') {
            this.toast('Update applied – reloading');
            try { localStorage.removeItem('sa_build_ver'); } catch (x) {}
            setTimeout(() => location.reload(), 800);
            return;
          }
          if (s.state === 'error') {
            this.toast(s.error || 'Update failed', 'error');
            return;
          }
          setTimeout(poll, 500);
        } catch (e2) {
          this.toast('Lost contact with launcher', 'error');
        }
      };
      setTimeout(poll, 400);
    } catch (e) {
      this.toast(e.message || 'Auto-update failed', 'error');
    }
  },

  async renderCompanies() {
    const slots = (await DB.getSetting('companySlots', [])) || [];
    const active = await DB.getSetting('activeCompanySlot', 0);
    return `
      <div class="page-header"><div><h2>Companies</h2><p class="subtitle">Switch company profiles on this device</p></div>
        <button type="button" class="btn btn-primary" data-action="save-company-slot">Save current as slot</button></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${slots.length? slots.map((s,i)=>`
          <button type="button" data-action="switch-company" data-id="${i}" class="card p-4 text-left ${active===i?'ring-2 ring-sa-green':''}">
            <div class="font-bold">${s.name||'Company '+(i+1)}</div>
            <div class="text-xs text-slate-500">${s.businessTemplate||''}</div>
          </button>`).join('') : '<p class="text-slate-400">No slots yet</p>'}
      </div>`;
  },

  async _snapshotCompanyData() {
    const stores = ['clients','products','services','invoices','quotes','tickets','expenses','payments','employees','payslips','timeEntries'];
    const data = {};
    for (const s of stores) {
      try { data[s] = await DB.getAll(DB.STORES[s] || s); } catch (e) { data[s] = []; }
    }
    data.company = await DB.getCompany();
    data.businessTemplate = this.businessTemplate || await DB.getSetting('businessTemplate', 'startup');
    data.savedAt = new Date().toISOString();
    return data;
  },

  async _restoreCompanyData(data) {
    if (!data) return;
    const stores = ['clients','products','services','invoices','quotes','tickets','expenses','payments','employees','payslips','timeEntries'];
    for (const s of stores) {
      const key = DB.STORES[s] || s;
      try {
        const existing = await DB.getAll(key);
        for (const row of existing) {
          if (row.id != null) await DB.remove(key, row.id);
        }
        for (const row of (data[s] || [])) {
          const copy = { ...row };
          // keep ids for consistency within the slot
          await DB.put(key, copy);
        }
      } catch (e) { console.warn('restore', s, e); }
    }
    if (data.company) await DB.saveCompany({ ...data.company, id: 1 });
    if (data.businessTemplate) {
      await DB.setSetting('businessTemplate', data.businessTemplate);
      this.businessTemplate = data.businessTemplate;
      try {
        await applyBusinessTemplate(data.businessTemplate);
        await this.loadProfilePack(data.businessTemplate);
      } catch (e) {}
    }
  },

  async saveCompanySlot() {
    // Persist current company data into active slot, then add new empty-capable snapshot
    const slots = (await DB.getSetting('companySlots', [])) || [];
    const active = Number(await DB.getSetting('activeCompanySlot', 0)) || 0;
    if (slots[active]) {
      slots[active].data = await this._snapshotCompanyData();
      slots[active].name = this.company?.name || slots[active].name;
      slots[active].vatNo = this.company?.vatNo;
      slots[active].businessTemplate = this.businessTemplate;
    }
    const snap = await this._snapshotCompanyData();
    slots.push({
      name: (this.company?.name || 'Company') + ' (copy)',
      vatNo: this.company?.vatNo,
      businessTemplate: this.businessTemplate,
      snapshot: this.company,
      data: snap,
      savedAt: new Date().toISOString()
    });
    await DB.setSetting('companySlots', slots);
    await DB.setSetting('activeCompanySlot', slots.length - 1);
    this.toast('Company profile + documents saved to new slot');
    this.navigate('companies');
  },

  async switchCompany(i) {
    const slots = (await DB.getSetting('companySlots', [])) || [];
    const idx = Number(i);
    const s = slots[idx];
    if (!s) return;
    // Save current into active slot first
    const active = Number(await DB.getSetting('activeCompanySlot', 0)) || 0;
    if (slots[active]) {
      slots[active].data = await this._snapshotCompanyData();
      slots[active].name = this.company?.name || slots[active].name;
      slots[active].snapshot = this.company;
      slots[active].businessTemplate = this.businessTemplate;
    }
    if (s.data) {
      await this._restoreCompanyData(s.data);
    } else if (s.snapshot) {
      await DB.saveCompany({ ...s.snapshot, id: 1 });
      if (s.businessTemplate) {
        await applyBusinessTemplate(s.businessTemplate);
        this.businessTemplate = s.businessTemplate;
        await this.loadProfilePack(s.businessTemplate);
      }
    }
    await DB.setSetting('companySlots', slots);
    await DB.setSetting('activeCompanySlot', idx);
    await this.loadData();
    this.setupUI();
    this.toast('Switched to ' + (s.name || 'company') + ' (isolated data)');
    this.navigate('home');
  },

  renderBackup() {
    const last = this._lastBackupAt || localStorage.getItem('sa_last_backup') || '';
    return `
      <div class="page-header">
        <div><h2>Backup &amp; restore</h2>
          <p class="subtitle">One-click JSON · keep a copy off this device</p></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card p-6 space-y-3">
          <h3 class="font-bold">Export backup</h3>
          <p class="text-sm text-slate-500">Downloads clients, invoices, quotes, tickets, payroll and settings as a single JSON file.</p>
          <button type="button" class="btn btn-primary w-full" data-action="export-backup">Download backup JSON</button>
          <p class="text-xs text-slate-400">Last export on this browser: <strong>${last || '—'}</strong></p>
        </div>
        <div class="card p-6 space-y-3">
          <h3 class="font-bold">Restore backup</h3>
          <p class="text-sm text-slate-500">Replace current local data with a previous backup. This cannot be undone.</p>
          <input type="file" id="backup-file" accept="application/json,.json" class="input" />
          <button type="button" class="btn btn-outline w-full" data-action="restore-data">Restore from file</button>
        </div>
      </div>
      <div class="card p-4 mt-6 text-xs text-slate-500">
        Tip: After restoring, refresh once if totals look stale. Backups stay on your device unless you upload them yourself.
      </div>`;
  },


  async exportBackup() {
    try {
      const data = await DB.exportAllData();
      data.appVersion = APP_VERSION;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'SA-Invoice-backup-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      this.toast('Backup downloaded');
    } catch (e) { this.toast(e.message, 'error'); }
  },

  async importBackup() {
    const f = document.getElementById('backup-file')?.files?.[0];
    if (!f) return this.toast('Choose a file first', 'error');
    if (!confirm('Replace ALL local data?')) return;
    try {
      await DB.importAllData(JSON.parse(await f.text()));
      await this.loadData();
      this.setupUI();
      this.toast('Restored');
      this.navigate('home');
    } catch (e) { this.toast(e.message, 'error'); }
  },

  async checkForUpdates(silent=false) {
    try {
      if (!silent) this.toast('Checking for updates…', 'info');
      await this.applyCloudDefaults();
      let url = ((await DB.getSetting('updateServerUrl', '')) || '').trim().replace(/\/$/, '');
      if (!url && window.SA_CONFIG && SA_CONFIG.defaultUpdateServerUrl) {
        url = SA_CONFIG.defaultUpdateServerUrl.replace(/\/$/, '');
        await DB.setSetting('updateServerUrl', url);
      }
      if (!url) {
        if (!silent) this.toast('Update server not configured in config.js', 'error');
        return null;
      }
      if (url.endsWith(':5055')) {
        if (!silent) this.toast('Wrong port: use update server (5056), not license (5055)', 'error');
        return null;
      }
      const endpoint = url + '/api/latest';
      let data;
      try {
        data = window.SA_API
          ? await SA_API.json(endpoint, {}, 12000)
          : await fetch(endpoint, { cache: 'no-store' }).then(async r => {
              const t = await r.text();
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return JSON.parse(t);
            });
      } catch (e) {
        if (!silent) {
          this.showModal(`
            <div class="p-6 max-w-md">
              <h3 class="text-xl font-bold mb-2">Update check failed</h3>
              <p class="text-sm mb-2"><code class="text-xs">${endpoint}</code></p>
              <p class="text-sm text-slate-600 mb-3">${(e && e.message) || e}</p>
              <ul class="text-sm mb-3" style="list-style:disc;padding-left:1.2rem">
                <li>Local: Start-Update-Server.bat · URL http://127.0.0.1:5056</li>
                <li>Online: use your Render/Oracle HTTPS update URL</li>
                <li>See docs/FREE_ONLINE_HOSTING.md</li>
              </ul>
              <button type="button" class="btn btn-primary w-full" onclick="App.closeModal()">OK</button>
            </div>`);
        }
        return null;
      }
      this._updateInfo = data;
      if (data.version && data.version !== APP_VERSION) {
        if (!silent || data.mandatory) {
          const dl = data.downloadUrl || '';
          this.showModal(`
            <div class="p-6 max-w-md">
              <h3 class="text-xl font-bold mb-2">Update available</h3>
              <p class="text-sm mb-2">Server: <strong>${data.version}</strong> · You: <strong>${APP_VERSION}</strong></p>
              <p class="text-sm text-slate-600 mb-3">${data.message || ''}</p>
              <ul class="text-xs mb-4" style="list-style:disc;padding-left:1.2rem">${(data.changelog||[]).map(c=>`<li>${c}</li>`).join('')}</ul>
              <button type="button" class="btn btn-primary w-full" onclick="App.installUpdateNow()">Install automatically</button>
              ${dl?`<a class="btn btn-secondary w-full text-center mt-2" href="${dl}" target="_blank" rel="noopener">Manual ZIP download</a>`:''}
              <button type="button" class="btn btn-outline mt-2 w-full" onclick="App.closeModal()">Later</button>
            </div>`);
        }
      } else if (!silent) {
        this.toast('You are on the latest version (' + APP_VERSION + ')');
      }
      return data;
    } catch (e) {
      if (!silent) this.toast('Update check failed: ' + (e.message || e), 'error');
      return null;
    }
  },

  renderAbout() {
    const upd = (this._serverUrls && this._serverUrls.update) || (window.SA_CONFIG && SA_CONFIG.defaultUpdateServerUrl) || 'configured in config.js';
    return `
      <div class="page-header">
        <div><h2>Updates</h2>
          <p class="subtitle">SA Invoice Pro · ${APP_VERSION} · ${navigator.onLine?'Online':'Offline'}</p></div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" data-action="check-updates">Check for updates</button>
        </div>
      </div>
      <div class="card p-6 max-w-2xl space-y-4">
        <p class="text-sm">${typeof APP_COPYRIGHT!=='undefined'?APP_COPYRIGHT:'SA Invoice Pro'}</p>
        <p class="text-xs text-slate-500">Update channel is set automatically from app configuration. No URL to enter.</p>
        <p class="text-xs text-slate-400 truncate">Server: ${upd}</p>
        <button type="button" class="btn btn-primary w-full" data-action="check-updates">Check for updates</button>
        <div><label class="label">Owner unlock (session only)</label>
          <input id="owner-token" type="password" class="input" placeholder="Your private owner token" />
          <button type="button" class="btn btn-outline mt-2" data-action="owner-unlock">Unlock owner tools</button>
          <label class="label mt-3">Set custom owner token (this device)</label>
          <input id="new-owner-token" type="password" class="input" placeholder="Min 12 characters" />
          <button type="button" class="btn btn-secondary mt-2" data-action="set-owner-token">Save owner token</button>
        </div>
        ${this._ownerMode?`<div class="p-3 rounded-lg" style="background:#ecfdf5"><strong>Owner mode ON</strong></div>`:''}
        <h4 class="font-semibold">Changelog</h4>
        <ul class="text-sm" style="list-style:disc;padding-left:1.2rem">
          ${(typeof APP_CHANGELOG!=='undefined'?APP_CHANGELOG:[]).map(x=>`<li><strong>${x.v}</strong> – ${x.notes}</li>`).join('')}
        </ul>
      </div>`;
  },

  async saveUpdateServerUrl() {
    const v = document.getElementById('update-server-url')?.value?.trim() || '';
    await DB.setSetting('updateServerUrl', v);
    this.toast(v ? 'Update server saved' : 'Cleared');
  },

  async ownerUnlock() {
    const token = document.getElementById('owner-token')?.value || '';
    const custom = (await DB.getSetting('ownerToken', '') || '').trim();
    // No hardcoded default token – must set custom owner token in About first (min 12 chars).
    if (!custom || custom.length < 12) {
      return this.toast('Set a custom owner token first (About → Save owner token, min 12 characters)', 'error');
    }
    if (token !== custom) return this.toast('Invalid owner token', 'error');
    // Owner mode is NOT a user login – session flag only, never creates/opens user account
    this._ownerMode = true;
    sessionStorage.setItem('sa_owner', '1');
    this.toast('Owner tools unlocked for this session only (not a user login)');
    this.render();
  },

  async setOwnerToken() {
    const t = document.getElementById('new-owner-token')?.value?.trim() || '';
    if (t.length < 12) return this.toast('Token must be at least 12 characters', 'error');
    if (/^sa-owner-/i.test(t) || t.toLowerCase() === 'sa-owner-2026') {
      return this.toast('That token is banned. Choose a unique private token.', 'error');
    }
    await DB.setSetting('ownerToken', t);
    this.toast('Owner token saved on this device');
  },

  renderIndustryHub() {
    const packs = window.BUSINESS_TEMPLATES || [];
    return `
      <div class="page-header">
        <div><h2>Industry document hub</h2>
          <p class="subtitle">Apply an industry pack – menus, terms and docs reshape</p></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${packs.map(t => `
          <button type="button" class="card p-5 text-left" data-action="apply-industry" data-id="${t.id}">
            <div class="font-bold text-lg mb-1">${t.name}</div>
            <p class="text-sm text-slate-500">${t.desc||''}</p>
            <span class="text-xs text-sa-green mt-2 inline-block">Apply →</span>
          </button>`).join('')}
      </div>
      <div class="card p-5 mt-6">
        <button type="button" class="btn btn-primary" data-action="go-documents">Open document generator</button>
      </div>`;
  },

  async applyIndustry(id) {
    if (!id) return;
    await applyBusinessTemplate(id);
    this.businessTemplate = id;
    await DB.setSetting('businessTemplate', id);
    await this.loadProfilePack(id);
    this.modules = this.profilePack?.modules || this.modules;
    await DB.setSetting('modules', this.modules);
    this.setupUI();
    this.toast('Industry applied: ' + (this.profilePack?.name || id));
    this.navigate('home');
  },

  // ========== PAYROLL (SA basic) ==========
  renderPayroll() {
    const emps = this.employees || [];
    const slips = [...(this.payslips||[])].sort((a,b)=> (b.period||'').localeCompare(a.period||''));
    return `
      <div class="page-header">
        <div>
          <h2>Payroll</h2>
          <p class="subtitle">Employees & payslips · ZAR · indicative UIF/PAYE only (not full SARS submission)</p>
        </div>
        <div class="page-actions">
          <button type="button" data-action="batch-payslips-pdf" class="btn btn-outline">Batch payslip PDFs</button>
          <button type="button" data-action="new-employee" class="btn btn-secondary">Add employee</button>
          <button type="button" data-action="new-payslip" class="btn btn-primary">New payslip</button>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Employees (${emps.length})</h3>
          ${emps.length?`<div class="table-container"><table class="data-table">
            <thead><tr><th>Name</th><th>Role</th><th>Gross (mo)</th><th></th></tr></thead>
            <tbody>${emps.map(e=>`<tr>
              <td>${e.fullName||''}</td><td>${e.role||'—'}</td>
              <td>${this.formatMoney(e.grossSalary||0)}</td>
              <td class="whitespace-nowrap">
                <button data-action="edit-employee" data-id="${e.id}" class="btn btn-outline p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button data-action="delete-employee" data-id="${e.id}" class="btn btn-outline p-1.5 text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
              </td></tr>`).join('')}</tbody></table></div>`
          :'<p class="text-slate-400 text-sm">No employees yet</p>'}
        </div>
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Payslips</h3>
          ${slips.length?`<div class="table-container"><table class="data-table">
            <thead><tr><th>Number</th><th>Employee</th><th>Period</th><th>Net</th><th></th></tr></thead>
            <tbody>${slips.map(s=>{
              const e=emps.find(x => String(x.id) === String(s.employeeId));
              return `<tr>
              <td>${s.number||''}</td><td>${e?.fullName||s.employeeName||''}</td>
              <td>${s.period||''}</td><td>${this.formatMoney(s.netPay||0)}</td>
              <td>
                <button data-action="pdf-payslip" data-id="${s.id}" class="btn btn-outline p-1.5"><i data-lucide="file-down" class="w-4 h-4"></i></button>
                <button data-action="delete-payslip" data-id="${s.id}" class="btn btn-outline p-1.5 text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
              </td></tr>`;
            }).join('')}</tbody></table></div>`
          :'<p class="text-slate-400 text-sm">No payslips yet</p>'}
        </div>
      </div>
      <p class="text-xs text-slate-500 mt-4">Indicative only. Confirm PAYE/UIF/SDL with a tax practitioner or SARS. Employee data is stored locally (POPIA).</p>`;
  },

  showEmployeeModal(id) {
    const e = id ? (this.employees||[]).find(x => String(x.id) === String(id)) : {};
    this.showModal(`
      <div class="p-6">
        <h3 class="text-xl font-bold mb-4">${id?'Edit':'Add'} employee</h3>
        <form id="emp-form" class="space-y-3">
          <div><label class="label">Full name *</label><input name="fullName" class="input" required value="${e?.fullName||''}" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">ID / passport</label><input name="idNumber" class="input" value="${e?.idNumber||''}" /></div>
            <div><label class="label">Tax number</label><input name="taxNumber" class="input" value="${e?.taxNumber||''}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Role</label><input name="role" class="input" value="${e?.role||''}" /></div>
            <div><label class="label">Start date</label><input name="startDate" type="date" class="input" value="${e?.startDate||''}" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Gross monthly (ZAR)</label><input name="grossSalary" type="number" step="0.01" class="input" value="${e?.grossSalary||''}" /></div>
            <div><label class="label">Bank account</label><input name="bankAccount" class="input" value="${e?.bankAccount||''}" /></div>
          </div>
          <div><label class="label">Email / phone</label><input name="contact" class="input" value="${e?.contact||''}" /></div>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex gap-2 items-center text-sm"><input type="checkbox" name="uifExempt" ${e?.uifExempt?'checked':''}/> UIF exempt</label>
            <div><label class="label">PAYE directive %</label><input name="payeDirective" type="number" step="0.01" class="input" value="${e?.payeDirective||''}" placeholder="Optional" /></div>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary" onclick="App.saveEmployee(${id||'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveEmployee(id) {
    const fd = Object.fromEntries(new FormData(document.getElementById('emp-form')));
    const data = {
      fullName: fd.fullName, idNumber: fd.idNumber, taxNumber: fd.taxNumber,
      role: fd.role, startDate: fd.startDate, contact: fd.contact,
      bankAccount: fd.bankAccount, grossSalary: parseFloat(fd.grossSalary)||0, uifExempt: fd.uifExempt==="on", payeDirective: parseFloat(fd.payeDirective)||null
    };
    if (id) { data.id = id; await DB.put(DB.STORES.employees, data); }
    else await DB.add(DB.STORES.employees, data);
    await this.loadData(); this.closeModal(); this.render(); this.toast('Employee saved');
  },

  async deleteEmployee(id) {
    if (!confirm('Delete employee?')) return;
    await DB.remove(DB.STORES.employees, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  showPayslipModal() {
    const opts = (this.employees||[]).map(e=>`<option value="${e.id}">${e.fullName}</option>`).join('');
    if (!opts) return this.toast('Add an employee first', 'error');
    const period = new Date().toISOString().slice(0,7);
    this.showModal(`
      <div class="p-6">
        <h3 class="text-xl font-bold mb-4">New payslip</h3>
        <form id="payslip-form" class="space-y-3">
          <div><label class="label">Employee</label><select name="employeeId" class="input">${opts}</select></div>
          <div><label class="label">Period (YYYY-MM)</label><input name="period" class="input" value="${period}" /></div>
          <p class="text-xs text-slate-500">Gross from employee record. UIF/PAYE figures are simplified estimates only.</p>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary" onclick="App.savePayslip()">Create payslip</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  estimateDeductions(gross, emp) {
    const g = Number(gross)||0;
    const uif = (emp && emp.uifExempt) ? 0 : Math.min(g * 0.01, 177.12);
    let paye = 0;
    if (g > 7000) paye = (g - 7000) * 0.18 * 0.5;
    if (g > 20000) paye = (g - 20000) * 0.26 * 0.4 + 1500;
    if (g > 40000) paye = (g - 40000) * 0.31 * 0.35 + 4000;
    paye = Math.max(0, Math.round(paye * 100) / 100);
    const net = Math.round((g - uif - paye) * 100) / 100;
    return { uif: Math.round(uif*100)/100, paye, netPay: net, gross: g };
  },

  async savePayslip() {
    if (!this.requireLicense()) return;
    const fd = Object.fromEntries(new FormData(document.getElementById('payslip-form')));
    const emp = (this.employees||[]).find(x=>String(x.id)===String(fd.employeeId));
    if (!emp) return this.toast('Employee not found', 'error');
    const ded = this.estimateDeductions(emp.grossSalary, emp);
    const number = await DB.getNextNumber('payslip');
    await DB.add(DB.STORES.payslips, {
      number, employeeId: emp.id, employeeName: emp.fullName,
      period: fd.period, ...ded, createdAt: new Date().toISOString()
    });
    await this.loadData(); this.closeModal(); this.render(); this.toast('Payslip ' + number + ' created');
  },

  pdfPayslip(id) {
    const s = this.byId(this.payslips, id);
    if (!s) return this.toast('Payslip not found', 'error');
    const emp = this.byId(this.employees, s.employeeId) || {};
    const co = this.company || {};
    try {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        this.toast('PDF library not loaded', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const green = [0, 122, 77];
      // Header bar
      doc.setFillColor(...green);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(co.name || 'SA Invoice Pro', 14, 14);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('PAYSLIP', 14, 22);
      doc.text(String(s.number || ''), 196, 22, { align: 'right' });

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      let y = 38;
      doc.setFont(undefined, 'bold');
      doc.text('Employee', 14, y);
      doc.setFont(undefined, 'normal');
      doc.text(String(s.employeeName || emp.fullName || '—'), 50, y);
      y += 7;
      doc.setFont(undefined, 'bold');
      doc.text('Period', 14, y);
      doc.setFont(undefined, 'normal');
      doc.text(String(s.period || '—'), 50, y);
      y += 7;
      doc.setFont(undefined, 'bold');
      doc.text('ID / Tax ref', 14, y);
      doc.setFont(undefined, 'normal');
      doc.text(`${emp.idNumber || '—'} / ${emp.taxNumber || '—'}`, 50, y);
      y += 7;
      if (emp.role) {
        doc.setFont(undefined, 'bold');
        doc.text('Role', 14, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(emp.role), 50, y);
        y += 7;
      }
      y += 4;
      // Earnings / deductions table
      const rows = [
        ['Description', 'Amount (ZAR)'],
        ['Gross pay', this.formatMoney(s.gross)],
        ['UIF (indicative)', this.formatMoney(s.uif)],
        ['PAYE (estimate)', this.formatMoney(s.paye)],
        ['Net pay', this.formatMoney(s.netPay)],
      ];
      if (doc.autoTable) {
        doc.autoTable({
          startY: y,
          head: [rows[0]],
          body: rows.slice(1).map(r => [r[0], r[1]]),
          theme: 'grid',
          headStyles: { fillColor: green },
          styles: { fontSize: 10 },
          columnStyles: { 1: { halign: 'right' } }
        });
        y = doc.lastAutoTable.finalY + 10;
      } else {
        for (const r of rows) {
          doc.text(r[0], 14, y);
          doc.text(r[1], 196, y, { align: 'right' });
          y += 7;
        }
        y += 6;
      }
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const notes = [
        'Indicative payroll figures only — confirm against current SARS tax tables and UIF rules.',
        'Not an official IRP5 / tax certificate. Personal information processed under POPIA for employment purposes.',
        (typeof APP_COPYRIGHT !== 'undefined' ? APP_COPYRIGHT : 'SA Invoice Pro')
      ];
      for (const line of notes) {
        const parts = doc.splitTextToSize(line, 180);
        doc.text(parts, 14, y);
        y += parts.length * 4.5 + 2;
      }
      doc.save(`Payslip-${s.number || id}.pdf`);
      this.toast('Payslip PDF downloaded', 'success');
    } catch (e) {
      this.toast(e.message || 'Payslip PDF failed', 'error');
    }
  },


  async deletePayslip(id) {
    if (!confirm('Delete payslip?')) return;
    await DB.remove(DB.STORES.payslips, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  // ========== POPIA ==========
  renderPopia() {
    const c = this.company || {};
    const showTut = !this._popiaTutHidden;
    // load flag async once
    if (this._popiaTutHidden === undefined) {
      DB.getSetting('popiaTutorialDone', false).then(v => { this._popiaTutHidden = !!v; if (v) this.render(); });
      this._popiaTutHidden = false;
    }
    const reqs = [...(this.popiaRequests||[])].sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    return `
      ${!this._popiaTutHidden ? `<div class="card p-4 mb-4 border-l-4" style="border-left-color:#007A4D">
        <h3 class="font-semibold mb-2">Quick POPIA tutorial</h3>
        <ol class="text-sm text-slate-600 mb-3" style="list-style:decimal;padding-left:1.2rem">
          <li>Name your <strong>Information Officer</strong> (person responsible for privacy).</li>
          <li>Write <strong>why</strong> you process client/staff data (purposes).</li>
          <li>Log any request from a person to see or change their data.</li>
          <li>Use <strong>Privacy notice PDF</strong> to share your practices.</li>
        </ol>
        <button type="button" class="btn btn-secondary" data-action="dismiss-popia-tut">Got it – don’t show again</button>
      </div>` : ''}
      <div class="page-header">
        <div>
          <h2>POPIA compliance</h2>
          <p class="subtitle">Protection of Personal Information Act · local responsible-party toolkit</p>
        </div>
        <div class="page-actions">
          <button type="button" data-action="pdf-privacy-notice" class="btn btn-secondary">Privacy notice PDF</button>
          <button type="button" data-action="new-popia-request" class="btn btn-primary">Log data request</button>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Information officer & purposes</h3>
          <form id="popia-settings-form" class="space-y-3">
            <div><label class="label">Information officer name</label>
              <input name="ioName" class="input" value="${c.popiaIoName||''}" /></div>
            <div><label class="label">Information officer contact</label>
              <input name="ioContact" class="input" value="${c.popiaIoContact||''}" /></div>
            <div><label class="label">Purposes for processing</label>
              <textarea name="purposes" class="input" rows="3">${c.popiaPurposes||'Invoicing and debtor management; service delivery; employment and payroll; legal and tax obligations under South African law.'}</textarea></div>
            <div><label class="label">Retention period (summary)</label>
              <input name="retention" class="input" value="${c.popiaRetention||'As required by tax and commercial law (typically 5+ years for financial records)'}" /></div>
            <div><label class="label">Operators / third parties</label>
              <textarea name="operators" class="input" rows="2">${c.popiaOperators||''}</textarea></div>
            <button type="button" data-action="save-popia-settings" class="btn btn-primary">Save POPIA settings</button>
          </form>
        </div>
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Data subject requests</h3>
          ${reqs.length?`<div class="table-container"><table class="data-table">
            <thead><tr><th>Ref</th><th>Type</th><th>Subject</th><th>Status</th><th></th></tr></thead>
            <tbody>${reqs.map(r=>`<tr>
              <td>${r.number||''}</td><td>${r.requestType||''}</td><td>${r.subjectName||''}</td>
              <td><span class="badge">${r.status||'open'}</span></td>
              <td>${r.status!=='closed'?`<button data-action="resolve-popia" data-id="${r.id}" class="btn btn-outline p-1.5">Close</button>`:''}</td>
            </tr>`).join('')}</tbody></table></div>`
          :'<p class="text-slate-400 text-sm">No requests logged</p>'}
        </div>
      </div>
      <div class="card p-5 mt-6">
        <h3 class="font-semibold mb-2">Practical checklist</h3>
        <ul class="text-sm text-slate-600" style="list-style:disc;padding-left:1.2rem">
          <li>Collect only what you need for a lawful purpose</li>
          <li>Secure this device; control who can log in</li>
          <li>Log and respond to access/correction/deletion requests</li>
          <li>License server only receives hardware id at your chosen URL</li>
        </ul>
        <p class="text-xs text-slate-500 mt-3">Not legal advice. Register with the Information Regulator where required.</p>
      </div>`;
  },

  async savePopiaSettings() {
    const form = document.getElementById('popia-settings-form');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const c = { ...(this.company || {}), id: 1 };
    c.popiaIoName = fd.ioName; c.popiaIoContact = fd.ioContact;
    c.popiaPurposes = fd.purposes; c.popiaRetention = fd.retention; c.popiaOperators = fd.operators;
    await DB.saveCompany(c); this.company = c; this.toast('POPIA settings saved');
  },

  showPopiaRequestModal() {
    this.showModal(`
      <div class="p-6">
        <h3 class="text-xl font-bold mb-4">Log POPIA data subject request</h3>
        <form id="popia-req-form" class="space-y-3">
          <div><label class="label">Data subject name *</label><input name="subjectName" class="input" required /></div>
          <div><label class="label">Contact</label><input name="contact" class="input" /></div>
          <div><label class="label">Request type</label>
            <select name="requestType" class="input">
              <option>Access</option><option>Correction</option><option>Deletion</option>
              <option>Objection</option><option>Other</option>
            </select>
          </div>
          <div><label class="label">Details</label><textarea name="details" class="input" rows="3"></textarea></div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary" onclick="App.savePopiaRequest()">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async savePopiaRequest() {
    const fd = Object.fromEntries(new FormData(document.getElementById('popia-req-form')));
    const number = await DB.getNextNumber('popia');
    await DB.add(DB.STORES.popiaRequests, {
      number, ...fd, status: 'open', date: new Date().toISOString().slice(0,10)
    });
    await this.loadData(); this.closeModal(); this.render(); this.toast('Request logged ' + number);
  },

  async dismissPopiaTutorial() {
    await DB.setSetting('popiaTutorialDone', true);
    this._popiaTutHidden = true;
    this.render();
  },

  async resolvePopiaRequest(id) {
    const r = (this.popiaRequests||[]).find(x => String(x.id) === String(id));
    if (!r) return;
    r.status = 'closed'; r.closedAt = new Date().toISOString();
    await DB.put(DB.STORES.popiaRequests, r);
    await this.loadData(); this.render(); this.toast('Request closed');
  },

  pdfPrivacyNotice() {
    const c = this.company || {};
    try {
      generateBusinessLetterPDF({
        company: c,
        client: { name: 'Customers, suppliers and users' },
        title: 'PRIVACY NOTICE (POPIA)',
        date: new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' }),
        ref: 'PRIVACY',
        template: this.template, colour: this.accent,
        bodyLines: [
          `${c.name || 'This organisation'} is the responsible party for personal information processed in our South African business.`,
          `Information officer: ${c.popiaIoName || '[Name]'} · ${c.popiaIoContact || c.email || c.phone || ''}`,
          `Purposes:\n${c.popiaPurposes || 'Invoicing, service delivery, employment, legal obligations.'}`,
          `Retention: ${c.popiaRetention || 'As required by law and operational need.'}`,
          `Operators: ${c.popiaOperators || 'Only as needed (e.g. accountant).'}`,
          'You may request access, correction or deletion subject to the law. Contact the information officer above.',
          'Complaints may be directed to the Information Regulator (South Africa).',
          'Issued under the Protection of Personal Information Act 4 of 2013 (POPIA).'
        ]
      });
      this.toast('Privacy notice PDF downloaded');
    } catch (e) { this.toast(e.message, 'error'); }
  },


    // ========== EXPENSES (Bookkeeping) ==========

  // ========== CORE PAGES (restored stable) ==========
  renderHome() {
    const co = this.company || {};
    const unpaid = (this.invoices || []).filter(i => i.status !== 'paid' && i.status !== 'cancelled');
    const paid = (this.invoices || []).filter(i => i.status === 'paid');
    const totalOut = unpaid.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalPaid = paid.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const openT = (this.tickets || []).filter(t => !['closed', 'resolved'].includes((t.status || '').toLowerCase())).length;
    const recent = [...(this.invoices || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 5);
    const online = navigator.onLine;
    const lic = this.licenseStatus || {};
    // Overdue this week / aged
    const now = new Date();
    const overdue = unpaid.map(inv => {
      const due = inv.dueDate || inv.date;
      const days = due ? Math.floor((now - new Date(due)) / 86400000) : 0;
      const c = (this.clients || []).find(x => String(x.id) === String(inv.clientId));
      return { inv, days: Math.max(0, days), client: c?.name || inv.clientName || '—', due: due || '' };
    }).filter(x => x.days > 0).sort((a, b) => b.days - a.days);
    const overdueTotal = overdue.reduce((s, x) => s + (Number(x.inv.total) || 0), 0);
    const dueSoon = unpaid.map(inv => {
      const due = inv.dueDate || inv.date;
      if (!due) return null;
      const days = Math.floor((new Date(due) - now) / 86400000);
      if (days < 0 || days > 7) return null;
      const c = (this.clients || []).find(x => String(x.id) === String(inv.clientId));
      return { inv, days, client: c?.name || inv.clientName || '—', due };
    }).filter(Boolean);

    return `
      <div class="quick-actions-strip no-print mb-4">
        <button type="button" data-action="go-invoices" class="qa-btn"><span>🧾</span> Invoices</button>
        <button type="button" data-action="go-quotes" class="qa-btn"><span>📋</span> Quotes</button>
        <button type="button" data-action="go-clients" class="qa-btn"><span>👤</span> Clients</button>
        <button type="button" data-action="go-expenses" class="qa-btn"><span>💸</span> Expenses</button>
        <button type="button" data-action="go-tickets" class="qa-btn"><span>🎫</span> Tickets</button>
        <button type="button" data-action="go-reports" class="qa-btn"><span>📊</span> Reports</button>
        <button type="button" data-action="go-accounting" class="qa-btn"><span>📒</span> Accounting</button>
      </div>
      <div class="flex flex-wrap gap-2 mb-4 no-print">
        <button type="button" data-action="new-invoice" class="btn btn-primary btn-sm">+ Invoice</button>
        <button type="button" data-action="new-quote" class="btn btn-secondary btn-sm">+ Quote</button>
        <button type="button" data-action="new-client" class="btn btn-outline btn-sm">+ Client</button>
        <button type="button" data-action="new-ticket" class="btn btn-outline btn-sm">+ Ticket</button>
      </div>

      <div class="page-header">
        <div>
          <h2>Home</h2>
          <p class="subtitle">${co.name || 'Your business'} · ${online ? 'Online' : 'Offline'} · ${lic.label || 'License'}</p>
        </div>
        <div class="page-actions">
          <button type="button" data-action="new-invoice" class="btn btn-primary">New invoice</button>
          <button type="button" data-action="new-quote" class="btn btn-secondary">New quote</button>
        </div>
      </div>

      
      ${(() => {
        const low = (this.products || []).filter(p => {
          if (p.stock == null || p.stock === '') return false;
          const min = p.reorderLevel != null ? Number(p.reorderLevel) : 5;
          return Number(p.stock) <= min;
        });
        if (!low.length) return '';
        return `<div class="card p-4 mb-4" style="border-left:4px solid #7c3aed">
          <div class="flex flex-wrap justify-between gap-2 items-center">
            <div>
              <div class="font-bold" style="color:#6d28d9">Low stock</div>
              <div class="text-sm text-slate-600">${low.length} product(s) at or below reorder level</div>
            </div>
            <button type="button" data-action="go-products" class="btn btn-outline">Products</button>
          </div>
          <div class="mt-2 space-y-1 text-sm">
            ${low.slice(0, 6).map(p => `
              <div class="flex justify-between list-card py-1.5">
                <span>${p.name || p.description || 'Item'}</span>
                <strong>${p.stock} left</strong>
              </div>`).join('')}
            ${low.length > 6 ? `<p class="text-xs text-slate-500">+ ${low.length - 6} more</p>` : ''}
          </div>
        </div>`;
      })()}

      ${overdue.length ? `
      <div class="card p-4 mb-4" style="border-left:4px solid #dc2626">
        <div class="flex flex-wrap justify-between gap-2 items-center">
          <div>
            <div class="font-bold text-red-700">Overdue invoices</div>
            <div class="text-sm text-slate-600">${overdue.length} invoice(s) · ${this.formatMoney(overdueTotal)}</div>
          </div>
          <div class="flex gap-2">
            <button type="button" data-action="send-reminders" class="btn btn-outline">Payment reminders</button>
            <button type="button" data-action="go-reports" class="btn btn-secondary">Reports</button>
          </div>
        </div>
        <div class="mt-3 space-y-1 text-sm">
          ${overdue.slice(0, 5).map(x => `
            <button type="button" data-action="edit-invoice" data-id="${x.inv.id}" class="list-card w-full text-left py-2">
              <div class="flex justify-between gap-2">
                <span><strong>${x.inv.number || ''}</strong> · ${x.client}</span>
                <span class="text-red-600 font-semibold">${x.days}d overdue · ${this.formatMoney(x.inv.total)}</span>
              </div>
            </button>`).join('')}
          ${overdue.length > 5 ? `<p class="text-xs text-slate-500">+ ${overdue.length - 5} more on Reports</p>` : ''}
        </div>
      </div>` : ''}

      
      ${(() => {
        const rec = (this.invoices || []).filter(i => i.recurring && i.status !== 'cancelled');
        if (!rec.length) return '';
        const monthKey = new Date().toISOString().slice(0, 7);
        const pending = rec.filter(i => i.lastRecurringMonth !== monthKey);
        if (!pending.length) return `<div class="card p-3 mb-4 text-sm text-slate-500">Recurring: all ${rec.length} template(s) already run for this month.</div>`;
        return `<div class="card p-4 mb-4" style="border-left:4px solid #007A4D">
          <div class="flex flex-wrap justify-between gap-2 items-center">
            <div>
              <div class="font-bold text-sa-green">Recurring invoices</div>
              <div class="text-sm text-slate-600">${pending.length} of ${rec.length} ready to generate for ${monthKey}</div>
            </div>
            <button type="button" data-action="generate-recurring" class="btn btn-primary">Run recurring</button>
          </div>
        </div>`;
      })()}

      ${dueSoon.length ? `
      <div class="card p-4 mb-4" style="border-left:4px solid #f59e0b">
        <div class="font-bold text-amber-700 mb-2">Due in the next 7 days</div>
        <div class="space-y-1 text-sm">
          ${dueSoon.map(x => `
            <button type="button" data-action="edit-invoice" data-id="${x.inv.id}" class="list-card w-full text-left py-2">
              <div class="flex justify-between gap-2">
                <span><strong>${x.inv.number || ''}</strong> · ${x.client}</span>
                <span>Due ${x.due} · ${this.formatMoney(x.inv.total)}</span>
              </div>
            </button>`).join('')}
        </div>
      </div>` : ''}

      <div class="home-hero home-glass-panel text-white mb-6">
        <div class="home-hero-inner flex flex-wrap gap-4 items-center justify-between">
          <div>
            <div class="text-sm opacity-80">Welcome${Auth.currentUser ? ', ' + (Auth.currentUser.username || '') : ''}</div>
            <div class="text-2xl font-bold">${co.name || 'SA Invoice Pro'}</div>
            <div class="text-xs opacity-75 mt-1">${APP_VERSION} · ${this.businessTemplate || 'business'}</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="home-glass-tab" data-action="go-invoices">Invoices</button>
            <button type="button" class="home-glass-tab" data-action="go-quotes">Quotes</button>
            <button type="button" class="home-glass-tab" data-action="go-clients">Clients</button>
            <button type="button" class="home-glass-tab" data-action="go-dashboard">Dashboard</button>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="stat-card"><div class="value text-sa-green">${this.formatMoney(totalOut)}</div><div class="label">Outstanding</div></div>
        <div class="stat-card"><div class="value">${this.formatMoney(totalPaid)}</div><div class="label">Paid</div></div>
        <div class="stat-card"><div class="value">${(this.invoices || []).length}</div><div class="label">Invoices</div></div>
        <div class="stat-card"><div class="value">${openT}</div><div class="label">Open tickets</div></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-bold mb-3">Recent invoices</h3>
          ${recent.length ? `<div class="space-y-2">${recent.map(i => {
            const c = (this.clients || []).find(x => String(x.id) === String(i.clientId));
            return `<button type="button" data-action="edit-invoice" data-id="${i.id}" class="list-card w-full text-left">
              <div class="flex justify-between"><strong>${i.number || ''}</strong><span>${this.formatMoney(i.total)}</span></div>
              <div class="text-xs text-slate-500">${c?.name || i.clientName || '—'} · ${i.status || ''} · ${i.date || ''}</div>
            </button>`;
          }).join('')}</div>` : '<p class="text-slate-400 text-sm">No invoices yet</p>'}
        </div>
        <div class="card p-5">
          <h3 class="font-bold mb-3">Quick actions</h3>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" data-action="go-clients" class="btn btn-outline">Clients</button>
            <button type="button" data-action="go-products" class="btn btn-outline">Products</button>
            <button type="button" data-action="go-services" class="btn btn-outline">Services</button>
            <button type="button" data-action="go-tickets" class="btn btn-outline">Tickets</button>
            <button type="button" data-action="go-reports" class="btn btn-outline">Reports</button>
            <button type="button" data-action="go-settings" class="btn btn-outline">Settings</button>
          </div>
          <div class="mt-4 text-xs text-slate-500">
            Network: <strong class="${online ? 'text-sa-green' : 'text-amber-600'}">${online ? 'Online' : 'Offline'}</strong>
            · License: <strong>${lic.label || '—'}</strong>
          </div>
        </div>
      </div>`;
  },


  renderDashboard() {
    const _dashExportBtn = `<div class="page-actions mb-3 no-print flex flex-wrap gap-2">
      <button type="button" data-action="export-dashboard-snapshot" class="btn btn-outline">Export JSON</button>
      <button type="button" data-action="export-dashboard-pdf" class="btn btn-outline">Export PDF</button>
    </div>`;
    const inv = this.invoices || [];
    const paidList = inv.filter(i => i.status === 'paid');
    const outList = inv.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
    const paid = paidList.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const out = outList.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const quotes = (this.quotes || []).length;
    const clients = (this.clients || []).length;
    const total = paid + out || 1;
    const paidPct = Math.round((paid / total) * 100);
    const outPct = Math.round((out / total) * 100);

    // Last 6 months bars
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-ZA', { month: 'short' });
      const sumPaid = inv.filter(x => (x.date || '').startsWith(key) && x.status === 'paid').reduce((s, x) => s + (Number(x.total) || 0), 0);
      const sumAll = inv.filter(x => (x.date || '').startsWith(key)).reduce((s, x) => s + (Number(x.total) || 0), 0);
      months.push({ label, sumPaid, sumAll });
    }
    const maxM = Math.max(...months.map(m => m.sumAll), 1);

    return `
      ${_dashExportBtn}

      <div class="page-header">
        <div class="page-header" style="display:contents"><div><h2>Dashboard</h2><p class="subtitle">Paid vs outstanding · 6-month trend</p></div>
        <div class="page-actions">
          <button type="button" data-action="go-reports" class="btn btn-secondary">Full reports</button>
          <button type="button" data-action="new-invoice" class="btn btn-primary">New invoice</button>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="stat-card"><div class="value">${this.formatMoney(paid)}</div><div class="label">Revenue (paid)</div></div>
        <div class="stat-card"><div class="value text-sa-green">${this.formatMoney(out)}</div><div class="label">Outstanding</div></div>
        <div class="stat-card"><div class="value">${quotes}</div><div class="label">Quotes</div></div>
        <div class="stat-card"><div class="value">${clients}</div><div class="label">Clients</div></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card p-5">
          <h3 class="font-bold mb-3">Paid vs outstanding</h3>
          <div class="space-y-3 text-sm">
            <div>
              <div class="flex justify-between mb-1"><span>Paid (${paidPct}%)</span><strong>${this.formatMoney(paid)}</strong></div>
              <div class="chart-track"><div class="chart-fill chart-fill-paid" style="width:${paidPct}%"></div></div>
            </div>
            <div>
              <div class="flex justify-between mb-1"><span>Outstanding (${outPct}%)</span><strong>${this.formatMoney(out)}</strong></div>
              <div class="chart-track"><div class="chart-fill chart-fill-out" style="width:${outPct}%"></div></div>
            </div>
          </div>
          <p class="text-xs text-slate-500 mt-3">${paidList.length} paid · ${outList.length} open invoices</p>
        </div>
        <div class="card p-5">
          <h3 class="font-bold mb-3">Invoiced – last 6 months</h3>
          <div class="chart-bars">
            ${months.map(m => `
              <div class="chart-bar-col" title="${m.label}: ${this.formatMoney(m.sumAll)}">
                <div class="chart-bar" style="height:${Math.max(4, Math.round((m.sumAll / maxM) * 100))}%"></div>
                <div class="chart-bar-label">${m.label}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3">Jump to</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button type="button" data-action="go-invoices" class="list-card text-center"><div class="text-2xl font-bold">${inv.length}</div><div class="text-xs">Invoices</div></button>
          <button type="button" data-action="go-quotes" class="list-card text-center"><div class="text-2xl font-bold">${quotes}</div><div class="text-xs">Quotes</div></button>
          <button type="button" data-action="go-tickets" class="list-card text-center"><div class="text-2xl font-bold">${(this.tickets||[]).length}</div><div class="text-xs">Tickets</div></button>
          <button type="button" data-action="go-clients" class="list-card text-center"><div class="text-2xl font-bold">${clients}</div><div class="text-xs">Clients</div></button>
        </div>
      </div>`;
  },


  renderDocs(type) {
    const isQuote = type === 'quote';
    let list = [...(isQuote ? this.quotes : this.invoices) || []];
    const q = (this._docFilter || '').trim().toLowerCase();
    const st = this._docStatusFilter || '';
    if (q) {
      list = list.filter(doc => {
        const c = (this.clients || []).find(x => String(x.id) === String(doc.clientId));
        const hay = [doc.number, doc.status, doc.clientName, c?.name, c?.email].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    if (st) list = list.filter(doc => (doc.status || '') === st || (st === 'credit' && doc.isCredit));

    const sortKey = this._docSort || 'date';
    const sortDir = this._docSortDir || 'desc';
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va, vb;
      if (sortKey === 'total') {
        va = Number(a.total) || 0; vb = Number(b.total) || 0;
        return (va - vb) * dir;
      }
      if (sortKey === 'status') {
        va = String(a.isCredit ? 'credit' : (a.status || ''));
        vb = String(b.isCredit ? 'credit' : (b.status || ''));
        return va.localeCompare(vb) * dir;
      }
      if (sortKey === 'number') {
        return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true }) * dir;
      }
      // date default
      return String(a.date || '').localeCompare(String(b.date || '')) * dir;
    });

    const title = isQuote ? 'Quotes' : 'Invoices';
    const newAct = isQuote ? 'new-quote' : 'new-invoice';
    const editAct = isQuote ? 'edit-quote' : 'edit-invoice';
    const pdfAct = isQuote ? 'pdf-quote' : 'pdf-invoice';
    const delAct = isQuote ? 'delete-quote' : 'delete-invoice';
    const statuses = isQuote
      ? ['', 'open', 'accepted', 'rejected', 'converted', 'expired']
      : ['', 'draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled', 'credited', 'credit'];
    const sortMark = (key) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return `
      <div class="page-header">
        <div><h2>${title}</h2><p class="subtitle">${list.length} shown · sort: ${sortKey} ${sortDir}</p></div>
        <div class="page-actions">
          <button type="button" data-action="export-filtered-docs" class="btn btn-outline no-print">Export CSV</button>
          ${!isQuote ? '<button type="button" data-action="batch-mark-paid" class="btn btn-outline">Mark selected paid</button>' : ''}
          ${!isQuote ? '<button type="button" data-action="generate-recurring" class="btn btn-secondary">Run recurring</button>' : ''}
          ${!isQuote ? '<button type="button" data-action="toggle-recurring-cal" class="btn btn-outline">Recurring calendar</button>' : ''}
          <button type="button" data-action="${newAct}" class="btn btn-primary">New ${isQuote ? 'quote' : 'invoice'}</button>
        </div>
      </div>
      <div class="card p-3 mb-4 flex flex-wrap gap-2 items-center no-print">
        <input type="search" id="doc-search" class="input flex-1 min-w-[160px]" placeholder="Search number, client…" value="${(this._docFilter || '').replace(/"/g, '&quot;')}" />
        <select id="doc-status-filter" class="input w-auto">
          ${statuses.map(s => `<option value="${s}" ${st===s?'selected':''}>${s || 'All statuses'}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-secondary" data-action="apply-doc-filter">Filter</button>
        <button type="button" class="btn btn-outline" data-action="save-doc-preset" title="Save current search + status">Save preset</button>
        <select id="doc-preset-select" class="input w-auto">
          <option value="">Presets…</option>
        </select>
        <button type="button" class="btn btn-outline" data-action="delete-doc-preset" title="Delete selected preset">Delete preset</button>
        <button type="button" class="btn btn-outline no-print" data-action="print-list" title="Print list">Print</button>
      </div>
      ${list.length === 0 ? `<div class="card empty-state">
        <div class="empty-icon">${isQuote ? '📋' : '🧾'}</div>
        <h3>No ${title.toLowerCase()} match</h3>
        <p>Adjust filters or create a new document.</p>
        <button type="button" data-action="${newAct}" class="btn btn-primary mt-2">Create</button>
      </div>` : `
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr>
            ${!isQuote ? '<th class="p-3 no-print"><input type="checkbox" id="inv-select-all" title="Select all" /></th>' : ''}
            <th class="text-left p-3"><button type="button" class="sort-th" data-action="sort-docs" data-sort="number">Number${sortMark('number')}</button></th>
            <th class="text-left p-3">Client</th>
            <th class="text-left p-3"><button type="button" class="sort-th" data-action="sort-docs" data-sort="date">Date${sortMark('date')}</button></th>
            <th class="text-right p-3"><button type="button" class="sort-th" data-action="sort-docs" data-sort="total">Total${sortMark('total')}</button></th>
            <th class="text-left p-3"><button type="button" class="sort-th" data-action="sort-docs" data-sort="status">Status${sortMark('status')}</button></th>
            <th class="text-right p-3 no-print">Actions</th>
          </tr></thead>
          <tbody>
            ${list.map(doc => {
              const c = (this.clients || []).find(x => String(x.id) === String(doc.clientId));
              return `<tr class="border-t">
                ${!isQuote ? `<td class="p-3 no-print"><input type="checkbox" class="inv-select" value="${doc.id}" ${doc.status==='paid'||doc.isCredit?'disabled':''} /></td>` : ''}
                <td class="p-3 font-medium">${doc.number || ''}</td>
                <td class="p-3">${c?.name || doc.clientName || '—'}</td>
                <td class="p-3">${doc.date || ''}</td>
                <td class="p-3 text-right">${this.formatMoney(doc.total)}${(Number(doc.amountPaid)>0 || (doc.payments||[]).length) ? `<div class="text-xs text-amber-600">Paid ${this.formatMoney(doc.amountPaid||0)} · Due ${this.formatMoney(doc.amountDue!=null?doc.amountDue:Math.max(0,(doc.total||0)-(doc.amountPaid||0)))}</div>` : ''}</td>
                <td class="p-3"><span class="badge">${doc.isCredit ? 'credit' : (doc.status || '')}</span></td>
                <td class="p-3 text-right no-print row-actions-cell">
                  <div class="row-actions-desktop">
                    <button type="button" data-action="${editAct}" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Edit">✎</button>
                    <button type="button" data-action="${pdfAct}" data-id="${doc.id}" class="btn btn-outline p-1.5" title="PDF">PDF</button>
                    <button type="button" data-action="${isQuote?'status-quote':'status-invoice'}" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Status">Status</button>
                    ${!isQuote && !doc.isCredit ? `<button type="button" data-action="preview-invoice" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Preview">View</button>
                    <button type="button" data-action="pay-eft" data-id="${doc.id}" class="btn btn-primary p-1.5" title="EFT / Capitec / PayFast">Pay</button>
                    <button type="button" data-action="share-invoice-portal" data-id="${doc.id}" class="btn btn-secondary p-1.5" title="Client payment portal">Portal</button>
                    <button type="button" data-action="payment-history" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Record payment">Record</button>` : ''}
                    ${!isQuote && !doc.isCredit ? `<button type="button" data-action="duplicate-invoice" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Duplicate">Copy</button>` : ''}
                    ${isQuote ? `<button type="button" data-action="duplicate-quote" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Duplicate">Copy</button>` : ''}
                    ${!isQuote ? `<button type="button" data-action="packing-slip" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Packing slip">Pack</button>` : ''}
                    ${isQuote ? `<button type="button" data-action="convert-quote" data-id="${doc.id}" class="btn btn-outline p-1.5" title="To invoice">→Inv</button>` : ''}
                    <button type="button" data-action="share-whatsapp" data-id="${doc.id}" data-type="${isQuote?'quote':'invoice'}" class="btn btn-outline p-1.5" title="WhatsApp">WA</button>
                    <button type="button" data-action="email-doc" data-id="${doc.id}" data-type="${isQuote?'quote':'invoice'}" class="btn btn-outline p-1.5" title="Email">Email</button>
                    ${!isQuote && !doc.isCredit && (doc.status==='unpaid'||doc.status==='partial'||doc.status==='overdue') ? `<button type="button" data-action="payment-reminder-wa" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Payment reminder WA">Remind</button>` : ''}
                    <button type="button" data-action="${delAct}" data-id="${doc.id}" class="btn btn-outline p-1.5 text-red-600" title="Delete">✕</button>
                  </div>
                  <div class="row-actions-mobile">
                    <button type="button" class="btn btn-outline p-1.5" data-action="toggle-row-menu">More ▾</button>
                    <div class="row-menu">
                      <button type="button" data-action="${editAct}" data-id="${doc.id}">Edit</button>
                      ${!isQuote ? `<button type="button" data-action="preview-invoice" data-id="${doc.id}">Preview</button>` : `<button type="button" data-action="preview-quote" data-id="${doc.id}">Preview</button>`}
                      <button type="button" data-action="${pdfAct}" data-id="${doc.id}">PDF</button>
                      <button type="button" data-action="${isQuote?'status-quote':'status-invoice'}" data-id="${doc.id}">Status</button>
                      ${!isQuote && !doc.isCredit ? `<button type="button" data-action="payment-history" data-id="${doc.id}">Payments</button>` : ''}
                      ${!isQuote && !doc.isCredit ? `<button type="button" data-action="duplicate-invoice" data-id="${doc.id}">Duplicate</button>` : ''}
                      ${isQuote ? `<button type="button" data-action="duplicate-quote" data-id="${doc.id}">Duplicate</button>` : ''}
                      ${!isQuote ? `<button type="button" data-action="packing-slip" data-id="${doc.id}">Packing slip</button>` : ''}
                      ${isQuote ? `<button type="button" data-action="convert-quote" data-id="${doc.id}">Convert → invoice</button>` : ''}
                      <button type="button" data-action="${delAct}" data-id="${doc.id}" class="text-red-600">Delete</button>
                    </div>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`}`;
  },



  viewClient(id) {
    if (id == null || id === '') return this.toast('Client not found', 'error');
    this._viewClientId = id;
    this.currentPage = 'client-detail';
    this.render();
  },

  renderClientDetail(id) {
    const c = this.clientById ? this.clientById(id) : (this.clients || []).find(x => String(x.id) === String(id));
    if (!c) {
      this._viewClientId = null;
      return `<div class="card p-6"><p class="text-red-600">Client not found.</p>
        <button type="button" data-action="go-clients" class="btn btn-primary mt-3">Back to clients</button></div>`;
    }
    const tickets = (this.tickets || []).filter(t => String(t.clientId) === String(c.id));
    const inv = (this.invoices || []).filter(i => String(i.clientId) === String(c.id));
    const quotes = (this.quotes || []).filter(q => String(q.clientId) === String(c.id));
    const openT = tickets.filter(t => !['resolved','closed','cancelled'].includes(String(t.status||'').toLowerCase()));
    const closedT = tickets.filter(t => ['resolved','closed'].includes(String(t.status||'').toLowerCase()));
    return `
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" data-action="go-clients" class="btn btn-outline">← Clients</button>
        <button type="button" data-action="edit-client" data-id="${c.id}" class="btn btn-secondary">Edit</button>
        <button type="button" data-action="share-client-portal" data-id="${c.id}" class="btn btn-primary">Payment portal link</button>
        <button type="button" data-action="client-statement" data-id="${c.id}" class="btn btn-outline">Statement PDF</button>
      </div>
      <div class="card p-4 mb-4">
        <h2 class="text-xl font-bold">${c.name || 'Client'}</h2>
        <p class="text-sm text-slate-500">${[c.email, c.phone || c.mobile, c.city].filter(Boolean).join(' · ') || 'No contact details'}</p>
        <p class="text-xs text-slate-400 mt-1">${c.address || ''} ${c.vatNo ? '· VAT ' + c.vatNo : ''}</p>
        <div class="flex flex-wrap gap-3 mt-3 text-sm">
          <span class="badge">Open jobs: ${openT.length}</span>
          <span class="badge">Resolved: ${closedT.length}</span>
          <span class="badge">Invoices: ${inv.length}</span>
          <span class="badge">Quotes: ${quotes.length}</span>
        </div>
      </div>
      <div class="card p-4 mb-4">
        <h3 class="font-bold mb-2">Jobcards / tickets</h3>
        ${tickets.length === 0 ? '<p class="text-sm text-slate-500">No tickets.</p>' :
          tickets.slice(0, 20).map(t => {
            const st = t.status || 'open';
            const kids = (this.tickets || []).filter(k => String(k.parentId) === String(t.id));
            return `<div class="border-b py-2">
              <div class="flex justify-between items-center gap-2">
                <div>
                  <div class="font-medium text-sm">${t.number || ''} · ${t.title || t.subject || 'Ticket'}</div>
                  <div class="text-xs text-slate-500"><span class="badge">${st}</span> ${t.priority || ''} ${kids.length ? '· ' + kids.length + ' sub-task(s)' : ''}</div>
                </div>
                <button type="button" class="btn btn-outline btn-sm" data-action="edit-ticket" data-id="${t.id}">Open</button>
              </div>
            </div>`;
          }).join('')}
      </div>
      <div class="card p-4 mb-4">
        <h3 class="font-bold mb-2">Invoices</h3>
        ${inv.length === 0 ? '<p class="text-sm text-slate-500">No invoices.</p>' :
          inv.slice(0, 15).map(i => `<div class="flex justify-between text-sm py-1 border-b">
            <button type="button" class="text-left font-medium" data-action="edit-invoice" data-id="${i.id}">${i.number || i.id}</button>
            <span>${this.formatMoney(i.total)} · ${i.status || ''}</span>
          </div>`).join('')}
      </div>
      <div class="card p-4 mb-4">
        <h3 class="font-bold mb-2">Quotes</h3>
        ${quotes.length === 0 ? '<p class="text-sm text-slate-500">No quotes.</p>' :
          quotes.slice(0, 15).map(q => `<div class="flex justify-between text-sm py-1 border-b">
            <button type="button" class="text-left font-medium" data-action="edit-quote" data-id="${q.id}">${q.number || q.id}</button>
            <span>${this.formatMoney(q.total)} · ${q.status || ''}</span>
          </div>`).join('')}
      </div>`;
  },

  async addSubTicket(parentId) {
    const parent = (this.tickets || []).find(t => String(t.id) === String(parentId));
    if (!parent) return this.toast('Parent job not found', 'error');
    const title = prompt('Sub-job title (e.g. Parts order, Follow-up visit)');
    if (!title || !title.trim()) return;
    try {
      const number = await DB.getNextNumber('ticket');
      await DB.add(DB.STORES.tickets, {
        number,
        title: title.trim(),
        subject: title.trim(),
        parentId: parent.id,
        clientId: parent.clientId,
        status: 'open',
        priority: parent.priority || 'normal',
        createdAt: new Date().toISOString(),
        notes: 'Sub-task of ' + (parent.number || parent.id)
      });
      await this.loadData(true);
      this.toast('Sub-job card created', 'success');
      if (this.currentPage === 'client-detail' && parent.clientId) this.viewClient(parent.clientId);
      else this.render();
    } catch (e) {
      this.toast(e.message || 'Could not create sub-job', 'error');
    }
  },

  renderClients() {
    let list = [...(this.clients || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const q = (this._clientFilter || '').trim().toLowerCase();
    if (q) {
      list = list.filter(c => [c.name, c.email, c.phone, c.city, c.vatNo].join(' ').toLowerCase().includes(q));
    }
    return `
      <div class="page-header">
        <div><h2>Clients</h2><p class="subtitle">${list.length} client(s)</p></div>
        <div class="page-actions">
          <button type="button" data-action="new-client" class="btn btn-primary">Add client</button>
        </div>
      </div>
      <p class="text-sm text-slate-500 mb-3 no-print">Use <strong>Portal</strong> on a client to generate a pay link (WhatsApp / email) for their open invoices.</p>
      <div class="hidden">
      </div>
      <div class="card p-3 mb-4 flex flex-wrap gap-2 items-center no-print">
        <input type="search" id="client-search" class="input flex-1 min-w-[160px]" placeholder="Search name, email, phone…" value="${(this._clientFilter || '').replace(/"/g, '&quot;')}" />
        <button type="button" class="btn btn-secondary" data-action="apply-client-filter">Filter</button>
        <button type="button" class="btn btn-outline" data-action="save-client-preset">Save preset</button>
        <select id="client-preset-select" class="input w-auto"><option value="">Client presets…</option></select>
        <button type="button" class="btn btn-outline" data-action="delete-client-preset">Delete preset</button>
        <button type="button" class="btn btn-outline no-print" data-action="print-list">Print</button>
      </div>
      ${list.length === 0 ? `<div class="card empty-state">
        <div class="empty-icon">👥</div>
        <h3>No clients match</h3>
        <p>Try clearing search or add a new client.</p>
        <button type="button" data-action="new-client" class="btn btn-primary mt-2">Add client</button>
      </div>` : `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${list.map(c => `<div class="list-card">
          <div class="flex justify-between gap-2">
            <div>
              <div class="font-bold">${c.name || ''}</div>
              <div class="text-xs text-slate-500">${c.email || ''} ${c.phone ? '· ' + c.phone : ''}</div>
              <div class="text-xs text-slate-400">${c.vatNo ? 'VAT ' + c.vatNo : ''} ${c.city || ''}</div>
            </div>
            <div class="row-actions-cell no-print">
              <div class="row-actions-desktop flex gap-1 flex-wrap justify-end">
                <button type="button" data-action="client-statement" data-id="${c.id}" class="btn btn-outline p-1.5" title="Statement">Stmt</button>
                <button type="button" data-action="view-client" data-id="${c.id}" class="btn btn-primary p-1.5">Open</button>
                <button type="button" data-action="share-client-portal" data-id="${c.id}" class="btn btn-secondary p-1.5" title="Payment portal link">Portal</button>
                <button type="button" data-action="edit-client" data-id="${c.id}" class="btn btn-outline p-1.5">Edit</button>
                <button type="button" data-action="share-client-wa" data-id="${c.id}" class="btn btn-outline p-1.5">WA</button>
                <button type="button" data-action="share-client-email" data-id="${c.id}" class="btn btn-outline p-1.5">Email</button>
                <button type="button" data-action="delete-client" data-id="${c.id}" class="btn btn-outline p-1.5 text-red-600">Del</button>
              </div>
              <div class="row-actions-mobile">
                <button type="button" class="btn btn-outline p-1.5" data-action="toggle-row-menu">More ▾</button>
                <div class="row-menu">
                  <button type="button" data-action="client-statement" data-id="${c.id}">Statement</button>
                  <button type="button" data-action="share-client-portal" data-id="${c.id}">Payment portal link</button>
                  <button type="button" data-action="edit-client" data-id="${c.id}">Edit</button>
                  <button type="button" data-action="delete-client" data-id="${c.id}" class="text-red-600">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>`).join('')}
      </div>`}`;
  },


  renderItems(kind) {
    const isProduct = kind === 'product';
    const list = [...(isProduct ? this.products : this.services) || []];
    const title = isProduct ? 'Products' : 'Services';
    const newAct = isProduct ? 'new-product' : 'new-service';
    const editAct = isProduct ? 'edit-product' : 'edit-service';
    const delAct = isProduct ? 'delete-product' : 'delete-service';
    const emptyIcon = isProduct ? '📦' : '🛠️';
    return `
      <div class="page-header">
        <div><h2>${title}</h2><p class="subtitle">${list.length} item(s)</p></div>
        <div class="page-actions"><button type="button" data-action="${newAct}" class="btn btn-primary">Add ${isProduct ? 'product' : 'service'}</button></div>
      </div>
      ${list.length === 0 ? `
      <div class="card empty-state">
        <div class="empty-icon">${emptyIcon}</div>
        <h3>No ${title.toLowerCase()} yet</h3>
        <p>Add your first ${isProduct ? 'product (with stock &amp; reorder level)' : 'service'} to use on invoices and quotes.</p>
        <button type="button" data-action="${newAct}" class="btn btn-primary mt-2">Add first ${isProduct ? 'product' : 'service'}</button>
      </div>` : `
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr>
            <th class="text-left p-3">Name</th>
            ${isProduct ? '<th class="text-right p-3">Stock</th><th class="text-right p-3">Reorder</th>' : ''}
            <th class="text-right p-3">Price</th>
            <th class="text-right p-3 no-print">Actions</th>
          </tr></thead>
          <tbody>
            ${list.map(p => `<tr class="border-t">
              <td class="p-3"><div class="font-medium">${p.name || p.description || ''}</div>
                <div class="text-xs text-slate-500">${p.description && p.name ? p.description : ''}</div></td>
              ${isProduct ? `<td class="p-3 text-right">${p.stock != null ? p.stock : '—'}</td>
              <td class="p-3 text-right">${p.reorderLevel != null ? p.reorderLevel : '5'}</td>` : ''}
              <td class="p-3 text-right">${this.formatMoney(p.unitPrice || p.price)}</td>
              <td class="p-3 text-right no-print row-actions-cell">
                <div class="row-actions-desktop">
                  <button type="button" data-action="${editAct}" data-id="${p.id}" class="btn btn-outline p-1.5">Edit</button>
                  <button type="button" data-action="${delAct}" data-id="${p.id}" class="btn btn-outline p-1.5 text-red-600">Del</button>
                </div>
                <div class="row-actions-mobile">
                  <button type="button" class="btn btn-outline p-1.5" data-action="toggle-row-menu">More ▾</button>
                  <div class="row-menu">
                    <button type="button" data-action="${editAct}" data-id="${p.id}">Edit</button>
                    <button type="button" data-action="${delAct}" data-id="${p.id}" class="text-red-600">Delete</button>
                  </div>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;
  },

  async saveHelixUrl() {
    const v = (document.getElementById('helix-url-input')?.value || '').trim().replace(/\/$/, '');
    window.SA_CONFIG = window.SA_CONFIG || {};
    SA_CONFIG.helixUrl = v;
    try { await DB.setSetting('helixUrl', v); } catch (e) {}
    try { localStorage.setItem('sa_helix_url', v); } catch (e) {}
    this.toast(v ? 'Helix URL saved' : 'Helix URL cleared', 'success');
    if (this.currentPage === 'tickets') this.render();
  },

  async loadHelixUrlFromSettings() {
    try {
      const v = (await DB.getSetting('helixUrl', '')) || localStorage.getItem('sa_helix_url') || '';
      if (v) {
        window.SA_CONFIG = window.SA_CONFIG || {};
        if (!SA_CONFIG.helixUrl) SA_CONFIG.helixUrl = v;
      }
    } catch (e) {}
  },

  renderTickets() {
    const cfg = window.SA_CONFIG || {};
    const helixUrl = String(cfg.helixUrl || '').trim().replace(/\/$/, '');
    // Helix panel when URL set (default) or user chose Helix desk; classic when forced native
    const useHelix = !this._ticketsNative && (cfg.helixEmbedTickets !== false) && (helixUrl || this._forceHelixPanel);
    if (useHelix) return this.renderTicketsHelix(helixUrl || '');
    return this.renderTicketsNative();
  },

  helixTicketsUrl(base) {
    if (!base) return '';
    const path = (window.SA_CONFIG && SA_CONFIG.helixPathDesk) || '/desk/tickets';
    try {
      const u = new URL(path.startsWith('http') ? path : (base + (path.startsWith('/') ? path : '/' + path)));
      u.searchParams.set('source', 'sa-invoice-pro');
      u.searchParams.set('company', (this.company && this.company.name) || '');
      if (this.company && this.company.email) u.searchParams.set('email', this.company.email);
      return u.toString();
    } catch (e) {
      return base.replace(/\/$/, '') + '/desk/tickets';
    }
  },

  renderTicketsHelix(base) {
    const src = this.helixTicketsUrl(base);
    const list = this.tickets || [];
    const openN = list.filter(t => !['closed','resolved','cancelled'].includes(String(t.status||'').toLowerCase())).length;
    return `
      <div class="page-header">
        <div>
          <h2>Ticketing · Helix</h2>
          <p class="subtitle">Desk &amp; client portal · ${list.length} local job(s) · ${openN} open in SA Invoice</p>
        </div>
        <div class="page-actions flex flex-wrap gap-2">
          ${src ? `<a class="btn btn-primary" href="${src}" target="_blank" rel="noopener">Open Helix full screen</a>` : ``}
          <button type="button" class="btn btn-secondary" data-action="tickets-native">Classic tickets</button>
          <button type="button" class="btn btn-outline" data-action="new-ticket">Quick local job</button>
        </div>
      </div>
      <div class="card p-3 mb-3 text-sm text-slate-600 flex flex-wrap gap-3 items-center justify-between">
        <div class="flex flex-wrap gap-2 items-center flex-1">
          <label class="label mb-0 text-xs">Helix URL</label>
          <input id="helix-url-input" class="input text-xs" style="min-width:12rem;flex:1" value="${base}" placeholder="https://your-helix.pages.dev" />
          <button type="button" class="btn btn-outline btn-sm" data-action="save-helix-url">Save URL</button>
        </div>
      </div>
      ${src ? `
      <div class="card p-0 overflow-hidden helix-frame-wrap" style="min-height:72vh;border:1px solid var(--border,#e2e8f0);border-radius:14px;background:#0f172a">
        <iframe title="Helix desk" src="${src}" class="helix-frame"
          style="width:100%;height:72vh;border:0;border-radius:14px"
          allow="clipboard-write; fullscreen"></iframe>
      </div>
      <p class="text-xs text-slate-400 mt-2 text-center">If the frame is blank, use Open Helix full screen (some hosts block iframes).</p>` : `
      <div class="card p-8 text-center">
        <h3 class="font-bold text-lg mb-2">Connect Helix</h3>
        <p class="text-sm text-slate-600 mb-4">Deploy the <code>helix/</code> app (Vite), then paste its HTTPS URL above and Save.</p>
        <p class="text-xs text-slate-400">Helix is a separate React desk — tickets, portal, channels — not bundled inside this PWA build.</p>
      </div>`}`;
  },

  renderTicketsNative() {
    const list = [...(this.tickets || [])].sort((a, b) =>
      String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || ''))
    );
    const helixUrl = String((window.SA_CONFIG && SA_CONFIG.helixUrl) || '').trim();
    return `
      <div class="page-header">
        <div>
          <h2>Tickets / Jobs</h2>
          <p class="subtitle">${list.length} local ticket(s) · classic view</p>
        </div>
        <div class="page-actions flex flex-wrap gap-2">
          ${helixUrl ? `<button type="button" class="btn btn-secondary" data-action="tickets-helix">Helix desk</button>` : `<button type="button" class="btn btn-outline" data-action="tickets-helix">Connect Helix</button>`}
          <button type="button" data-action="new-ticket" class="btn btn-primary">New ticket</button>
        </div>
      </div>
      ${!helixUrl ? `<div class="card p-3 mb-3 text-sm text-slate-600">Set <strong>helixUrl</strong> in <code>js/config.js</code> or open Helix desk to paste your deployed Helix URL.</div>` : ''}
      ${list.length === 0 ? `
      <div class="card empty-state">
        <div class="empty-icon">🎫</div>
        <h3>No tickets yet</h3>
        <p>Log support jobs, SLA work, or site visits. Or connect <strong>Helix</strong> for full desk + client portal.</p>
        <div class="flex flex-wrap gap-2 mt-3 justify-center">
          <button type="button" data-action="new-ticket" class="btn btn-primary">New ticket</button>
        </div>
      </div>` : `
      <div class="space-y-3">
        ${list.map(t => {
          const c = (this.clients || []).find(x => String(x.id) === String(t.clientId));
          const st = (t.status || 'open').toLowerCase();
          const kids = (this.tickets || []).filter(k => String(k.parentId) === String(t.id));
          return `<div class="list-card ticket-card">
            <div class="flex justify-between gap-2 flex-wrap">
              <div class="min-w-0">
                <div class="font-bold truncate">${t.number ? t.number + ' · ' : ''}${t.title || t.subject || 'Ticket'}</div>
                <div class="text-xs text-slate-500 mt-0.5">
                  <span class="badge badge-${st}">${t.status || 'open'}</span>
                  ${t.priority ? ' · ' + t.priority : ''}
                  ${c ? ' · ' + c.name : ''}
                  ${kids.length ? ' · ' + kids.length + ' sub-job(s)' : ''}
                </div>
              </div>
              <div class="flex flex-wrap gap-1">
                <button type="button" class="btn btn-outline btn-sm" data-action="edit-ticket" data-id="${t.id}">Open</button>
                <button type="button" class="btn btn-outline btn-sm" data-action="log-time" data-id="${t.id}">Time</button>
                <button type="button" class="btn btn-outline btn-sm" data-action="add-sub-ticket" data-id="${t.id}">Sub</button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`}`;
  },


  renderDocGenerator() {
    const co = this.company || {};
    const clients = this.clients || [];
    const docTypes = [
      { id: 'sla', label: 'IT SLA agreement', needs: 'sla' },
      { id: 'consulting', label: 'Consulting engagement letter', needs: null },
      { id: 'tax_clearance_support', label: 'Letter of good standing / tax support', needs: null },
      { id: 'quote_letter', label: 'Formal quotation letter', needs: null },
      { id: 'popia_notice', label: 'POPIA privacy notice', needs: null },
      { id: 'invoice_cover', label: 'Invoice cover letter', needs: null },
      { id: 'job_card', label: 'Job card summary', needs: 'tickets' },
    ];
    const allowed = docTypes.filter(d => !d.needs || this.hasModule(d.needs));
    return `
      <div class="page-header">
        <div>
          <h2>Document generator</h2>
          <p class="subtitle">SA-style letters &amp; agreements · themed PDF</p>
        </div>
      </div>
      <div class="card p-5 max-w-3xl space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="label">Document type</label>
            <select id="docgen-type" class="input">
              ${allowed.map(d => `<option value="${d.id}">${d.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">Client</label>
            <select id="docgen-client" class="input">
              <option value="">— Select client —</option>
              ${clients.map(c => `<option value="${c.id}">${c.name || ''}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="label">Reference / title</label>
          <input id="docgen-ref" class="input" placeholder="e.g. SLA-2026-001" />
        </div>
        <div>
          <label class="label">Extra notes (optional)</label>
          <textarea id="docgen-notes" class="input" rows="3" placeholder="Clauses or special terms…"></textarea>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-secondary" data-action="docgen-demo">Load demo data</button>
          <button type="button" class="btn btn-primary" data-action="docgen-pdf">Generate PDF</button>
        </div>
        <p class="text-xs text-slate-500">Uses company profile: <strong>${co.name || '—'}</strong>. Not legal advice — review before sending.</p>
      </div>`;
  },

  docgenDemo() {
    const type = document.getElementById('docgen-type');
    const ref = document.getElementById('docgen-ref');
    const notes = document.getElementById('docgen-notes');
    const client = document.getElementById('docgen-client');
    if (ref) ref.value = 'DEMO-' + new Date().toISOString().slice(0, 10);
    if (notes) notes.value = 'Demo content for preview. Replace with your terms before issuing to a client.';
    if (client && client.options.length > 1) client.selectedIndex = 1;
    if (type) type.selectedIndex = 0;
    this.toast('Demo fields filled', 'success');
  },

  docgenPdf() {
    const type = document.getElementById('docgen-type')?.value || 'consulting';
    const clientId = document.getElementById('docgen-client')?.value;
    const ref = document.getElementById('docgen-ref')?.value || ('DOC-' + Date.now());
    const notes = document.getElementById('docgen-notes')?.value || '';
    const client = (this.clients || []).find(c => String(c.id) === String(clientId)) || { name: 'Valued Client' };
    const co = this.company || {};
    const titles = {
      sla: 'SERVICE LEVEL AGREEMENT',
      consulting: 'CONSULTING ENGAGEMENT LETTER',
      tax_clearance_support: 'LETTER OF GOOD STANDING / TAX SUPPORT',
      quote_letter: 'FORMAL QUOTATION',
      popia_notice: 'POPIA PRIVACY NOTICE',
      invoice_cover: 'TAX INVOICE COVER LETTER',
      job_card: 'JOB CARD SUMMARY'
    };
    const bodies = {
      sla: [
        'This Service Level Agreement is entered into between the Provider and the Client.',
        'Response times and service credits apply as agreed in the schedule of services.',
        'Fees are billed in South African Rand (ZAR). VAT is charged where the Provider is a registered vendor.',
        notes || 'Standard support hours: Monday–Friday 08:00–17:00 SAST.'
      ],
      consulting: [
        'Thank you for engaging our consulting services.',
        'Scope of work will be as described in the attached schedule or quotation.',
        'Fees are payable in ZAR per our tax invoice terms.',
        notes || 'This letter does not constitute legal or tax advice.'
      ],
      tax_clearance_support: [
        'To whom it may concern,',
        `We confirm a bona fide business relationship with ${client.name}.`,
        'This letter is provided in support of tax compliance processes where a third-party confirmation is requested.',
        'This is not a SARS tax clearance certificate or audit opinion.',
        notes
      ],
      quote_letter: [
        'Please find our quotation for professional services.',
        'All amounts are in South African Rand (ZAR).',
        notes || 'Quotation valid for 14 days unless otherwise stated.'
      ],
      popia_notice: [
        'We process personal information in line with the Protection of Personal Information Act 4 of 2013 (POPIA).',
        'Information is collected for lawful business purposes related to our services.',
        'You may request access, correction or deletion subject to the Act.',
        notes || 'Contact our information officer as listed in company settings.'
      ],
      invoice_cover: [
        'Please find our tax invoice for services rendered / goods supplied.',
        'Payment is due as stated on the invoice.',
        notes
      ],
      job_card: [
        'Job / ticket summary for the Client.',
        notes || 'Time and materials as logged on the related ticket.'
      ]
    };
    try {
      if (typeof generateBusinessLetterPDF === 'function') {
        generateBusinessLetterPDF({
          company: co,
          client,
          title: titles[type] || 'DOCUMENT',
          date: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' }),
          ref,
          template: this.template,
          colour: this.accent,
          bodyLines: (bodies[type] || bodies.consulting).filter(Boolean)
        });
      } else if (window.jspdf && window.jspdf.jsPDF) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(co.name || 'SA Invoice Pro', 14, 20);
        doc.setFontSize(12);
        doc.text(titles[type] || 'DOCUMENT', 14, 30);
        doc.setFontSize(10);
        doc.text('Ref: ' + ref, 14, 38);
        doc.text('Client: ' + (client.name || ''), 14, 46);
        let y = 58;
        for (const line of (bodies[type] || bodies.consulting)) {
          const parts = doc.splitTextToSize(String(line), 180);
          doc.text(parts, 14, y);
          y += parts.length * 6 + 4;
          if (y > 270) { doc.addPage(); y = 20; }
        }
        doc.setFontSize(8);
        doc.text((typeof APP_COPYRIGHT !== 'undefined' ? APP_COPYRIGHT : 'SA Invoice Pro'), 14, 285);
        doc.save(ref + '.pdf');
      } else {
        this.toast('PDF library not loaded', 'error');
        return;
      }
      this.toast('PDF generated', 'success');
    } catch (e) {
      this.toast(e.message || 'PDF failed', 'error');
    }
  },

  renderAccount() {
    const u = Auth.currentUser || {};
    const lic = this.licenseStatus || {};
    const online = navigator.onLine;
    return `
      <div class="page-header">
        <div><h2>Account</h2><p class="subtitle">Signed in as ${u.username || '—'}</p></div>
      </div>
      <div class="card p-5 max-w-lg space-y-2 text-sm">
        <div class="flex justify-between border-b py-2"><span>Username</span><strong>${u.username || '—'}</strong></div>
        <div class="flex justify-between border-b py-2"><span>Email</span><strong>${u.email || '—'}</strong></div>
        <div class="flex justify-between border-b py-2"><span>Network</span>
          <strong class="${online ? 'text-sa-green' : 'text-amber-600'}">${online ? 'Online' : 'Offline'}</strong></div>
        <div class="flex justify-between border-b py-2"><span>License</span><strong>${lic.label || '—'}</strong></div>
        <div class="flex justify-between py-2"><span>App version</span><strong>${APP_VERSION}</strong></div>
        <button type="button" class="btn btn-outline mt-4 w-full" onclick="try{Auth.logout()}catch(e){};location.reload()">Sign out</button>
      </div>`;
  },

  renderExpenses() {
    const list = [...(this.expenses || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const total = list.reduce((s, e) => s + (e.amount || 0), 0);
    const byCat = {};
    for (const e of list) {
      const cat = (e.category || e.type || 'Uncategorised').trim() || 'Uncategorised';
      byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
    }
    const catRows = Object.entries(byCat).sort((x, y) => y[1] - x[1]);
    const thisMonth = list.filter(e => {
      const d = new Date(e.date); const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }).reduce((s, e) => s + (e.amount || 0), 0);
    return `
      <div class="page-header">
        <div><h2>Expenses</h2><p class="subtitle">${list.length} records · Month ${this.formatMoney(thisMonth)} · Total ${this.formatMoney(total)}</p></div>
        <div class="page-actions">
          <button type="button" data-action="new-expense" class="btn btn-primary">New expense</button>
        </div>
      </div>
      ${catRows.length ? `<div class="card p-3 mb-4 text-sm flex flex-wrap gap-2">
        ${catRows.slice(0, 8).map(([cat, amt]) => `<span class="badge">${cat}: ${this.formatMoney(amt)}</span>`).join('')}
      </div>` : ''}
      ${list.length === 0 ? `
      <div class="card empty-state">
        <div class="empty-icon">💸</div>
        <h3>No expenses yet</h3>
        <p>Log costs with optional receipt photos for bookkeeping.</p>
        <button type="button" data-action="new-expense" class="btn btn-primary mt-2">Add expense</button>
      </div>` : `
      <div class="space-y-2">
        ${list.map(e => `
          <div class="list-card flex justify-between gap-2 items-start">
            <div>
              <div class="font-medium">${e.description || e.number || 'Expense'}</div>
              <div class="text-xs text-slate-500">${e.date || ''} · ${e.category || 'general'} ${e.vendor ? '· ' + e.vendor : ''}</div>
            </div>
            <div class="text-right">
              <div class="font-bold">${this.formatMoney(e.amount)}</div>
              <div class="row-actions-cell no-print mt-1">
                <div class="row-actions-desktop flex gap-1 justify-end">
                  ${e.receiptData ? `<button type="button" data-action="view-receipt" data-id="${e.id}" class="btn btn-outline p-1.5" title="Receipt">📷</button>` : ''}
                  <button type="button" data-action="edit-expense" data-id="${e.id}" class="btn btn-outline p-1.5">Edit</button>
                  <button type="button" data-action="delete-expense" data-id="${e.id}" class="btn btn-outline p-1.5 text-red-600">Del</button>
                </div>
                <div class="row-actions-mobile">
                  <button type="button" class="btn btn-outline p-1.5" data-action="toggle-row-menu">More ▾</button>
                  <div class="row-menu">
                    ${e.receiptData ? `<button type="button" data-action="view-receipt" data-id="${e.id}">Receipt</button>` : ''}
                    <button type="button" data-action="edit-expense" data-id="${e.id}">Edit</button>
                    <button type="button" data-action="delete-expense" data-id="${e.id}" class="text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>`).join('')}
      </div>`}`;
  },


  async showExpenseModal(id=null) {
    const e = id ? this.expenses.find(x => String(x.id) === String(id)) : {};
    const number = e.number || await DB.getNextNumber('expense');
    const today = new Date().toISOString().slice(0,10);
    this.showModal(`
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">${id?'Edit':'New'} Expense</h3>
          <button onclick="App.closeModal()" class="p-2"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="expense-form" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Ref</label><input name="number" class="input" value="${number}" readonly /></div>
            <div><label class="label">Date *</label><input name="date" type="date" class="input" value="${e.date||today}" required /></div>
          </div>
          <div><label class="label">Description *</label><input name="description" class="input" value="${e.description||''}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Category</label>
              <select name="category" class="input">
                ${['general','rent','salaries','fuel','stock','utilities','marketing','software','travel','equipment','other'].map(c=>
                  `<option value="${c}" ${e.category===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div><label class="label">Amount (R) *</label><input name="amount" type="number" step="0.01" min="0" class="input" value="${e.amount||''}" required /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Vendor / Payee</label><input name="vendor" class="input" value="${e.vendor||''}" /></div>
            <div><label class="label">Payment Method</label>
              <select name="method" class="input">
                ${['eft','cash','card','debit order','other'].map(m=>`<option value="${m}" ${e.method===m?'selected':''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>
          <div><label class="label">Notes</label><input name="notes" class="input" value="${e.notes||''}" /></div>
          <div>
            <label class="label">Receipt photo (optional, stored on this device)</label>
            <input type="file" id="expense-receipt" accept="image/*" capture="environment" class="input" />
            ${e.receiptData ? '<img src="'+e.receiptData+'" alt="Receipt" style="max-height:80px;margin-top:8px;border-radius:8px" />' : ''}
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.saveExpense(${id||'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveExpense(id) {
    const data = Object.fromEntries(new FormData(document.getElementById('expense-form')));
    if (!data.description?.trim()) return this.toast('Description required', 'error');
    data.amount = parseFloat(data.amount) || 0;
    if (data.amount <= 0) return this.toast('Amount must be greater than 0', 'error');
    const existing = id ? this.byId(this.expenses, id) : null;
    if (existing?.receiptData) data.receiptData = existing.receiptData;
    const fileInput = document.getElementById('expense-receipt');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        data.receiptData = await this.fileToDataUrl(fileInput.files[0], 800);
      } catch (e) {
        this.toast('Could not read receipt image', 'error');
      }
    }
    if (id) { data.id = id; await DB.put(DB.STORES.expenses, data); }
    else await DB.add(DB.STORES.expenses, data);
    await this.loadData();
    this.closeModal();
    this.render();
    this.toast('Expense saved', 'success');
  },

  fileToDataUrl(file, maxEdge) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, (maxEdge || 800) / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    await DB.remove(DB.STORES.expenses, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  // ========== PAYMENTS ==========
  showPaymentModal(invoiceId) {
    const inv = this.invoices.find(i => String(i.id) === String(invoiceId));
    if (!inv) return;
    const paid = this.payments.filter(p=>p.invoiceId===invoiceId).reduce((s,p)=>s+(p.amount||0),0);
    const balance = (inv.total||0) - paid;
    this.showModal(`
      <div class="p-6">
        <h3 class="text-xl font-bold mb-1">Record Payment</h3>
        <p class="text-sm text-slate-500 mb-4">${inv.number} • Balance due: <strong>${this.formatMoney(balance)}</strong></p>
        <form id="payment-form" class="space-y-3">
          <div><label class="label">Amount (R) *</label><input name="amount" type="number" step="0.01" min="0.01" class="input" value="${balance>0?balance.toFixed(2):''}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Date</label><input name="date" type="date" class="input" value="${new Date().toISOString().slice(0,10)}" /></div>
            <div><label class="label">Method</label>
              <select name="method" class="input">
                <option value="eft">EFT</option><option value="cash">Cash</option>
                <option value="card">Card</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div><label class="label">Reference</label><input name="reference" class="input" placeholder="Bank ref / receipt no." /></div>
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.savePayment(${JSON.stringify(String(invoiceId))})">Save Payment</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async savePayment(invoiceId) {
    const form = document.getElementById('payment-form');
    if (!form) return this.toast('Payment form missing', 'error');
    const data = Object.fromEntries(new FormData(form));
    data.amount = parseFloat(data.amount) || 0;
    if (data.amount <= 0) return this.toast('Enter a valid amount', 'error');
    data.invoiceId = invoiceId;
    data.createdAt = new Date().toISOString();
    try { await DB.add(DB.STORES.payments, data); } catch (e) { console.warn(e); }
    // Keep payments on the invoice document so PDF/preview show them
    const note = [data.method, data.reference].filter(Boolean).join(' · ');
    await this.recordPayment(invoiceId, data.amount, note || data.date || '');
    await this.loadData();
    this.closeModal();
    this.render();
    this.toast('Payment recorded', 'success');
  },

  // ========== BACKUP / RESTORE ==========
  async backupData() {
    try {
      const data = await DB.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `SA-Invoice-Backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      this.toast('Backup downloaded');
    } catch(e) { this.toast('Backup failed: '+e.message, 'error'); }
  },

  restoreData() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (!confirm('This will replace ALL current data with the backup. Continue?')) return;
        await DB.importAllData(payload);
        await this.loadData();
        this.render();
        this.toast('Backup restored successfully');
      } catch(e) { this.toast('Restore failed: '+e.message, 'error'); }
    };
    input.click();
  },

  
  showTutorial() {
    this.showModal(`
      <div class="p-6">
        <h3 class="text-xl font-bold mb-2">Quick start guide</h3>
        <ol class="text-sm space-y-2" style="list-style:decimal;padding-left:1.25rem;color:#475569">
          <li>Use the <strong>left menu</strong> (or menu icon on phone) to open sections.</li>
          <li>On the <strong>dashboard</strong>, click any invoice, quote or ticket to edit.</li>
          <li>On a ticket, use the <strong>green file+</strong> icon to resolve and create an invoice.</li>
          <li><strong>Settings</strong> is split into Company, Invoicing, Profile, Appearance, Backup.</li>
          <li>Open <strong>License</strong> for trial status and activation.</li>
        </ol>
        <button type="button" class="btn btn-primary mt-4 w-full" data-action="dismiss-tutorial">Got it – start working</button>
      </div>`);
  },
  async dismissTutorial() {
    await DB.setSetting('tutorialDone', true);
    this.closeModal();
  },

  // Modal stack – allows adding client/product without closing invoice form
  ensureModalRoot() {
    let m = document.getElementById('modal-root');
    if (!m) {
      m = document.createElement('div');
      m.id = 'modal-root';
      m.className = 'modal-root';
      m.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.45);padding:1rem;overflow:auto;';
      document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m) this.closeModal(); });
    }
    return m;
  },

  showModal(html, large=false) {
    if (!this.modalStack) this.modalStack = [];
    this.modalStack.push({ html, large: !!large });
    this._renderTopModal();
  },

  _renderTopModal() {
    if (!this.modalStack) this.modalStack = [];
    const root = this.ensureModalRoot();
    if (!this.modalStack.length) {
      root.innerHTML = '';
      root.style.display = 'none';
      return;
    }
    root.style.display = 'flex';
    const top = this.modalStack[this.modalStack.length - 1];
    const z = 50 + this.modalStack.length;
    root.innerHTML = `
      <div class="modal-overlay" id="modal-overlay" style="z-index:${z};position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(15,23,42,.45);overflow:auto;">
        <div class="modal ${top.large?'modal-xl':'modal-lg'}" style="max-height:90vh;overflow:auto;width:100%;max-width:${top.large?'56rem':'32rem'};">${top.html}</div>
      </div>`;
    const ov = document.getElementById('modal-overlay');
    if (ov) ov.onclick = e => { if (e.target.id === 'modal-overlay') this.closeModal(); };
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch (e) {}
  },

  closeModal() {
    if (!this.modalStack) this.modalStack = [];
    this.modalStack.pop();
    this._renderTopModal();
  },

  closeAllModals() {
    this.modalStack = [];
    try {
      const root = this.ensureModalRoot();
      root.innerHTML = '';
      root.style.display = 'none';
    } catch (e) {}
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

