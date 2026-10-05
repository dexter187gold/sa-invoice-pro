/* SA Invoice Pro – server URLs & integrations */
window.SA_CONFIG = Object.assign({
  appVersion: '1.0.18',
  defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
  defaultUpdateServerUrl: '',
  defaultOwnerDashboardUrl: '',
  publicAppUrl: '',
  githubReleasesUrl: '',
  /* Helix desk (TanStack/Vite) – set after you deploy Helix to Pages/Vercel */
  helixUrl: '',
  helixPathDesk: '/desk/tickets',
  helixEmbedTickets: true,
  features: {
    autoUpdateCheck: true,
    mandatoryUpdateGate: true,
    cloudDefaults: true
  }
}, window.SA_CONFIG || {});
