// SA Invoice Pro v2.0.1 – Auth (startup: updates → accounts → login/signup)
const Auth = {
  currentUser: null,
  SESSION_KEY: 'sa_session_v201',
  _mode: 'boot', // boot | login | signup | recover

  async init() {
    await DB.openDB();
    let session = localStorage.getItem(this.SESSION_KEY) || sessionStorage.getItem(this.SESSION_KEY);
    // migrate old key
    if (!session) {
      const old = localStorage.getItem('sa_session_v12');
      if (old) { session = old; localStorage.setItem(this.SESSION_KEY, old); }
    }
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        localStorage.setItem(this.SESSION_KEY, session);
        return true;
      } catch (e) {}
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
    return null;
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
    if (!profile.sq1 || !profile.sa1 || !profile.sq2 || !profile.sa2 || !profile.sq3 || !profile.sa3)
      throw new Error('Answer all 3 security questions');
    const users = await DB.getAll(DB.STORES.users);
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase().trim()))
      throw new Error('Username already exists');
    const hash = await DB.hashPassword(password);
    const id = await DB.add(DB.STORES.users, {
      username: username.trim(),
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      fullName: profile.fullName || '',
      email: profile.email.trim(),
      phone: profile.phone || '',
      security: {
        q1: profile.sq1, a1: await DB.hashPassword(profile.sa1.trim().toLowerCase()),
        q2: profile.sq2, a2: await DB.hashPassword(profile.sa2.trim().toLowerCase()),
        q3: profile.sq3, a3: await DB.hashPassword(profile.sa3.trim().toLowerCase())
      }
    });
    this._persistSession({
      id, username: username.trim(), fullName: profile.fullName || '',
      email: profile.email.trim(), isNewRegistration: true
    }, true);
    return id;
  },

  async login(username, password, remember = true) {
    const users = await DB.getAll(DB.STORES.users);
    const user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
    if (!user) throw new Error('User not found');
    const hash = await DB.hashPassword(password);
    if (hash !== user.passwordHash) throw new Error('Incorrect password');
    this._persistSession({
      id: user.id, username: user.username, fullName: user.fullName || '',
      email: user.email || '', isNewRegistration: false
    }, remember);
    return user;
  },

  /** Password-only when a single primary user is selected */
  async loginByPasswordOnly(password, remember = true) {
    const users = await DB.getAll(DB.STORES.users);
    if (!users.length) throw new Error('No accounts');
    const hash = await DB.hashPassword(password);
    // Prefer last username
    const last = localStorage.getItem('sa_last_username');
    let user = last ? users.find(u => u.username === last) : null;
    if (user && user.passwordHash === hash) {
      this._persistSession({
        id: user.id, username: user.username, fullName: user.fullName || '',
        email: user.email || '', isNewRegistration: false
      }, remember);
      return user;
    }
    // Try all users (small local DB)
    user = users.find(u => u.passwordHash === hash);
    if (!user) throw new Error('Incorrect password');
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

  async renderAuthScreen() {
    const root = document.getElementById('auth-screen');
    if (!root) return;
    root.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');

    root.innerHTML = `
      <div class="auth-boot" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;
        background:linear-gradient(145deg,#0f172a 0%,#134e4a 45%,#0f172a 100%);">
        <div class="card" style="max-width:420px;width:100%;padding:2rem;border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.35)">
          <div style="text-align:center;margin-bottom:1.25rem">
            <img src="icons/logo.svg" alt="SA Invoice Pro" style="width:72px;height:72px;margin:0 auto 0.75rem" onerror="this.style.display='none'"/>
            <h1 style="font-size:1.5rem;font-weight:800;color:#0f172a;margin:0">SA Invoice Pro</h1>
            <p style="color:#64748b;font-size:0.85rem;margin-top:0.35rem">Starting…</p>
          </div>
          <div id="auth-status" style="text-align:center;color:#64748b;font-size:0.9rem">Checking for updates…</div>
          <div id="auth-content" class="mt-4"></div>
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
      <form id="auth-login-form" class="space-y-3">
        <div>
          <label class="label">Account</label>
          <input name="username" class="input" value="${last}" placeholder="Username (optional if only one user)" autocomplete="username" />
        </div>
        ${this.pwField('password', 'Password')}
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="remember" checked /> Stay signed in
        </label>
        <button type="submit" class="btn btn-primary w-full">Sign in</button>
        <button type="button" id="btn-to-signup" class="btn btn-outline w-full">Create another account</button>
        <button type="button" id="btn-to-recover" class="text-sm text-sa-green w-full mt-1">Forgot password?</button>
      </form>`;
    this.bindPwToggles();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('auth-login-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const user = fd.get('username')?.trim()
          ? await this.login(fd.get('username'), fd.get('password'), fd.get('remember') === 'on')
          : await this.loginByPasswordOnly(fd.get('password'), fd.get('remember') === 'on');
        localStorage.setItem('sa_last_username', user.username);
        if (window.AppCrypto) { try { await AppCrypto.unlock(fd.get('password')); } catch (x) {} }
        App.onLoginSuccess();
      } catch (err) {
        App.toast(err.message || 'Login failed', 'error');
      }
    };
    document.getElementById('btn-to-signup').onclick = () => this.renderSignupForm();
    document.getElementById('btn-to-recover').onclick = () => this.renderRecoverForm();
  },

  renderSignupForm() {
    this._mode = 'signup';
    const el = document.getElementById('auth-content');
    if (!el) return;
    const qs = [
      'What city were you born in?',
      'What was the name of your first pet?',
      'What is your mother’s maiden name?',
      'What school did you attend in Grade 7?',
      'What is your favourite SA sports team?'
    ];
    const qOpts = qs.map(q => `<option value="${q}">${q}</option>`).join('');
    el.innerHTML = `
      <form id="auth-signup-form" class="space-y-3">
        <div><label class="label">Username *</label>
          <input name="username" class="input" required autocomplete="username" placeholder="At least 4 characters" /></div>
        <div><label class="label">Email *</label>
          <input name="email" type="email" class="input" required autocomplete="email" /></div>
        <div><label class="label">Full name</label>
          <input name="fullName" class="input" autocomplete="name" /></div>
        ${this.pwField('password', 'Password')}
        ${this.pwField('password2', 'Confirm password')}
        <p class="text-xs text-slate-500 font-semibold mt-2">Security questions (account recovery)</p>
        <div><label class="label">Question 1</label><select name="sq1" class="input">${qOpts}</select>
          <input name="sa1" class="input mt-1" placeholder="Answer" required /></div>
        <div><label class="label">Question 2</label><select name="sq2" class="input">${qOpts}</select>
          <input name="sa2" class="input mt-1" placeholder="Answer" required /></div>
        <div><label class="label">Question 3</label><select name="sq3" class="input">${qOpts}</select>
          <input name="sa3" class="input mt-1" placeholder="Answer" required /></div>
        <button type="submit" class="btn btn-primary w-full">Create account</button>
        <button type="button" id="btn-to-login" class="btn btn-outline w-full">Already have an account?</button>
      </form>`;
    this.bindPwToggles();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('auth-signup-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (fd.get('password') !== fd.get('password2')) {
        App.toast('Passwords do not match', 'error');
        return;
      }
      try {
        await this.createAccount(fd.get('username'), fd.get('password'), {
          email: fd.get('email'),
          fullName: fd.get('fullName'),
          sq1: fd.get('sq1'), sa1: fd.get('sa1'),
          sq2: fd.get('sq2'), sa2: fd.get('sa2'),
          sq3: fd.get('sq3'), sa3: fd.get('sa3')
        });
        localStorage.setItem('sa_last_username', fd.get('username').trim());
        if (window.AppCrypto) { try { await AppCrypto.unlock(fd.get('password')); } catch (x) {} }
        // Force company setup path
        await DB.setSetting('onboardingDone', false);
        App.onLoginSuccess();
      } catch (err) {
        App.toast(err.message || 'Registration failed', 'error');
      }
    };
    document.getElementById('btn-to-login').onclick = async () => {
      if (await this.hasUsers()) this.renderLoginForm();
      else App.toast('No accounts yet — create one first', 'error');
    };
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
