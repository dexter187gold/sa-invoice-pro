/* Runtime config – edit after deploy without rebuild.
   Set helixUrl to your live Helix (olive-yellow-reef-quartz) deployment. */
window.SA_CONFIG = Object.assign({
  appVersion: '2.4.2',
  defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
  helixUrl: '',
  helixPathDesk: '/desk/tickets',
}, window.SA_CONFIG || {});
