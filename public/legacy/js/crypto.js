// SA Invoice Pro – local encryption helpers (AES-GCM + PBKDF2)
const AppCrypto = {
  _key: null,

  async deriveKey(password, saltB64) {
    const enc = new TextEncoder();
    const salt = saltB64
      ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
      : crypto.getRandomValues(new Uint8Array(16));
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const saltOut = btoa(String.fromCharCode(...salt));
    this._key = key;
    return { key, salt: saltOut };
  },

  async unlock(password) {
    let salt = localStorage.getItem('sa_crypto_salt');
    const { key, salt: s } = await this.deriveKey(password, salt);
    if (!salt) localStorage.setItem('sa_crypto_salt', s);
    this._key = key;
    sessionStorage.setItem('sa_crypto_unlocked', '1');
    return true;
  },

  lock() {
    this._key = null;
    sessionStorage.removeItem('sa_crypto_unlocked');
  },

  isUnlocked() {
    return !!this._key || sessionStorage.getItem('sa_crypto_unlocked') === '1';
  },

  async encryptText(plain) {
    if (!this._key) return plain; // pass-through if not unlocked
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this._key, enc.encode(String(plain)));
    const packed = new Uint8Array(iv.length + ct.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ct), iv.length);
    return 'ENC:' + btoa(String.fromCharCode(...packed));
  },

  async decryptText(data) {
    if (!data || typeof data !== 'string' || !data.startsWith('ENC:')) return data;
    if (!this._key) throw new Error('Vault locked');
    const raw = Uint8Array.from(atob(data.slice(4)), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this._key, ct);
    return new TextDecoder().decode(pt);
  },

  async encryptObject(obj) {
    const json = JSON.stringify(obj);
    return this.encryptText(json);
  },

  async decryptObject(data) {
    const json = await this.decryptText(data);
    try { return JSON.parse(json); } catch (e) { return null; }
  }
};
window.AppCrypto = AppCrypto;
