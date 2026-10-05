/* Runtime config – edit after deploy without rebuild if loaded as separate asset.
   For Vite, values are also in src/config.js; this file is optional overlay. */
window.SA_CONFIG = Object.assign({
  appVersion: '2.0.0',
  defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
  helixUrl: '',
  helixPathDesk: '/desk/tickets',
}, window.SA_CONFIG || {});
