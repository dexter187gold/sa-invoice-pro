/**
 * SA Invoice Pro – Cloud Sync hooks (v1)
 * Runs after app.js. Provides:
 *  - Auto pull on boot when logged into cloud
 *  - Helper to push invoice status
 *  - Floating Cloud Account panel (Settings shortcut)
 */
(function () {
  if (!window.SA_SYNC) {
    console.warn('[SA_SYNC] sync.js not loaded');
    return;
  }

  const SYNC = window.SA_SYNC;

  // ── 1. Auto-pull when cloud session exists ───────────────────────────────
  async function tryPullOnBoot() {
    if (!SYNC.enabled || !SYNC.isLoggedIn()) return;
    try {
      const remote = await SYNC.pull();
      console.log('[SA_SYNC] Pulled workspace v' + remote.version, remote.updated_at);
      // Expose for app to merge (app can call window.__SA_SYNC_REMOTE__)
      window.__SA_SYNC_REMOTE__ = remote;
      // Dispatch event so app.js (or future code) can listen
      window.dispatchEvent(new CustomEvent('sa-sync-pulled', { detail: remote }));
    } catch (e) {
      console.warn('[SA_SYNC] Pull failed', e.message || e);
    }
  }

  // Run after a short delay so IndexedDB / app is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryPullOnBoot, 1800));
  } else {
    setTimeout(tryPullOnBoot, 1800);
  }

  // ── 2. Global helper the app can call after saving invoice / payment ─────
  window.saPushInvoiceStatus = function (invoice, client) {
    if (!SYNC.isLoggedIn()) return Promise.resolve();
    try {
      const status = SYNC.statusFromInvoice(invoice, client || {});
      return SYNC.pushInvoiceStatus(status).catch(err => {
        console.warn('[SA_SYNC] status push failed', err);
      });
    } catch (e) {
      console.warn('[SA_SYNC] statusFromInvoice error', e);
      return Promise.resolve();
    }
  };

  // Full workspace push (call occasionally or on app close)
  window.saPushWorkspace = function (workspaceObject) {
    if (!SYNC.isLoggedIn() || !workspaceObject) return Promise.resolve();
    return SYNC.push(workspaceObject).catch(err => {
      console.warn('[SA_SYNC] workspace push failed', err);
    });
  };

  // ── 3. Simple Cloud Account floating panel ───────────────────────────────
  function createCloudPanel() {
    if (document.getElementById('sa-cloud-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'sa-cloud-panel';
    panel.style.cssText = `
      position:fixed; bottom:20px; right:20px; z-index:9999;
      width:300px; max-width:calc(100vw - 32px);
      background:#fff; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,.18);
      border:1px solid #e2e8f0; font-family:system-ui,sans-serif; overflow:hidden;
      display:none;
    `;

    panel.innerHTML = `
      <div style="background:#007A4D;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:14px">☁ Cloud Sync</strong>
        <button id="sa-cloud-close" style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;line-height:1">×</button>
      </div>
      <div style="padding:16px" id="sa-cloud-body">
        <p style="margin:0 0 12px;font-size:13px;color:#64748b" id="sa-cloud-status">Checking…</p>
        <div id="sa-cloud-form">
          <input id="sa-cloud-email" type="email" placeholder="Email" style="width:100%;padding:8px 10px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box"/>
          <input id="sa-cloud-pass" type="password" placeholder="Password (min 6)" style="width:100%;padding:8px 10px;margin-bottom:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box"/>
          <div style="display:flex;gap:8px">
            <button id="sa-cloud-login" style="flex:1;padding:8px;background:#0f172a;color:#fff;border:0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Login</button>
            <button id="sa-cloud-register" style="flex:1;padding:8px;background:#007A4D;color:#fff;border:0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Register</button>
          </div>
        </div>
        <button id="sa-cloud-logout" style="display:none;width:100%;padding:8px;margin-top:4px;background:#fee2e2;color:#991b1b;border:0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Logout</button>
        <p id="sa-cloud-msg" style="margin:10px 0 0;font-size:12px;color:#64748b;min-height:16px"></p>
      </div>
    `;
    document.body.appendChild(panel);

    // Toggle button
    const btn = document.createElement('button');
    btn.id = 'sa-cloud-toggle';
    btn.title = 'Cloud Sync';
    btn.innerHTML = '☁';
    btn.style.cssText = `
      position:fixed; bottom:20px; right:20px; z-index:9998;
      width:48px; height:48px; border-radius:50%; border:0;
      background:#007A4D; color:#fff; font-size:22px; cursor:pointer;
      box-shadow:0 4px 14px rgba(0,122,77,.4);
    `;
    document.body.appendChild(btn);

    function refreshUI() {
      const logged = SYNC.isLoggedIn();
      document.getElementById('sa-cloud-status').textContent = logged
        ? '✅ Connected to cloud'
        : 'Not connected – login to sync across devices';
      document.getElementById('sa-cloud-form').style.display = logged ? 'none' : 'block';
      document.getElementById('sa-cloud-logout').style.display = logged ? 'block' : 'none';
    }

    btn.onclick = () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      btn.style.display = panel.style.display === 'none' ? 'block' : 'none';
      refreshUI();
    };
    document.getElementById('sa-cloud-close').onclick = () => {
      panel.style.display = 'none';
      btn.style.display = 'block';
    };

    document.getElementById('sa-cloud-login').onclick = async () => {
      const email = document.getElementById('sa-cloud-email').value.trim();
      const pass = document.getElementById('sa-cloud-pass').value;
      const msg = document.getElementById('sa-cloud-msg');
      msg.textContent = 'Logging in…';
      try {
        await SYNC.login(email, pass);
        msg.textContent = 'Logged in successfully';
        refreshUI();
        tryPullOnBoot();
      } catch (e) {
        msg.textContent = e.message || 'Login failed';
      }
    };

    document.getElementById('sa-cloud-register').onclick = async () => {
      const email = document.getElementById('sa-cloud-email').value.trim();
      const pass = document.getElementById('sa-cloud-pass').value;
      const msg = document.getElementById('sa-cloud-msg');
      msg.textContent = 'Creating account…';
      try {
        await SYNC.register(email, pass);
        msg.textContent = 'Account created & logged in';
        refreshUI();
      } catch (e) {
        msg.textContent = e.message || 'Register failed';
      }
    };

    document.getElementById('sa-cloud-logout').onclick = () => {
      SYNC.logout();
      document.getElementById('sa-cloud-msg').textContent = 'Logged out';
      refreshUI();
    };

    refreshUI();
  }

  // Create panel once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createCloudPanel);
  } else {
    createCloudPanel();
  }

  console.log('[SA_SYNC] hooks ready – use window.saPushInvoiceStatus(inv, client)');
})();
