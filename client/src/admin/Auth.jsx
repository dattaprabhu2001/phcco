import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, token } from '../lib/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // A token in localStorage is not proof of a live session — it may have
  // expired while the tab was closed. Verify it against the server once on
  // mount so the guard below never flashes the CMS to a signed-out user.
  useEffect(() => {
    if (!token.get()) { setReady(true); return; }
    api.get('/admin/me')
      .then(({ user }) => setUser(user))
      .catch(() => token.clear())
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const res = await api.post('/admin/login', { email, password }, { noRedirect: true });
    token.set(res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    token.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="admin-boot">Checking your session…</div>;
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return children;
}
