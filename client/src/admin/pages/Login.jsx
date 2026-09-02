import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../Auth.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const to = location.state?.from?.pathname || '/admin';
  if (user) navigate(to, { replace: true });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <img src="/assets/media/brand/phcco-logo.webp" alt="PHCCO" className="admin-login-logo" />
        <h1>Content management</h1>
        <p className="admin-muted">Sign in to manage the PHCCO website.</p>

        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" autoComplete="username" required
               value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" autoComplete="current-password" required
               value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="admin-error" role="alert">{error}</p>}

        <button className="admin-btn primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <Link className="admin-muted admin-back" to="/">← Back to the website</Link>
      </form>
    </div>
  );
}
