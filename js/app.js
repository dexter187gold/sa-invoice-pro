// SA Invoice Pro v1.1.0 – Modular business OS (SA)
const APP_VERSION = '3.2.1';
const APP_COPYRIGHT = 'SA Invoice Pro  © ' + new Date().getFullYear() + '  ·  All rights reserved';
const APP_LEGAL_NAME = 'SA Invoice Pro';
const APP_CHANGELOG = [
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
    // View mode never touches IndexedDB
    try { this.initViewMode(); } catch (e) {}
    // Failsafe always armed first – show login even if DB hangs
    let finished = false;
    const failsafe = setTimeout(() => {
      if (finished) return;
      if (boot) boot.textContent = 'Still loading – showing sign-in…';
      const auth = document.getElementById('auth-screen');
      if (auth) auth.classList.remove('hidden');
      try { Auth.renderAuthScreen(); } catch (e) {}
    }, 3500);
    try {
      // Soft DB warm-up with timeout – must not block forever
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

  async onLoginSuccess() {
    await this.applyCloudDefaults();
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    await this.loadData();
    try {
      const blocked = await this.checkMandatoryUpdate();
      if (blocked) return;
    } catch (e) {}

    this.onboardingDone = await DB.getSetting('onboardingDone', false);
    if (this.company && this.company.name && this.company.name.trim()) {
      if (!this.onboardingDone) {
        await DB.setSetting('onboardingDone', true);
        this.onboardingDone = true;
      }
    }
    this.setupUI();
    this.setupConnectivity();
    this.setupPWA();
    this._ownerMode = sessionStorage.getItem('sa_owner') === '1';
    this.applyTheme();
    this.applyAccent();

    const isNew = !!(Auth.currentUser && Auth.currentUser.isNewRegistration);
    // Clear the one-shot flag so refresh does not re-force onboarding incorrectly
    if (Auth.currentUser && Auth.currentUser.isNewRegistration) {
      Auth.currentUser.isNewRegistration = false;
      Auth._persistSession(Auth.currentUser, true);
    }

    if (!this.onboardingDone || !this.company?.name) {
      // New users / incomplete company → mandatory company setup
      this.showOnboarding();
      return;
    }

    this.navigate('home');
    if (isNew || !(await DB.getSetting('guidedTutorialDone', false))) {
      setTimeout(() => this.startGuidedTutorial(), 700);
    } else {
      this.toast('Welcome back, ' + (Auth.currentUser?.username || '') + '!', 'success');
    }
  },

  async loadData() {
    this.company = await DB.getCompany();
    this.clients = await DB.getAll(DB.STORES.clients);
    this.products = await DB.getAll(DB.STORES.products);
    this.services = await DB.getAll(DB.STORES.services);
    this.invoices = await DB.getAll(DB.STORES.invoices);
    this.quotes = await DB.getAll(DB.STORES.quotes);
    this.tickets = await DB.getAll(DB.STORES.tickets);
    this.timeEntries = await DB.getAll(DB.STORES.timeEntries);
    this.expenses = await DB.getAll(DB.STORES.expenses);
    this.payments = await DB.getAll(DB.STORES.payments);
    try {
      this.employees = await DB.getAll(DB.STORES.employees);
      this.payslips = await DB.getAll(DB.STORES.payslips);
      this.popiaRequests = await DB.getAll(DB.STORES.popiaRequests);
    } catch (e) {
      this.employees = this.employees || [];
      this.payslips = this.payslips || [];
      this.popiaRequests = this.popiaRequests || [];
    }
    this.theme = await DB.getSetting('theme', 'light');
    this.accent = await DB.getSetting('accent', 'green');
    this.template = await DB.getSetting('template', 'classic');
    this.vatEnabled = await DB.getSetting('vatEnabled', true);
    this.vatRate = await DB.getSetting('vatRate', 0.15);
    this.logoData = await DB.getSetting('logoData', null);
    this.pdfSignName = await DB.getSetting('pdfSignName', '');
    this.pdfSignTitle = await DB.getSetting('pdfSignTitle', '');
    this.pdfAutoSign = await DB.getSetting('pdfAutoSign', true);
    this.businessTemplate = await DB.getSetting('businessTemplate', 'custom');
    await this.loadProfilePack(this.businessTemplate);
    this.modules = await DB.getSetting('modules', null) || this.modules;
    if (!this.modules) {
      this.modules = (window.BUSINESS_MODULES && window.BUSINESS_MODULES[this.businessTemplate])
        || window.DEFAULT_MODULES
        || { invoices:true, quotes:true, tickets:true, clients:true, products:true, services:true, expenses:true, reports:true };
    }
    if (window.License) {
      this.licenseStatus = await License.init();
    }

  },

  // ========== ONBOARDING ==========
  showOnboarding() {
    document.getElementById('main').innerHTML = `
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-sa-green rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">SA</div>
          <h1 class="text-3xl font-bold mb-2">Welcome aboard!</h1>
          <p class="text-slate-500">Tell us about your business, pick a template that fits, choose your look — then hit <strong>Let's Go</strong> to open your dashboard.</p>
        </div>

        <div class="card p-6 mb-6">
          <h2 class="text-xl font-semibold mb-1">1. Your Business Details</h2>
          <p class="text-sm text-slate-500 mb-4">This appears on every invoice and quote</p>
          <form id="onboard-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2"><label class="label">Company / Trading Name *</label><input name="name" class="input" required placeholder="e.g. Acme Solutions (Pty) Ltd" /></div>
              <div><label class="label">CIPC Registration No</label><input name="regNo" class="input" placeholder="2020/123456/07" /></div>
              <div><label class="label">VAT Number</label><input name="vatNo" class="input" placeholder="4123456789" /></div>
              <div><label class="label">Phone</label><input name="phone" class="input" /></div>
              <div><label class="label">Email</label><input name="email" type="email" class="input" /></div>
              <div class="sm:col-span-2"><label class="label">Address</label><input name="address" class="input" /></div>
              <div><label class="label">City</label><input name="city" class="input" /></div>
              <div><label class="label">Province</label>
                <select name="province" class="input">
                  <option value="">— Select —</option>
                  ${['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Free State','Limpopo','Mpumalanga','North West','Northern Cape'].map(p=>`<option value="${p}">${p}</option>`).join('')}
                </select>
              </div>
            </div>

            <h3 class="font-semibold text-sa-green pt-2">Banking (optional – shown on invoices)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label class="label">Bank</label><input name="bankName" class="input" placeholder="FNB / Standard / Absa / Capitec" /></div>
              <div><label class="label">Account Number</label><input name="accountNumber" class="input" /></div>
              <div><label class="label">Branch Code</label><input name="branchCode" class="input" /></div>
              <div><label class="label">Account Type</label>
                <select name="accountType" class="input"><option value="">—</option><option>Cheque / Current</option><option>Savings</option><option>Business</option></select>
              </div>
            </div>
          </form>
        </div>

        <div class="card p-6 mb-6">
          <h2 class="text-xl font-semibold mb-1">2. Choose Your Business Type</h2>
          <p class="text-sm text-slate-500 mb-4">We'll pre-load useful products, services & settings</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="template-grid">
            ${BUSINESS_TEMPLATES.map(t => `
              <label class="template-card border rounded-xl p-4 cursor-pointer hover:border-sa-green transition flex gap-3 items-start">
                <input type="radio" name="bizTemplate" value="${t.id}" class="mt-1" ${t.id==='custom'?'checked':''} />
                <div>
                  <div class="font-semibold flex items-center gap-2"><i data-lucide="${t.icon}" class="w-4 h-4"></i> ${t.name}</div>
                  <div class="text-xs text-slate-500 mt-1">${t.desc}</div>
                </div>
              </label>`).join('')}
          </div>
        </div>

        <div class="card p-6 mb-6">
          <h2 class="text-xl font-semibold mb-1">3. Look & Feel</h2>
          <p class="text-sm text-slate-500 mb-4">You can change this anytime in Settings</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Invoice Template Style</label>
              <select id="ob-template" class="input">
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            <div>
              <label class="label">Accent Colour</label>
              <select id="ob-accent" class="input">
                ${['green','navy','blue','purple','teal','orange','red','gold'].map(c=>`<option value="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
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
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        <button id="btn-lets-go" class="btn btn-primary w-full justify-center text-lg py-3">
          Let's Go <i data-lucide="arrow-right" class="w-5 h-5"></i>
        </button>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    document.getElementById('btn-lets-go').onclick = () => this.finishOnboarding();
  },

  async finishOnboarding() {
    const form = document.getElementById('onboard-form');
    const data = Object.fromEntries(new FormData(form));
    const nameErr = this.validateCompanyName(data.name);
    if (nameErr) return this.toast(nameErr, 'error');
    const emailErr = this.validateEmail(data.email);
    if (emailErr) return this.toast(emailErr, 'error');
    const phoneErr = this.validatePhone(data.phone);
    if (phoneErr) return this.toast(phoneErr, 'error');
    const vatErr = this.validateVatNo(data.vatNo);
    if (vatErr) return this.toast(vatErr, 'error');

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

    await this.loadData();
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
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  setupPWA() {
    // Service worker registered from index.html (versioned). Avoid double register here.
    const boot = document.getElementById('boot-status');
    if (boot) boot.textContent = 'Loading workspace…';
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); this.deferredPrompt = e;
      document.getElementById('btn-install')?.classList.remove('hidden');
    });
    document.getElementById('btn-install')?.addEventListener('click', async () => {
      if (this.deferredPrompt) { this.deferredPrompt.prompt(); this.deferredPrompt = null;
        document.getElementById('btn-install').classList.add('hidden'); }
    });
  },

  async toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    await DB.setSetting('theme', this.theme);
    this.applyTheme();
  },
  applyTheme() {
    document.documentElement.classList.toggle('dark', this.theme === 'dark');
    const icon = document.querySelector('#btn-theme i');
    if (icon) icon.setAttribute('data-lucide', this.theme === 'dark' ? 'sun' : 'moon');
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
    const el = document.getElementById('toast');
    el.innerHTML = `<div class="toast ${type}">${msg}</div>`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
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
      products: () => this.renderItems('product'),
      services: () => this.renderItems('service'),
      expenses: () => this.renderExpenses(),
      payroll: () => this.renderPayroll(),
      popia: () => this.renderPopia(),
      reports: () => this.renderReports(),
      industry: () => this.renderIndustryHub(),
      about: () => this.renderAbout(),
      account: () => this.renderAccount(),
      companies: () => this.renderCompanies(),
      backup: () => this.renderBackup(),
      license: () => this.renderLicense(),
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
    main.innerHTML = `
      <div class="flex items-center gap-2 mb-4 text-sm page-crumb">
        <button type="button" data-action="go-home" class="btn btn-outline p-1.5" title="Home"><i data-lucide="home" class="w-4 h-4"></i></button>
        <span class="text-slate-400">/</span>
        <span class="font-medium capitalize">${this.currentPage}</span>
        <span class="ml-auto text-xs text-slate-400">v${APP_VERSION}</span>
      </div>
      ${body}`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    this.bindActions();
    this.drawFinancePie();
    this.bindClausePack();
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
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => this.handleAction(btn.dataset.action, btn.dataset.id ? Number(btn.dataset.id) : null, btn);
    });
  },

  async handleAction(action, id, el) {
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
      'email-doc': () => this.emailDoc(id, el?.dataset?.type === 'quote'),
      'share-whatsapp': () => this.shareWhatsApp(id, el?.dataset?.type === 'quote'),
      'delete-invoice': () => this.deleteDoc('invoice', id),
      'delete-quote': () => this.deleteDoc('quote', id),
      'new-ticket': () => this.showTicketModal(),
      'edit-ticket': () => this.showTicketModal(id),
      'delete-ticket': () => this.deleteTicket(id),
      'log-time': () => this.showTimeModal(id),
      'new-client': () => this.showClientModal(),
      'edit-client': () => this.showClientModal(id),
      'delete-client': () => this.deleteClient(id),
      'new-product': () => this.showItemModal('product'),
      'edit-product': () => this.showItemModal('product', id),
      'delete-product': () => this.deleteItem('product', id),
      'new-service': () => this.showItemModal('service'),
      'edit-service': () => this.showItemModal('service', id),
      'delete-service': () => this.deleteItem('service', id),
      'save-settings': () => this.saveSettings(),
      'export-excel': () => this.exportExcel(),
      'export-report-pdf': () => this.exportReportPdf(),
      'new-expense': () => this.showExpenseModal(),
      'edit-expense': () => this.showExpenseModal(id),
      'delete-expense': () => this.deleteExpense(id),
      'record-payment': () => this.showPaymentModal(id),
      'backup-data': () => this.backupData(),
      'restore-data': () => this.restoreData(),
      'filter-invoices': () => this.filterList('invoice'),
      'filter-quotes': () => this.filterList('quote'),
      'generate-recurring': () => this.generateRecurring(),
      'activate-license': () => this.doServerActivate(),
      'resolve-to-invoice': () => this.resolveTicketToInvoice(id),
      'go-invoices': () => this.navigate('invoices'),
      'go-quotes': () => this.navigate('quotes'),
      'go-tickets': () => this.navigate('tickets'),
      'go-clients': () => this.navigate('clients'),
      'go-expenses': () => this.navigate('expenses'),
      'duplicate-doc': () => this.duplicateDoc(id, el?.dataset?.type || 'invoice'),
      'dismiss-tutorial': () => this.dismissTutorial(),
      'settings-tab': () => { this.settingsTab = el?.dataset?.tab || 'company'; this.render(); },
      'go-documents': () => this.navigate('documents'),
      'go-industry': () => this.navigate('industry'),
      'go-dashboard': () => this.navigate('dashboard'),
      'go-settings': () => this.navigate('settings'),
      'go-account': () => this.navigate('account'),
      'export-backup': () => this.exportBackup(),
      'import-backup': () => this.importBackup(),
      'save-company-slot': () => this.saveCompanySlot(),
      'switch-company': (id) => this.switchCompany(id),
      'check-updates': () => this.checkForUpdates(false),
      'save-update-server': () => this.saveUpdateServerUrl(),
      'owner-unlock': () => this.ownerUnlock(),
      'apply-industry': () => this.applyIndustry(id || el?.dataset?.id),
      'dismiss-popia-tut': () => this.dismissPopiaTutorial(),
      'load-demo': () => this.loadDemoData(),
      'new-employee': () => this.showEmployeeModal(),
      'edit-employee': () => this.showEmployeeModal(id),
      'delete-employee': () => this.deleteEmployee(id),
      'new-payslip': () => this.showPayslipModal(),
      'export-sars-csv': () => this.exportSarsPayrollCsv(),
      'pdf-payslip': () => this.pdfPayslip(id),
      'delete-payslip': () => this.deletePayslip(id),
      'new-popia-request': () => this.showPopiaRequestModal(),
      'save-popia-settings': () => this.savePopiaSettings(),
      'resolve-popia': () => this.resolvePopiaRequest(id),
      'pdf-privacy-notice': () => this.pdfPrivacyNotice(),
      'go-payroll': () => this.navigate('payroll'),
      'go-popia': () => this.navigate('popia'),
      'gen-business-doc': () => this.generateBusinessDocPdf(),
      'preview-business-doc': () => this.previewBusinessDoc(),
      'save-license-server': () => this.saveLicenseServerUrl(),
      'get-hwid': () => this.doGetHwid(),
      'license-request': () => this.doLicenseRequest(),
      'license-claim': () => this.doLicenseClaim(),
      'save-google-client': () => {
        const v = document.getElementById('google-client-id')?.value || '';
        Auth.setGoogleClientId(v);
        this.toast(v ? 'Google Client ID saved' : 'Google Client ID cleared');
      }
    };
    if (actions[action]) actions[action]();
  },


  // ========== HOME (document hub) ==========
  renderHome() {
    const co = this.company || {};
    const st = this.licenseStatus || {};
    const invN = (this.invoices||[]).length;
    const qtN = (this.quotes||[]).length;
    const clN = (this.clients||[]).length;
    const name = Auth.currentUser?.fullName || Auth.currentUser?.username || 'there';
    return `
      <div class="home-hero mb-6">
        <div class="home-hero-inner">
          <div>
            <p class="text-sm opacity-90 mb-1">Welcome back</p>
            <h2 class="text-3xl font-extrabold tracking-tight mb-2">${name}</h2>
            <p class="text-sm opacity-90 max-w-xl">${co.name || 'Complete company setup in Settings'} · ${(this.profilePack&&this.profilePack.tagline)||this.businessTemplate||'Business'} · ${st.label||'License'}</p>
          </div>
          <img src="icons/logo.svg" alt="" class="home-hero-logo" width="64" height="64"/>
        </div>
        <div class="home-glass-row">
          ${this.hasModule('invoices')?`<button type="button" data-action="new-invoice" class="home-glass-tab">+ Invoice</button>`:''}
          ${this.hasModule('quotes')?`<button type="button" data-action="new-quote" class="home-glass-tab">${this.getProfileLabel('quotes','Quote')}</button>`:''}
          <button type="button" data-action="go-dashboard" class="home-glass-tab">Dashboard KPIs</button>
          <button type="button" data-action="go-documents" class="home-glass-tab">Doc generator</button>
          <button type="button" data-action="go-industry" class="home-glass-tab">Industries</button>
          <button type="button" data-action="go-settings" class="home-glass-tab">Settings</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div class="card p-5 lg:col-span-2">
          <h3 class="font-bold text-lg mb-3">Profile summary</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div class="p-3 rounded-xl bg-slate-50"><div class="text-xs text-slate-500">Company</div><div class="font-semibold">${co.name||'—'}</div></div>
            <div class="p-3 rounded-xl bg-slate-50"><div class="text-xs text-slate-500">VAT</div><div class="font-semibold">${co.vatNo||'—'}</div></div>
            <div class="p-3 rounded-xl bg-slate-50"><div class="text-xs text-slate-500">CIPC</div><div class="font-semibold">${co.regNo||'—'}</div></div>
            <div class="p-3 rounded-xl bg-slate-50"><div class="text-xs text-slate-500">Industry</div><div class="font-semibold">${this.profilePack?.name||this.businessTemplate}</div></div>
            <div class="p-3 rounded-xl bg-slate-50"><div class="text-xs text-slate-500">Theme</div><div class="font-semibold">${this.template} / ${this.accent}</div></div>
            <div class="p-3 rounded-xl bg-slate-50"><div class="text-xs text-slate-500">Connection</div><div class="font-semibold">${this.isOnline?'Online':'Offline'}</div></div>
          </div>
        </div>
        <div class="card p-5">
          <h3 class="font-bold text-lg mb-3">Library counts</h3>
          <ul class="space-y-2 text-sm">
            <li class="flex justify-between"><span>Clients</span><strong>${clN}</strong></li>
            <li class="flex justify-between"><span>${this.getProfileLabel('invoices','Invoices')}</span><strong>${invN}</strong></li>
            <li class="flex justify-between"><span>${this.getProfileLabel('quotes','Quotes')}</span><strong>${qtN}</strong></li>
            <li class="flex justify-between"><span>Products</span><strong>${(this.products||[]).length}</strong></li>
            <li class="flex justify-between"><span>Services</span><strong>${(this.services||[]).length}</strong></li>
          </ul>
          <button type="button" data-action="go-dashboard" class="btn btn-primary w-full mt-4">Open live Dashboard</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="card p-5">
          <h3 class="font-bold mb-2">Getting started</h3>
          <ol class="text-sm text-slate-600 space-y-1" style="list-style:decimal;padding-left:1.2rem">
            <li>Confirm company & banking under Settings</li>
            <li>Add a client</li>
            <li>Create your first ${this.getProfileLabel('invoices','invoice')}</li>
            <li>Optional: Document generator for letters</li>
          </ol>
        </div>
        <div class="card p-5">
          <h3 class="font-bold mb-2">Account</h3>
          <p class="text-sm text-slate-600 mb-3">Signed in as <strong>${Auth.currentUser?.username||''}</strong></p>
          <button type="button" data-action="go-account" class="btn btn-secondary">Manage account</button>
          <button type="button" data-action="load-demo" class="btn btn-outline ml-2">Load demo data</button>
        </div>
      </div>`;
  },

  renderDocGenerator() {
    const clients = this.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    const types = [
      { id:'sla', cat:'IT & Services', name:'SLA / Service Level Agreement' },
      { id:'consulting', cat:'Professional', name:'Consulting agreement' },
      { id:'engagement', cat:'Professional', name:'Letter of engagement' },
      { id:'goodstanding', cat:'Compliance', name:'Letter of good standing' },
      { id:'taxclearance', cat:'Compliance', name:'Tax clearance support letter' },
      { id:'nda', cat:'Legal', name:'Non-disclosure agreement (NDA)' },
      { id:'quotation_cover', cat:'Sales', name:'Quotation covering letter' },
      { id:'proforma', cat:'Sales', name:'Proforma invoice letter' },
      { id:'demand', cat:'Collections', name:'Payment demand / reminder' },
      { id:'finaldemand', cat:'Collections', name:'Final demand before action' },
      { id:'completion', cat:'Projects', name:'Works completion certificate' },
      { id:'popia_privacy', cat:'POPIA', name:'Privacy notice (POPIA)' },
      { id:'popia_operator', cat:'POPIA', name:'Operator agreement outline' },
      { id:'employment_offer', cat:'HR', name:'Offer of employment letter' },
      { id:'credit_app', cat:'Credit', name:'Credit application cover' }
    ];
    const cats = [...new Set(types.map(t=>t.cat))];
    return `
      <div class="page-header">
        <div>
          <h2>Document generator</h2>
          <p class="subtitle">Category-based SA letters · clauses · client merge · themed PDF</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-outline" data-action="doc-load-demo">Fill demo into form</button>
        </div>
      </div>
      <form id="docgen-form" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 space-y-4">
          <div class="card p-4">
            <label class="label">Category</label>
            <select id="docgen-cat" class="input mb-2">
              <option value="">All categories</option>
              ${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}
            </select>
            <label class="label">Document type *</label>
            <select name="docType" id="docgen-type" class="input">
              ${types.map(t=>`<option value="${t.id}" data-cat="${t.cat}">${t.name}</option>`).join('')}
            </select>
          </div>
          <div class="card p-4">
            <label class="label">Client / counterparty</label>
            <select name="clientId" class="input"><option value="">— Select —</option>${clients}</select>
            <label class="label mt-2">Or type name</label>
            <input name="clientNameOverride" class="input" placeholder="If not in list" />
          </div>
          <div class="card p-4 doc-block" data-for="sla,consulting,engagement">
            <label class="label">SLA / service levels</label>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="label text-xs">Response (hours)</label><input name="slaHours" type="number" class="input" value="8" /></div>
              <div><label class="label text-xs">Resolve (hours)</label><input name="slaResolve" type="number" class="input" value="48" /></div>
            </div>
            <label class="label mt-2">Coverage hours</label>
            <input name="slaCover" class="input" value="Weekdays 08:00–17:00 SAST" />
          </div>
        </div>
        <div class="lg:col-span-2 space-y-4">
          <div class="card p-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="label">Effective / letter date</label><input name="docDate" type="date" class="input" value="${new Date().toISOString().slice(0,10)}" /></div>
              <div><label class="label">Reference</label><input name="ref" class="input" placeholder="REF-…" /></div>
            </div>
            <label class="label mt-2">Subject line</label>
            <input name="subject" class="input" placeholder="Leave blank for default" />
            <label class="label mt-2">Scope / description</label>
            <textarea name="scope" class="input" rows="2" placeholder="What is covered by this document?"></textarea>
            <label class="label mt-2">Extra notes</label>
            <textarea name="notes" class="input" rows="2"></textarea>
          </div>
          <div class="card p-4">
            <label class="label">Clauses to include (tick)</label>
            <div class="mb-2">
              <label class="label">Clause pack (auto-tick)</label>
              <select id="clause-pack" class="input">
                <option value="">— Custom —</option>
                <option value="standard">Standard commercial</option>
                <option value="it">IT / SLA heavy</option>
                <option value="professional">Professional services</option>
                <option value="minimal">Minimal (payment + law only)</option>
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm" id="clause-grid">
              ${[
                ['conf','Confidentiality'],
                ['liability','Limitation of liability'],
                ['popia','POPIA / personal information'],
                ['payment','Payment terms (ZAR / VAT)'],
                ['termination','Termination'],
                ['law','Governing law – South Africa'],
                ['ip','Intellectual property'],
                ['force','Force majeure'],
                ['non_solicit','Non-solicitation of staff'],
                ['warranty','Service warranty (30 days)'],
                ['dispute','Dispute resolution (negotiation first)'],
                ['entire','Entire agreement'],
                ['cod','COD / deposit terms'],
                ['sla_credits','Service credit outline (SLA)'],
                ['insurance','Insurance requirement']
              ].map(([v,l])=>`<label class="flex gap-2 items-center"><input type="checkbox" name="clause_${v}" value="1"/> ${l}</label>`).join('')}
            </div>
            <p class="text-xs text-slate-500 mt-2">Packs pre-select common clauses; you can still tick/untick before generate.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" data-action="gen-business-doc">Generate PDF</button>
            <button type="button" class="btn btn-secondary" data-action="preview-business-doc">Preview text</button>
          </div>
          <div id="docgen-preview" class="hidden text-sm whitespace-pre-wrap p-4 rounded-lg border" style="max-height:360px;overflow:auto;background:#f8fafc"></div>
        </div>
      </form>`;
  },


  buildBusinessDocPayload() {
    const form = document.getElementById('docgen-form');
    if (!form) throw new Error('Open the Document generator page first');
    const d = Object.fromEntries(new FormData(form));
    const co = this.company || {};
    const client = this.clients.find(c => String(c.id) === String(d.clientId)) || {};
    const clientName = (d.clientNameOverride && d.clientNameOverride.trim()) || client.name || 'Valued Client';
    const type = d.docType || 'sla';
    const hours = d.slaHours || '8';
    const resolveH = d.slaResolve || '48';
    const notes = (d.notes || '').trim();
    const ref = (d.ref || '').trim() || (`REF-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`);
    const dateObj = d.docDate ? new Date(d.docDate) : new Date();
    const dateStr = dateObj.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });

    const titles = {
      sla: 'SERVICE LEVEL AGREEMENT',
      consulting: 'CONSULTING AGREEMENT',
      goodstanding: 'LETTER OF GOOD STANDING',
      taxclearance: 'TAX CLEARANCE – SUPPORTING LETTER',
      engagement: 'LETTER OF ENGAGEMENT',
      quotation_cover: 'QUOTATION COVERING LETTER',
      demand: 'PAYMENT REMINDER',
      completion: 'WORKS COMPLETION CERTIFICATE'
    };
    const title = (d.subject && d.subject.trim()) || titles[type] || 'DOCUMENT';

    let bodyLines = [];
    if (type === 'sla') {
      bodyLines = [
        `This Service Level Agreement ("Agreement") is entered into between ${co.name || 'the Service Provider'} ("Provider") and ${clientName} ("Client").`,
        '1. Scope of services\nThe Provider shall supply information technology and related professional services as described in accepted quotations, job cards and tax invoices issued under this Agreement. Services may include support, maintenance, installation, remote assistance and on-site call-outs within the Republic of South Africa.',
        `2. Response and resolution targets\n• Priority incidents: initial response within ${hours} business hours during weekdays 08:00–17:00 SAST (excluding South African public holidays).\n• Standard requests: target resolution within ${resolveH} business hours where access and parts are available.\n• Emergency after-hours support may be charged at the Provider’s published call-out rates.`,
        '3. Client responsibilities\nThe Client shall provide timely access to premises, systems, credentials and decision-makers; maintain current backups where applicable; and ensure a safe working environment for on-site staff.',
        '4. Fees and payment\nAll fees are quoted and invoiced in South African Rand (ZAR). Where the Provider is a registered VAT vendor, VAT is charged at the prevailing SARS rate (currently 15%) unless zero-rated or exempt. Payment is due strictly as stated on each tax invoice (typically 7, 14 or 30 days). COD terms apply where agreed on the job card.',
        '5. Limitation of liability\nTo the fullest extent permitted by South African law, the Provider’s aggregate liability arising from any incident is limited to the fees paid for the affected services in the three (3) months preceding the claim. The Provider is not liable for indirect or consequential loss, including lost profits or data, except where caused by gross negligence or wilful misconduct.',
        '6. General\nThis Agreement is governed by the laws of the Republic of South Africa. Any dispute shall first be referred to good-faith negotiation in the province where the Provider is based. Variations must be in writing. This document may be signed in counterparts (including electronic acceptance).'
      ];
    } else if (type === 'consulting') {
      bodyLines = [
        `This Consulting Agreement is between ${co.name || 'the Consultant'} ("Consultant") and ${clientName} ("Client").`,
        '1. Engagement\nThe Consultant will provide professional consulting services on a project or retainer basis as set out in the relevant quotation or statement of work. Work is performed with due care and skill consistent with ordinary professional practice in South Africa.',
        '2. Deliverables and timelines\nDeliverables, milestones and estimated timelines will be agreed in writing. Delays caused by late Client input may shift delivery dates without penalty to the Consultant.',
        '3. Fees\nFees are exclusive or inclusive of VAT as stated on each tax invoice, payable in ZAR to the Consultant’s nominated South African bank account. A deposit may be required before work starts.',
        '4. Confidentiality and IP\nEach party shall keep the other’s confidential information secure. Pre-existing intellectual property remains with its owner; project-specific deliverables transfer to the Client on full payment unless otherwise agreed.',
        '5. Termination\nEither party may terminate on thirty (30) days’ written notice. Fees for work performed to the termination date remain payable.',
        '6. Governing law\nLaws of the Republic of South Africa apply.',
        'POPIA: Personal information is processed only as needed to perform this engagement, retained securely, and not sold to third parties.'
      ];
    } else if (type === 'goodstanding') {
      bodyLines = [
        'To whom it may concern,',
        `We confirm that ${clientName} is a client of ${co.name || 'our firm'} and, to the best of our knowledge and based on our records as at ${dateStr}, maintains an account in good standing.`,
        'This letter is issued at the Client’s request for general business purposes. It does not constitute a guarantee of future performance, creditworthiness, or an audit opinion, and may not be relied upon as a suretyship or financial undertaking.',
        `Should you require verification, please contact us on ${co.phone || 'our office number'} or ${co.email || 'our email address'}.`
      ];
    } else if (type === 'taxclearance') {
      bodyLines = [
        'To whom it may concern,',
        `Re: Supporting letter – ${clientName}`,
        `We confirm that we maintain a bona fide business relationship with ${clientName}. This letter is provided in support of the Client’s tax compliance / tax clearance processes with the South African Revenue Service (SARS) where a third-party confirmation is requested.`,
        'We do not act as the Client’s registered tax practitioner solely by virtue of this letter. Any tax advice is limited to the scope of our separate engagement terms, if any.',
        `For queries, contact ${co.name || 'our offices'} at ${co.email || ''} ${co.phone || ''}.`
      ];
    } else if (type === 'engagement') {
      bodyLines = [
        `Dear ${clientName},`,
        `Thank you for appointing ${co.name || 'us'}. This letter sets out the basis on which we will provide professional services to you in South Africa.`,
        'Scope: As described in our quotation or proposal, updated by written agreement from time to time.',
        'Fees: Billed in ZAR on tax invoice. VAT charged if we are registered. Our standard payment terms apply unless a signed agreement states otherwise.',
        'Your information: You warrant that information you supply is accurate. We will handle personal information in line with POPIA to the extent applicable to this engagement.',
        'Please sign and return a copy of this letter (or confirm by email) to accept these terms. We look forward to working with you.'
      ];
    } else if (type === 'demand') {
      bodyLines = [
        `Dear ${clientName},`,
        'According to our records, one or more tax invoices remain unpaid past the stated due date. Kindly arrange payment in South African Rand to the banking details printed on the invoice within seven (7) calendar days of this letter.',
        'If payment has already been made, please send proof of payment so that we may update our records. Failing payment, we reserve our rights under South African law, including suspending further services and pursuing recovery.',
        `Contact: ${co.email || ''} · ${co.phone || ''}`
      ];

    } else if (type === 'nda') {
      bodyLines = [
        `NON-DISCLOSURE AGREEMENT (outline)`,
        `Between ${co.name||'Disclosing Party'} and ${clientName}.`,
        'Each party may receive confidential information. The receiving party shall not disclose it to third parties and shall use it only for evaluating or performing a business relationship.',
        'Obligations survive for three (3) years after disclosure unless information becomes public without breach.',
        'Governed by the laws of the Republic of South Africa.'
      ];
    } else if (type === 'proforma') {
      bodyLines = [
        `Dear ${clientName},`,
        'Please find our proforma details for the proposed supply. A tax invoice will be issued on acceptance / delivery as applicable.',
        'Amounts are in ZAR. VAT treatment will appear on the formal tax invoice if we are a vendor.'
      ];
    } else if (type === 'finaldemand') {
      bodyLines = [
        `Dear ${clientName},`,
        'FINAL DEMAND: Despite earlier reminders, payment remains outstanding. Kindly pay within five (5) days failing which we may suspend services and pursue recovery under South African law.',
        `Contact: ${co.email||''} · ${co.phone||''}`
      ];
    } else if (type === 'popia_privacy') {
      bodyLines = [
        `${co.name||'We'} process personal information as responsible party under POPIA.`,
        `Information officer: ${co.popiaIoName||'[Name]'} · ${co.popiaIoContact||co.email||''}`,
        `Purposes: ${co.popiaPurposes||'Invoicing, service delivery, employment, legal obligations.'}`,
        'You may request access, correction or deletion subject to the Act.'
      ];
    } else if (type === 'popia_operator') {
      bodyLines = [
        'OPERATOR AGREEMENT (outline)',
        `${co.name||'Responsible party'} may appoint ${clientName} as operator to process personal information only on documented instructions, with appropriate security measures under POPIA.`
      ];
    } else if (type === 'employment_offer') {
      bodyLines = [
        `Dear ${clientName},`,
        `We are pleased to offer you employment with ${co.name||'our company'} subject to final contract.`,
        'Please confirm acceptance in writing. This letter is not the full employment contract.'
      ];
    } else if (type === 'credit_app') {
      bodyLines = [
        `Dear ${clientName},`,
        'Please complete our credit application so we may consider account facilities. Approval is not guaranteed and is subject to our internal policy.'
      ];
    } else if (type === 'completion') {
      bodyLines = [
        `Date: ${dateStr}`,
        `Client: ${clientName}`,
        `Reference: ${ref}`,
        `We, ${co.name || 'the Contractor'}, confirm that the works and/or services under the above reference have been completed substantially in accordance with the agreed scope as at the date of this certificate, subject to any snag list agreed in writing.`,
        'This certificate does not waive outstanding payment obligations or warranty terms stated on the related tax invoice or agreement.'
      ];
    } else {
      bodyLines = [
        `Dear ${clientName},`,
        `Please find our quotation for professional services. All amounts are in South African Rand (ZAR). VAT treatment is shown on the quotation in line with SARS requirements.`,
        'This quotation is valid for the period stated on the quote document (typically 7–30 days). Acceptance may be by signed quote, email confirmation, or issuance of a purchase order.',
        'We look forward to your favourable response.'
      ];
    }
    
    const clauseBits = [];
    if (d.clause_conf) clauseBits.push('Confidentiality: Each party shall keep confidential information secure and use it only for the purpose of this engagement.');
    if (d.clause_liability) clauseBits.push('Limitation of liability: Aggregate liability is limited to fees paid for the affected services in the preceding three (3) months, except for fraud or gross negligence.');
    if (d.clause_popia) clauseBits.push('POPIA: Personal information is processed only as needed for this engagement and in line with the Protection of Personal Information Act 4 of 2013.');
    if (d.clause_payment) clauseBits.push('Payment: Fees are invoiced in South African Rand (ZAR). VAT is charged if the supplier is a registered VAT vendor. Payment is due as stated on each tax invoice.');
    if (d.clause_termination) clauseBits.push('Termination: Either party may terminate on written notice as stated in the main agreement or, failing that, on thirty (30) days’ notice.');
    if (d.clause_law) clauseBits.push('Governing law: This document is governed by the laws of the Republic of South Africa.');
    if (d.clause_ip) clauseBits.push('Intellectual property: Pre-existing IP remains with its owner; deliverables transfer on full payment unless agreed otherwise.');
    if (d.clause_force) clauseBits.push('Force majeure: Neither party is liable for delays caused by events beyond reasonable control.');
    if (d.clause_non_solicit) clauseBits.push('Non-solicitation: During the engagement and for 6 months after, neither party shall solicit the other\'s employees involved in the work, except with written consent.');
    if (d.clause_warranty) clauseBits.push('Warranty: Services are performed with reasonable skill and care. Defects reported within 30 days will be remedied at no extra charge where reasonably practicable.');
    if (d.clause_dispute) clauseBits.push('Dispute resolution: Parties shall attempt good-faith negotiation before formal proceedings. Mediation may be used by agreement.');
    if (d.clause_entire) clauseBits.push('Entire agreement: This document and related invoices/quotes supersede prior informal discussions on the same subject.');
    if (d.clause_cod) clauseBits.push('COD / deposit: Where indicated on the quote or job card, a deposit or cash-on-delivery applies before delivery of goods or release of work product.');
    if (d.clause_sla_credits) clauseBits.push('Service credits: Material SLA misses may attract service credits as agreed in writing; credits are the sole remedy unless otherwise agreed.');
    if (d.clause_insurance) clauseBits.push('Insurance: Each party shall maintain insurance appropriate to its business risks for the duration of the engagement.');
    if (d.scope) bodyLines.push('Scope:\\n' + d.scope);
    if (clauseBits.length) bodyLines.push('Selected clauses:\\n' + clauseBits.map((c,i)=>(i+1)+'. '+c).join('\\n'));

    if (notes) bodyLines.push('Additional terms / notes:\n' + notes);

    return {
      company: co,
      client: { name: clientName, address: client.address, email: client.email, phone: client.phone },
      title,
      bodyLines,
      date: dateStr,
      ref,
      template: this.template || 'classic',
      colour: this.accent || 'green'
    };
  },

  docLoadDemo() {
    const form = document.getElementById('docgen-form');
    if (!form) return this.toast('Open Document generator first', 'error');
    const set = (n,v) => { const el = form.elements.namedItem(n); if (el) el.value = v; };
    set('subject', 'Demo – professional services arrangement');
    set('ref', 'DEMO-' + new Date().getFullYear() + '-001');
    set('scope', 'Remote and on-site professional services as agreed in writing.');
    set('notes', 'This is sample content for training — replace before sending to clients.');
    set('slaHours', '4');
    set('slaResolve', '24');
    if (this.clients[0]) {
      const sel = form.elements.namedItem('clientId');
      if (sel) sel.value = String(this.clients[0].id);
    } else {
      set('clientNameOverride', 'Demo Client (Pty) Ltd');
    }
    this.toast('Demo fields filled — Preview or Generate PDF');
  },

  previewBusinessDoc() {
    try {
      const payload = this.buildBusinessDocPayload();
      const el = document.getElementById('docgen-preview');
      if (!el) return this.toast('Preview area missing – refresh the page', 'error');
      el.textContent = [payload.title, 'Date: ' + payload.date, 'Ref: ' + payload.ref, '', ...payload.bodyLines, '', APP_COPYRIGHT || 'SA Invoice Pro'].join('\n\n');
      el.classList.remove('hidden');
      this.toast('Preview updated');
    } catch (e) {
      this.toast(e.message || 'Preview failed', 'error');
    }
  },

  generateBusinessDocPdf() {
    try {
      if (typeof window.generateBusinessLetterPDF !== 'function') {
        throw new Error('PDF engine not ready – hard-refresh (Ctrl+F5) and try again');
      }
      const payload = this.buildBusinessDocPayload();
      payload.signName = this.pdfSignName || this.company?.name;
      payload.signTitle = this.pdfSignTitle || '';
      generateBusinessLetterPDF(payload);
      this.toast('PDF downloaded – themed like your invoices');
    } catch (e) {
      console.error(e);
      window.__SA_DEBUG = window.__SA_DEBUG || [];
      window.__SA_DEBUG.push(String(e.message || e));
      this.toast(e.message || 'PDF failed', 'error');
    }
  },

  async loadDemoData() {
    if (!confirm('Load realistic SA demo data? (sample clients, invoices, products – safe to try)')) return;
    if (!this.requireLicense()) return;
    try {
      const co = this.company || {};
      if (!co.name) {
        await DB.saveCompany({
          name: 'Nkosi Digital Solutions (Pty) Ltd',
          regNo: '2020/123456/07',
          vatNo: '4123456789',
          beeLevel: '2',
          phone: '011 555 0148',
          email: 'accounts@nkosidigital.co.za',
          address: '12 Rivonia Road, Sandton',
          city: 'Johannesburg',
          postalCode: '2196',
          province: 'Gauteng',
          bankName: 'FNB',
          bankAccountName: 'Nkosi Digital Solutions',
          bankAccountNo: '62801234567',
          bankBranch: '250655',
          terms: 'Payment due within 14 days. Interest may be charged on overdue accounts. Thank you for your business.'
        });
      }
      const clients = [
        { name: 'Mthatha Logistics CC', email: 'ap@mthathalogistics.co.za', phone: '047 531 2200', address: '45 York Road, Mthatha', type: 'business', vatNo: '4987654321' },
        { name: 'Cape Flora Retail (Pty) Ltd', email: 'finance@capeflora.co.za', phone: '021 555 0199', address: '88 Long Street, Cape Town', type: 'business' },
        { name: 'Dr S. van der Berg', email: 'svanderberg@mail.co.za', phone: '082 555 0177', address: 'Pretoria East', type: 'individual' }
      ];
      const existingClients = await DB.getAll(DB.STORES.clients);
      if (existingClients.length < 2) {
        for (const c of clients) await DB.add(DB.STORES.clients, c);
      }
      const products = await DB.getAll(DB.STORES.products);
      if (!products.length) {
        await DB.add(DB.STORES.products, { name: 'Laptop – Business 14"', unitPrice: 12999, sku: 'NB-14', stock: 8, description: 'Incl. VAT-exclusive price' });
        await DB.add(DB.STORES.products, { name: 'Cat6 Network Cable (box)', unitPrice: 850, sku: 'CAB-C6', stock: 25 });
      }
      const services = await DB.getAll(DB.STORES.services);
      if (!services.length) {
        await DB.add(DB.STORES.services, { name: 'On-site support (hour)', unitPrice: 750, description: 'Weekday business hours', slaHours: 8 });
        await DB.add(DB.STORES.services, { name: 'Monthly retainer – Standard', unitPrice: 4500, description: 'Remote support + monitoring', slaHours: 4 });
      }
      const allClients = await DB.getAll(DB.STORES.clients);
      const c0 = allClients[0];
      const invs = await DB.getAll(DB.STORES.invoices);
      if (c0 && invs.length < 2) {
        const number = await DB.getNextNumber('invoice');
        const items = [
          { description: 'On-site support (hour)', qty: 3, unitPrice: 750 },
          { description: 'Cat6 Network Cable (box)', qty: 1, unitPrice: 850 }
        ];
        const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const vatAmount = this.vatEnabled ? subtotal * this.vatRate : 0;
        await DB.add(DB.STORES.invoices, {
          number, date: new Date().toISOString().slice(0, 10),
          clientId: c0.id, clientName: c0.name,
          items, subtotal, discount: 0, vatAmount, total: subtotal + vatAmount,
          status: 'unpaid', type: 'invoice', notes: 'Demo invoice – 14 days'
        });
        const qn = await DB.getNextNumber('quote');
        await DB.add(DB.STORES.quotes, {
          number: qn, date: new Date().toISOString().slice(0, 10),
          clientId: c0.id, clientName: c0.name,
          items: [{ description: 'Monthly retainer – Standard', qty: 1, unitPrice: 4500 }],
          subtotal: 4500, discount: 0,
          vatAmount: this.vatEnabled ? 4500 * this.vatRate : 0,
          total: 4500 + (this.vatEnabled ? 4500 * this.vatRate : 0),
          status: 'draft', type: 'quote'
        });
      }
      await this.loadData();
      this.toast('Demo data loaded – open Home, Invoices, or Doc generator');
      this.navigate('home');
    } catch (e) {
      this.toast(e.message || 'Demo load failed', 'error');
    }
  },

  // ========== DASHBOARD ==========
  renderDashboard() {
    const unpaid = this.invoices.filter(i => !['paid','cancelled'].includes(i.status));
    const paid = this.invoices.filter(i => i.status === 'paid');
    const openTickets = this.tickets.filter(t => !['closed','resolved'].includes(t.status));
    const totalOut = unpaid.reduce((s,i) => s+(i.total||0), 0);
    const totalPaid = paid.reduce((s,i) => s+(i.total||0), 0);
    const now = new Date();
    const expMonth = this.expenses.filter(e => {
      const d = new Date(e.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).reduce((s,e)=>s+(e.amount||0),0);
    const lowStock = this.products.filter(p => p.stock != null && p.stock <= (p.lowStockAlert||5));
    return `
      <div class="page-header">
        <div>
          <h2>Dashboard</h2>
          <p class="subtitle">Live KPIs · money & open work · not the same as Home</p>
        </div>
        <div class="page-actions">
          ${this.hasModule('invoices')?`<button data-action="run-recurring" class="btn btn-outline">Run recurring</button>
          <button data-action="new-recurring" class="btn btn-secondary">Recurring</button>
          <button data-action="new-invoice" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> Invoice</button>`:''}
          ${this.hasModule('quotes')?`<button data-action="new-quote" class="btn btn-secondary"><i data-lucide="file-pen" class="w-4 h-4"></i> Quote</button>`:''}
          ${this.hasModule('tickets')?`<button data-action="new-ticket" class="btn btn-secondary"><i data-lucide="ticket" class="w-4 h-4"></i> Ticket</button>`:''}
          ${this.hasModule('expenses')?`<button data-action="new-expense" class="btn btn-outline"><i data-lucide="wallet" class="w-4 h-4"></i> Expense</button>`:''}
        </div>
      </div>
      <div class="kpi-grid">
        <button type="button" data-action="go-invoices" class="stat-card text-left w-full cursor-pointer"><div class="value text-sa-green">${this.formatMoney(totalOut)}</div><div class="label">Outstanding · open invoices</div></button>
        <button type="button" data-action="go-invoices" class="stat-card text-left w-full cursor-pointer"><div class="value">${this.formatMoney(totalPaid)}</div><div class="label">Collected</div></button>
        ${this.hasModule('expenses')?`<button type="button" data-action="go-expenses" class="stat-card text-left w-full cursor-pointer"><div class="value">${this.formatMoney(expMonth)}</div><div class="label">Expenses (Month)</div></button>`:''}
        ${this.hasModule('tickets')?`<button type="button" data-action="go-tickets" class="stat-card text-left w-full cursor-pointer"><div class="value">${openTickets.length}</div><div class="label">Open Tickets</div></button>`:`<button type="button" data-action="go-clients" class="stat-card text-left w-full cursor-pointer"><div class="value">${this.clients.length}</div><div class="label">Clients</div></button>`}
      </div>
      <p class="text-xs text-slate-400 mb-4">v${typeof APP_VERSION!=='undefined'?APP_VERSION:'1.1'} · click a card or row to open</p>
      ${lowStock.length ? `<div class="card p-4 mb-6 border-l-4" style="border-left-color:#ea580c">
        <h3 class="font-semibold text-orange-600 mb-2">Low Stock Alert</h3>
        ${lowStock.map(p => `<div class="text-sm">${p.name}: <strong>${p.stock}</strong> left</div>`).join('')}
      </div>` : ''}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Recent Invoices</h3>
          ${this.invoices.slice(-5).reverse().map(i => {
            const c = this.clients.find(x=>x.id===i.clientId);
            return `<button type="button" data-action="edit-invoice" data-id="${i.id}" class="w-full flex justify-between py-2 border-b text-sm text-left hover:bg-slate-50 rounded px-1">
              <span class="font-medium">${i.number} • ${c?.name||''}</span><span class="badge badge-${i.status}">${i.status}</span></button>`;
          }).join('') || '<p class="text-slate-400 text-sm">No invoices yet</p>'}
          ${this.hasModule('quotes') ? `<h3 class="font-semibold mb-3 mt-4">Recent Quotes</h3>
          ${this.quotes.slice(-3).reverse().map(q => {
            const c = this.clients.find(x=>x.id===q.clientId);
            return `<button type="button" data-action="edit-quote" data-id="${q.id}" class="w-full flex justify-between py-2 border-b text-sm text-left hover:bg-slate-50 rounded px-1">
              <span>${q.number} • ${c?.name||''}</span><span class="badge badge-${q.status||'draft'}">${q.status||'draft'}</span></button>`;
          }).join('') || '<p class="text-slate-400 text-sm">No quotes yet</p>'}` : ''}
        </div>
        ${this.hasModule('tickets') ? `<div class="card p-5">
          <h3 class="font-semibold mb-3">Open Tickets</h3>
          ${openTickets.slice(0,5).map(t => {
            const c = this.clients.find(x=>x.id===t.clientId);
            return `<div class="flex justify-between items-center gap-2 py-2 border-b text-sm">
              <button type="button" data-action="edit-ticket" data-id="${t.id}" class="flex-1 text-left hover:underline">
                <span class="font-medium">${t.number}</span> • ${t.subject||''}
              </button>
              <button type="button" data-action="resolve-to-invoice" data-id="${t.id}" class="btn btn-outline p-1.5 text-sa-green" title="Resolve & create invoice">
                <i data-lucide="file-plus" class="w-4 h-4"></i>
              </button>
              <span class="badge badge-${t.priority||'medium'}">${t.priority||'medium'}</span>
            </div>`;
          }).join('') || '<p class="text-slate-400 text-sm">No open tickets</p>'}
        </div>` : `<div class="card p-5">
          <h3 class="font-semibold mb-3">Quick tip</h3>
          <p class="text-sm text-slate-500">Your <strong>${this.businessTemplate}</strong> profile is active. Menu only shows tools for this business type. Change it anytime in Settings.</p>
        </div>`}
      </div>`;
  },

  // ========== DOCS ==========
  renderDocs(type) {
    const isQuote = type === 'quote';
    const list = isQuote ? this.quotes : this.invoices;
    const sorted = [...list].sort((a,b) => new Date(b.date)-new Date(a.date));
    const filterKey = isQuote ? 'quoteFilter' : 'invoiceFilter';
    const statusFilter = this[filterKey] || 'all';
    let filtered = statusFilter === 'all' ? sorted : sorted.filter(d => d.status === statusFilter);
    if (this.docSearch) {
      const q = this.docSearch;
      filtered = filtered.filter(d => {
        const c = this.clients.find(x=>x.id===d.clientId);
        const name = (c?.name || d.clientName || '').toLowerCase();
        return (d.number||'').toLowerCase().includes(q) || name.includes(q) || (d.status||'').toLowerCase().includes(q);
      });
    }
    return `
      <div class="page-header">
        <div><h2>${isQuote?'Quotes':'Invoices'}</h2>
          <p class="subtitle">${list.length} docs • Template: ${this.template} • VAT ${this.vatEnabled?'ON':'OFF'}</p></div>
        <div class="flex gap-2">
          ${!isQuote ? `<button data-action="generate-recurring" class="btn btn-secondary"><i data-lucide="repeat" class="w-4 h-4"></i> Run Recurring</button>` : ''}
          <button data-action="new-${type}" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> New</button>
        </div>
      </div>
      ${sorted.length===0 ? `<div class="card empty-state"><i data-lucide="file-text"></i><p>No documents yet</p>
        <button data-action="new-${type}" class="btn btn-primary mt-3">Create first</button></div>` : `
        <div class="card overflow-hidden"><div class="table-container"><table class="data-table">
          <thead><tr><th>#</th><th>Client</th><th>Date</th><th>Total</th><th>Status</th><th>Recurring</th><th>Actions</th></tr></thead>
          <tbody>${filtered.map(doc => {
            const c = this.clients.find(x=>x.id===doc.clientId);
            return `<tr>
              <td class="font-medium">${doc.number}</td>
              <td>${c?.name||doc.clientName||'—'}</td>
              <td>${this.formatDate(doc.date)}</td>
              <td class="font-medium">${this.formatMoney(doc.total)}</td>
              <td><span class="badge badge-${doc.status||'open'}">${doc.status||'open'}</span></td>
              <td>${doc.recurring ? `<span class="badge badge-converted">${doc.recurringInterval||'monthly'}</span>` : '—'}</td>
              <td><div class="flex flex-wrap gap-1">
                <button data-action="preview-${type}" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Preview"><i data-lucide="eye" class="w-4 h-4"></i></button>
                <button data-action="pdf-${type}" data-id="${doc.id}" class="btn btn-outline p-1.5"><i data-lucide="download" class="w-4 h-4"></i></button>
                <button data-action="edit-${type}" data-id="${doc.id}" class="btn btn-outline p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button data-action="status-${type}" data-id="${doc.id}" class="btn btn-outline p-1.5" title="Status"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>
                ${!isQuote && doc.status!=='paid'?`<button data-action="record-payment" data-id="${doc.id}" class="btn btn-outline p-1.5 text-sa-green" title="Record payment"><i data-lucide="banknote" class="w-4 h-4"></i></button>`:''}
                <button data-action="duplicate-doc" data-id="${doc.id}" data-type="${type}" class="btn btn-outline p-1.5" title="Duplicate"><i data-lucide="copy" class="w-4 h-4"></i></button>
                ${isQuote?`<button data-action="convert-quote" data-id="${doc.id}" class="btn btn-outline p-1.5 text-sa-green" title="Convert"><i data-lucide="arrow-right" class="w-4 h-4"></i></button>`:''}
                <button data-action="email-doc" data-id="${doc.id}" data-type="${type}" class="btn btn-outline p-1.5"><i data-lucide="mail" class="w-4 h-4"></i></button>
                <button data-action="share-whatsapp" data-id="${doc.id}" data-type="${type}" class="btn btn-outline p-1.5 text-green-600"><i data-lucide="message-circle" class="w-4 h-4"></i></button>
                <button data-action="delete-${type}" data-id="${doc.id}" class="btn btn-outline p-1.5 text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
              </div></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div></div>`}`;
  },

  // ========== TICKETS + TIME ==========
  renderTickets() {
    const sorted = [...this.tickets].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h2 class="text-2xl font-bold">Tickets / SLA / Time</h2>
          <p class="text-slate-500 text-sm">IT, support, COD jobs + time tracking</p></div>
        <button data-action="new-ticket" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> New Ticket</button>
      </div>
      ${sorted.length===0 ? `<div class="card empty-state"><i data-lucide="ticket"></i><p>No tickets yet</p>
        <button data-action="new-ticket" class="btn btn-primary mt-3">Create Ticket</button></div>` : `
        <div class="card overflow-hidden"><div class="table-container"><table class="data-table">
          <thead><tr><th>#</th><th>Subject</th><th>Client</th><th>Type</th><th>Priority</th><th>Time Logged</th><th>SLA Due</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${sorted.map(t => {
            const c = this.clients.find(x=>x.id===t.clientId);
            const mins = this.timeEntries.filter(e=>e.ticketId===t.id).reduce((s,e)=>s+(e.minutes||0),0);
            return `<tr>
              <td class="font-medium">${t.number}</td>
              <td>${t.subject||'—'}</td>
              <td>${c?.name||'—'}</td>
              <td><span class="badge badge-draft">${t.type||'support'}</span></td>
              <td><span class="badge badge-${['high','critical'].includes(t.priority)?'overdue':t.priority==='low'?'paid':'unpaid'}">${t.priority||'medium'}</span></td>
              <td>${mins ? (mins/60).toFixed(1)+'h' : '—'}</td>
              <td>${this.formatDate(t.slaDue)}</td>
              <td><span class="badge badge-${t.status||'open'}">${t.status||'open'}</span></td>
              <td>
                <button data-action="log-time" data-id="${t.id}" class="btn btn-outline p-1.5" title="Log time"><i data-lucide="clock" class="w-4 h-4"></i></button>
                <button data-action="resolve-to-invoice" data-id="${t.id}" class="btn btn-outline p-1.5 text-sa-green" title="Resolve & invoice"><i data-lucide="file-plus" class="w-4 h-4"></i></button>
                <button data-action="edit-ticket" data-id="${t.id}" class="btn btn-outline p-1.5" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button data-action="delete-ticket" data-id="${t.id}" class="btn btn-outline p-1.5 text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div></div>`}`;
  },

  async showTicketModal(id=null) {
    const t = id ? this.tickets.find(x=>x.id===id) : {};
    const number = t.number || await DB.getNextNumber('ticket');
    this.showModal(`
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">${id?'Edit':'New'} Ticket</h3>
          <button onclick="App.closeModal()" class="p-2"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="ticket-form" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Ticket #</label><input name="number" class="input" value="${number}" readonly /></div>
            <div><label class="label">Type</label>
              <select name="type" class="input">${['support','it','sla','cod','maintenance','other'].map(ty=>`<option value="${ty}" ${t.type===ty?'selected':''}>${ty.toUpperCase()}</option>`).join('')}</select>
            </div>
          </div>
          <div><label class="label">Subject *</label><input name="subject" class="input" value="${t.subject||''}" required /></div>
          <div><label class="label">Client</label>
            <select name="clientId" class="input"><option value="">— Optional —</option>
              ${this.clients.map(c=>`<option value="${c.id}" ${t.clientId==c.id?'selected':''}>${c.name}</option>`).join('')}</select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Priority</label>
              <select name="priority" class="input">${['low','medium','high','critical'].map(p=>`<option value="${p}" ${t.priority===p?'selected':''}>${p}</option>`).join('')}</select>
            </div>
            <div><label class="label">Status</label>
              <select name="status" class="input">${['open','in-progress','waiting','resolved','closed'].map(s=>`<option value="${s}" ${t.status===s?'selected':''}>${s}</option>`).join('')}</select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">SLA Due</label><input name="slaDue" type="date" class="input" value="${t.slaDue||''}" /></div>
            <div><label class="label">COD Amount (R)</label><input name="codAmount" type="number" step="0.01" class="input" value="${t.codAmount||''}" /></div>
          </div>
          <div>
            <label class="label">Linked Invoice</label>
            <select name="invoiceId" class="input">
              <option value="">— None —</option>
              ${this.invoices.map(inv => `<option value="${inv.id}" ${t.invoiceId==inv.id?'selected':''}>${inv.number} (${this.formatMoney(inv.total)})</option>`).join('')}
            </select>
          </div>
          <div><label class="label">Job Card / Work Done</label><textarea name="jobCard" class="input" rows="2" placeholder="Work performed, parts used, site notes...">${t.jobCard||''}</textarea></div>
          <div><label class="label">Description</label><textarea name="description" class="input" rows="2">${t.description||''}</textarea></div>
          <div class="flex flex-wrap gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.saveTicket(${id||'null'})">Save Ticket</button>
            ${id ? `<button type="button" class="btn btn-secondary" onclick="App.ticketToInvoice(${id})"><i data-lucide="file-plus" class="w-4 h-4"></i> Create Invoice</button>` : ''}
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveTicket(id) {
    const data = Object.fromEntries(new FormData(document.getElementById('ticket-form')));
    if (!data.subject) return this.toast('Subject required','error');
    data.clientId = data.clientId ? Number(data.clientId) : null;
    data.invoiceId = data.invoiceId ? Number(data.invoiceId) : null;
    data.codAmount = parseFloat(data.codAmount)||0;
    data.createdAt = data.createdAt || new Date().toISOString();
    if (id) { data.id=id; await DB.put(DB.STORES.tickets, data); }
    else await DB.add(DB.STORES.tickets, data);
    await this.loadData(); this.closeModal(); this.render(); this.toast('Ticket saved');
  },

  async ticketToInvoice(ticketId, opts={}) {
    const t = this.tickets.find(x => x.id === ticketId);
    if (!t) return;
    if (!this.requireLicense()) return;
    const resolve = opts.resolve !== false; // default resolve when converting
    const number = await DB.getNextNumber('invoice');
    const mins = this.timeEntries.filter(e => e.ticketId === ticketId).reduce((s,e) => s + (e.minutes||0), 0);
    const hours = mins / 60;
    const rate = 650;
    const items = [];
    if (hours > 0) items.push({ description: `Labour – Job ${t.number}: ${t.subject}`, qty: Math.round(hours*100)/100, unitPrice: rate });
    if (t.codAmount > 0) items.push({ description: `COD / Materials – ${t.number}`, qty: 1, unitPrice: t.codAmount });
    if (t.jobCard) items.push({ description: `Job: ${(t.jobCard||'').slice(0,100)}`, qty: 1, unitPrice: 0 });
    if (!items.length) items.push({ description: `Work – ${t.subject || t.number}`, qty: 1, unitPrice: 0 });
    const subtotal = items.reduce((s,i) => s + i.qty * i.unitPrice, 0);
    const vatAmount = this.vatEnabled ? subtotal * this.vatRate : 0;
    const inv = {
      number, date: new Date().toISOString().slice(0,10),
      clientId: t.clientId, clientName: this.clients.find(c=>c.id===t.clientId)?.name || '',
      items, subtotal, discount: 0, shipping: 0, vatAmount, total: subtotal + vatAmount,
      status: 'unpaid', type: 'invoice', docKind: 'invoice',
      notes: t.jobCard || t.description || '',
      reference: t.number, ticketId: t.id
    };
    const invId = await DB.add(DB.STORES.invoices, inv);
    t.invoiceId = invId;
    if (resolve) {
      t.status = 'resolved';
      t.resolvedAt = new Date().toISOString();
    }
    await DB.put(DB.STORES.tickets, t);
    await this.loadData();
    this.closeAllModals();
    this.toast(resolve ? `Ticket resolved → invoice ${number}` : `Invoice ${number} created`);
    this.showDocModal('invoice', invId);
  },

  async resolveTicketToInvoice(ticketId) {
    return this.ticketToInvoice(ticketId, { resolve: true });
  },

  async duplicateDoc(id, type='invoice') {
    const isQuote = type === 'quote';
    const src = isQuote ? this.quotes.find(x=>x.id===id) : this.invoices.find(x=>x.id===id);
    if (!src) return;
    if (!this.requireLicense()) return;
    const number = await DB.getNextNumber(isQuote ? 'quote' : 'invoice');
    const copy = { ...src, number, date: new Date().toISOString().slice(0,10), status: isQuote ? 'draft' : 'unpaid' };
    delete copy.id;
    const store = isQuote ? DB.STORES.quotes : DB.STORES.invoices;
    const newId = await DB.add(store, copy);
    await this.loadData();
    this.toast('Duplicated as ' + number);
    this.showDocModal(isQuote ? 'quote' : 'invoice', newId);
  },

  async deleteTicket(id) {
    if (!confirm('Delete ticket?')) return;
    await DB.remove(DB.STORES.tickets, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  showTimeModal(ticketId) {
    this.showModal(`
      <div class="p-6">
        <h3 class="text-xl font-bold mb-4">Log Time</h3>
        <form id="time-form" class="space-y-3">
          <div><label class="label">Minutes *</label><input name="minutes" type="number" min="1" class="input" required placeholder="e.g. 30" /></div>
          <div><label class="label">Note</label><input name="note" class="input" placeholder="What was done" /></div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-primary" onclick="App.saveTime(${ticketId})">Log Time</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveTime(ticketId) {
    const data = Object.fromEntries(new FormData(document.getElementById('time-form')));
    const minutes = parseInt(data.minutes)||0;
    if (minutes < 1) return this.toast('Enter minutes','error');
    await DB.add(DB.STORES.timeEntries, {
      ticketId, minutes, note: data.note||'', date: new Date().toISOString(), user: Auth.currentUser?.username
    });
    await this.loadData(); this.closeModal(); this.render(); this.toast(`${minutes} min logged`);
  },

  // ========== CLIENTS ==========
  renderClients() {
    return `
      <div class="flex justify-between items-center mb-6">
        <div><h2 class="text-2xl font-bold">Clients</h2><p class="text-slate-500 text-sm">${this.clients.length} clients</p></div>
        <button data-action="new-client" class="btn btn-primary"><i data-lucide="user-plus" class="w-4 h-4"></i> Add Client</button>
      </div>
      ${this.clients.length===0 ? `<div class="card empty-state"><i data-lucide="users"></i><p>No clients yet</p>
        <button data-action="new-client" class="btn btn-primary mt-3">Add Client</button></div>` :
        `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${this.clients.map(c => `
            <div class="card p-5">
              <div class="flex justify-between">
                <div><h3 class="font-semibold text-lg">${c.name}</h3>
                  <p class="text-sm text-slate-500">${c.email||c.phone||''}</p>
                  ${c.clientType?`<span class="badge badge-draft mt-1">${c.clientType}</span>`:''}</div>
                <div class="flex gap-1">
                  <button data-action="edit-client" data-id="${c.id}" class="btn btn-outline p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                  <button data-action="delete-client" data-id="${c.id}" class="btn btn-outline p-1.5 text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
              </div>
              <div class="mt-2 text-xs text-slate-500">${c.vatNo?`VAT: ${c.vatNo}`:''} ${c.city?`• ${c.city}`:''}</div>
            </div>`).join('')}
        </div>`}`;
  },

  showClientModal(id=null) {
    const c = id ? this.clients.find(x=>x.id===id) : {};
    this.showModal(`
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">${id?'Edit':'New'} Client</h3>
          <button onclick="App.closeModal()" class="p-2"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="client-form" class="space-y-3">
          <div><label class="label">Name *</label><input name="name" class="input" value="${c.name||''}" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Email</label><input name="email" type="email" class="input" value="${c.email||''}" /></div>
            <div><label class="label">Phone</label><input name="phone" class="input" value="${c.phone||''}" /></div>
            <div><label class="label">VAT No</label><input name="vatNo" class="input" value="${c.vatNo||''}" /></div>
            <div><label class="label">Reg No</label><input name="regNo" class="input" value="${c.regNo||''}" /></div>
            <div><label class="label">Client Type</label>
              <select name="clientType" class="input"><option value="">—</option>
                ${['standard','sla','cod','it-contract','retail','wholesale'].map(t=>`<option value="${t}" ${c.clientType===t?'selected':''}>${t}</option>`).join('')}</select>
            </div>
            <div><label class="label">Payment Terms</label>
              <select name="defaultTerms" class="input">${['','30 days','14 days','COD','Immediate','EOM'].map(t=>`<option value="${t}" ${c.defaultTerms===t?'selected':''}>${t||'—'}</option>`).join('')}</select>
            </div>
          </div>
          <div><label class="label">Address</label><input name="address" class="input" value="${c.address||''}" /></div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="label">City</label><input name="city" class="input" value="${c.city||''}" /></div>
            <div><label class="label">Postal</label><input name="postalCode" class="input" value="${c.postalCode||''}" /></div>
            <div><label class="label">Province</label><input name="province" class="input" value="${c.province||''}" /></div>
          </div>
          <div><label class="label">Notes</label><textarea name="notes" class="input" rows="2">${c.notes||''}</textarea></div>
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.saveClient(${id||'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveClient(id) {
    const data = Object.fromEntries(new FormData(document.getElementById('client-form')));
    if (!data.name?.trim()) return this.toast('Name required','error');
    if (data.name.trim().length < 2) return this.toast('Name too short','error');
    let newId = id;
    if (id) { data.id=id; await DB.put(DB.STORES.clients, data); }
    else newId = await DB.add(DB.STORES.clients, data);
    await this.loadData();
    this.closeModal(); // only closes top modal (client), keeps invoice open if stacked
    // Refresh client dropdown if invoice form is still open underneath
    const sel = document.querySelector('#invoice-form [name="clientId"]');
    if (sel) {
      sel.innerHTML = '<option value="">— Select —</option>' +
        this.clients.map(c => `<option value="${c.id}" ${c.id==newId?'selected':''}>${c.name}</option>`).join('');
      this.toast('Client added – selected on this invoice');
    } else {
      this.render();
      this.toast('Client saved');
    }
  },
  async deleteClient(id) {
    if (!confirm('Delete client?')) return;
    await DB.remove(DB.STORES.clients, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  // ========== PRODUCTS / SERVICES + STOCK ==========
  renderItems(kind) {
    const isService = kind === 'service';
    const list = isService ? this.services : this.products;
    return `
      <div class="flex justify-between items-center mb-6">
        <div><h2 class="text-2xl font-bold">${isService?'Services':'Products'}</h2>
          <p class="text-slate-500 text-sm">${list.length} ${isService?'services':'products'}${!isService?' • stock tracking enabled':''}</p></div>
        <button data-action="new-${kind}" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> Add</button>
      </div>
      ${list.length===0 ? `<div class="card empty-state"><i data-lucide="${isService?'wrench':'package'}"></i><p>No ${kind}s yet</p>
        <button data-action="new-${kind}" class="btn btn-primary mt-3">Add first</button></div>` : `
        <div class="card overflow-hidden"><div class="table-container"><table class="data-table">
          <thead><tr><th>Name</th><th>Description</th><th>Price</th>
            ${isService?'<th>SLA Hours</th>':'<th>Stock</th><th>SKU</th>'}
            <th></th></tr></thead>
          <tbody>${list.map(p => `<tr>
            <td class="font-medium">${p.name}</td>
            <td class="text-slate-500">${p.description||'—'}</td>
            <td>${this.formatMoney(p.unitPrice)}</td>
            ${isService?`<td>${p.slaHours||'—'}h</td>`:
              `<td class="${p.stock!=null&&p.stock<=(p.lowStockAlert||5)?'text-red-600 font-semibold':''}">${p.stock??'—'}</td>
               <td>${p.sku||'—'}</td>`}
            <td>
              <button data-action="edit-${kind}" data-id="${p.id}" class="btn btn-outline p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-action="delete-${kind}" data-id="${p.id}" class="btn btn-outline p-1.5 text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
        </table></div></div>`}`;
  },

  showItemModal(kind, id=null) {
    const isService = kind === 'service';
    const list = isService ? this.services : this.products;
    const p = id ? list.find(x=>x.id===id) : {};
    this.showModal(`
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">${id?'Edit':'New'} ${isService?'Service':'Product'}</h3>
          <button onclick="App.closeModal()" class="p-2"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="item-form" class="space-y-3">
          <div><label class="label">Name *</label><input name="name" class="input" value="${p.name||''}" required /></div>
          <div><label class="label">Description</label><textarea name="description" class="input" rows="2">${p.description||''}</textarea></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Unit Price (excl VAT)</label><input name="unitPrice" type="number" step="0.01" min="0" class="input" value="${p.unitPrice||''}" /></div>
            ${isService ? `<div><label class="label">Default SLA Hours</label><input name="slaHours" type="number" class="input" value="${p.slaHours||''}" /></div>` :
              `<div><label class="label">SKU</label><input name="sku" class="input" value="${p.sku||''}" /></div>`}
          </div>
          ${!isService ? `<div class="grid grid-cols-2 gap-3">
            <div><label class="label">Stock Level</label><input name="stock" type="number" class="input" value="${p.stock??''}" /></div>
            <div><label class="label">Low Stock Alert</label><input name="lowStockAlert" type="number" class="input" value="${p.lowStockAlert||5}" /></div>
          </div>` : `<div><label class="label">Category</label>
            <select name="category" class="input"><option value="">—</option>
              ${['IT Support','Maintenance','Consulting','Hosting','Development','Other'].map(c=>`<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}</select></div>`}
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.saveItem('${kind}',${id||'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveItem(kind, id) {
    const data = Object.fromEntries(new FormData(document.getElementById('item-form')));
    data.unitPrice = parseFloat(data.unitPrice)||0;
    if (data.slaHours) data.slaHours = parseFloat(data.slaHours)||0;
    if (data.stock !== undefined && data.stock !== '') data.stock = parseInt(data.stock);
    if (data.lowStockAlert) data.lowStockAlert = parseInt(data.lowStockAlert)||5;
    if (!data.name?.trim()) return this.toast('Name required','error');
    const store = kind==='service' ? DB.STORES.services : DB.STORES.products;
    if (id) { data.id=id; await DB.put(store, data); }
    else await DB.add(store, data);
    await this.loadData();
    this.closeModal(); // keep invoice form if open
    // Refresh product selects in open invoice form
    const selects = document.querySelectorAll('#invoice-form .product-select');
    if (selects.length) {
      const allItems = [...this.products.map(p=>({...p,kind:'product'})), ...this.services.map(s=>({...s,kind:'service'}))];
      const opts = '<option value="">— Select product/service or type —</option>' +
        allItems.map(p => `<option value="${p.id}" data-price="${p.unitPrice}" data-desc="${(p.description||p.name||'').replace(/"/g,'&quot;')}">${p.name}${p.kind?` (${p.kind})`:''}</option>`).join('');
      selects.forEach(s => { const cur = s.value; s.innerHTML = opts; if (cur) s.value = cur; });
      this.toast((kind==='service'?'Service':'Product') + ' added – available in line items');
    } else {
      this.render();
      this.toast('Saved');
    }
  },
  async deleteItem(kind, id) {
    if (!confirm('Delete?')) return;
    await DB.remove(kind==='service'?DB.STORES.services:DB.STORES.products, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  // ========== REPORTS + EXPORT ==========
  renderReports() {
    const unpaid = this.invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
    const paid = this.invoices.filter(i => i.status === 'paid');
    const totalVat = this.vatEnabled ? this.invoices.reduce((s,i)=>s+(i.vatAmount||0),0) : 0;
    const totalOut = unpaid.reduce((s,i)=>s+(i.total||0),0);
    const totalPaid = paid.reduce((s,i)=>s+(i.total||0),0);
    const totalInvoiced = this.invoices.reduce((s,i)=>s+(i.total||0),0);
    const openT = this.tickets.filter(t=>!['closed','resolved'].includes(t.status)).length;
    const totalTime = this.timeEntries.reduce((s,e)=>s+(e.minutes||0),0);
    const maxVal = Math.max(totalPaid, totalOut, 1);

    // Simple monthly breakdown (last 6 months)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0,7);
      const label = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
      const sum = this.invoices.filter(inv => (inv.date||'').startsWith(key)).reduce((s,inv)=>s+(inv.total||0),0);
      months.push({ label, sum });
    }
    const maxMonth = Math.max(...months.map(m=>m.sum), 1);

    return `
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold">Reports & Statistics</h2>
          <p class="text-slate-500 text-sm">Bookkeeping overview • VAT ${this.vatEnabled?'on':'off'}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button data-action="export-excel" class="btn btn-secondary"><i data-lucide="download" class="w-4 h-4"></i> Export CSV</button>
          <button data-action="export-report-pdf" class="btn btn-primary"><i data-lucide="file-text" class="w-4 h-4"></i> Report PDF</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="stat-card"><div class="value text-sa-green">${this.formatMoney(totalOut)}</div><div class="label">Outstanding</div></div>
        <div class="stat-card"><div class="value">${this.formatMoney(totalPaid)}</div><div class="label">Paid</div></div>
        <div class="stat-card"><div class="value">${this.formatMoney(totalVat)}</div><div class="label">VAT Collected</div></div>
        <div class="stat-card"><div class="value">${(totalTime/60).toFixed(1)}h</div><div class="label">Time Logged</div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card p-5">
          <h3 class="font-semibold mb-4">Paid vs Outstanding</h3>
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-sm mb-1"><span>Paid</span><strong>${this.formatMoney(totalPaid)}</strong></div>
              <div style="height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden">
                <div style="height:100%;width:${Math.round(totalPaid/maxVal*100)}%;background:var(--sa-green);border-radius:6px"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-1"><span>Outstanding</span><strong>${this.formatMoney(totalOut)}</strong></div>
              <div style="height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden">
                <div style="height:100%;width:${Math.round(totalOut/maxVal*100)}%;background:#f59e0b;border-radius:6px"></div>
              </div>
            </div>
            <div class="text-xs text-slate-500 pt-2">Total invoiced: ${this.formatMoney(totalInvoiced)}</div>
          </div>
        </div>
        <div class="card p-5">
          <h3 class="font-semibold mb-4">Invoiced – Last 6 Months</h3>
          <div class="flex items-end gap-2" style="height:140px">
            ${months.map(m => `
              <div class="flex-1 flex flex-col items-center justify-end h-full">
                <div class="text-xs font-medium mb-1">${m.sum?this.formatMoney(m.sum).replace('R ',''):'0'}</div>
                <div style="width:100%;max-width:40px;height:${Math.max(4, Math.round(m.sum/maxMonth*100))}%;background:var(--sa-green);border-radius:4px 4px 0 0"></div>
                <div class="text-xs text-slate-500 mt-1">${m.label}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Aged Receivables</h3>
          ${unpaid.length===0?'<p class="text-slate-400">Nothing outstanding – great work</p>':`
            <div class="table-container"><table class="data-table">
              <thead><tr><th>Invoice</th><th>Client</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>${unpaid.map(i=>{
                const c=this.clients.find(x=>x.id===i.clientId);
                return `<tr><td>${i.number}</td><td>${c?.name||'—'}</td><td>${this.formatDate(i.dueDate)}</td><td>${this.formatMoney(i.total)}</td><td><span class="badge badge-${i.status}">${i.status}</span></td></tr>`;
              }).join('')}</tbody>
            </table></div>`}
        </div>
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Profit snapshot (indicative)</h3>
          <p class="text-sm mb-2">Income (paid invoices) minus expenses this month – bookkeeping style overview, not a full audit set.</p>
          <div class="text-2xl font-bold text-sa-green mb-4" id="pnl-figure">—</div>
          <canvas id="finance-pie" width="280" height="180" class="mb-4"></canvas>
          <h3 class="font-semibold mb-3">Bookkeeping reports</h3>
          <div class="text-sm space-y-2 mb-4">
            <div class="flex justify-between"><span>VAT on paid invoices (est.)</span><strong id="rep-vat">—</strong></div>
            <div class="flex justify-between"><span>Aged debtors (unpaid total)</span><strong id="rep-aged">—</strong></div>
            <div class="flex justify-between"><span>Profit snapshot</span><strong id="pnl-figure">—</strong></div>
          </div>
          <button type="button" class="btn btn-secondary mb-4" data-action="pdf-report-pack">Export report PDF</button>
          <h3 class="font-semibold mb-3">Business Snapshot</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between border-b py-2"><span>Clients</span><strong>${this.clients.length}</strong></div>
            <div class="flex justify-between border-b py-2"><span>Products / Services</span><strong>${this.products.length} / ${this.services.length}</strong></div>
            <div class="flex justify-between border-b py-2"><span>Invoices / Quotes</span><strong>${this.invoices.length} / ${this.quotes.length}</strong></div>
            <div class="flex justify-between border-b py-2"><span>Open Tickets</span><strong>${openT}</strong></div>
            <div class="flex justify-between py-2"><span>Collection rate</span><strong>${totalInvoiced?Math.round(totalPaid/totalInvoiced*100):0}%</strong></div>
          </div>
        </div>
      </div>`;
  },

  exportReportPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const paid = this.invoices.filter(i => i.status === 'paid').reduce((s,i)=>s+(i.total||0),0);
    const out = this.invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s,i)=>s+(i.total||0),0);
    const vat = this.invoices.reduce((s,i)=>s+(i.vatAmount||0),0);
    doc.setFontSize(16);
    doc.text(this.company?.name || 'SA Invoice Pro', 14, 20);
    doc.setFontSize(12);
    doc.text('Business Report', 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, 14, 36);
    doc.text(`Outstanding: R ${out.toFixed(2)}`, 14, 48);
    doc.text(`Paid: R ${paid.toFixed(2)}`, 14, 56);
    doc.text(`VAT Collected: R ${vat.toFixed(2)}`, 14, 64);
    doc.text(`Invoices: ${this.invoices.length}  |  Quotes: ${this.quotes.length}  |  Clients: ${this.clients.length}`, 14, 72);
    doc.text(`Open tickets: ${this.tickets.filter(t=>!['closed','resolved'].includes(t.status)).length}`, 14, 80);
    // Simple table of unpaid
    const unpaid = this.invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
    if (unpaid.length && doc.autoTable) {
      doc.autoTable({
        startY: 90,
        head: [['Invoice', 'Client', 'Due', 'Total', 'Status']],
        body: unpaid.map(i => {
          const c = this.clients.find(x=>x.id===i.clientId);
          return [i.number, c?.name||'', i.dueDate||'', 'R '+(i.total||0).toFixed(2), i.status];
        }),
        styles: { fontSize: 8 }
      });
    }
    doc.save(`SA-Report-${new Date().toISOString().slice(0,10)}.pdf`);
    this.toast('Report PDF downloaded');
  },

    exportExcel() {
    // Simple CSV export of invoices
    const rows = [['Number','Client','Date','Due','Subtotal','VAT','Total','Status']];
    this.invoices.forEach(i => {
      const c = this.clients.find(x=>x.id===i.clientId);
      rows.push([i.number, c?.name||i.clientName||'', i.date, i.dueDate||'', i.subtotal, i.vatAmount, i.total, i.status]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SA-Invoices-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    this.toast('CSV exported');
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
      { id:'about', label:'About / Debug' }
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
      body = `
        <form id="settings-form" class="space-y-4">
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
          <div class="mt-4 pt-4 border-t">
            <h4 class="font-semibold mb-2">PDF attestation (auto sign block)</h4>
            <p class="text-xs text-slate-500 mb-2">Adds a signed-for block on PDFs. Not a cryptographic qualified electronic signature under the ECT Act — for operational attestation.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label class="label">Signatory name</label><input id="pdf-sign-name" class="input" value="${this.pdfSignName||''}" placeholder="e.g. Director name" /></div>
              <div><label class="label">Title</label><input id="pdf-sign-title" class="input" value="${this.pdfSignTitle||''}" placeholder="e.g. Managing Director" /></div>
            </div>
            <label class="flex gap-2 items-center mt-2 text-sm"><input type="checkbox" id="pdf-auto-sign" ${this.pdfAutoSign!==false?'checked':''}/> Auto-add signature block on generate</label>
          </div>
          <button type="button" data-action="save-settings" class="btn btn-primary mt-3">Save appearance</button>
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
      <div class="card p-6 max-w-3xl">${body}</div>`;
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

    // Business profile – ALWAYS apply when selector present
    const bizType = document.getElementById('business-type-select')?.value;
    if (bizType) {
      await applyBusinessTemplate(bizType);
      this.businessTemplate = bizType;
      await DB.setSetting('businessTemplate', bizType);
      await this.loadProfilePack(bizType);
      this.modules = this.profilePack?.modules || (window.BUSINESS_MODULES && window.BUSINESS_MODULES[bizType]) || this.modules;
      await DB.setSetting('modules', this.modules);
      this.setupUI();
      this.toast('Business profile applied: ' + (this.profilePack?.name || bizType));
      this.render();
      return;
    }

    this.toast('Settings saved');
  },

  // ========== PDF / PREVIEW / STATUS / SHARE ==========
  doPreview(id, isQuote) {
    const doc = isQuote ? this.quotes.find(q=>q.id===id) : this.invoices.find(i=>i.id===id);
    if (!doc) return this.toast('Document not found', 'error');
    const client = this.clients.find(c=>c.id===doc.clientId);
    try {
      // Revoke previous blob URL
      if (this._previewUrl) { try { URL.revokeObjectURL(this._previewUrl); } catch(e) {} }
      let blob;
      if (typeof previewPDFBlob === 'function') {
        blob = previewPDFBlob({...doc, type: isQuote?'quote':'invoice'}, this.company, client, this.template, this.accent, this.vatEnabled, this.logoData);
      } else {
        const dataUrl = previewPDF({...doc, type: isQuote?'quote':'invoice'}, this.company, client, this.template, this.accent, this.vatEnabled, this.logoData);
        // convert data url to blob for iframe reliability
        const byte = atob(dataUrl.split(',')[1]);
        const arr = new Uint8Array(byte.length);
        for (let i=0;i<byte.length;i++) arr[i]=byte.charCodeAt(i);
        blob = new Blob([arr], { type: 'application/pdf' });
      }
      this._previewUrl = URL.createObjectURL(blob);
      const kind = isQuote ? 'quote' : 'invoice';
      this.showModal(`
        <div class="p-4 flex flex-col" style="height:85vh;min-height:480px">
          <div class="flex justify-between items-center mb-3 gap-2 flex-wrap">
            <h3 class="font-bold text-lg">${doc.number} Preview</h3>
            <div class="flex gap-2">
              <button type="button" class="btn btn-primary" onclick="App.doPdf(${id}, ${isQuote})">
                <i data-lucide="download" class="w-4 h-4"></i> Download PDF
              </button>
              <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            </div>
          </div>
          <iframe src="${this._previewUrl}" title="PDF Preview" class="flex-1 w-full rounded-lg border bg-white"
            style="min-height:400px;background:#fff"></iframe>
        </div>`, true);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
      console.error(e);
      this.toast('Preview failed: ' + (e.message||e), 'error');
    }
  },

  doPdf(id, isQuote) {
    const doc = isQuote ? this.quotes.find(q=>q.id===id) : this.invoices.find(i=>i.id===id);
    const client = this.clients.find(c=>c.id===doc.clientId);
    generateInvoicePDF({...doc, type: isQuote?'quote':'invoice'}, this.company, client, {
      template: this.template, colour: this.accent, vatEnabled: this.vatEnabled, vatRate: this.vatRate, logoData: this.logoData,
      autoSign: this.pdfAutoSign !== false,
      signName: this.pdfSignName || this.company?.name,
      signTitle: this.pdfSignTitle || ''
    });
  },

  async deleteDoc(type, id) {
    if (!confirm('Delete this document?')) return;
    await DB.remove(type==='quote'?DB.STORES.quotes:DB.STORES.invoices, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  changeStatus(type, id) {
    const isQuote = type==='quote';
    const doc = (isQuote?this.quotes:this.invoices).find(d=>d.id===id);
    if (!doc) return;
    const statuses = isQuote ? ['open','accepted','rejected','converted','expired'] : ['draft','unpaid','paid','overdue','cancelled'];
    this.showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4">Status – ${doc.number}</h3>
        <div class="grid grid-cols-2 gap-2">
          ${statuses.map(s=>`<button class="btn ${doc.status===s?'btn-primary':'btn-outline'} justify-center" onclick="App.setStatus('${type}',${id},'${s}')">${s}</button>`).join('')}
        </div>
        <button class="btn btn-secondary w-full mt-4" onclick="App.closeModal()">Cancel</button>
      </div>`);
  },

  async setStatus(type, id, status) {
    const store = type==='quote'?DB.STORES.quotes:DB.STORES.invoices;
    const doc = (type==='quote'?this.quotes:this.invoices).find(d=>d.id===id);
    doc.status = status;
    if (status==='paid') doc.paidDate = new Date().toISOString().slice(0,10);
    await DB.put(store, doc);
    await this.loadData(); this.closeModal(); this.render(); this.toast(`Status → ${status}`);
  },

  async convertQuote(id) {
    const quote = this.quotes.find(q=>q.id===id);
    if (!quote || !confirm('Convert quote to invoice?')) return;
    const number = await DB.getNextNumber('invoice');
    const inv = {...quote, id:undefined, number, type:'invoice', status:'unpaid', date:new Date().toISOString().slice(0,10)};
    delete inv.id;
    await DB.add(DB.STORES.invoices, inv);
    quote.status = 'converted';
    await DB.put(DB.STORES.quotes, quote);
    await this.loadData(); this.navigate('invoices'); this.toast('Converted to invoice');
  },

  shareWhatsApp(id, isQuote) {
    const doc = isQuote ? this.quotes.find(q=>q.id===id) : this.invoices.find(i=>i.id===id);
    const client = this.clients.find(c=>c.id===doc.clientId);
    this.doPdf(id, isQuote);
    const text = encodeURIComponent(`Hi ${client?.name||''},\n\nPlease find ${isQuote?'quotation':'tax invoice'} ${doc.number} for ${this.formatMoney(doc.total)}.\n\nRegards,\n${this.company?.name||''}`);
    window.open(`https://wa.me/?text=${text}`,'_blank');
    this.toast('PDF downloaded – attach in WhatsApp');
  },

  emailDoc(id, isQuote) {
    const doc = isQuote ? this.quotes.find(q=>q.id===id) : this.invoices.find(i=>i.id===id);
    const client = this.clients.find(c=>c.id===doc.clientId);
    this.doPdf(id, isQuote);
    const subject = encodeURIComponent(`${isQuote?'Quotation':'Tax Invoice'} ${doc.number}`);
    const body = encodeURIComponent(`Dear ${client?.name||'Client'},\n\nPlease find attached ${doc.number}.\nTotal: ${this.formatMoney(doc.total)}\n\nKind regards,\n${this.company?.name||''}`);
    window.location.href = `mailto:${client?.email||''}?subject=${subject}&body=${body}`;
    this.toast('PDF downloaded – attach to email');
  },

  // ========== RECURRING ==========
  async generateRecurring() {
    const recurring = this.invoices.filter(i => i.recurring && i.status !== 'cancelled');
    if (recurring.length === 0) return this.toast('No recurring invoices set up. Edit an invoice and enable Recurring.', 'error');
    let created = 0;
    for (const inv of recurring) {
      const number = await DB.getNextNumber('invoice');
      const next = {
        ...inv, id: undefined, number,
        date: new Date().toISOString().slice(0,10),
        status: 'unpaid',
        dueDate: (() => { const d=new Date(); d.setDate(d.getDate()+30); return d.toISOString().slice(0,10); })()
      };
      delete next.id;
      await DB.add(DB.STORES.invoices, next);
      created++;
    }
    await this.loadData(); this.render();
    this.toast(`Created ${created} recurring invoice(s)`);
  },

  // ========== DOC MODAL ==========
  async showDocModal(type, id=null) {
    const isQuote = type === 'quote';
    let doc = id ? (isQuote ? this.quotes.find(q=>q.id===id) : this.invoices.find(i=>i.id===id)) : null;
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
            <div class="sm:col-span-2"><label class="label">Notes</label><textarea name="notes" class="input" rows="2">${doc?.notes||''}</textarea></div>
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
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
    return `
      <div class="page-header">
        <div>
          <h2>License</h2>
          <p class="subtitle">Server handshake only · trial activated after vendor issues a key</p>
        </div>
      </div>
      <div class="card p-5 max-w-3xl">
        <h3 class="font-semibold mb-3">This PC – activation steps</h3>
        <ol class="text-sm text-slate-600 mb-4" style="list-style:decimal;padding-left:1.25rem">
          <li>Save license server URL (your vendor PC)</li>
          <li><strong>Get HWID</strong> – sends device ID; server must reply handshake</li>
          <li><strong>Request license</strong> – enabled after handshake (vendor approves on server)</li>
          <li>Key appears automatically when issued – then <strong>Activate</strong></li>
        </ol>
        <div class="space-y-2 text-sm mb-4">
          <div class="flex justify-between border-b py-2"><span>Status</span>
            <strong class="${st.mode==='licensed'?'text-sa-green':'text-amber-600'}">${st.label}</strong></div>
          <div class="flex justify-between border-b py-2"><span>Hardware ID</span>
            <strong class="font-mono text-xs" id="hwid-display">${hwid || '—'}</strong></div>
          <div class="flex justify-between border-b py-2"><span>Handshake</span>
            <strong class="${handshakeOk?'text-sa-green':''}">${handshakeOk?'OK – server replied':'Not yet'}</strong></div>
          <div class="flex justify-between py-2"><span>Server message</span>
            <span class="text-xs text-right max-w-xs">${serverMsg || '—'}</span></div>
        </div>

        <label class="label">License server URL</label>
        <input id="license-server-url" class="input mb-2" placeholder="http://127.0.0.1:5055" />
        <button type="button" class="btn btn-secondary mb-4" data-action="save-license-server">Save server URL</button>

        <div class="flex flex-wrap gap-2 mb-4">
          <button type="button" class="btn btn-primary" data-action="get-hwid">
            1. Get HWID + handshake
          </button>
          <button type="button" class="btn ${canRequest?'btn-primary':'btn-secondary'}" data-action="license-request"
            ${canRequest?'':'disabled style="opacity:0.45;cursor:not-allowed"'}>
            2. Request license
          </button>
          <button type="button" class="btn btn-secondary" data-action="license-claim"
            ${canRequest?'':'disabled style="opacity:0.45;cursor:not-allowed"'}>
            Refresh key from server
          </button>
        </div>

        <label class="label">Server-issued key (auto-filled)</label>
        <input id="license-key-input" class="input mb-2 font-mono text-sm" readonly
          value="${pendingKey || ''}" placeholder="Appears after vendor issues a key" />
        <button type="button" class="btn ${canActivate?'btn-primary':'btn-secondary'}" data-action="activate-license"
          ${canActivate?'':'disabled style="opacity:0.45;cursor:not-allowed"'}>
          3. Activate (server validates)
        </button>
        <p class="text-xs text-slate-500 mt-3">No local key generator. Keys are only created on the vendor license server. On startup the app tries the server 3 times, then continues offline if already licensed.</p>
      </div>`;
  },

  async doGetHwid() {
    try {
      await License.getHardwareId();
      const url = await License.getServerUrl();
      if (!url) {
        this.toast('Save the license server URL first', 'error');
        this.render();
        return;
      }
      await License.handshake();
      this.licenseStatus = License.getStatus();
      this.toast(License.serverMessage || 'Handshake OK');
      this.render();
    } catch (e) {
      this.toast(e.message || 'Handshake failed – is the server running?', 'error');
      this.render();
    }
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
      this.licenseStatus = License.getStatus();
      this.setupUI();
      this.toast('Activation successful – ' + (this.licenseStatus.label || ''));
      this.render();
    } catch (e) {
      this.toast(e.message || 'Activation failed', 'error');
    }
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
      let lic = (await DB.getSetting('licenseServerUrl', '')) || '';
      let upd = (await DB.getSetting('updateServerUrl', '')) || '';
      const dLic = (cfg.defaultLicenseServerUrl || '').trim();
      const dUpd = (cfg.defaultUpdateServerUrl || '').trim();
      // Prefer config.js defaults when settings empty
      if (!lic && dLic) { lic = dLic; await DB.setSetting('licenseServerUrl', lic); }
      if (!upd && dUpd) { upd = dUpd; await DB.setSetting('updateServerUrl', upd); }
      // Local dev fallback only when still empty and on localhost
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
    } catch (e) {}
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
        this.showModal(`
          <div class="p-6 max-w-md">
            <h3 class="text-xl font-bold mb-2">Mandatory update</h3>
            <p class="text-sm mb-3">Version <strong>${data.version}</strong> required. You have <strong>${APP_VERSION}</strong>.</p>
            <button type="button" class="btn btn-primary w-full mb-2" onclick="App.installUpdateNow()">Install automatically</button>
            ${data.downloadUrl?`<a class="btn btn-secondary w-full text-center" href="${data.downloadUrl}" target="_blank">Manual download</a>`:''}
          </div>`, true);
        return true;
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

  async saveCompanySlot() {
    const slots = (await DB.getSetting('companySlots', [])) || [];
    const co = this.company || {};
    slots.push({ name: co.name, vatNo: co.vatNo, businessTemplate: this.businessTemplate, snapshot: co, savedAt: new Date().toISOString() });
    await DB.setSetting('companySlots', slots);
    await DB.setSetting('activeCompanySlot', slots.length - 1);
    this.toast('Company slot saved');
    this.navigate('companies');
  },

  async switchCompany(i) {
    const slots = (await DB.getSetting('companySlots', [])) || [];
    const s = slots[Number(i)];
    if (!s) return;
    if (s.snapshot) await DB.saveCompany({ ...s.snapshot, id: 1 });
    if (s.businessTemplate) {
      await applyBusinessTemplate(s.businessTemplate);
      this.businessTemplate = s.businessTemplate;
      await this.loadProfilePack(s.businessTemplate);
    }
    await DB.setSetting('activeCompanySlot', Number(i));
    await this.loadData();
    this.setupUI();
    this.toast('Switched to ' + (s.name || 'company'));
    this.navigate('home');
  },

  renderBackup() {
    return `
      <div class="page-header"><div><h2>Backup & restore</h2><p class="subtitle">One-click JSON backup</p></div></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card p-6"><h3 class="font-bold mb-2">Export</h3>
          <button type="button" class="btn btn-primary" data-action="export-backup">Download backup JSON</button></div>
        <div class="card p-6"><h3 class="font-bold mb-2">Restore</h3>
          <input type="file" id="backup-file" accept="application/json,.json" class="input mb-3" />
          <button type="button" class="btn btn-secondary" data-action="import-backup">Restore from file</button></div>
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
      let url = ((await DB.getSetting('updateServerUrl', '')) || '').trim().replace(/\/$/, '');
      if (!url) {
        if (!silent) this.toast('Set Update server URL in About first', 'error');
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
    return `
      <div class="page-header">
        <div><h2>About / Updates</h2>
          <p class="subtitle">SA Invoice Pro · ${APP_VERSION} · ${navigator.onLine?'Online':'Offline'}</p></div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" data-action="check-updates">Check for updates</button>
        </div>
      </div>
      <div class="card p-6 max-w-2xl space-y-4">
        <p class="text-sm">${typeof APP_COPYRIGHT!=='undefined'?APP_COPYRIGHT:'SA Invoice Pro'}</p>
        <p class="text-xs text-slate-500"><a href="docs/FREE_ONLINE_HOSTING.md" target="_blank">Free online hosting</a> · <a href="docs/GITHUB_AND_CLOUD.md" target="_blank">GitHub + cloud</a> · <a href="docs/SARS_EFILING.md" target="_blank">SARS eFiling notes</a> · <a href="docs/QES_PDF_SIGNING.md" target="_blank">QES signing notes</a> · Owner dashboard port 5060 · Silent update: Install-Update-Service.bat</p>
        <div><label class="label">Update server URL (port 5056 only)</label>
          <input id="update-server-url" class="input" placeholder="http://127.0.0.1:5056" />
          <p class="text-xs text-slate-500 mt-1">Not the license server (5055). Example: http://127.0.0.1:5056</p>
          <button type="button" class="btn btn-secondary mt-2" data-action="save-update-server">Save update server</button>
        </div>
        <div><label class="label">Owner unlock (session only)</label>
          <input id="owner-token" type="password" class="input" placeholder="Owner token" />
          <button type="button" class="btn btn-outline mt-2" data-action="owner-unlock">Unlock owner tools</button>
          <label class="label mt-3">Set custom owner token (this device)</label>
          <input id="new-owner-token" type="password" class="input" placeholder="Min 10 characters" />
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
              const e=emps.find(x=>x.id===s.employeeId);
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
    const e = id ? (this.employees||[]).find(x=>x.id===id) : {};
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
    const s = (this.payslips||[]).find(x=>x.id===id);
    if (!s) return;
    const emp = (this.employees||[]).find(x=>x.id===s.employeeId) || {};
    const co = this.company || {};
    try {
      generateBusinessLetterPDF({
        company: co,
        client: { name: s.employeeName || emp.fullName },
        title: 'PAYSLIP',
        date: new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' }),
        ref: s.number,
        template: this.template, colour: this.accent,
        bodyLines: [
          `Employee: ${s.employeeName || emp.fullName}`,
          `Period: ${s.period}`,
          `ID / tax ref: ${emp.idNumber || '—'} / ${emp.taxNumber || '—'}`,
          `Gross pay: ${this.formatMoney(s.gross)}`,
          `UIF (indicative): ${this.formatMoney(s.uif)}`,
          `PAYE (estimate only): ${this.formatMoney(s.paye)}`,
          `Net pay: ${this.formatMoney(s.netPay)}`,
          'Not an official SARS calculation. Confirm with current tax tables.',
          'Personal information processed under POPIA for employment/payroll only.'
        ]
      });
    } catch (e) { this.toast(e.message, 'error'); }
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
    const r = (this.popiaRequests||[]).find(x=>x.id===id);
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
  renderExpenses() {
    const list = [...this.expenses].sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
    const total = list.reduce((s,e) => s + (e.amount||0), 0);
    const thisMonth = list.filter(e => {
      const d = new Date(e.date); const n = new Date();
      return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
    }).reduce((s,e)=>s+(e.amount||0),0);
    return `
      <div class="page-header">
        <div><h2>Expenses</h2><p class="subtitle">Track business costs • ${list.length} records</p></div>
        <div class="page-actions">
          <button data-action="new-expense" class="btn btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> Add Expense</button>
        </div>
      </div>
      <div class="kpi-grid">
        <div class="stat-card"><div class="value">${this.formatMoney(total)}</div><div class="label">Total Expenses</div></div>
        <div class="stat-card"><div class="value">${this.formatMoney(thisMonth)}</div><div class="label">This Month</div></div>
      </div>
      ${list.length===0 ? `<div class="card empty-state"><i data-lucide="wallet"></i><p>No expenses yet</p>
        <button data-action="new-expense" class="btn btn-primary mt-3">Add first expense</button></div>` : `
        <div class="card overflow-hidden"><div class="table-container"><table class="data-table">
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th><th></th></tr></thead>
          <tbody>${list.map(e => `<tr>
            <td>${this.formatDate(e.date)}</td>
            <td><span class="badge badge-draft">${e.category||'general'}</span></td>
            <td>${e.description||'—'}</td>
            <td>${e.vendor||'—'}</td>
            <td class="font-medium">${this.formatMoney(e.amount)}</td>
            <td>
              <button data-action="edit-expense" data-id="${e.id}" class="btn btn-outline p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-action="delete-expense" data-id="${e.id}" class="btn btn-outline p-1.5 text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
        </table></div></div>`}`;
  },

  async showExpenseModal(id=null) {
    const e = id ? this.expenses.find(x=>x.id===id) : {};
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
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn btn-primary" onclick="App.saveExpense(${id||'null'})">Save</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async saveExpense(id) {
    const data = Object.fromEntries(new FormData(document.getElementById('expense-form')));
    if (!data.description?.trim()) return this.toast('Description required','error');
    data.amount = parseFloat(data.amount)||0;
    if (data.amount <= 0) return this.toast('Amount must be greater than 0','error');
    if (id) { data.id=id; await DB.put(DB.STORES.expenses, data); }
    else await DB.add(DB.STORES.expenses, data);
    await this.loadData(); this.closeModal(); this.render(); this.toast('Expense saved');
  },

  async deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    await DB.remove(DB.STORES.expenses, id);
    await this.loadData(); this.render(); this.toast('Deleted');
  },

  // ========== PAYMENTS ==========
  showPaymentModal(invoiceId) {
    const inv = this.invoices.find(i=>i.id===invoiceId);
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
            <button type="button" class="btn btn-primary" onclick="App.savePayment(${invoiceId})">Save Payment</button>
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
          </div>
        </form>
      </div>`);
  },

  async savePayment(invoiceId) {
    const data = Object.fromEntries(new FormData(document.getElementById('payment-form')));
    data.amount = parseFloat(data.amount)||0;
    if (data.amount <= 0) return this.toast('Enter a valid amount','error');
    data.invoiceId = invoiceId;
    data.createdAt = new Date().toISOString();
    await DB.add(DB.STORES.payments, data);
    const inv = this.invoices.find(i=>i.id===invoiceId);
    const totalPaid = this.payments.filter(p=>p.invoiceId===invoiceId).reduce((s,p)=>s+(p.amount||0),0) + data.amount;
    if (inv && totalPaid >= (inv.total||0) - 0.01) {
      inv.status = 'paid';
      inv.paidDate = data.date || new Date().toISOString().slice(0,10);
      await DB.put(DB.STORES.invoices, inv);
    }
    await this.loadData(); this.closeModal(); this.render();
    this.toast('Payment recorded');
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
  showModal(html, large=false) {
    this.modalStack.push({ html, large });
    this._renderTopModal();
  },

  _renderTopModal() {
    const root = document.getElementById('modal-root');
    if (!this.modalStack.length) { root.innerHTML = ''; return; }
    const top = this.modalStack[this.modalStack.length - 1];
    const z = 50 + this.modalStack.length;
    root.innerHTML = `
      <div class="modal-overlay" id="modal-overlay" style="z-index:${z}">
        <div class="modal ${top.large?'modal-xl':'modal-lg'}">${top.html}</div>
      </div>`;
    document.getElementById('modal-overlay').onclick = e => {
      if (e.target.id === 'modal-overlay') this.closeModal();
    };
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  closeModal() {
    this.modalStack.pop();
    this._renderTopModal();
  },

  closeAllModals() {
    this.modalStack = [];
    document.getElementById('modal-root').innerHTML = '';
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

