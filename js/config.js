/* SA Invoice Pro 3.1 – endpoints for online mode
   Fill these after Cloudflare Pages + Render/Oracle deploy.
*/
window.SA_CONFIG = Object.assign({
  appVersion: '3.1.0',
  // Public HTTPS URLs (leave '' for local-only)
  defaultLicenseServerUrl: '',
  defaultUpdateServerUrl: '',
  defaultOwnerDashboardUrl: '',
  // Optional: public client URL when hosted
  publicAppUrl: '',
  githubReleasesUrl: '',
  // Feature toggles
  features: {
    autoUpdateCheck: true,
    mandatoryUpdateGate: true,
    cloudDefaults: true
  }
}, window.SA_CONFIG || {});
