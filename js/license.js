// SA Invoice Pro v1.5 – Server-only license handshake (no local key gen)
const License = {
  TRIAL_DAYS: 7,
  SECRET: 'SAIP-ZA-2026-V1',
  trialStartedAt: null,
  licenseKey: null,
  licenseMeta: null,
  hwid: null,
  handshakeOk: false,
  pendingKey: null,
  serverMessage: '',
  lastError: '',

  async getHardwareId() {
    let id = await DB.getSetting('hwid', null);
    if (id) { this.hwid = id; return id; }
    const raw = [
      navigator.userAgent, navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      String(navigator.hardwareConcurrency || ''),
      Date.now().toString(36)
    ].join('|');
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    id = 'HWID-' + Math.abs(h).toString(16).toUpperCase().padStart(8, '0') +
      '-' + Math.abs((h * 31) | 0).toString(16).toUpperCase().padStart(4, '0');
    await DB.setSetting('hwid', id);
    this.hwid = id;
    return id;
  },

  async getServerUrl() {
    return ((await DB.getSetting('licenseServerUrl', '')) || '').replace(/\/$/, '');
  },

  async init() {
    let trialStart = await DB.getSetting('trialStartedAt', null);
    if (!trialStart) {
      trialStart = new Date().toISOString();
      await DB.setSetting('trialStartedAt', trialStart);
    }
    this.trialStartedAt = trialStart;
    this.licenseKey = await DB.getSetting('licenseKey', null);
    this.licenseMeta = await DB.getSetting('licenseMeta', null);
    this.hwid = await this.getHardwareId();
    this.handshakeOk = !!(await DB.getSetting('handshakeOk', false));
    this.pendingKey = await DB.getSetting('pendingLicenseKey', null);
    this.serverRestrict = await DB.getSetting('serverRestrict', null);
    // Auto connect: 3 retries then offline
    await this.connectWithRetries(2);
    return this.getStatus();
  },

  async connectWithRetries(max = 3) {
    const url = await this.getServerUrl();
    if (!url) {
      this.serverMessage = 'No server URL set – offline mode';
      return false;
    }
    for (let i = 1; i <= max; i++) {
      try {
        const ok = await this.handshake();
        if (ok) return true;
      } catch (e) {
        this.lastError = e.message || String(e);
        this.serverMessage = `Connect attempt ${i}/${max} failed`;
      }
      if (i < max) await new Promise(r => setTimeout(r, 800));
    }
    this.serverMessage = 'Server unreachable after 3 tries – working offline';
    return false;
  },

  async fetchJson(path, body) {
    const url = await this.getServerUrl();
    if (!url) throw new Error('Set license server URL first');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
        signal: ctrl.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || ('HTTP ' + res.status));
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Server timeout – is the license server running?');
      if ((e.message || '').includes('Failed to fetch') || (e.message || '').includes('NetworkError'))
        throw new Error('Cannot reach ' + url + ' – On SAME PC type http://127.0.0.1:5055 exactly. Restart license server (CORS update). Allow port 5055 in Windows Firewall if using another PC.');
      throw e;
    } finally {
      clearTimeout(t);
    }
  },

  /** Step 1–2: Get HWID and handshake with server */
  async handshake() {
    if (!this.hwid) await this.getHardwareId();
    const data = await this.fetchJson('/api/handshake', {
      hwid: this.hwid,
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.5',
      at: new Date().toISOString()
    });
    this.handshakeOk = true;
    await DB.setSetting('handshakeOk', true);
    this.serverMessage = data.message || 'Handshake OK – server recognised this PC';
    try {
      const st = await this.checkDeviceStatus();
      if (st && st.allowed === false) {
        this.serverMessage = 'Server status: ' + (st.mode || 'restricted');
        await DB.setSetting('serverRestrict', st.mode);
      } else {
        await DB.setSetting('serverRestrict', null);
      }
    } catch (_) {}
    // Server may already have a key waiting
    if (data.key) {
      this.pendingKey = data.key;
      await DB.setSetting('pendingLicenseKey', data.key);
    }
    return true;
  },

  /** Step 3: Request license (after handshake) */
  async requestLicense(plan = 'T') {
    if (!this.handshakeOk) throw new Error('Complete Get HWID / handshake first');
    if (!this.hwid) await this.getHardwareId();
    const company = (typeof App !== 'undefined' && App.company) ? App.company.name : '';
    const data = await this.fetchJson('/api/request', {
      hwid: this.hwid,
      plan,
      company,
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.5',
      at: new Date().toISOString()
    });
    this.serverMessage = data.message || 'License requested – waiting for vendor approval';
    if (data.key) {
      this.pendingKey = data.key;
      await DB.setSetting('pendingLicenseKey', data.key);
    }
    return data;
  },

  /** Poll / claim issued key from server */
  async claimKey() {
    if (!this.hwid) await this.getHardwareId();
    const data = await this.fetchJson('/api/claim', { hwid: this.hwid });
    if (!data.key) throw new Error(data.message || 'No key issued yet');
    this.pendingKey = data.key;
    await DB.setSetting('pendingLicenseKey', data.key);
    this.serverMessage = 'Key received from server – click Activate';
    return data;
  },

  /** Step 4: Activate – client sends key to server for validation, then stores locally */
  async activateWithServer() {
    const key = (this.pendingKey || '').trim().toUpperCase();
    if (!key) throw new Error('No server key yet – request and wait for approval');
    if (!this.hwid) await this.getHardwareId();
    const data = await this.fetchJson('/api/activate-validate', {
      hwid: this.hwid,
      key,
      at: new Date().toISOString()
    });
    if (!data.valid) throw new Error(data.error || 'Server rejected this key');
    // Server confirmed – save locally
    const plan = data.plan || 'trial';
    const days = data.days || 7;
    const activatedAt = new Date().toISOString();
    const expiresAt = data.expiresAt || new Date(Date.now() + days * 86400000).toISOString();
    const record = {
      key,
      plan,
      label: data.label || 'Licensed (server)',
      activatedAt,
      expiresAt,
      hwid: this.hwid,
      source: 'server'
    };
    await DB.setSetting('licenseKey', key);
    await DB.setSetting('licenseMeta', record);
    await DB.setSetting('pendingLicenseKey', null);
    this.licenseKey = key;
    this.licenseMeta = record;
    this.pendingKey = null;
    this.serverMessage = data.message || 'Activation successful';
    return record;
  },

  validateKeyFormat(key) {
    const k = (key || '').trim().toUpperCase();
    const m = /^SAIP-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(k);
    if (!m) return false;
    return this._checksum(m[1] + m[2]) === m[3];
  },

  _checksum(body) {
    const s = body + this.SECRET;
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  },

  async checkDeviceStatus() {
    if (!this.hwid) await this.getHardwareId();
    return this.fetchJson('/api/device-status', { hwid: this.hwid });
  },

  getStatus() {
    // sync restrict from last check stored
    // (loaded in init below)

    if (this.serverRestrict === 'suspended' || this.serverRestrict === 'blocked') {
      return {
        mode: this.serverRestrict,
        label: 'Server ' + this.serverRestrict + ' – contact vendor',
        plan: null,
        daysLeft: 0,
        canUse: false,
        source: 'server'
      };
    }
    if (this.licenseMeta && this.licenseKey) {
      const exp = new Date(this.licenseMeta.expiresAt).getTime();
      if (Date.now() <= exp) {
        return {
          mode: 'licensed',
          label: this.licenseMeta.label || 'Licensed',
          plan: this.licenseMeta.plan,
          daysLeft: Math.ceil((exp - Date.now()) / 86400000),
          expiresAt: this.licenseMeta.expiresAt,
          canUse: true,
          source: 'server'
        };
      }
      return {
        mode: 'expired',
        label: 'License expired – request a new key from server',
        plan: this.licenseMeta.plan,
        daysLeft: 0,
        canUse: false
      };
    }
    // No local free trial activation without server – soft read-only until server trial
    return {
      mode: 'unlicensed',
      label: 'Not licensed – complete server handshake to activate trial',
      plan: null,
      daysLeft: 0,
      canUse: false,
      handshakeOk: this.handshakeOk,
      hasPendingKey: !!this.pendingKey
    };
  }
};
window.License = License;
