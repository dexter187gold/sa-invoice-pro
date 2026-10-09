/* Runtime config – edit after deploy without rebuild.
   Set helixUrl to your live Helix deployment if used. */
window.SA_CONFIG = Object.assign({
  appVersion: '3.12.0',
  defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
  helixUrl: '',
  helixPathDesk: '/desk/tickets',
}, window.SA_CONFIG || {});
