/* Runtime config — public defaults (overridable at deploy) */
window.SA_CONFIG = Object.assign({
  appVersion: '6.61.0',
  defaultLicenseServerUrl: 'https://saip-license.onrender.com',
  defaultCloudUrl: 'https://saip-sync.onrender.com',
  googleClientId: '1035068069363-o5st6insdv9d349onoa4gqqnf5gadav8.apps.googleusercontent.com',
  helixUrl: '',
  helixPathDesk: '/desk/tickets',
}, window.SA_CONFIG || {});
