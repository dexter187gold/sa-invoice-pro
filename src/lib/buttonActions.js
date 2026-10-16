/** Central button / action helpers — Pro Studio Q4 */
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function confirmAction(message) {
  try {
    return window.confirm(message);
  } catch {
    return true;
  }
}

export async function withBusy(setBusy, fn) {
  if (setBusy) setBusy(true);
  try {
    return await fn();
  } finally {
    if (setBusy) setBusy(false);
  }
}

export function safeClick(handler) {
  return async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      await handler(e);
    } catch (err) {
      console.error('[action]', err);
      const msg = err?.message || String(err);
      try {
        window.dispatchEvent(new CustomEvent('saip-toast', { detail: { message: msg, type: 'error' } }));
      } catch {}
    }
  };
}
