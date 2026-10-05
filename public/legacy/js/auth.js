// SA Invoice Pro v2.0.1 – Auth (startup: updates → accounts → login/signup)
const Auth = {
  currentUser: null,
  SESSION_KEY: 'sa_session_v201',
  _mode: 'boot', // boot | login | signup | recover

  /** Visible errors on auth screen (toast may be hidden under #app) */
  authAlert(msg, type = 'error') {
    const text = String(msg || 'Something went wrong');
    let box = document.getElementById('auth-alert');
    if (!box) {
      const host = document.getElementById('auth-content') || document.getElementById('auth-screen');
      if (host) {
        box = document.createElement('div');
        box.id = 'auth-alert';
        host.prepend(box);
      }
    }
    if (box) {
      box.className = 'auth-alert ' + (type === 'success' ? 'auth-alert-ok' : 'auth-alert-err');
      box.setAttribute('role', 'alert');
      box.textContent = text;
      box.style.display = 'block';
      try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
    try {
      if (typeof App !== 'undefined' && App.toast) App.toast(text, type === 'success' ? 'success' : 'error');
    } catch (e) {}
    console[type === 'success' ? 'log' : 'warn']('[Auth]', text);
  },



  async init() {
    try {
      await Promise.race([
        DB.openDB(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('db timeout')), 6000))
      ]);
    } catch (e) {
      console.warn('Auth.init DB', e);
    }
    let session = localStorage.getItem(this.SESSION_KEY) || sessionStorage.getItem(this.SESSION_KEY);
    if (!session) {
      const old = localStorage.getItem('sa_session_v12');
      if (old) { session = old; localStorage.setItem(this.SESSION_KEY, old); }
    }
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        // Verify session user still in DB
        try {
          if (this.currentUser && this.currentUser.id != null && typeof DB !== 'undefined') {
            const users = await DB.getAll(DB.STORES.users);
            const ok = (users || []).some(u => String(u.id) === String(this.currentUser.id));
            if (!ok) {
              this.currentUser = null;
              try { localStorage.removeItem('sa_session'); sessionStorage.removeItem('sa_session'); } catch (e) {}
            }
          }
        } catch (e) { /* keep session if DB not ready */ }
        if (!this.currentUser || !this.currentUser.username) {
          localStorage.removeItem(this.SESSION_KEY);
          sessionStorage.removeItem(this.SESSION_KEY);
          return false;
        }
        localStorage.setItem(this.SESSION_KEY, session);
        return true;
      } catch (e) {
        localStorage.removeItem(this.SESSION_KEY);
      }
    }
    return false;
  },

  async hasUsers() {
    return (await DB.getAll(DB.STORES.users)).length > 0;
  },

  async listUsers() {
    return DB.getAll(DB.STORES.users);
  },

  validateUsername(username) {
    const u = (username || '').trim();
    if (u.length < 4) return 'Username must be at least 4 characters';
    if (u.length > 32) return 'Username too long (max 32)';
    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(u))
      return 'Username must start with a letter (letters, numbers, . _ - only)';
    return null;
  },

  validateEmail(email) {
    const e = (email || '').trim();
    if (!e) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email address';
    return null;
  },

  validatePassword(password) {
    const p = password || '';
    if (p.length < 8) return 'Password must be at least 8 characters';
    if (p.length > 64) return 'Password too long';
    if (!/[a-z]/.test(p)) return 'Password needs a lowercase letter';
    if (!/[A-Z]/.test(p)) return 'Password needs an uppercase letter';
    if (!/[0-9]/.test(p)) return 'Password needs a number';
    if (!/[^a-zA-Z0-9]/.test(p)) return 'Password needs a symbol (!@#$% etc.)';
    // Reserved / dangerous passwords (owner tokens must never be account passwords)
    const reserved = [
      'sa-owner-2026', 'sa-owner-2025', 'saowner2026', 'owner-token',
      'password', 'Password1!', 'Admin123!', 'Welcome1!'
    ];
    const lower = p.toLowerCase();
    if (reserved.some(r => lower === r.toLowerCase() || lower.includes('sa-owner'))) {
      return 'This password is reserved and not allowed. Choose a different password.';
    }
    return null;
  },

  /** Owner token must never authenticate as a normal user */
  isReservedCredential(value) {
    const v = (value || '').trim().toLowerCase();
    if (!v) return false;
    if (v === 'sa-owner-2026' || v.startsWith('sa-owner-')) return true;
    return false;
  },

  LOCKOUT_KEY: 'sa_login_lock',
  MAX_FAILS: 5,
  LOCKOUT_MS: 5 * 60 * 1000,

  getLockState() {
    try {
      const raw = localStorage.getItem(this.LOCKOUT_KEY);
      if (!raw) return { fails: 0, until: 0 };
      return JSON.parse(raw);
    } catch (e) {
      return { fails: 0, until: 0 };
    }
  },

  setLockState(state) {
    localStorage.setItem(this.LOCKOUT_KEY, JSON.stringify(state));
  },

  checkLockout() {
    const s = this.getLockState();
    const now = Date.now();
    if (s.until && now < s.until) {
      const mins = Math.ceil((s.until - now) / 60000);
      throw new Error('Too many failed attempts. Try again in ' + mins + ' minute(s).');
    }
    if (s.until && now >= s.until) {
      this.setLockState({ fails: 0, until: 0 });
    }
  },

  recordFailedLogin() {
    const s = this.getLockState();
    const fails = (s.fails || 0) + 1;
    if (fails >= this.MAX_FAILS) {
      this.setLockState({ fails, until: Date.now() + this.LOCKOUT_MS });
      throw new Error('Account login locked for 5 minutes after ' + this.MAX_FAILS + ' failed attempts.');
    }
    this.setLockState({ fails, until: 0 });
    const left = this.MAX_FAILS - fails;
    throw new Error('Incorrect password (' + left + ' attempt(s) left)');
  },

  clearFailedLogins() {
    this.setLockState({ fails: 0, until: 0 });
  },

  passwordStrength(password) {
    const p = password || '';
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    if (this.isReservedCredential(p)) score = 0;
    const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const colors = ['#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a', '#007A4D'];
    return { score, label: labels[score] || 'Very weak', color: colors[score] || '#dc2626' };
  },

  _persistSession(user, remember = true) {
    this.currentUser = user;
    const safe = {
      id: user.id,
      username: user.username,
      fullName: user.fullName || '',
      email: user.email || '',
      isNewRegistration: !!user.isNewRegistration
    };
    const raw = JSON.stringify(safe);
    localStorage.setItem(this.SESSION_KEY, raw);
    if (remember) sessionStorage.setItem(this.SESSION_KEY, raw);
  },

  async createAccount(username, password, profile = {}) {
    const uErr = this.validateUsername(username);
    if (uErr) throw new Error(uErr);
    const eErr = this.validateEmail(profile.email);
    if (eErr) throw new Error(eErr);
    const pErr = this.validatePassword(password);
    if (pErr) throw new Error(pErr);
    if (!profile.sq1 || !String(profile.sa1 || '').trim() || !profile.sq2 || !String(profile.sa2 || '').trim() || !profile.sq3 || !String(profile.sa3 || '').trim())
      throw new Error('Answer all 3 security questions');
    try {
      await DB.openDB();
    } catch (e) {
      throw new Error('Cannot open local database: ' + (e.message || e) + '. Close other tabs and try again.');
    }
    let users = [];
    try {
      users = await DB.getAll(DB.STORES.users);
    } catch (e) {
      throw new Error('Cannot read users store. Reload once, then try again.');
    }
    if ((users || []).find(u => (u.username || '').toLowerCase() === username.toLowerCase().trim()))
      throw new Error('Username already exists');
    let hash;
    try {
      hash = await DB.hashPassword(password);
    } catch (e) {
      throw new Error('Password hashing failed: ' + (e.message || e));
    }
    let a1, a2, a3;
    try {
      a1 = await DB.hashPassword(String(profile.sa1).trim().toLowerCase());
      a2 = await DB.hashPassword(String(profile.sa2).trim().toLowerCase());
      a3 = await DB.hashPassword(String(profile.sa3).trim().toLowerCase());
    } catch (e) {
      throw new Error('Could not secure security answers');
    }
    let id;
    try {
      id = await DB.add(DB.STORES.users, {
        username: username.trim(),
        passwordHash: hash,
        createdAt: new Date().toISOString(),
        fullName: profile.fullName || '',
        email: String(profile.email).trim(),
        phone: profile.phone || '',
        security: {
          q1: profile.sq1, a1,
          q2: profile.sq2, a2,
          q3: profile.sq3, a3
        }
      });
    } catch (e) {
      throw new Error('Could not save account: ' + (e.message || e) + '. Try clearing site data if this persists.');
    }
    this._persistSession({
      id, username: username.trim(), fullName: profile.fullName || '',
      email: String(profile.email).trim(), isNewRegistration: true
    }, true);
    return id;
  },


  async login(username, password, remember = true) {
    this.checkLockout();
    if (this.isReservedCredential(password) || this.isReservedCredential(username)) {
      try { this.recordFailedLogin(); } catch (e) { throw e; }
    }
    const users = await DB.getAll(DB.STORES.users);
    if (!users || !users.length) throw new Error('No accounts on this device — create one first');
    const user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
    if (!user) {
      this.recordFailedLogin();
    }
    const hash = await DB.hashPassword(password);
    if (!user || hash !== user.passwordHash) {
      this.recordFailedLogin();
    }
    this.clearFailedLogins();
    this._persistSession({
      id: user.id, username: user.username, fullName: user.fullName || '',
      email: user.email || '', isNewRegistration: false
    }, remember);
    return user;
  },

  /** Password-only when a single primary user is selected */
  async loginByPasswordOnly(password, remember = true) {
    this.checkLockout();
    if (this.isReservedCredential(password)) {
      this.recordFailedLogin();
    }
    const users = await DB.getAll(DB.STORES.users);
    if (!users.length) throw new Error('No accounts');
    const hash = await DB.hashPassword(password);
    // Prefer last username
    const last = localStorage.getItem('sa_last_username');
    let user = last ? users.find(u => u.username === last) : null;
    if (user && user.passwordHash === hash) {
      this.clearFailedLogins();
      this._persistSession({
        id: user.id, username: user.username, fullName: user.fullName || '',
        email: user.email || '', isNewRegistration: false
      }, remember);
      return user;
    }
    // Try all users (small local DB)
    user = users.find(u => u.passwordHash === hash);
    if (!user) this.recordFailedLogin();
    this.clearFailedLogins();
    this._persistSession({
      id: user.id, username: user.username, fullName: user.fullName || '',
      email: user.email || '', isNewRegistration: false
    }, remember);
    localStorage.setItem('sa_last_username', user.username);
    return user;
  },

  async changePassword(userId, oldPw, newPw) {
    const pErr = this.validatePassword(newPw);
    if (pErr) throw new Error(pErr);
    const user = await DB.getById(DB.STORES.users, userId);
    if (!user) throw new Error('User not found');
    const oldHash = await DB.hashPassword(oldPw);
    if (oldHash !== user.passwordHash) throw new Error('Current password is wrong');
    user.passwordHash = await DB.hashPassword(newPw);
    await DB.put(DB.STORES.users, user);
  },

  async deleteUser(userId, password) {
    const user = await DB.getById(DB.STORES.users, userId);
    if (!user) throw new Error('User not found');
    const hash = await DB.hashPassword(password);
    if (hash !== user.passwordHash) throw new Error('Password incorrect');
    await DB.remove(DB.STORES.users, userId);
    if (this.currentUser && this.currentUser.id === userId) this.logout();
  },

  async recoverPassword(username, a1, a2, a3, newPassword) {
    const users = await DB.getAll(DB.STORES.users);
    const user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
    if (!user || !user.security) throw new Error('Account or security questions not found');
    const h1 = await DB.hashPassword((a1 || '').trim().toLowerCase());
    const h2 = await DB.hashPassword((a2 || '').trim().toLowerCase());
    const h3 = await DB.hashPassword((a3 || '').trim().toLowerCase());
    if (h1 !== user.security.a1 || h2 !== user.security.a2 || h3 !== user.security.a3)
      throw new Error('Security answers do not match');
    const pErr = this.validatePassword(newPassword);
    if (pErr) throw new Error(pErr);
    user.passwordHash = await DB.hashPassword(newPassword);
    await DB.put(DB.STORES.users, user);
    return true;
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
    if (window.AppCrypto) AppCrypto.lock();
  },

  pwField(name, label, required = true) {
    return `
      <div>
        <label class="label">${label}${required?' *':''}</label>
        <div style="position:relative">
          <input type="password" name="${name}" id="pw-${name}" class="input" ${required?'required':''} autocomplete="current-password" style="padding-right:2.5rem" />
          <button type="button" class="pw-toggle" data-target="pw-${name}" style="position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#64748b;padding:0.25rem" title="Show/hide">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>
        </div>
      </div>`;
  },

  bindPwToggles() {
    document.querySelectorAll('.pw-toggle').forEach(btn => {
      btn.onclick = () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) icon.setAttribute('data-lucide', show ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
      };
    });
  },


  getGoogleClientId() {
    try {
      const fromLs = localStorage.getItem('sa_google_client_id') || '';
      if (fromLs && fromLs.includes('apps.googleusercontent.com')) return fromLs.trim();
    } catch (e) {}
    try {
      if (typeof SA_CONFIG !== 'undefined' && SA_CONFIG.googleClientId) {
        const c = String(SA_CONFIG.googleClientId).trim();
        if (c) return c;
      }
      if (typeof window !== 'undefined' && window.SA_GOOGLE_CLIENT_ID) {
        const c = String(window.SA_GOOGLE_CLIENT_ID).trim();
        if (c) return c;
      }
    } catch (e) {}
    return '';
  },

  setGoogleClientId(id) {
    const v = (id || '').trim();
    if (!v) return;
    try { localStorage.setItem('sa_google_client_id', v); } catch (e) {}
    try { if (typeof window !== 'undefined') window.SA_GOOGLE_CLIENT_ID = v; } catch (e) {}
    try {
      if (typeof SA_CONFIG !== 'undefined') SA_CONFIG.googleClientId = v;
    } catch (e) {}
    // Persist in IndexedDB so it survives across sessions (async fire-and-forget)
    try {
      if (typeof DB !== 'undefined' && DB.setSetting) {
        DB.setSetting('googleClientId', v).catch(() => {});
      }
    } catch (e) {}
  },

  async loadGoogleClientIdFromDb() {
    try {
      if (typeof DB !== 'undefined' && DB.getSetting) {
        const id = await DB.getSetting('googleClientId', null);
        if (id && String(id).includes('apps.googleusercontent.com')) {
          this.setGoogleClientId(String(id));
          return String(id);
        }
      }
    } catch (e) {}
    return this.getGoogleClientId();
  },


  async startGoogleTrial(user) {
    try {
      if (!window.License) return;
      const existing = await DB.getSetting('trialStartedAt', null);
      const already = await DB.getSetting('googleTrialGranted', false);
      if (already && existing) return;
      const now = new Date().toISOString();
      if (!existing) await DB.setSetting('trialStartedAt', now);
      await DB.setSetting('googleTrialGranted', true);
      await DB.setSetting('trialSource', 'google');
      // Align license meta for 7-day trial
      const days = (window.License && License.TRIAL_DAYS) || 7;
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      const key = 'TRIAL-GOOGLE-' + (user?.id || 'user').toString().slice(0, 8);
      const record = {
        key,
        plan: 'trial',
        label: '7-day free trial (Google)',
        activatedAt: now,
        expiresAt,
        hwid: (window.License && License.hwid) || null,
        source: 'google-trial'
      };
      await DB.setSetting('licenseKey', key);
      await DB.setSetting('licenseMeta', record);
      if (window.License) {
        License.licenseKey = key;
        License.licenseMeta = record;
        License.trialStartedAt = existing || now;
        try { await License.persistOfflineLicense(key, record); } catch (e) {}
      }
    } catch (e) {
      console.warn('startGoogleTrial', e);
    }
  },

  async mountGoogleButton(containerId) {
    try { await this.loadGoogleClientIdFromDb(); } catch (e) {}

    const el = document.getElementById(containerId);
    if (!el) return;
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      el.innerHTML = '<button type="button" class="btn btn-outline w-full" id="btn-google-setup-hint">Continue with Google</button><p class="text-xs text-slate-500 mt-1 text-center">Tap to paste your Google OAuth Web Client ID (first time).</p>';
      const hint = document.getElementById('btn-google-setup-hint');
      if (hint) hint.onclick = () => {
        const id = prompt('Paste Google OAuth Web Client ID (ends with .apps.googleusercontent.com)');
        if (id && id.includes('apps.googleusercontent.com')) {
          this.setGoogleClientId(id.trim());
          this.authAlert('Google Client ID saved — loading button…', 'success');
          this.mountGoogleButton(containerId);
        } else if (id) this.authAlert('That does not look like a Google Client ID');
      };
      return;
    }
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      el.innerHTML = '<p class="text-xs text-amber-700 text-center">Loading Google…</p>';
      let tries = 0;
      const wait = setInterval(() => {
        tries++;
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
          clearInterval(wait);
          this.mountGoogleButton(containerId);
        } else if (tries > 25) {
          clearInterval(wait);
          el.innerHTML = '<p class="text-xs text-red-600 text-center">Google script blocked or offline. Use email/password.</p>';
        }
      }, 200);
      return;
    }
    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => this.handleGoogleCredential(resp),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      el.innerHTML = '';
      google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        width: Math.min(320, el.clientWidth || 320),
        text: 'continue_with',
        shape: 'pill'
      });
    } catch (e) {
      console.warn(e);
      el.innerHTML = '<p class="text-xs text-red-600 text-center">Google button failed</p>';
    }
  },

  parseJwtPayload(token) {
    try {
      const part = token.split('.')[1];
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  },

  async handleGoogleCredential(response) {
    try {
      if (!response || !response.credential) throw new Error('No Google credential');
      const payload = this.parseJwtPayload(response.credential);
      if (!payload || !payload.email) throw new Error('Could not read Google profile');
      const email = String(payload.email).toLowerCase();
      const sub = payload.sub || '';
      const name = payload.name || payload.given_name || email.split('@')[0];
      const users = await DB.getAll(DB.STORES.users);
      let user = users.find(u => (u.googleSub && u.googleSub === sub) || (u.email && u.email.toLowerCase() === email));
      if (!user) {
        const randomPw = 'Ggl!' + Math.random().toString(36).slice(2) + 'A1!' + Date.now().toString(36);
        const hash = await DB.hashPassword(randomPw);
        const baseUser = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'googleuser';
        let username = baseUser;
        let n = 1;
        while (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
          username = baseUser + n;
          n++;
        }
        const id = await DB.add(DB.STORES.users, {
          username,
          passwordHash: hash,
          email,
          fullName: name,
          googleSub: sub,
          googleEmail: email,
          createdAt: new Date().toISOString(),
          authProvider: 'google',
          security: null,
          isNewRegistration: true
        });
        this._persistSession({
          id, username, fullName: name, email, isNewRegistration: true, authProvider: 'google'
        }, true);
        this.authAlert('Google account linked — welcome!', 'success');
        try { await this.startGoogleTrial({ id }); } catch (e) {}
        try { await DB.setSetting('onboardingDone', false); } catch (e) {}
      } else {
        if (!user.googleSub && sub) {
          user.googleSub = sub;
          user.googleEmail = email;
          user.authProvider = user.authProvider || 'google';
          await DB.put(DB.STORES.users, user);
        }
        this._persistSession({
          id: user.id,
          username: user.username,
          fullName: user.fullName || name,
          email: user.email || email,
          isNewRegistration: false,
          authProvider: 'google'
        }, true);
        this.authAlert('Signed in with Google', 'success');
        try { await this.startGoogleTrial(user); } catch (e) {}
      }
      if (typeof App !== 'undefined' && App.onLoginSuccess) await App.onLoginSuccess();
    } catch (err) {
      this.authAlert(err.message || 'Google sign-in failed');
    }
  },

  async renderAuthScreen() {
    const root = document.getElementById('auth-screen');
    if (!root) return;
    root.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');

    root.classList.add('auth-screen-scroll');
    root.innerHTML = `
      <div class="auth-screen-inner auth-boot" style="background:linear-gradient(145deg,#0f172a 0%,#134e4a 45%,#0f172a 100%);">
        <div class="auth-card card" style="max-width:420px;width:100%;border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.35);overflow:visible;">
          <div class="auth-card-header" style="text-align:center;padding:1.5rem 1.5rem 0.75rem;">
            <img src="icons/logo.svg" alt="SA Invoice Pro" style="width:72px;height:72px;margin:0 auto 0.75rem;display:block" onerror="this.style.display='none'"/>
            <h1 style="font-size:1.5rem;font-weight:800;color:#0f172a;margin:0">SA Invoice Pro</h1>
            <p style="color:#64748b;font-size:0.85rem;margin-top:0.35rem">Starting…</p>
          </div>
          <div id="auth-status" style="text-align:center;color:#64748b;font-size:0.9rem;padding:0 1.5rem;">Checking for updates…</div>
          <div id="auth-content" class="auth-card-body mt-4" style="padding:1rem 1.5rem 2rem;"></div>
        </div>
      </div>`;

    // 1) Updates first (silent, short timeout)
    try {
      const url = (await DB.getSetting('updateServerUrl', '')) || '';
      if (url && typeof App !== 'undefined' && App.checkForUpdates) {
        document.getElementById('auth-status').textContent = 'Checking for updates…';
        await Promise.race([
          App.checkForUpdates(true),
          new Promise(r => setTimeout(r, 3500))
        ]);
      }
    } catch (e) {}

    // 2) Accounts?
    const has = await this.hasUsers();
    document.getElementById('auth-status').textContent = has
      ? 'Welcome back — enter your password'
      : 'Create your first account';
    if (has) this.renderLoginForm();
    else this.renderSignupForm();
  },

  renderLoginForm() {
    this._mode = 'login';
    const last = localStorage.getItem('sa_last_username') || '';
    const el = document.getElementById('auth-content');
    if (!el) return;
    el.innerHTML = `
      <div id="auth-alert" class="auth-alert" style="display:none" role="alert"></div>
      <form id="auth-login-form" class="space-y-3" novalidate>
        <div id="lockout-hint" class="text-xs text-amber-600"></div>
        <div>
          <label class="label">Username</label>
          <input name="username" class="input" value="${last.replace(/"/g, '&quot;')}" placeholder="Leave blank if only one account" autocomplete="username" />
        </div>
        ${this.pwField('password', 'Password')}
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="remember" checked /> Stay signed in
        </label>
        <button type="submit" id="btn-login-submit" class="btn btn-primary w-full">Sign in</button>
        <div id="google-signin-slot" class="flex flex-col items-center gap-2 pt-2">
          <div class="text-xs text-slate-400">or</div>
          <div id="google-btn-wrap" style="min-height:44px;width:100%;display:flex;justify-content:center"></div>
          <p class="text-xs text-slate-400 text-center">Google Sign-In needs a Client ID in Settings → About (after first local login) or config.</p>
        </div>
        <button type="button" id="btn-to-signup" class="btn btn-outline w-full">Create another account</button>
        <button type="button" id="btn-to-recover" class="btn btn-outline w-full">Forgot password?</button>
      </form>`;
    this.bindPwToggles();
    if (typeof lucide !== 'undefined') try { lucide.createIcons(); } catch (e) {}
    const form = document.getElementById('auth-login-form');
    const doLogin = async () => {
      const fd = new FormData(form);
      const username = (fd.get('username') || '').trim();
      const password = fd.get('password') || '';
      if (!password) {
        this.authAlert('Enter your password');
        return;
      }
      try {
        this.authAlert('Signing in…', 'success');
        const user = username
          ? await this.login(username, password, fd.get('remember') === 'on')
          : await this.loginByPasswordOnly(password, fd.get('remember') === 'on');
        localStorage.setItem('sa_last_username', user.username);
        if (window.AppCrypto) { try { await AppCrypto.unlock(password); } catch (x) {} }
        this.authAlert('Signed in — opening app…', 'success');
        try {
          if (typeof App !== 'undefined' && App.enterApp) {
            await Promise.race([
              App.enterApp(),
              new Promise((_, rej) => setTimeout(() => rej(new Error('open timeout')), 15000))
            ]);
          } else if (typeof App !== 'undefined' && App.onLoginSuccess) {
            await App.onLoginSuccess();
          } else {
            location.reload();
          }
        } catch (openErr) {
          console.error(openErr);
          try {
            document.getElementById('auth-screen')?.classList.add('hidden');
            document.getElementById('app')?.classList.remove('hidden');
            if (App.navigate) App.navigate('home');
          } catch (e2) {
            this.authAlert('Signed in. Pull to refresh if the screen is blank.');
          }
        }
      } catch (err) {
        this.authAlert(err.message || 'Login failed');
      }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await doLogin();
    };
    document.getElementById('btn-login-submit').onclick = async (e) => {
      e.preventDefault();
      await doLogin();
    };
    document.getElementById('btn-to-signup').onclick = () => this.renderSignupForm();
    document.getElementById('btn-to-recover').onclick = () => this.renderRecoverForm();
    setTimeout(() => this.mountGoogleButton('google-btn-wrap'), 300);
  },


  renderSignupForm() {
    this._mode = 'signup';
    const el = document.getElementById('auth-content');
    if (!el) return;
    const qs = [
      'What city were you born in?',
      'What was the name of your first pet?',
      'What is your mother\'s maiden name?',
      'What school did you attend in Grade 7?',
      'What is your favourite SA sports team?'
    ];
    const qOpts = qs.map(q => `<option value="${q.replace(/"/g, '&quot;')}">${q}</option>`).join('');
    el.innerHTML = `
      <div id="auth-alert" class="auth-alert" style="display:none" role="alert"></div>
      <form id="auth-signup-form" class="space-y-3" novalidate>
        <div><label class="label">Username *</label>
          <input name="username" class="input" autocomplete="username" placeholder="At least 4 characters" /></div>
        <div><label class="label">Email *</label>
          <input name="email" type="email" class="input" autocomplete="email" placeholder="you@example.com" /></div>
        <div><label class="label">Full name</label>
          <input name="fullName" class="input" autocomplete="name" /></div>
        ${this.pwField('password', 'Password')}
        ${this.pwField('password2', 'Confirm password')}
        <p class="text-xs text-slate-500">Password: 8+ chars, upper, lower, number, symbol</p>
        <p class="text-xs text-slate-500 font-semibold mt-2">Security questions (account recovery)</p>
        <div><label class="label">Question 1</label><select name="sq1" class="input">${qOpts}</select>
          <input name="sa1" class="input mt-1" placeholder="Answer" autocomplete="off" /></div>
        <div><label class="label">Question 2</label><select name="sq2" class="input">${qOpts}</select>
          <input name="sa2" class="input mt-1" placeholder="Answer" autocomplete="off" /></div>
        <div><label class="label">Question 3</label><select name="sq3" class="input">${qOpts}</select>
          <input name="sa3" class="input mt-1" placeholder="Answer" autocomplete="off" /></div>
        <button type="submit" id="btn-signup-submit" class="btn btn-primary w-full">Create account</button>
        <div id="google-signup-slot" class="flex flex-col items-center gap-2 pt-2">
          <div class="text-xs text-slate-400">or</div>
          <div id="google-btn-wrap-signup" style="min-height:44px;width:100%;display:flex;justify-content:center"></div>
        </div>
        <button type="button" id="btn-to-login" class="btn btn-outline w-full">Already have an account?</button>
        <div class="auth-bottom-spacer" style="height:2.5rem" aria-hidden="true"></div>
      </form>`;
    this.bindPwToggles();
    if (typeof lucide !== 'undefined') try { lucide.createIcons(); } catch (e) {}
    const pwInput = document.getElementById('pw-password');
    if (pwInput) {
      let meter = document.getElementById('pw-strength');
      if (!meter) {
        meter = document.createElement('div');
        meter.id = 'pw-strength';
        meter.className = 'text-xs mt-1 font-semibold';
        pwInput.parentElement.appendChild(meter);
      }
      const update = () => {
        const s = this.passwordStrength(pwInput.value);
        meter.textContent = 'Strength: ' + s.label;
        meter.style.color = s.color;
      };
      pwInput.addEventListener('input', update);
      update();
    }
    const form = document.getElementById('auth-signup-form');
    const doSignup = async () => {
      const fd = new FormData(form);
      const username = (fd.get('username') || '').trim();
      const email = (fd.get('email') || '').trim();
      const password = fd.get('password') || '';
      const password2 = fd.get('password2') || '';
      if (!username) return this.authAlert('Enter a username');
      if (!email) return this.authAlert('Enter an email');
      if (!password) return this.authAlert('Enter a password');
      if (password !== password2) return this.authAlert('Passwords do not match');
      if (!(fd.get('sa1') || '').trim() || !(fd.get('sa2') || '').trim() || !(fd.get('sa3') || '').trim()) {
        return this.authAlert('Answer all 3 security questions');
      }
      try {
        this.authAlert('Creating account…', 'success');
        await this.createAccount(username, password, {
          email,
          fullName: fd.get('fullName'),
          sq1: fd.get('sq1'), sa1: fd.get('sa1'),
          sq2: fd.get('sq2'), sa2: fd.get('sa2'),
          sq3: fd.get('sq3'), sa3: fd.get('sa3')
        });
        localStorage.setItem('sa_last_username', username);
        if (window.AppCrypto) { try { await AppCrypto.unlock(password); } catch (x) {} }
        try { await DB.setSetting('onboardingDone', false); } catch (e) {}
        this.authAlert('Account created — opening app…', 'success');
        try {
          if (typeof App !== 'undefined' && App.enterApp) {
            await Promise.race([
              App.enterApp(),
              new Promise((_, rej) => setTimeout(() => rej(new Error('open timeout')), 15000))
            ]);
          } else if (typeof App !== 'undefined' && App.onLoginSuccess) {
            await App.onLoginSuccess();
          } else {
            location.reload();
          }
        } catch (openErr) {
          console.error(openErr);
          this.authAlert('Account saved. Tap Sign in if the app does not open.');
          // Do not logout — session is valid
          try {
            document.getElementById('auth-screen')?.classList.add('hidden');
            document.getElementById('app')?.classList.remove('hidden');
            if (App.showOnboarding) App.showOnboarding();
          } catch (e2) {
            setTimeout(() => location.reload(), 800);
          }
        }
      } catch (err) {
        this.authAlert(err.message || 'Registration failed');
      }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await doSignup();
    };
    document.getElementById('btn-signup-submit').onclick = async (e) => {
      e.preventDefault();
      await doSignup();
    };
    document.getElementById('btn-to-login').onclick = async () => {
      if (await this.hasUsers()) this.renderLoginForm();
      else this.authAlert('No accounts yet — create one first');
    };
    setTimeout(() => this.mountGoogleButton('google-btn-wrap-signup'), 300);
  },


  async renderRecoverForm() {
    this._mode = 'recover';
    const users = await this.listUsers();
    const el = document.getElementById('auth-content');
    if (!el) return;
    el.innerHTML = `
      <form id="auth-recover-form" class="space-y-3">
        <p class="text-sm text-slate-600">Reset password using your security answers.</p>
        <div><label class="label">Username</label>
          <select name="username" class="input">
            ${users.map(u => `<option value="${u.username}">${u.username}</option>`).join('')}
          </select>
        </div>
        <div id="recover-qs" class="text-sm text-slate-500">Select a user…</div>
        <input name="a1" class="input" placeholder="Answer 1" required />
        <input name="a2" class="input" placeholder="Answer 2" required />
        <input name="a3" class="input" placeholder="Answer 3" required />
        ${this.pwField('newPassword', 'New password')}
        <button type="submit" class="btn btn-primary w-full">Reset password</button>
        <button type="button" id="btn-back-login" class="btn btn-outline w-full">Back</button>
      </form>`;
    this.bindPwToggles();
    const showQ = () => {
      const un = el.querySelector('[name=username]').value;
      const u = users.find(x => x.username === un);
      const box = document.getElementById('recover-qs');
      if (u?.security) box.innerHTML = `<ol style="list-style:decimal;padding-left:1.2rem"><li>${u.security.q1}</li><li>${u.security.q2}</li><li>${u.security.q3}</li></ol>`;
      else box.textContent = 'No security questions on this account.';
    };
    el.querySelector('[name=username]').onchange = showQ;
    showQ();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('auth-recover-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await this.recoverPassword(fd.get('username'), fd.get('a1'), fd.get('a2'), fd.get('a3'), fd.get('newPassword'));
        App.toast('Password updated — please sign in');
        this.renderLoginForm();
      } catch (err) {
        App.toast(err.message || 'Recovery failed', 'error');
      }
    };
    document.getElementById('btn-back-login').onclick = () => this.renderLoginForm();
  }
};
window.Auth = Auth;
