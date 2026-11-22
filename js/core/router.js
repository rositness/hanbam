// Хеш-роутер: работает на любом статическом хостинге без настройки сервера.

const routes = [];
let notFound = null;

export function route(pattern, handler, opts = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
  routes.push({ re, keys, handler, opts });
}
export function fallback(handler) { notFound = handler; }

export function currentPath() { return decodeURIComponent(location.hash.replace(/^#/, '')) || '/'; }

export function resolve(path = currentPath()) {
  const [p, q] = path.split('?');
  for (const r of routes) {
    const m = p.match(r.re);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = m[i + 1]; });
      return { handler: r.handler, params, query: new URLSearchParams(q || ''), opts: r.opts, path: p };
    }
  }
  return notFound ? { handler: notFound, params: {}, query: new URLSearchParams(), opts: {}, path: p } : null;
}

export function navigate(path, { replace = false } = {}) {
  const hash = '#' + path;
  if (replace) { history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  else if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = path;
}

export function back(fallbackPath = '/') {
  if (history.length > 1 && document.referrer !== undefined && sessionStorage.getItem('hb-nav') === '1') history.back();
  else navigate(fallbackPath, { replace: true });
}
