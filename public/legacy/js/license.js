// SA Invoice Pro – License client (server handshake + offline persistence)
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
  serverRestrict: null,

  async getHardwareId() {
    let id = await DB.getSetting('hwid', null);
    if (id) {
      this.hwid = id;
      return id;
    }
    try {
      id = localStorage.getItem('saip_hwid') || null;
    } catch (e) {}
    if (id) {
      await DB.setSetting('hwid', id);
      this.hwid = id;
      return id;
    }
    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
      String(navigator.hardwareConcurrency || ''),
      Date.now().toString(36)
    ].join('|');
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    id =
      'HWID-' +
      Math.abs(h).toString(16).toUpperCase().padStart(8, '0') +
      '-' +
      Math.abs((h * 31) | 0).toString(16).toUpperCase().padStart(4, '0');
    await DB.setSetting('hwid', id);
    try {
      localStorage.setItem('saip_hwid', id);
    } catch (e) {}
    this.hwid = id;
    return id;
  },

  async getServerUrl() {
    let url = ((await DB.getSetting('licenseServerUrl', '')) || '').trim().replace(/\/$/, '');
    if (!url && window.SA_CONFIG && SA_CONFIG.defaultLicenseServerUrl) {
      url = String(SA_CONFIG.defaultLicenseServerUrl).trim().replace(/\/$/, '');
      if (url) await DB.setSetting('licenseServerUrl', url);
    }
    return url;
  },

  async init() {
    // 1) Restore licence from all layers FIRST (before network)
    await this.restoreAllLayers();

    let trialStart = await DB.getSetting('trialStartedAt', null);
    if (!trialStart) {
      trialStart = new Date().toISOString();
      await DB.setSetting('trialStartedAt', trialStart);
    }
    this.trialStartedAt = trialStart;
    this.hwid = await this.getHardwareId();
    this.handshakeOk = !!(await DB.getSetting('handshakeOk', false));
    this.pendingKey = await DB.getSetting('pendingLicenseKey', null);
    this.serverRestrict = await DB.getSetting('serverRestrict', null);

    // 2) Pull remote owner config (Google ID, PayFast) if server online
    try {
      await this.pullRemoteConfig();
    } catch (e) {}

    // 3) Optional handshake (does not clear local licence)
    await this.connectWithRetries(2);
    return this.getStatus();
  },

  async restoreAllLayers() {
    // IndexedDB primary
    this.licenseKey = await DB.getSetting('licenseKey', null);
    this.licenseMeta = await DB.getSetting('licenseMeta', null);
    if (this.licenseKey && this.licenseMeta) {
      await this.persistOfflineLicense(this.licenseKey, this.licenseMeta, true);
      return true;
    }
    // Blob
    try {
      const blob = await DB.getSetting('licenseOfflineBlob', null);
      if (blob && blob.key && blob.meta) {
        this.licenseKey = blob.key;
        this.licenseMeta = blob.meta;
        await DB.setSetting('licenseKey', blob.key);
        await DB.setSetting('licenseMeta', blob.meta);
        return true;
      }
    } catch (e) {}
    // localStorage
    try {
      const raw = localStorage.getItem('saip_license_v1');
      if (raw) {
        const blob = JSON.parse(raw);
        if (blob && blob.key && blob.meta) {
          this.licenseKey = blob.key;
          this.licenseMeta = blob.meta;
          await DB.setSetting('licenseKey', blob.key);
          await DB.setSetting('licenseMeta', blob.meta);
          await DB.setSetting('licenseOfflineBlob', blob);
          return true;
        }
      }
    } catch (e) {}
    return false;
  },

  async persistOfflineLicense(key, meta, quiet) {
    if (!key || !meta) return null;
    const payload = {
      v: 1,
      product: 'SA Invoice Pro',
      key,
      meta,
      hwid: this.hwid || meta.hwid || null,
      savedAt: new Date().toISOString()
    };
    try {
      await DB.setSetting('licenseKey', key);
      await DB.setSetting('licenseMeta', meta);
      await DB.setSetting('licenseOfflineBlob', payload);
    } catch (e) {}
    try {
      localStorage.setItem('saip_license_v1', JSON.stringify(payload));
      localStorage.setItem('saip_license_key', key);
    } catch (e) {}
    this.licenseKey = key;
    this.licenseMeta = meta;
    return payload;
  },

  async restoreOfflineLicense() {
    return this.restoreAllLayers();
  },

  exportLicenseFile(payload) {
    const data =
      payload ||
      {
        v: 1,
        product: 'SA Invoice Pro',
        key: this.licenseKey,
        meta: this.licenseMeta,
        hwid: this.hwid,
        savedAt: new Date().toISOString()
      };
    if (!data.key) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sa-invoice-license.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },

  async importLicenseFile(file) {
    const text = await file.text();
    const blob = JSON.parse(text);
    if (!blob || !blob.key || !blob.meta) throw new Error('Invalid license file');
    await this.persistOfflineLicense(blob.key, blob.meta);
    return this.getStatus();
  },

  async pullRemoteConfig() {
    const url = await this.getServerUrl();
    if (!url) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(url + '/api/public-config', { signal: ctrl.signal });
      if (!res.ok) return null;
      const cfg = await res.json();
      if (!cfg || !cfg.ok) return null;
      // Apply Google Client ID for all users
      if (cfg.googleClientId && typeof Auth !== 'undefined' && Auth.setGoogleClientId) {
        Auth.setGoogleClientId(cfg.googleClientId);
        try {
          await DB.setSetting('googleClientId', cfg.googleClientId);
        } catch (e) {}
      }
      // Apply PayFast if owner pushed sandbox/live keys
      if (cfg.payfast && window.PayFast) {
        const pf = cfg.payfast;
        if (pf.merchantId) {
          await PayFast.saveConfig({
            merchantId: pf.merchantId || '',
            merchantKey: pf.merchantKey || '',
            passphrase: pf.passphrase || '',
            sandbox: pf.sandbox !== false
          });
        }
      }
      if (cfg.licenseServerUrl) {
        await DB.setSetting('licenseServerUrl', String(cfg.licenseServerUrl).replace(/\/$/, ''));
      }
      return cfg;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(t);
    }
  },

  async connectWithRetries(max) {
    max = max || 3;
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
        this.serverMessage = 'Connect attempt ' + i + '/' + max + ' failed';
      }
      if (i < max) await new Promise((r) => setTimeout(r, 600));
    }
    this.serverMessage = 'Server unreachable – using offline licence if saved';
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
      if (!res.ok) throw new Error(data.error || data.message || 'HTTP ' + res.status);
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Server timeout – is the license server running?');
      if ((e.message || '').includes('Failed to fetch') || (e.message || '').includes('NetworkError')) {
        throw new Error('Cannot reach ' + url);
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  },

  async handshake() {
    if (!this.hwid) await this.getHardwareId();
    const data = await this.fetchJson('/api/handshake', {
      hwid: this.hwid,
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0',
      at: new Date().toISOString()
    });
    this.handshakeOk = true;
    await DB.setSetting('handshakeOk', true);
    this.serverMessage = data.message || 'Handshake OK';
    try {
      const st = await this.checkDeviceStatus();
      if (st && st.allowed === false) {
        this.serverMessage = 'Server status: ' + (st.mode || 'restricted');
        await DB.setSetting('serverRestrict', st.mode);
        this.serverRestrict = st.mode;
      } else {
        await DB.setSetting('serverRestrict', null);
        this.serverRestrict = null;
      }
    } catch (e) {}
    return true;
  },

  async requestLicense() {
    if (!this.hwid) await this.getHardwareId();
    if (!this.handshakeOk) await this.handshake();
    const data = await this.fetchJson('/api/request', {
      hwid: this.hwid,
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0'
    });
    this.serverMessage = data.message || 'Request sent';
    return data;
  },

  async claimKey() {
    if (!this.hwid) await this.getHardwareId();
    const data = await this.fetchJson('/api/claim', { hwid: this.hwid });
    if (!data.key) throw new Error(data.message || 'No key issued yet');
    this.pendingKey = data.key;
    await DB.setSetting('pendingLicenseKey', data.key);
    this.serverMessage = 'Key received – click Activate';
    return data;
  },

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
    await DB.setSetting('pendingLicenseKey', null);
    this.pendingKey = null;
    await this.persistOfflineLicense(key, record);
    this.serverMessage = data.message || 'Activation successful';
    return record;
  },

  async checkDeviceStatus() {
    if (!this.hwid) await this.getHardwareId();
    return this.fetchJson('/api/device-status', { hwid: this.hwid });
  },

  getStatus() {
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
      const expMs = this.licenseMeta.expiresAt ? new Date(this.licenseMeta.expiresAt).getTime() : NaN;
      // Missing expiry → treat as long-lived (don't lose activation)
      const exp = Number.isFinite(expMs) ? expMs : Date.now() + 3650 * 86400000;
      if (Date.now() <= exp) {
        const plan = (this.licenseMeta.plan || '').toLowerCase();
        const mode = plan === 'trial' || (this.licenseMeta.source || '').includes('trial') ? 'trial' : 'licensed';
        return {
          mode,
          label: this.licenseMeta.label || (mode === 'trial' ? 'Trial active' : 'Licensed'),
          plan: this.licenseMeta.plan,
          daysLeft: Math.max(0, Math.ceil((exp - Date.now()) / 86400000)),
          expiresAt: this.licenseMeta.expiresAt,
          canUse: true,
          source: this.licenseMeta.source || 'local'
        };
      }
      return {
        mode: 'expired',
        label: 'License expired',
        plan: this.licenseMeta.plan,
        daysLeft: 0,
        canUse: false
      };
    }
    return {
      mode: 'unlicensed',
      label: 'Not licensed',
      plan: null,
      daysLeft: 0,
      canUse: false,
      handshakeOk: this.handshakeOk,
      hasPendingKey: !!this.pendingKey
    };
  }
};

window.License = License;
