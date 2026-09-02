/**
 * Thin fetch wrapper.
 *
 * Everything is same-origin (Vite proxies /api to the server in dev, Express
 * serves the built SPA in production), so paths stay relative. The admin token
 * lives in localStorage and is attached automatically.
 */
const TOKEN_KEY = 'phcco.admin.token';

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(method, path, body, opts = {}) {
  const headers = {};
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });

  // An expired or missing token on an admin call means the session is over.
  // Clearing it here lets the route guard bounce to the login screen instead of
  // every caller having to special-case a 401.
  if (res.status === 401 && path.startsWith('/admin') && !opts.noRedirect) {
    token.clear();
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b, o) => request('POST', p, b, o),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
};
