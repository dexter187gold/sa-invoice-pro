/* SA Invoice Pro 3.2 – auto server URLs
   Fill these once when you deploy. The app applies them automatically
   so users do not type/copy/paste license or update URLs.
*/
window.SA_CONFIG = Object.assign({
  appVersion: '3.2.0',
  // >>> SET YOUR RENDER (or other) HTTPS URLS HERE <<<
  defaultLicenseServerUrl: '', // e.g. 'https://sa-invoice-license.onrender.com'
  defaultUpdateServerUrl: '',  // e.g. 'https://sa-invoice-updates.onrender.com'
  defaultOwnerDashboardUrl: '',
  publicAppUrl: '',
  githubReleasesUrl: '',
  features: {
    autoUpdateCheck: true,
    mandatoryUpdateGate: true,
    cloudDefaults: true
  }
}, window.SA_CONFIG || {});
