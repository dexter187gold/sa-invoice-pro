/* SA Invoice Pro – server URLs (applied automatically on start) */
window.SA_CONFIG = Object.assign({
  appVersion: '1.0.14',
  defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
  defaultUpdateServerUrl: '',
  defaultOwnerDashboardUrl: '',
  publicAppUrl: '',
  githubReleasesUrl: '',
  features: {
    autoUpdateCheck: true,
    mandatoryUpdateGate: true,
    cloudDefaults: true
  }
}, window.SA_CONFIG || {});
