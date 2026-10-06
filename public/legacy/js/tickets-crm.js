/** SA Tickets CRM 1.1.0 loader */
(async function () {
  const ver = (window.SA_BUILD || '1.1.0');
  const parts = [0, 1, 2, 3].map(function (n) {
    return fetch('js/tickets-crm.chunk' + n + '.js?v=' + ver).then(function (r) {
      if (!r.ok) throw new Error('chunk ' + n + ' ' + r.status);
      return r.text();
    });
  });
  try {
    const texts = await Promise.all(parts);
    const code = texts.join('');
    (0, eval)(code);
  } catch (e) {
    console.error('[SA] Tickets CRM failed to load', e);
  }
})();
