/**
 * SA Invoice Pro – PayFast (sandbox + live) checkout helper.
 * Signature: MD5 of name=value pairs in attribute order, non-empty only, + passphrase.
 * Docs: https://developers.payfast.co.za/docs
 *
 * SECURITY: Merchant key & passphrase are stored in IndexedDB on the device.
 * Prefer server-side signing for production high-volume; sandbox is fine client-side.
 */
const PayFast = {
  async getConfig() {
    const g = async (k, d) => {
      try { return await DB.getSetting(k, d); } catch (e) { return d; }
    };
    return {
      merchantId: String(await g('payfastMerchantId', '') || '').trim(),
      merchantKey: String(await g('payfastMerchantKey', '') || '').trim(),
      passphrase: String(await g('payfastPassphrase', '') || '').trim(),
      sandbox: !!(await g('payfastSandbox', true)),
      returnPath: String(await g('payfastReturnPath', '') || '').trim()
    };
  },

  async saveConfig(cfg) {
    if (cfg.merchantId != null) await DB.setSetting('payfastMerchantId', String(cfg.merchantId).trim());
    if (cfg.merchantKey != null) await DB.setSetting('payfastMerchantKey', String(cfg.merchantKey).trim());
    if (cfg.passphrase != null) await DB.setSetting('payfastPassphrase', String(cfg.passphrase).trim());
    if (cfg.sandbox != null) await DB.setSetting('payfastSandbox', !!cfg.sandbox);
  },

  processUrl(sandbox) {
    return sandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';
  },

  /** MD5 (hex) – pure JS for PayFast signature */
  md5(str) {
    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function md5cycle(x, k) {
      let a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    }
    function md5blk(s) {
      const md5blks = [];
      for (let i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) +
          (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }
    function md51(s) {
      const n = s.length;
      const state = [1732584193, -271733879, -1732584194, 271733878];
      let i;
      for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
      s = s.substring(i - 64);
      const tail = new Array(16).fill(0);
      for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) {
        md5cycle(state, tail);
        for (let j = 0; j < 16; j++) tail[j] = 0;
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }
    function rhex(n) {
      const hex_chr = '0123456789abcdef';
      let s = '';
      for (let j = 0; j < 4; j++) s += hex_chr.charAt((n >> (j * 8 + 4)) & 0x0f) + hex_chr.charAt((n >> (j * 8)) & 0x0f);
      return s;
    }
    function add32(a, b) { return (a + b) & 0xffffffff; }
    return md51(str).map(rhex).join('');
  },

  buildSignature(data, passphrase) {
    // PayFast: sign non-empty fields in order; exclude signature + merchant_key
    const parts = [];
    Object.keys(data).forEach((k) => {
      if (k === 'signature' || k === 'merchant_key') return;
      let v = data[k];
      if (v === undefined || v === null) return;
      v = String(v).trim();
      if (v === '') return;
      parts.push(k + '=' + encodeURIComponent(v).replace(/%20/g, '+'));
    });
    let str = parts.join('&');
    if (passphrase) {
      str += '&passphrase=' + encodeURIComponent(passphrase.trim()).replace(/%20/g, '+');
    }
    return this.md5(str);
  },

  /**
   * Start checkout for an invoice (or licence product).
   * amount in ZAR, two decimals.
   */
  async startPayment({
    amount,
    itemName,
    itemDescription,
    mPaymentId,
    email,
    nameFirst,
    nameLast,
    customStr1,
    customStr2
  }) {
    const cfg = await this.getConfig();
    if (!cfg.merchantId || !cfg.merchantKey) {
      throw new Error('PayFast not configured — open Settings → Payments and enter sandbox Merchant ID & Key');
    }
    const amt = Number(amount);
    if (!(amt > 0)) throw new Error('Amount must be greater than zero');

    const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
    const returnUrl = origin + (origin.includes('?') ? '&' : origin.endsWith('/') ? '' : '/') +
      (origin.includes('index') ? '' : '') + '?payfast=return';
    // Clean return: same page with query
    const base = origin + (location.pathname || '/');
    const data = {
      merchant_id: cfg.merchantId,
      merchant_key: cfg.merchantKey,
      return_url: base + (base.includes('?') ? '&' : '?') + 'payfast=return&ref=' + encodeURIComponent(mPaymentId || ''),
      cancel_url: base + (base.includes('?') ? '&' : '?') + 'payfast=cancel&ref=' + encodeURIComponent(mPaymentId || ''),
      // notify_url requires public HTTPS server — optional for sandbox manual check
      name_first: (nameFirst || 'Customer').slice(0, 100),
      name_last: (nameLast || '').slice(0, 100),
      email_address: (email || '').slice(0, 100),
      m_payment_id: String(mPaymentId || ('SAIP-' + Date.now())).slice(0, 100),
      amount: amt.toFixed(2),
      item_name: String(itemName || 'Invoice').slice(0, 100),
      item_description: String(itemDescription || '').slice(0, 255)
    };
    if (customStr1) data.custom_str1 = String(customStr1).slice(0, 255);
    if (customStr2) data.custom_str2 = String(customStr2).slice(0, 255);

    // Remove empty optional fields before signature
    Object.keys(data).forEach((k) => {
      if (data[k] === '' || data[k] == null) delete data[k];
    });

    data.signature = this.buildSignature(data, cfg.passphrase);

    // Persist pending payment for return handling
    try {
      await DB.setSetting('payfastPending', {
        mPaymentId: data.m_payment_id,
        amount: data.amount,
        itemName: data.item_name,
        at: new Date().toISOString(),
        sandbox: cfg.sandbox
      });
    } catch (e) {}

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.processUrl(cfg.sandbox);
    form.style.display = 'none';
    Object.keys(data).forEach((k) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = data[k];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  },

  async handleReturnFromQuery() {
    try {
      const params = new URLSearchParams(location.search || '');
      const pf = params.get('payfast');
      if (!pf) return null;
      const ref = params.get('ref') || '';
      const pending = await DB.getSetting('payfastPending', null);
      // Clean URL
      try {
        const u = new URL(location.href);
        u.searchParams.delete('payfast');
        u.searchParams.delete('ref');
        history.replaceState({}, '', u.pathname + u.search);
      } catch (e) {}
      return { status: pf, ref, pending };
    } catch (e) {
      return null;
    }
  }
};

if (typeof window !== 'undefined') window.PayFast = PayFast;
